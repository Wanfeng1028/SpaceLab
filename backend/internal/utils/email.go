package utils

import (
	"crypto/tls"
	"fmt"
	"os"

	"gopkg.in/gomail.v2"
)

var Mailer *EmailService

// EmailService 邮件服务
type EmailService struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

// InitEmail 初始化邮件服务
func InitEmail() {
	Mailer = &EmailService{
		Host:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		Port:     getEnvInt("SMTP_PORT", 587),
		Username: getEnv("SMTP_USERNAME", ""),
		Password: getEnv("SMTP_PASSWORD", ""),
		From:     getEnv("SMTP_FROM", "noreply@spacelab.com"),
	}
}

// SendEmail 发送邮件
func (e *EmailService) SendEmail(to, subject, body string) error {
	if e.Username == "" || e.Password == "" {
		// SMTP 未配置，跳过发送
		fmt.Printf("Email skipped (SMTP not configured): %s -> %s\n", subject, to)
		return nil
	}

	m := gomail.NewMessage()
	m.SetHeader("From", e.From)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(e.Host, e.Port, e.Username, e.Password)
	d.TLSConfig = &tls.Config{InsecureSkipVerify: true}

	return d.DialAndSend(m)
}

// SendCommentNotification 发送评论通知
func (e *EmailService) SendCommentNotification(to, postTitle, commentContent, commenterName string) error {
	subject := fmt.Sprintf("New comment on: %s", postTitle)
	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>New Comment</h2>
			<p><strong>%s</strong> commented on your post <strong>%s</strong>:</p>
			<blockquote>%s</blockquote>
			<p><a href="%s/blog">View Comments</a></p>
		</body>
		</html>
	`, commenterName, postTitle, commentContent, getEnv("SITE_URL", "http://localhost:4200"))

	return e.SendEmail(to, subject, body)
}

// SendWelcomeEmail 发送欢迎邮件
func (e *EmailService) SendWelcomeEmail(to, username string) error {
	subject := "Welcome to SpaceLab!"
	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>Welcome, %s!</h2>
			<p>Thank you for joining SpaceLab.</p>
			<p>You can now:</p>
			<ul>
				<li>Browse articles</li>
				<li>Leave comments</li>
				<li>Explore projects</li>
			</ul>
			<p><a href="%s">Get Started</a></p>
		</body>
		</html>
	`, username, getEnv("SITE_URL", "http://localhost:4200"))

	return e.SendEmail(to, subject, body)
}

// SendPasswordReset 发送密码重置邮件
func (e *EmailService) SendPasswordReset(to, resetToken string) error {
	subject := "Password Reset - SpaceLab"
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", getEnv("SITE_URL", "http://localhost:4200"), resetToken)
	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>Password Reset</h2>
			<p>You requested a password reset. Click the link below to reset your password:</p>
			<p><a href="%s">Reset Password</a></p>
			<p>If you didn't request this, please ignore this email.</p>
			<p>This link will expire in 1 hour.</p>
		</body>
		</html>
	`, resetLink)

	return e.SendEmail(to, subject, body)
}

// SendNewsletter 发送新闻通讯
func (e *EmailService) SendNewsletter(to, subject, content string) error {
	body := fmt.Sprintf(`
		<html>
		<body>
			<h1>%s</h1>
			%s
			<hr>
			<p><small>You received this email because you subscribed to SpaceLab newsletter.</small></p>
		</body>
		</html>
	`, subject, content)

	return e.SendEmail(to, subject, body)
}

// 辅助函数
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	// 简化实现
	return defaultValue
}
