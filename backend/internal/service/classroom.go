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

func (s *Classroom) JoinByCode(
	ctx context.Context,
	userID string,
	code string,
) (string, error) {
	return s.repo.JoinByCode(ctx, userID, code)
}

func (s *Classroom) AssignSet(
	ctx context.Context,
	userID string,
	req model.AssignSetRequest,
) error {
	return s.repo.AssignSet(ctx, userID, req)
}

func (s *Classroom) CreateChallenge(
	ctx context.Context,
	userID string,
	req model.CreateClassChallengeRequest,
) (string, error) {
	return s.repo.CreateChallenge(ctx, userID, req)
}

func (s *Classroom) JoinChallenge(
	ctx context.Context,
	userID string,
	challengeID string,
) error {
	return s.repo.JoinChallenge(ctx, userID, challengeID)
}

func (s *Classroom) RemoveStudent(
	ctx context.Context,
	userID string,
	req model.RemoveStudentRequest,
) error {
	return s.repo.RemoveStudent(ctx, userID, req)
}

func (s *Classroom) GetChallengeDetail(
	ctx context.Context,
	userID string,
	challengeID string,
) (*model.ClassChallengeDetail, error) {
	return s.repo.GetChallengeDetail(ctx, userID, challengeID)
}

func (s *Classroom) GetChallengeRanking(
	ctx context.Context,
	userID string,
	challengeID string,
) (*model.ClassChallengeRankingResponse, error) {
	return s.repo.GetChallengeRanking(ctx, userID, challengeID)
}

func (s *Classroom) AssignQuiz(
	ctx context.Context,
	userID string,
	req model.AssignQuizRequest,
) error {
	return s.repo.AssignQuiz(ctx, userID, req)
}

func (s *Classroom) GetClassQuizLeaderboard(
	ctx context.Context,
	viewerID, groupID, quizID string,
) (*model.QuizLeaderboard, error) {
	return s.repo.GetClassQuizLeaderboard(ctx, viewerID, groupID, quizID)
}

func (s *Classroom) GetClassQuizTeacherStats(
	ctx context.Context,
	teacherID, groupID, quizID string,
) (*model.QuizTeacherStats, error) {
	return s.repo.GetClassQuizTeacherStats(ctx, teacherID, groupID, quizID)
}

func (s *Classroom) GetRecentTeacherQuizActivity(
	ctx context.Context,
	teacherID string,
	limit int,
) ([]model.RecentQuizActivity, error) {
	return s.repo.GetRecentTeacherQuizActivity(ctx, teacherID, limit)
}

func (s *Classroom) GetStudentQuizAssignments(
	ctx context.Context,
	userID string,
) ([]model.StudentQuizAssignment, error) {
	return s.repo.GetStudentQuizAssignments(ctx, userID)
}
