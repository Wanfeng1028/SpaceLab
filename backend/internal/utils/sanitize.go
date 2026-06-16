package utils

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

// 评论专用严格策略：只允许纯文本 + 基础格式
var commentPolicy = bluemonday.StrictPolicy()

// 富文本策略：允许安全的 HTML 标签（文章内容用）
var richTextPolicy = bluemonday.UGCPolicy()

func init() {
	// 富文本策略：允许常见安全标签
	richTextPolicy.AllowElements(
		"p", "br", "hr", "blockquote",
		"h1", "h2", "h3", "h4", "h5", "h6",
		"ul", "ol", "li",
		"strong", "em", "b", "i", "u", "s", "del", "ins",
		"code", "pre",
		"a", "img",
		"table", "thead", "tbody", "tr", "th", "td",
	)
	richTextPolicy.AllowAttrs("href").OnElements("a")
	richTextPolicy.AllowAttrs("src", "alt", "title", "width", "height").OnElements("img")
	richTextPolicy.AllowAttrs("class", "language").OnElements("code", "pre")

	// 链接安全：强制添加 rel 和 target
	richTextPolicy.RequireNoFollowOnLinks(true)
	richTextPolicy.RequireNoFollowOnFullyQualifiedLinks(true)
	richTextPolicy.AddTargetBlankToFullyQualifiedLinks(true)

	// 禁止 javascript: / data: / vbscript: 链接
	richTextPolicy.AllowURLSchemes("http", "https", "mailto")
}

// SanitizeComment 清洗评论内容（严格模式，只保留纯文本）
func SanitizeComment(content string) string {
	return strings.TrimSpace(commentPolicy.Sanitize(content))
}

// SanitizeRichText 清洗富文本内容（文章等，允许安全标签）
func SanitizeRichText(content string) string {
	return strings.TrimSpace(richTextPolicy.Sanitize(content))
}

// SanitizePlainString 清洗纯字符串字段（用户名、标题等）
func SanitizePlainString(s string) string {
	return strings.TrimSpace(regexp.MustCompile(`<[^>]*>`).ReplaceAllString(s, ""))
}

// ValidateSafeURL 校验 URL 是否安全（禁止 javascript: / data: / file: 协议）
func ValidateSafeURL(urlStr string) bool {
	lower := strings.ToLower(strings.TrimSpace(urlStr))
	if lower == "" {
		return true // 空值允许
	}
	// 必须以 http:// 或 https:// 开头
	if strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") {
		return true
	}
	return false
}

// SanitizeLinkURL 清洗链接 URL
func SanitizeLinkURL(urlStr string) string {
	urlStr = strings.TrimSpace(urlStr)
	if !ValidateSafeURL(urlStr) {
		return ""
	}
	return urlStr
}

// IsValidURL 校验 URL 是否为合法的 http/https URL
func IsValidURL(rawURL string) bool {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return false
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return false
	}
	if parsed.Host == "" {
		return false
	}
	return true
}
