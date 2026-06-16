package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"go.uber.org/zap"
)

// RecaptchaResponse Google reCAPTCHA v3 API 响应
type RecaptchaResponse struct {
	Success     bool     `json:"success"`
	Score       float64  `json:"score"`
	Action      string   `json:"action"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	ErrorCodes  []string `json:"error-codes"`
}

// VerifyRecaptchaToken 校验 Google reCAPTCHA v3 token
// score 阈值 0.5，低于此值视为机器人
func VerifyRecaptchaToken(token, secret string) (bool, error) {
	if secret == "" {
		Logger.Warn("RECAPTCHA_SECRET_KEY not configured, skipping verification")
		return true, nil
	}
	if token == "" {
		return false, fmt.Errorf("captcha token is required")
	}

	data := url.Values{
		"secret":   {secret},
		"response": {token},
	}

	resp, err := http.PostForm("https://www.google.com/recaptcha/api/siteverify", data)
	if err != nil {
		return false, fmt.Errorf("failed to verify captcha: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read captcha response: %w", err)
	}

	var result RecaptchaResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("failed to parse captcha response: %w", err)
	}

	if !result.Success {
		errMsg := strings.Join(result.ErrorCodes, ", ")
		Logger.Warn("reCAPTCHA verification failed", zap.String("error_codes", errMsg))
		return false, nil
	}

	// v3 返回 0.0~1.0 分数，建议阈值 0.5
	if result.Score < 0.5 {
		Logger.Warn("reCAPTCHA score too low", zap.Float64("score", result.Score), zap.String("action", result.Action))
		return false, nil
	}

	return true, nil
}
