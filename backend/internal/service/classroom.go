package service

import (
	"context"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

// Classroom contains read-only classroom/challenge business logic used during migration.
type Classroom struct {
	repo *repository.Classroom
}

func NewClassroom(repo *repository.Classroom) *Classroom {
	return &Classroom{repo: repo}
}

func (s *Classroom) GetOwnedGroups(
	ctx context.Context,
	userID string,
) ([]model.OwnedGroup, error) {
	return s.repo.GetOwnedGroupsByUserID(ctx, userID)
}

func (s *Classroom) GetAvailableSets(
	ctx context.Context,
	userID string,
) ([]model.AvailableClassSet, error) {
	return s.repo.GetAvailableSetsByUserID(ctx, userID)
}

func (s *Classroom) GetMyChallenges(
	ctx context.Context,
	userID string,
) ([]model.MyClassChallenge, error) {
	return s.repo.GetMyChallengesByUserID(ctx, userID)
}

func (s *Classroom) GetTeacherClassroomDetail(
	ctx context.Context,
	userID string,
	groupID string,
) (*model.TeacherClassroomDetail, error) {
	return s.repo.GetTeacherClassroomDetail(ctx, userID, groupID)
}

func (s *Classroom) CreateGroup(
	ctx context.Context,
	userID string,
	req model.CreateGroupRequest,
) (*model.CreateGroupResponse, error) {
	return s.repo.CreateGroup(ctx, userID, req)
}
