package service

import (
	"context"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

type ChallengeService struct {
	repo *repository.Challenge
}

func NewChallenge(repo *repository.Challenge) *ChallengeService {
	return &ChallengeService{repo: repo}
}

func (s *ChallengeService) SaveAttempt(ctx context.Context, userID string, input model.ChallengeAttemptInput) error {
	return s.repo.SaveAttempt(ctx, userID, input)
}

func (s *ChallengeService) GetRanking(ctx context.Context, setID string) (*model.ChallengeRankingResponse, error) {
	return s.repo.GetRanking(ctx, setID)
}

func (s *ChallengeService) SaveClassChallengeAttempt(ctx context.Context, userID string, input model.ClassChallengeAttemptInput) error {
	return s.repo.SaveClassChallengeAttempt(ctx, userID, input)
}
