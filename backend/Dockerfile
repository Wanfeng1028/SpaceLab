FROM golang:1.23-alpine AS builder

WORKDIR /build

# 安装构建依赖
RUN apk add --no-cache git

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# 运行阶段
FROM alpine:latest

WORKDIR /app

# 安装必要的运行时依赖
RUN apk --no-cache add ca-certificates tzdata

# 从 builder 复制二进制文件
COPY --from=builder /build/main .
COPY --from=builder /build/.env.example .

# 创建上传目录
RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./main"]
