# SpaceLab Backend Makefile

.PHONY: help build run test clean docker-up docker-down docker-logs

# 默认目标
help:
	@echo "SpaceLab Backend - 可用命令:"
	@echo ""
	@echo "开发命令:"
	@echo "  make build          - 构建后端二进制文件"
	@echo "  make run            - 运行后端服务"
	@echo "  make dev            - 运行开发模式（热重载）"
	@echo "  make test           - 运行测试"
	@echo "  make lint           - 运行代码检查"
	@echo ""
	@echo "数据库命令:"
	@echo "  make db-up          - 启动数据库服务"
	@echo "  make db-down        - 停止数据库服务"
	@echo "  make db-migrate     - 运行数据库迁移"
	@echo "  make db-reset       - 重置数据库"
	@echo ""
	@echo "Docker 命令:"
	@echo "  make docker-up      - 启动所有服务"
	@echo "  make docker-down    - 停止所有服务"
	@echo "  make docker-logs    - 查看服务日志"
	@echo "  make docker-rebuild - 重新构建并启动"
	@echo ""
	@echo "清理命令:"
	@echo "  make clean          - 清理构建文件"
	@echo "  make clean-all      - 清理所有生成的文件"

# 构建后端
build:
	go build -o bin/server ./cmd/server

# 运行后端
run: build
	./bin/server

# 开发模式
dev:
	go run cmd/server/main.go

# 运行测试
test:
	go test ./...

# 代码检查
lint:
	golangci-lint run

# 数据库命令
db-up:
	docker-compose up -d postgres redis

db-down:
	docker-compose down postgres redis

db-migrate:
	docker-compose exec postgres psql -U spacelab -d spacelab -f /docker-entrypoint-initdb.d/001_initial_schema.sql

db-reset:
	docker-compose down -v
	docker-compose up -d postgres redis

# Docker 命令
docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	docker-compose up -d --build

# 清理命令
clean:
	rm -rf bin/
	rm -rf tmp/

clean-all: clean
	docker-compose down -v

# 环境变量
env-example:
	@cp .env.example .env
	@echo "已创建 .env 文件，请编辑配置"

# 安装依赖
deps:
	go mod download

# 生成文档
docs:
	godoc -http=:6060

# 生产构建
build-prod:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -a -installsuffix cgo -o bin/server ./cmd/server

# 运行所有（开发）
all: db-up deps build run
