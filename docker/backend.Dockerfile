# syntax=docker/dockerfile:1.7
FROM golang:1.24-alpine AS builder

# GOTOOLCHAIN=auto lets Go 1.24 auto-download the Go 1.25 toolchain
# required by go.mod, without needing a golang:1.25 base image.
ENV GOTOOLCHAIN=auto

WORKDIR /app
COPY go.mod ./
COPY go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build go mod download 2>/dev/null || true
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux go build -o /migrate ./cmd/migrate
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux go build -o /telegram-import ./cmd/telegram-import

FROM alpine:3.19
RUN apk --no-cache add ca-certificates wget
WORKDIR /app
COPY --from=builder /server ./server
COPY --from=builder /migrate ./migrate
COPY --from=builder /telegram-import ./telegram-import

EXPOSE 5000
CMD ["./server"]
