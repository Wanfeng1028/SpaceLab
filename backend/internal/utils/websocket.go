package utils

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

// getAllowedOrigins 从环境变量读取允许的 WebSocket 来源
func getAllowedOrigins() []string {
	origins := []string{"http://localhost:4200", "http://localhost:8080"}
	if originsStr := os.Getenv("ALLOWED_ORIGINS"); originsStr != "" {
		for _, origin := range strings.Split(originsStr, ",") {
			origins = append(origins, strings.TrimSpace(origin))
		}
	}
	return origins
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// 禁止空 Origin 绕过（拒绝非浏览器客户端的匿名连接）
		if origin == "" {
			return false
		}
		allowedOrigins := getAllowedOrigins()
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				return true
			}
		}
		return false
	},
}

// WebSocketHub WebSocket 中心
type WebSocketHub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
	done       chan struct{}
}

// Client WebSocket 客户端
type Client struct {
	hub    *WebSocketHub
	conn   *websocket.Conn
	send   chan []byte
	userID string
	roomID string
	// 消息速率限制
	msgCount  int
	lastMsgAt time.Time
	msgMu     sync.Mutex
}

// Message WebSocket 消息
type Message struct {
	Type    string      `json:"type"`
	Room    string      `json:"room,omitempty"`
	UserID  string      `json:"user_id,omitempty"`
	Payload interface{} `json:"payload"`
	Time    time.Time   `json:"time"`
}

var Hub *WebSocketHub

// InitWebSocket 初始化 WebSocket
func InitWebSocket() {
	Hub = &WebSocketHub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		done:       make(chan struct{}),
	}
	go Hub.Run()
}

func (h *WebSocketHub) Stop() {
	close(h.done)
	h.mu.Lock()
	for client := range h.clients {
		close(client.send)
		delete(h.clients, client)
	}
	h.mu.Unlock()
}

func (h *WebSocketHub) Run() {
	for {
		select {
		case <-h.done:
			return
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("WebSocket client connected: %s", client.userID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			log.Printf("WebSocket client disconnected: %s", client.userID)

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastMessage 广播消息
func (h *WebSocketHub) BroadcastMessage(msgType string, payload interface{}) {
	msg := Message{
		Type:    msgType,
		Payload: payload,
		Time:    time.Now(),
	}
	data, _ := json.Marshal(msg)
	h.broadcast <- data
}

// SendToRoom 发送消息到指定房间
func (h *WebSocketHub) SendToRoom(roomID, msgType string, payload interface{}) {
	msg := Message{
		Type:    msgType,
		Payload: payload,
		Time:    time.Now(),
	}
	data, _ := json.Marshal(msg)

	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		if client.roomID == roomID {
			select {
			case client.send <- data:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

// SendToUser 发送消息给指定用户
func (h *WebSocketHub) SendToUser(userID, msgType string, payload interface{}) {
	msg := Message{
		Type:    msgType,
		Payload: payload,
		Time:    time.Now(),
	}
	data, _ := json.Marshal(msg)

	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		if client.userID == userID {
			select {
			case client.send <- data:
			default:
				close(client.send)
				delete(h.clients, client)
			}
		}
	}
}

// GetOnlineUsers 获取在线用户列表
func (h *WebSocketHub) GetOnlineUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	seen := make(map[string]bool)
	var users []string
	for client := range h.clients {
		if client.userID != "" && !seen[client.userID] {
			seen[client.userID] = true
			users = append(users, client.userID)
		}
	}
	return users
}

// GetOnlineCount 获取在线用户数
func (h *WebSocketHub) GetOnlineCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// 允许的消息类型白名单
var allowedMessageTypes = map[string]bool{
	"ping":    true,
	"join":    true,
	"leave":   true,
	"message": true,
}

// rateLimit 检查客户端消息速率
func (c *Client) rateLimit() bool {
	c.msgMu.Lock()
	defer c.msgMu.Unlock()

	now := time.Now()
	// 每秒重置计数
	if now.Sub(c.lastMsgAt) > time.Second {
		c.msgCount = 0
		c.lastMsgAt = now
	}
	c.msgCount++
	// 每秒最多 10 条消息
	return c.msgCount <= 10
}

// parseJWTFromQuery 从 URL query 解析 JWT 并返回 userID
func parseJWTFromQuery(r *http.Request) (string, bool) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		return "", false
	}

	// 从环境变量读取 JWT 密钥
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "dev-secret-key-change-in-production"
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, nil
		}
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return "", false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", false
	}

	userID, ok := claims["user_id"].(string)
	if !ok || userID == "" {
		return "", false
	}

	return userID, true
}

// HandleWebSocket 处理 WebSocket 连接（需从 query 传入 ?token=JWT 认证）
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	// JWT 认证检查（从 query param 读取 token）
	userID, authenticated := parseJWTFromQuery(r)
	if !authenticated || userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:       Hub,
		conn:      conn,
		send:      make(chan []byte, 256),
		userID:    userID, // 来自 JWT，不可伪造
		lastMsgAt: time.Now(),
	}

	Hub.register <- client

	go client.writePump()
	go client.readPump()
}

// readPump 读取消息
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		// 消息速率限制
		if !c.rateLimit() {
			// 超速：发送警告但不断开（防止误杀）
			log.Printf("WebSocket rate limit exceeded for user %s", c.userID)
			continue
		}

		// 仅接受 JSON 消息
		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// 消息类型白名单
		if !allowedMessageTypes[msg.Type] {
			continue
		}

		switch msg.Type {
		case "ping":
			// 健康检查，不需要额外处理
		case "join":
			// 只允许加入房间，userID 强制用 JWT 中的值
			c.roomID = msg.Room
		case "leave":
			c.roomID = ""
		case "message":
			// 普通消息转发（未来可扩展为聊天功能）
		}
	}
}

// writePump 写入消息
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
