package utils

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v2"
)

// ResendService Resend 邮件服务
type ResendService struct {
	client  *resend.Client
	from    string
	siteURL string
}

// InitResend 初始化 Resend 服务
func InitResend(apiKey, from, siteURL string) *ResendService {
	if apiKey == "" {
		if Logger != nil {
			Logger.Info("Resend skipped: RESEND_API_KEY not configured")
		}
		return nil
	}

	client := resend.NewClient(apiKey)
	return &ResendService{
		client:  client,
		from:    from,
		siteURL: siteURL,
	}
}

// SendVerificationEmail 发送邮箱验证邮件
func (s *ResendService) SendVerificationEmail(ctx context.Context, to, token string) error {
	verifyLink := fmt.Sprintf("%s/verify-email?token=%s", s.siteURL, token)
	subject := "Verify your email - TesoroHome"
	html := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h1 style="color: #333;">Verify Your Email</h1>
			<p>Thanks for joining TesoroHome! Please verify your email address by clicking the button below:</p>
			<div style="text-align: center; margin: 30px 0;">
				<a href="%s" style="background-color: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Verify Email</a>
			</div>
			<p>Or click this link: <a href="%s">%s</a></p>
			<p>This link will expire in 24 hours.</p>
			<p>If you didn't create an account, you can safely ignore this email.</p>
			<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
			<p style="color: #999; font-size: 12px;">TesoroHome - Explore the Universe of Knowledge</p>
		</body>
		</html>
	`, verifyLink, verifyLink, verifyLink)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	})

	if err != nil {
		return fmt.Errorf("send verification email failed: %w", err)
	}
	return nil
}

// SendPasswordResetEmail 发送密码重置邮件
func (s *ResendService) SendPasswordResetEmail(ctx context.Context, to, token string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.siteURL, token)
	subject := "Reset Your Password - TesoroHome"
	html := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h1 style="color: #333;">Reset Your Password</h1>
			<p>You requested a password reset. Click the button below to reset your password:</p>
			<div style="text-align: center; margin: 30px 0;">
				<a href="%s" style="background-color: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Reset Password</a>
			</div>
			<p>Or click this link: <a href="%s">%s</a></p>
			<p>This link will expire in 1 hour.</p>
			<p>If you didn't request a password reset, you can safely ignore this email. Your password will not change.</p>
			<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
			<p style="color: #999; font-size: 12px;">TesoroHome - Explore the Universe of Knowledge</p>
		</body>
		</html>
	`, resetLink, resetLink, resetLink)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	})

	if err != nil {
		return fmt.Errorf("send password reset email failed: %w", err)
	}
	return nil
}

// SendWelcomeEmail 发送欢迎邮件
func (s *ResendService) SendWelcomeEmail(ctx context.Context, to, username string) error {
	subject := "Welcome to TesoroHome, " + username + "!"
	html := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h1 style="color: #333;">Welcome, %s!</h1>
			<p>Thank you for joining TesoroHome. We're glad to have you here.</p>
			<h3>You can now:</h3>
			<ul>
				<li>Browse and read articles across AI, technology, and space</li>
				<li>Leave comments and engage with the community</li>
				<li>Explore our project showcase</li>
			</ul>
			<div style="text-align: center; margin: 30px 0;">
				<a href="%s" style="background-color: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">Start Exploring</a>
			</div>
			<p>Happy exploring!</p>
			<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
			<p style="color: #999; font-size: 12px;">TesoroHome - Explore the Universe of Knowledge</p>
		</body>
		</html>
	`, username, s.siteURL)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	})

	if err != nil {
		return fmt.Errorf("send welcome email failed: %w", err)
	}
	return nil
}

// SendSystemNotification 发送系统通知
func (s *ResendService) SendSystemNotification(ctx context.Context, to, subject, content string) error {
	html := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h1 style="color: #333;">%s</h1>
			<div style="line-height: 1.6;">%s</div>
			<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
			<p style="color: #999; font-size: 12px;">TesoroHome - Explore the Universe of Knowledge</p>
		</body>
		</html>
	`, subject, content)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	})

	if err != nil {
		return fmt.Errorf("send system notification failed: %w", err)
	}
	return nil
}

// SendCommentNotification 发送评论通知
func (s *ResendService) SendCommentNotification(ctx context.Context, to, postTitle, commentContent, commenterName string) error {
	subject := fmt.Sprintf("New comment on: %s", postTitle)
	html := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h1 style="color: #333;">New Comment</h1>
			<p><strong>%s</strong> commented on your post <strong>%s</strong>:</p>
			<blockquote style="border-left: 3px solid #6366f1; padding-left: 15px; color: #555; margin: 15px 0;">%s</blockquote>
			<div style="text-align: center; margin: 30px 0;">
				<a href="%s/blog" style="background-color: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">View Comments</a>
			</div>
			<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
			<p style="color: #999; font-size: 12px;">TesoroHome - Explore the Universe of Knowledge</p>
		</body>
		</html>
	`, commenterName, postTitle, commentContent, s.siteURL)

	_, err := s.client.Emails.Send(&resend.SendEmailRequest{
		From:    s.from,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	})

	if err != nil {
		return fmt.Errorf("send comment notification failed: %w", err)
	}
	return nil
}

// IsConfigured 检查是否已配置
func (s *ResendService) IsConfigured() bool {
	return s != nil && s.client != nil
}
