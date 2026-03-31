package service

import (
	"context"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

// Dashboard contains dashboard summary business logic.
type Dashboard struct {
	repo *repository.Dashboard
}

func NewDashboard(repo *repository.Dashboard) *Dashboard {
	return &Dashboard{repo: repo}
}

func (s *Dashboard) GetTeacherSummary(
	ctx context.Context,
	userID string,
) (*model.TeacherDashboardSummary, error) {
	return s.repo.GetTeacherSummaryByUserID(ctx, userID)
}

func (s *Dashboard) GetStudentSummary(
	ctx context.Context,
	userID string,
) (*model.StudentDashboardSummary, error) {
	return s.repo.GetStudentSummaryByUserID(ctx, userID)
}
