package service

import (
	"context"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

// Leaderboard contains leaderboard business logic.
type Leaderboard struct {
	repo *repository.Leaderboard
}

func NewLeaderboard(repo *repository.Leaderboard) *Leaderboard {
	return &Leaderboard{repo: repo}
}

// Get returns the leaderboard for the given period, annotating the current
// user's row if userID is provided.
func (s *Leaderboard) Get(ctx context.Context, period string, limit int, userID string) (*model.LeaderboardResponse, error) {
	rows, err := s.repo.GetTopN(ctx, period, limit)
	if err != nil {
		return nil, err
	}

	resp := &model.LeaderboardResponse{
		Rows:            rows,
		CurrentUserRank: nil,
	}
	if len(resp.Rows) == 0 {
		resp.Rows = []model.LeaderboardRow{}
	}

	if userID == "" {
		return resp, nil
	}

	// Mark current user in the list
	found := false
	for i := range resp.Rows {
		if resp.Rows[i].UserID == userID {
			resp.Rows[i].IsCurrentUser = true
			rank := resp.Rows[i].Rank
			resp.CurrentUserRank = &rank
			found = true
			break
		}
	}

	// If the user didn't appear in top N, look up their rank separately
	if !found {
		rank, score, err := s.repo.GetUserRank(ctx, period, userID)
		if err != nil {
			// Non-fatal — just skip user rank annotation
			return resp, nil
		}
		if rank > 0 && score > 0 {
			resp.CurrentUserRank = &rank
		}
	}

	return resp, nil
}
