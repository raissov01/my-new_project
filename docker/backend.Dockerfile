# syntax=docker/dockerfile:1.7
# Use golang:1.25-alpine directly — avoids GOTOOLCHAIN=auto downloading the
# 1.25 toolchain on every cold build (~150 MB, adds 10-20 min to VPS builds).
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -o /migrate ./cmd/migrate

FROM alpine:3.19
RUN apk --no-cache add ca-certificates wget
WORKDIR /app
COPY --from=builder /server ./server
COPY --from=builder /migrate ./migrate

EXPOSE 5000
CMD ["./server"]
