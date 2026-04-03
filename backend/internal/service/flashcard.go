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
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("authentication required")
	}

	if strings.TrimSpace(req.Title) == "" {
		return "", fmt.Errorf("title is required")
	}

	normalizedCards := make([]model.FlashcardInput, 0, len(req.Cards))
	for _, c := range req.Cards {
		term := strings.TrimSpace(c.Term)
		definition := strings.TrimSpace(c.Definition)

		if term == "" && definition == "" {
			continue
		}

		if term == "" || definition == "" {
			return "", fmt.Errorf("both term and definition are required for each saved card")
		}

		normalizedCards = append(normalizedCards, model.FlashcardInput{
			Term:       term,
			Definition: definition,
		})
	}

	if len(normalizedCards) == 0 {
		return "", fmt.Errorf("at least one card with term and definition is required")
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.Cards = normalizedCards

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

func (s *Flashcard) GetSetByID(ctx context.Context, setID, requesterUserID string) (*model.SetDetail, error) {
	return s.repo.GetSetByID(ctx, setID, requesterUserID)
}

func (s *Flashcard) CloneSet(ctx context.Context, userID, sourceSetID string) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("authentication required")
	}
	if strings.TrimSpace(sourceSetID) == "" {
		return "", fmt.Errorf("source set ID is required")
	}
	return s.repo.CloneSet(ctx, userID, sourceSetID)
}
