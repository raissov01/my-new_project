package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	connectAttempts = 30
	connectDelay    = 2 * time.Second
	pingTimeout     = 5 * time.Second
)

// Connect creates a connection pool to PostgreSQL.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// Sensible pool defaults
	cfg.MaxConns = 10
	cfg.MinConns = 2
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	// Verify connectivity
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}

	return pool, nil
}

// WaitUntilReady retries connectivity checks while PostgreSQL and Swarm DNS settle.
func WaitUntilReady(ctx context.Context, databaseURL string) error {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return fmt.Errorf("parse config: %w", err)
	}

	var lastErr error

	for attempt := 1; attempt <= connectAttempts; attempt++ {
		if ctx.Err() != nil {
			return fmt.Errorf("wait for database: %w", ctx.Err())
		}

		pool, err := pgxpool.NewWithConfig(ctx, cfg)
		if err == nil {
			pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
			err = pool.Ping(pingCtx)
			cancel()
			pool.Close()
		}

		if err == nil {
			return nil
		}

		lastErr = err
		log.Printf("database not ready yet (attempt %d/%d): %v", attempt, connectAttempts, err)

		if attempt == connectAttempts {
			break
		}

		timer := time.NewTimer(connectDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return fmt.Errorf("wait for database: %w", ctx.Err())
		case <-timer.C:
		}
	}

	return fmt.Errorf("database not ready after %d attempts: %w", connectAttempts, lastErr)
}
