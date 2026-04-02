package main

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("server init: %v", err)
	}

	if err := srv.Run(); err != nil {
		log.Fatalf("server run: %v", err)
	}
}
