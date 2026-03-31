package service

import (
	"context"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

// Profile contains profile business logic.
type Profile struct {
	repo *repository.Profile
}

func NewProfile(repo *repository.Profile) *Profile {
	return &Profile{repo: repo}
}

func (s *Profile) GetMe(ctx context.Context, userID string) (*model.Profile, error) {
	return s.repo.GetByID(ctx, userID)
}
