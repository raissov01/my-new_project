FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN GOTOOLCHAIN=local go mod tidy 2>/dev/null || true
RUN CGO_ENABLED=0 GOOS=linux GOTOOLCHAIN=local go build -o /server ./cmd

FROM alpine:3.19
RUN apk --no-cache add ca-certificates wget
WORKDIR /app
COPY --from=builder /server .

EXPOSE 5000
CMD ["./server"]
