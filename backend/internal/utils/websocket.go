package utils

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 开发环境允许所有来源
	},
}

// WebSocketHub WebSocket 中心
type WebSocketHub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// Client WebSocket 客户端
type Client struct {
	hub      *WebSocketHub
	conn     *websocket.Conn
	send     chan []byte
	userID   string
	roomID   string
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
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	go Hub.Run()
}

// Run 运行 WebSocket 中心
func (h *WebSocketHub) Run() {
	for {
		select {
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

// SendToRoom 发送消息到房间
func (h *WebSocketHub) SendToRoom(roomID, msgType string, payload interface{}) {
	msg := Message{
		Type:    msgType,
		Room:    roomID,
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

// SendToUser 发送消息给用户
func (h *WebSocketHub) SendToUser(userID, msgType string, payload interface{}) {
	msg := Message{
		Type:    msgType,
		UserID:  userID,
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

// GetOnlineUsers 获取在线用户
func (h *WebSocketHub) GetOnlineUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]string, 0)
	for client := range h.clients {
		if client.userID != "" {
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

// HandleWebSocket 处理 WebSocket 连接
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  Hub,
		conn: conn,
		send: make(chan []byte, 256),
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

	c.conn.SetReadLimit(512)
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

		// 处理消息
		var msg Message
		if err := json.Unmarshal(message, &msg); err == nil {
			switch msg.Type {
			case "join":
				c.roomID = msg.Room
				c.userID = msg.UserID
			case "leave":
				c.roomID = ""
			}
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
