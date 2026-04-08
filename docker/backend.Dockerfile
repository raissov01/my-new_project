# syntax=docker/dockerfile:1.7
FROM golang:1.24-alpine AS builder

# GOTOOLCHAIN=auto lets Go 1.24 auto-download the Go 1.25 toolchain
# required by go.mod, without needing a golang:1.25 base image.
ENV GOTOOLCHAIN=auto

WORKDIR /app

# Cache the module download layer separately so changing source files does
# not re-download dependencies.
COPY go.mod ./
COPY go.sum* ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download 2>/dev/null || true

# Copy source AFTER module download so source edits don't bust the module cache.
# Cache mounts target only the Go module + build caches — never source dirs —
# so the actual binary is always recompiled from the freshly copied source on
# every build (this is the bug the previous "remove cache mounts" commit was
# trying to fix; the real cause was a missing source COPY ordering, not the
# caches themselves).
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
