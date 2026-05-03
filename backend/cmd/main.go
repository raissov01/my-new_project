package main

import (
	"io"
	"log"
	"os"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/errlog"
	"github.com/midoriya/flashlearn-backend/internal/server"
)

func main() {
	// Tee log output into the in-memory ring buffer so the admin panel can
	// surface recent backend errors without shell access to the container.
	log.SetOutput(io.MultiWriter(os.Stderr, errlog.Writer()))

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
