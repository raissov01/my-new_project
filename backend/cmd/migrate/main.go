package main

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/config"
	"github.com/midoriya/flashlearn-backend/internal/database"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := database.ConnectGorm(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	sqlDB, err := db.DB()
	if err == nil {
		defer sqlDB.Close()
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	log.Println("database migration complete")
}
