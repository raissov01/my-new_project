# syntax=docker/dockerfile:1.7
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build go mod download 2>/dev/null || true
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build GOTOOLCHAIN=local go mod tidy 2>/dev/null || true
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux GOTOOLCHAIN=local go build -o /server ./cmd
RUN --mount=type=cache,target=/go/pkg/mod --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 GOOS=linux GOTOOLCHAIN=local go build -o /migrate ./cmd/migrate

FROM alpine:3.19
RUN apk --no-cache add ca-certificates wget
WORKDIR /app
COPY --from=builder /server ./server
COPY --from=builder /migrate ./migrate

EXPOSE 5000
CMD ["./server"]
