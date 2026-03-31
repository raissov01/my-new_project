package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	migDir := "../../supabase/migrations"
	if len(os.Args) > 1 {
		migDir = os.Args[1]
	}

	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer conn.Close(ctx)

	entries, err := os.ReadDir(migDir)
	if err != nil {
		log.Fatalf("read migrations dir: %v", err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".sql" {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		path := filepath.Join(migDir, name)
		sql, err := os.ReadFile(path)
		if err != nil {
			log.Fatalf("read %s: %v", name, err)
		}
		fmt.Printf("applying %s ... ", name)
		_, err = conn.Exec(ctx, string(sql))
		if err != nil {
			fmt.Printf("ERROR: %v\n", err)
			// Continue — some migrations may have already been partially applied
			continue
		}
		fmt.Println("ok")
	}

	fmt.Println("\ndone.")
}
