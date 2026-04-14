package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/model"
	"github.com/midoriya/flashlearn-backend/internal/repository"
)

type Quiz struct {
	repo *repository.Quiz
}

func NewQuiz(repo *repository.Quiz) *Quiz {
	return &Quiz{repo: repo}
}

const (
	minTimePerQuestion = 5
	maxTimePerQuestion = 300
	defaultTimePerQ    = 30
	minQuestions       = 1
	maxQuestions       = 500
	maxTitleLen        = 200
)

func (s *Quiz) GetOverview(ctx context.Context, userID string, filters repository.QuizListFilters) ([]model.QuizOverview, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	return s.repo.GetOverview(ctx, userID, filters)
}

func (s *Quiz) GetByID(ctx context.Context, quizID, requesterUserID string) (*model.QuizDetail, error) {
	if strings.TrimSpace(quizID) == "" {
		return nil, fmt.Errorf("quiz id is required")
	}
	return s.repo.GetByID(ctx, quizID, requesterUserID)
}

func (s *Quiz) CreateQuiz(ctx context.Context, userID string, req model.CreateQuizRequest) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("authentication required")
	}
	normalized, err := s.validateAndNormalize(req.Title, req.Description, req.Subject, req.TimePerQuestion, req.Questions)
	if err != nil {
		return "", err
	}
	req.Title = normalized.title
	req.Description = normalized.description
	req.Subject = normalized.subject
	req.TimePerQuestion = normalized.timePerQuestion
	req.Questions = normalized.questions
	return s.repo.CreateQuiz(ctx, userID, req)
}

func (s *Quiz) UpdateQuiz(ctx context.Context, userID, quizID string, req model.UpdateQuizRequest) error {
	if strings.TrimSpace(userID) == "" {
		return fmt.Errorf("authentication required")
	}
	if strings.TrimSpace(quizID) == "" {
		return fmt.Errorf("quiz id is required")
	}
	normalized, err := s.validateAndNormalize(req.Title, req.Description, req.Subject, req.TimePerQuestion, req.Questions)
	if err != nil {
		return err
	}
	req.Title = normalized.title
	req.Description = normalized.description
	req.Subject = normalized.subject
	req.TimePerQuestion = normalized.timePerQuestion
	req.Questions = normalized.questions
	return s.repo.UpdateQuiz(ctx, userID, quizID, req)
}

func (s *Quiz) DeleteQuiz(ctx context.Context, userID, quizID string) error {
	if strings.TrimSpace(userID) == "" {
		return fmt.Errorf("authentication required")
	}
	return s.repo.DeleteQuiz(ctx, userID, quizID)
}

func (s *Quiz) SubmitAttempt(ctx context.Context, userID, quizID string, req model.SubmitAttemptRequest) (*model.AttemptResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	if strings.TrimSpace(quizID) == "" {
		return nil, fmt.Errorf("quiz id is required")
	}
	return s.repo.SubmitAttempt(ctx, userID, quizID, req)
}

func (s *Quiz) ListAttempts(ctx context.Context, userID, quizID string) ([]model.AttemptSummary, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	return s.repo.ListAttemptsForUser(ctx, userID, quizID)
}

func (s *Quiz) GetAttempt(ctx context.Context, userID, attemptID string) (*model.AttemptResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	return s.repo.GetAttempt(ctx, userID, attemptID)
}

type normalizedQuiz struct {
	title           string
	description     string
	subject         string
	timePerQuestion int
	questions       []model.QuizQuestionInput
}

func (s *Quiz) validateAndNormalize(
	title, description, subject string,
	timePerQuestion int,
	questions []model.QuizQuestionInput,
) (*normalizedQuiz, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return nil, fmt.Errorf("title is required")
	}
	if len(title) > maxTitleLen {
		return nil, fmt.Errorf("title is too long")
	}

	if timePerQuestion <= 0 {
		timePerQuestion = defaultTimePerQ
	}
	if timePerQuestion < minTimePerQuestion || timePerQuestion > maxTimePerQuestion {
		return nil, fmt.Errorf("time per question must be between %d and %d seconds", minTimePerQuestion, maxTimePerQuestion)
	}

	normalized := make([]model.QuizQuestionInput, 0, len(questions))
	for i, q := range questions {
		qt := strings.TrimSpace(q.QuestionText)
		a := strings.TrimSpace(q.OptionA)
		b := strings.TrimSpace(q.OptionB)
		c := strings.TrimSpace(q.OptionC)
		d := strings.TrimSpace(q.OptionD)
		correct := strings.ToLower(strings.TrimSpace(q.CorrectOption))

		if qt == "" && a == "" && b == "" && c == "" && d == "" {
			continue
		}
		if qt == "" {
			return nil, fmt.Errorf("question %d: text is required", i+1)
		}
		if a == "" || b == "" || c == "" || d == "" {
			return nil, fmt.Errorf("question %d: all four options are required", i+1)
		}
		if correct != "a" && correct != "b" && correct != "c" && correct != "d" {
			return nil, fmt.Errorf("question %d: correct option must be a, b, c, or d", i+1)
		}

		normalized = append(normalized, model.QuizQuestionInput{
			ID:            q.ID,
			QuestionText:  qt,
			OptionA:       a,
			OptionB:       b,
			OptionC:       c,
			OptionD:       d,
			CorrectOption: correct,
		})
	}

	if len(normalized) < minQuestions {
		return nil, fmt.Errorf("at least %d question is required", minQuestions)
	}
	if len(normalized) > maxQuestions {
		return nil, fmt.Errorf("quiz may not exceed %d questions", maxQuestions)
	}

	return &normalizedQuiz{
		title:           title,
		description:     strings.TrimSpace(description),
		subject:         strings.TrimSpace(subject),
		timePerQuestion: timePerQuestion,
		questions:       normalized,
	}, nil
}
