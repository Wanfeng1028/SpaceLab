package utils

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTP 请求计数
	HttpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spacelab_http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status_code"},
	)

	// HTTP 请求延迟
	HttpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "spacelab_http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	// 数据库查询计数
	DBQueriesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "spacelab_db_queries_total",
			Help: "Total number of database queries",
		},
		[]string{"operation", "table"},
	)

	// 数据库查询延迟
	DBQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "spacelab_db_query_duration_seconds",
			Help:    "Database query duration in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5},
		},
		[]string{"operation", "table"},
	)

	// 活跃用户数
	ActiveUsers = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "spacelab_active_users",
			Help: "Number of currently active users",
		},
	)

	// 文章总数
	PostsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "spacelab_posts_total",
			Help: "Total number of posts",
		},
	)

	// 评论总数
	CommentsTotal = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "spacelab_comments_total",
			Help: "Total number of comments",
		},
	)

	// 文件上传大小
	UploadSizeBytes = promauto.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "spacelab_upload_size_bytes",
			Help:    "Size of uploaded files in bytes",
			Buckets: []float64{1024, 10240, 102400, 1048576, 5242880, 10485760},
		},
	)

	// 缓存命中率
	CacheHits = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spacelab_cache_hits_total",
			Help: "Total number of cache hits",
		},
	)

	// 缓存未命中
	CacheMisses = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "spacelab_cache_misses_total",
			Help: "Total number of cache misses",
		},
	)
)

// RecordHttpRequest 记录 HTTP 请求指标
func RecordHttpRequest(method, path, statusCode string, duration float64) {
	HttpRequestsTotal.WithLabelValues(method, path, statusCode).Inc()
	HttpRequestDuration.WithLabelValues(method, path).Observe(duration)
}

// RecordDBQuery 记录数据库查询指标
func RecordDBQuery(operation, table string, duration float64) {
	DBQueriesTotal.WithLabelValues(operation, table).Inc()
	DBQueryDuration.WithLabelValues(operation, table).Observe(duration)
}

// IncrementActiveUsers 增加活跃用户数
func IncrementActiveUsers() {
	ActiveUsers.Inc()
}

// DecrementActiveUsers 减少活跃用户数
func DecrementActiveUsers() {
	ActiveUsers.Dec()
}

// SetPostsTotal 设置文章总数
func SetPostsTotal(count float64) {
	PostsTotal.Set(count)
}

// IncrementCommentsTotal 增加评论总数
func IncrementCommentsTotal() {
	CommentsTotal.Inc()
}

// RecordUploadSize 记录上传文件大小
func RecordUploadSize(size float64) {
	UploadSizeBytes.Observe(size)
}

// RecordCacheHit 记录缓存命中
func RecordCacheHit() {
	CacheHits.Inc()
}

// RecordCacheMiss 记录缓存未命中
func RecordCacheMiss() {
	CacheMisses.Inc()
}
