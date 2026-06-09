package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// MailerLiteService MailerLite 邮件列表管理服务
type MailerLiteService struct {
	apiKey      string
	groupID     string
	baseURL     string
	client      *http.Client
}

// MailerLiteSubscriber 订阅者请求结构
type MailerLiteSubscriber struct {
	Email     string            `json:"email"`
	Name      string            `json:"name,omitempty"`
	Fields    map[string]string `json:"fields,omitempty"`
	Consented bool              `json:"consented"`
}

// MailerLiteResponse MailerLite API 响应
type MailerLiteResponse struct {
	Success bool                   `json:"success,omitempty"`
	Data    map[string]interface{} `json:"data,omitempty"`
	Error   string                 `json:"error,omitempty"`
	Message string                 `json:"message,omitempty"`
}

// InitMailerLite 初始化 MailerLite 服务
func InitMailerLite(apiKey, groupID, baseURL string) *MailerLiteService {
	if apiKey == "" || groupID == "" {
		fmt.Println("MailerLite skipped: API key or group ID not configured")
		return nil
	}

	if baseURL == "" {
		baseURL = "https://api.mailerlite.com/api/v2"
	}

	return &MailerLiteService{
		apiKey:  apiKey,
		groupID: groupID,
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// AddSubscriber 添加订阅者到 newsletter 列表
func (s *MailerLiteService) AddSubscriber(email, name string) error {
	if !s.IsConfigured() {
		fmt.Printf("MailerLite skipped: not configured (email: %s)\n", email)
		return nil
	}

	subscriber := MailerLiteSubscriber{
		Email:  email,
		Name:   name,
		Consented: true,
		Fields: map[string]string{
			"source": "spacelab_registration",
		},
	}

	return s.updateOrCreateSubscriber(email, subscriber)
}

// RemoveSubscriber 移除订阅者（退订）
func (s *MailerLiteService) RemoveSubscriber(email string) error {
	if !s.IsConfigured() {
		return nil
	}

	subscriberID, err := s.getSubscriberIDByEmail(email)
	if err != nil {
		// 如果找不到，可能是新邮箱，忽略
		fmt.Printf("MailerLite: subscriber not found for %s, skipping unsubscribe\n", email)
		return nil
	}

	url := fmt.Sprintf("%s/subscribers/%s", s.baseURL, subscriberID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("create unsubscribe request failed: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MailerLite-ApiKey", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("unsubscribe request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		fmt.Printf("MailerLite: unsubscribed %s (id: %s)\n", email, subscriberID)
		return nil
	}

	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("unsubscribe failed with status %d: %s", resp.StatusCode, string(body))
}

// IsSubscribed 检查是否已订阅
func (s *MailerLiteService) IsSubscribed(email string) (bool, error) {
	if !s.IsConfigured() {
		return false, nil
	}

	_, err := s.getSubscriberIDByEmail(email)
	if err != nil {
		return false, nil
	}
	return true, nil
}

// getSubscriberIDByEmail 通过邮箱获取订阅者 ID
func (s *MailerLiteService) getSubscriberIDByEmail(email string) (string, error) {
	url := fmt.Sprintf("%s/subscribers?email=%s", s.baseURL, email)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-MailerLite-ApiKey", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return "", fmt.Errorf("subscriber not found")
	}

	var result MailerLiteResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.Data == nil || len(result.Data["data"].([]interface{})) == 0 {
		return "", fmt.Errorf("subscriber not found")
	}

	dataArr := result.Data["data"].([]interface{})
	firstSubscriber := dataArr[0].(map[string]interface{})
	id, _ := firstSubscriber["id"].(string)

	return id, nil
}

// updateOrCreateSubscriber 更新或创建订阅者
func (s *MailerLiteService) updateOrCreateSubscriber(email string, subscriber MailerLiteSubscriber) error {
	// 先尝试查找现有订阅者
	existingID, err := s.getSubscriberIDByEmail(email)
	if err != nil {
		// 不存在，创建新的
		return s.createSubscriber(subscriber)
	}

	// 已存在，更新
	return s.updateSubscriber(existingID, subscriber)
}

// createSubscriber 创建新订阅者
func (s *MailerLiteService) createSubscriber(subscriber MailerLiteSubscriber) error {
	url := fmt.Sprintf("%s/subscribers", s.baseURL)

	payload, err := json.Marshal(map[string]interface{}{
		"email":     subscriber.Email,
		"name":      subscriber.Name,
		"fields":    subscriber.Fields,
		"consented": subscriber.Consented,
		"groups":    map[string][]string{
			s.groupID: {s.groupID},
		},
	})
	if err != nil {
		return fmt.Errorf("marshal subscriber data failed: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("create subscriber request failed: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MailerLite-ApiKey", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("create subscriber request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		fmt.Printf("MailerLite: created subscriber %s\n", subscriber.Email)
		return nil
	}

	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("create subscriber failed with status %d: %s", resp.StatusCode, string(body))
}

// updateSubscriber 更新现有订阅者
func (s *MailerLiteService) updateSubscriber(subscriberID string, subscriber MailerLiteSubscriber) error {
	url := fmt.Sprintf("%s/subscribers/%s", s.baseURL, subscriberID)

	payload, err := json.Marshal(map[string]interface{}{
		"email":     subscriber.Email,
		"name":      subscriber.Name,
		"consented": subscriber.Consented,
		"groups":    map[string][]string{
			s.groupID: {s.groupID},
		},
	})
	if err != nil {
		return fmt.Errorf("marshal update data failed: %w", err)
	}

	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(payload))
	if err != nil {
		return fmt.Errorf("update subscriber request failed: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-MailerLite-ApiKey", s.apiKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("update subscriber request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		fmt.Printf("MailerLite: updated subscriber %s\n", subscriber.Email)
		return nil
	}

	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("update subscriber failed with status %d: %s", resp.StatusCode, string(body))
}

// IsConfigured 检查是否已配置
func (s *MailerLiteService) IsConfigured() bool {
	return s != nil && s.apiKey != "" && s.groupID != ""
}

// GetGroupID 获取当前配置的 group ID
func (s *MailerLiteService) GetGroupID() string {
	return s.groupID
}
