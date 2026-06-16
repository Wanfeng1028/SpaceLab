package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestCaptchaHandler_GetCaptchaID 测试获取验证码 ID
func TestCaptchaHandler_GetCaptchaID(t *testing.T) {
	handler := NewCaptchaHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/captcha/new", nil)

	handler.GetCaptchaID(c)

	if w.Code != http.StatusOK {
		t.Errorf("GetCaptchaID status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp struct {
		CaptchaID string `json:"captcha_id"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}
	if resp.CaptchaID == "" {
		t.Error("Expected non-empty captcha_id")
	}
}

// TestCaptchaHandler_GetCaptchaImage 测试获取验证码图片
func TestCaptchaHandler_GetCaptchaImage(t *testing.T) {
	handler := NewCaptchaHandler()

	// 先获取一个 ID
	wID := httptest.NewRecorder()
	cID, _ := gin.CreateTestContext(wID)
	cID.Request = httptest.NewRequest("GET", "/captcha/new", nil)
	handler.GetCaptchaID(cID)

	var idResp struct {
		CaptchaID string `json:"captcha_id"`
	}
	json.Unmarshal(wID.Body.Bytes(), &idResp)

	if idResp.CaptchaID == "" {
		t.Fatal("Failed to get captcha ID")
	}

	// 获取图片
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/captcha/"+idResp.CaptchaID+".png", nil)
	c.Params = []gin.Param{{Key: "id", Value: idResp.CaptchaID}}

	handler.GetCaptchaImage(c)

	if w.Code != http.StatusOK {
		t.Errorf("GetCaptchaImage status = %d, want %d", w.Code, http.StatusOK)
	}

	// 检查响应内容（PNG 文件头应以 \x89PNG 开头）
	if len(w.Body.Bytes()) < 8 {
		t.Errorf("Response body too short: %d bytes", len(w.Body.Bytes()))
	}
	expectedHeader := []byte{0x89, 0x50, 0x4E, 0x47}
	if len(w.Body.Bytes()) >= 4 {
		header := w.Body.Bytes()[:4]
		for i, b := range expectedHeader {
			if header[i] != b {
				t.Errorf("PNG header byte %d = %02x, want %02x", i, header[i], b)
			}
		}
	}

	// 检查缓存头
	if w.Header().Get("Cache-Control") == "" {
		t.Error("Expected Cache-Control header to be set")
	}
}

// TestCaptchaHandler_Verify 测试验证码校验
func TestCaptchaHandler_Verify(t *testing.T) {
	handler := NewCaptchaHandler()

	// 先获取一个 ID
	wID := httptest.NewRecorder()
	cID, _ := gin.CreateTestContext(wID)
	cID.Request = httptest.NewRequest("GET", "/captcha/new", nil)
	handler.GetCaptchaID(cID)

	var idResp struct {
		CaptchaID string `json:"captcha_id"`
	}
	json.Unmarshal(wID.Body.Bytes(), &idResp)

	// 测试错误答案
	body := `{"captcha_id":"` + idResp.CaptchaID + `","answer":"wrong"}`
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/captcha/verify", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.VerifyCaptcha(c)

	var resp struct {
		Success bool `json:"success"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Success {
		t.Error("Expected captcha verification to fail with wrong answer")
	}

	// 测试空参数
	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/captcha/verify", strings.NewReader(`{}`))
	c.Request.Header.Set("Content-Type", "application/json")

	handler.VerifyCaptcha(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Empty params status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}

// TestCaptchaHandler_MissingID 测试缺少 ID 时的 GetCaptchaImage
func TestCaptchaHandler_MissingID(t *testing.T) {
	handler := NewCaptchaHandler()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/captcha/.png", nil)

	handler.GetCaptchaImage(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Missing ID status = %d, want %d", w.Code, http.StatusBadRequest)
	}
}
