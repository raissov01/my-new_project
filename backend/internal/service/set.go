package service

import (
	"context"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

// Set contains set overview business logic.
type Set struct {
	repo *repository.Set
}

func NewSet(repo *repository.Set) *Set {
	return &Set{repo: repo}
}

func (s *Set) GetOverview(ctx context.Context, userID string) ([]model.SetOverview, error) {
	return s.repo.GetOverviewByUserID(ctx, userID)
}

func (s *Set) GetPublicOverview(ctx context.Context) ([]model.SetOverview, error) {
	return s.repo.GetPublicOverview(ctx)
}
