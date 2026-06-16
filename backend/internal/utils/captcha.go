package utils

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"go.uber.org/zap"
)

// TurnstileResponse Cloudflare Turnstile API 响应
type TurnstileResponse struct {
	Success     bool     `json:"success"`
	ErrorCodes  []string `json:"error-codes"`
	ChallengeTS string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
}

// VerifyTurnstileToken 校验 Cloudflare Turnstile token
// POST https://challenges.cloudflare.com/turnstile/v0/siteverify
func VerifyTurnstileToken(token, secret string) (bool, error) {
	if secret == "" {
		Logger.Warn("TURNSTILE_SECRET_KEY not configured, skipping verification")
		return true, nil
	}
	if token == "" {
		return false, fmt.Errorf("turnstile token is required")
	}

	data := url.Values{
		"secret":   {secret},
		"response": {token},
	}

	resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify", data)
	if err != nil {
		return false, fmt.Errorf("failed to verify turnstile: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("failed to read turnstile response: %w", err)
	}

	var result TurnstileResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("failed to parse turnstile response: %w", err)
	}

	if !result.Success {
		errMsg := ""
		for _, code := range result.ErrorCodes {
			errMsg += code + "; "
		}
		Logger.Warn("Turnstile verification failed", zap.String("error_codes", errMsg))
		return false, nil
	}

	return true, nil
}
