package utils

import (
	"fmt"
	"strings"
	"sync"

	"github.com/lionsoul2014/ip2region/binding/golang/xdb"
)

var (
	ipSearcher     *xdb.Searcher
	ipSearcherOnce sync.Once
	ipSearcherErr  error
)

// InitIPLocation 初始化 IP 归属地查询器（基于 ip2region 离线 xdb 文件）。
// xdbPath 为 ip2region.xdb 文件路径，通常在 main.go 启动时调用一次。
func InitIPLocation(xdbPath string) error {
	ipSearcherOnce.Do(func() {
		// 基于文件创建 searcher（全缓存模式，适合高并发）
		cBuff, err := xdb.LoadContentFromFile(xdbPath)
		if err != nil {
			ipSearcherErr = fmt.Errorf("failed to load ip2region xdb: %w", err)
			return
		}
		searcher, err := xdb.NewWithBuffer(xdb.IPv4, cBuff)
		if err != nil {
			ipSearcherErr = fmt.Errorf("failed to create ip2region searcher: %w", err)
			return
		}
		ipSearcher = searcher
	})
	return ipSearcherErr
}

// GetIPLocation 根据 IP 地址解析归属地（省/国家级）。
// 返回格式示例："广东"、"北京"、"美国"。
// 若解析失败或为内网 IP，返回空字符串。
func GetIPLocation(ip string) string {
	if ipSearcher == nil {
		return ""
	}
	if ip == "" || isPrivateIP(ip) {
		return ""
	}

	region, err := ipSearcher.Search(ip)
	if err != nil {
		return ""
	}

	// ip2region 返回格式: 国家|区域|省份|城市|ISP
	// 例: 中国|0|广东省|深圳市|电信
	return parseRegion(region)
}

// parseRegion 从 ip2region 原始字符串中提取有意义的归属地
func parseRegion(region string) string {
	parts := strings.Split(region, "|")
	if len(parts) < 5 {
		return ""
	}

	country := parts[0]
	province := parts[2]
	city := parts[3]

	// 中国：显示省份（去掉"省"/"市"/"自治区"等后缀保留核心名）
	if country == "中国" {
		if province != "0" && province != "" {
			return simplifyCNProvince(province)
		}
		if city != "0" && city != "" {
			return city
		}
		return "中国"
	}

	// 非中国：显示国家名
	if country != "0" && country != "" {
		return country
	}

	return ""
}

// simplifyCNProvince 简化省份名称
func simplifyCNProvince(province string) string {
	suffixes := []string{"维吾尔自治区", "壮族自治区", "回族自治区", "自治区", "特别行政区", "省", "市"}
	for _, suffix := range suffixes {
		if strings.HasSuffix(province, suffix) {
			return strings.TrimSuffix(province, suffix)
		}
	}
	return province
}

// isPrivateIP 判断是否为内网/回环地址
func isPrivateIP(ip string) bool {
	privatePrefixes := []string{
		"10.", "172.16.", "172.17.", "172.18.", "172.19.",
		"172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
		"172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
		"172.30.", "172.31.", "192.168.", "127.", "::1", "fd",
	}
	for _, prefix := range privatePrefixes {
		if strings.HasPrefix(ip, prefix) {
			return true
		}
	}
	return ip == "localhost"
}
