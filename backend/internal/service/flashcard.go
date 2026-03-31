package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

type Flashcard struct {
	repo *repository.Flashcard
}

func NewFlashcard(repo *repository.Flashcard) *Flashcard {
	return &Flashcard{repo: repo}
}

func (s *Flashcard) CreateSet(ctx context.Context, userID string, req model.CreateSetRequest) (string, error) {
	if strings.TrimSpace(req.Title) == "" {
		return "", fmt.Errorf("title is required")
	}
	filled := 0
	for _, c := range req.Cards {
		if strings.TrimSpace(c.Term) != "" && strings.TrimSpace(c.Definition) != "" {
			filled++
		}
	}
	if filled == 0 {
		return "", fmt.Errorf("at least one card with term and definition is required")
	}
	return s.repo.CreateSet(ctx, userID, req)
}

func (s *Flashcard) UpdateSet(ctx context.Context, userID, setID string, req model.UpdateSetRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return fmt.Errorf("title is required")
	}
	return s.repo.UpdateSet(ctx, userID, setID, req)
}

func (s *Flashcard) DeleteSet(ctx context.Context, userID, setID string) error {
	return s.repo.DeleteSet(ctx, userID, setID)
}

func (s *Flashcard) GetSetByID(ctx context.Context, setID string) (*model.SetDetail, error) {
	return s.repo.GetSetByID(ctx, setID)
}
