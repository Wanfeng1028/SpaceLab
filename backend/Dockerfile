# ============================================================
# Stage 1: Builder
# ============================================================
FROM golang:1.25-alpine AS builder

WORKDIR /build

# Build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go.mod and go.sum first (leverage Docker cache)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary with stripped debug info for smaller size
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o main ./cmd/server

# ============================================================
# Stage 2: Runtime (Alpine minimal image)
# ============================================================
FROM alpine:3.21

WORKDIR /app

# Runtime dependencies (CA certs + timezone data)
RUN apk --no-cache add ca-certificates tzdata && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /build/main .

# Copy IP location data (ip2region.xdb)
COPY --from=builder /build/data ./data

# Create uploads directory with correct ownership
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads

# Switch to non-root user
USER appuser

EXPOSE 8080

CMD ["./main"]
