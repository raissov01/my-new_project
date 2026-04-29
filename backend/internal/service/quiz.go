package service

import (
	"context"
	"fmt"
	"sort"
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
	minReorderItems    = 2
	maxReorderItems    = 10
	maxBlankAnswerLen  = 300
	maxTagsPerQuiz     = 10
	maxTagLen          = 40
)

// Supported question types. MCQ is the default for empty/unknown values.
const (
	QTypeMCQ            = "mcq"
	QTypeMCQMulti       = "mcq_multi"
	QTypeTrueFalse      = "true_false"
	QTypeFillBlank      = "fill_blank"
	QTypeReorder        = "reorder"
	QTypeMatching       = "matching"
	QTypeHotspot        = "hotspot"
	QTypePoll           = "poll"
	QTypeDropdown       = "dropdown"
	QTypeCategorization = "categorization"
	QTypeLabeling       = "labeling"
	QTypeComprehension  = "comprehension"
	QTypeAudio          = "audio"
	QTypeVideo          = "video"
	QTypeDrawing        = "drawing"
)

func (s *Quiz) GetOverview(ctx context.Context, userID string, filters repository.QuizListFilters) ([]model.QuizOverview, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	return s.repo.GetOverview(ctx, userID, filters)
}

func (s *Quiz) GetByID(ctx context.Context, quizID, requesterUserID, inviteToken string) (*model.QuizDetail, error) {
	if strings.TrimSpace(quizID) == "" {
		return nil, fmt.Errorf("quiz id is required")
	}
	return s.repo.GetByID(ctx, quizID, requesterUserID, inviteToken)
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
	req.Tags = normalizeTags(req.Tags)
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
	req.Tags = normalizeTags(req.Tags)
	return s.repo.UpdateQuiz(ctx, userID, quizID, req)
}

// normalizeTags lowercases, trims, dedupes, and caps the tag list so the
// repository layer doesn't have to worry about client-provided inconsistency
// ("  Anatomy ", "anatomy", "ANATOMY" → "anatomy" once). Empty strings are
// dropped and anything longer than maxTagLen is clipped rather than rejected
// so a single overlong tag doesn't fail the whole save.
func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(tags))
	out := make([]string, 0, len(tags))
	for _, t := range tags {
		v := strings.ToLower(strings.TrimSpace(t))
		if v == "" {
			continue
		}
		if len(v) > maxTagLen {
			v = v[:maxTagLen]
		}
		if _, dup := seen[v]; dup {
			continue
		}
		seen[v] = struct{}{}
		out = append(out, v)
		if len(out) >= maxTagsPerQuiz {
			break
		}
	}
	return out
}

func (s *Quiz) DeleteQuiz(ctx context.Context, userID, quizID string) error {
	if strings.TrimSpace(userID) == "" {
		return fmt.Errorf("authentication required")
	}
	return s.repo.DeleteQuiz(ctx, userID, quizID)
}

func (s *Quiz) CloneQuiz(ctx context.Context, userID, sourceQuizID string) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("authentication required")
	}
	if strings.TrimSpace(sourceQuizID) == "" {
		return "", fmt.Errorf("quiz id is required")
	}
	return s.repo.CloneQuiz(ctx, userID, sourceQuizID)
}

func (s *Quiz) SubmitAttempt(ctx context.Context, userID, quizID, inviteToken string, req model.SubmitAttemptRequest) (*model.AttemptResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	if strings.TrimSpace(quizID) == "" {
		return nil, fmt.Errorf("quiz id is required")
	}
	return s.repo.SubmitAttempt(ctx, userID, quizID, inviteToken, req)
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
		qType := strings.ToLower(strings.TrimSpace(q.QuestionType))
		if qType == "" {
			qType = QTypeMCQ
		}
		a := strings.TrimSpace(q.OptionA)
		b := strings.TrimSpace(q.OptionB)
		c := strings.TrimSpace(q.OptionC)
		d := strings.TrimSpace(q.OptionD)
		e := strings.TrimSpace(q.OptionE)
		correct := strings.ToLower(strings.TrimSpace(q.CorrectOption))
		blank := strings.TrimSpace(q.BlankAnswer)
		imageURL := strings.TrimSpace(q.ImageURL)
		audioURL := strings.TrimSpace(q.AudioURL)
		videoURL := strings.TrimSpace(q.VideoURL)
		explanation := strings.TrimSpace(q.Explanation)

		// Skip fully empty rows (helps Excel import tolerate trailing blanks).
		isEmpty := qt == "" && a == "" && b == "" && c == "" && d == "" && e == "" &&
			blank == "" && len(q.ReorderItems) == 0
		if isEmpty {
			continue
		}
		if qt == "" {
			return nil, fmt.Errorf("question %d: text is required", i+1)
		}

		out := model.QuizQuestionInput{
			ID:           q.ID,
			QuestionText: qt,
			QuestionType: qType,
			ImageURL:     imageURL,
			AudioURL:     audioURL,
			VideoURL:     videoURL,
			Explanation:  explanation,
		}

		switch qType {
		case QTypeMCQ:
			if a == "" || b == "" || c == "" || d == "" {
				return nil, fmt.Errorf("question %d: all four options are required", i+1)
			}
			if correct == "e" && e == "" {
				return nil, fmt.Errorf("question %d: option E text is required when correct answer is e", i+1)
			}
			if correct != "a" && correct != "b" && correct != "c" && correct != "d" && correct != "e" {
				return nil, fmt.Errorf("question %d: correct option must be a, b, c, d, or e", i+1)
			}
			out.OptionA = a
			out.OptionB = b
			out.OptionC = c
			out.OptionD = d
			out.OptionE = e
			out.CorrectOption = correct

		case QTypeMCQMulti:
			if a == "" || b == "" || c == "" || d == "" {
				return nil, fmt.Errorf("question %d: all four options are required for mcq_multi", i+1)
			}
			// correct is comma-separated, e.g. "a,c" — validate and sort
			normalizedCorrect, err := normalizeMCQMultiCorrect(correct, e != "")
			if err != nil {
				return nil, fmt.Errorf("question %d: %w", i+1, err)
			}
			out.OptionA = a
			out.OptionB = b
			out.OptionC = c
			out.OptionD = d
			out.OptionE = e
			out.CorrectOption = normalizedCorrect

		case QTypeTrueFalse:
			if correct != "t" && correct != "f" {
				return nil, fmt.Errorf("question %d: correct option must be t or f for true/false", i+1)
			}
			out.CorrectOption = correct

		case QTypeFillBlank:
			if blank == "" {
				return nil, fmt.Errorf("question %d: blank answer is required for fill_blank", i+1)
			}
			if len(blank) > maxBlankAnswerLen {
				return nil, fmt.Errorf("question %d: blank answer is too long", i+1)
			}
			out.BlankAnswer = blank

		case QTypeReorder:
			items := make([]string, 0, len(q.ReorderItems))
			for _, it := range q.ReorderItems {
				t := strings.TrimSpace(it)
				if t != "" {
					items = append(items, t)
				}
			}
			if len(items) < minReorderItems || len(items) > maxReorderItems {
				return nil, fmt.Errorf("question %d: reorder needs %d-%d items", i+1, minReorderItems, maxReorderItems)
			}
			out.ReorderItems = items

		case QTypeMatching, QTypeCategorization:
			if len(q.MatchPairs) < 2 || len(q.MatchPairs) > 8 {
				return nil, fmt.Errorf("question %d: %s needs 2–8 pairs", i+1, qType)
			}
			pairs := make([]model.MatchPair, 0, len(q.MatchPairs))
			for j, p := range q.MatchPairs {
				l := strings.TrimSpace(p.Left)
				r := strings.TrimSpace(p.Right)
				if l == "" || r == "" {
					return nil, fmt.Errorf("question %d: pair %d: both sides are required", i+1, j+1)
				}
				pairs = append(pairs, model.MatchPair{Left: l, Right: r})
			}
			out.MatchPairs = pairs

		case QTypeHotspot:
			if len(q.HotspotZones) == 0 {
				return nil, fmt.Errorf("question %d: hotspot needs at least one zone", i+1)
			}
			if correct == "" {
				return nil, fmt.Errorf("question %d: hotspot needs a correct zone ID", i+1)
			}
			out.HotspotZones = q.HotspotZones
			out.CorrectOption = correct

		case QTypeLabeling:
			if len(q.HotspotZones) < 2 {
				return nil, fmt.Errorf("question %d: labeling needs at least 2 zones", i+1)
			}
			for j, z := range q.HotspotZones {
				if strings.TrimSpace(z.CorrectLabel) == "" {
					return nil, fmt.Errorf("question %d: zone %d needs a correct label", i+1, j+1)
				}
			}
			out.HotspotZones = q.HotspotZones

		case QTypePoll:
			if a == "" || b == "" {
				return nil, fmt.Errorf("question %d: poll needs at least two options (A and B)", i+1)
			}
			out.OptionA = a
			out.OptionB = b
			out.OptionC = c
			out.OptionD = d
			out.OptionE = e

		case QTypeDropdown:
			if a == "" || b == "" {
				return nil, fmt.Errorf("question %d: dropdown needs at least two options (A and B)", i+1)
			}
			validOpts := map[string]bool{}
			if a != "" {
				validOpts["a"] = true
			}
			if b != "" {
				validOpts["b"] = true
			}
			if c != "" {
				validOpts["c"] = true
			}
			if d != "" {
				validOpts["d"] = true
			}
			if !validOpts[correct] {
				return nil, fmt.Errorf("question %d: dropdown correct option must match one of the filled options", i+1)
			}
			out.OptionA = a
			out.OptionB = b
			out.OptionC = c
			out.OptionD = d
			out.OptionE = e
			out.CorrectOption = correct

		case QTypeComprehension:
			cd := q.ComprehensionData
			if cd == nil {
				return nil, fmt.Errorf("question %d: comprehension needs comprehensionData", i+1)
			}
			if strings.TrimSpace(cd.Passage) == "" {
				return nil, fmt.Errorf("question %d: comprehension passage cannot be empty", i+1)
			}
			if len(cd.SubQuestions) < 1 {
				return nil, fmt.Errorf("question %d: comprehension needs at least one sub-question", i+1)
			}
			for j, sq := range cd.SubQuestions {
				if strings.TrimSpace(sq.Prompt) == "" {
					return nil, fmt.Errorf("question %d sub-question %d: prompt cannot be empty", i+1, j+1)
				}
				if strings.TrimSpace(sq.Correct) == "" {
					return nil, fmt.Errorf("question %d sub-question %d: correct answer cannot be empty", i+1, j+1)
				}
				// Assign stable ID if missing
				if sq.ID == "" {
					cd.SubQuestions[j].ID = fmt.Sprintf("sq%d", j)
				}
			}
			out.ComprehensionData = cd

		case QTypeAudio:
			if a == "" || b == "" || c == "" || d == "" {
				return nil, fmt.Errorf("question %d: all four options are required for audio", i+1)
			}
			if correct == "e" && e == "" {
				return nil, fmt.Errorf("question %d: option E text is required when correct answer is e", i+1)
			}
			if correct != "a" && correct != "b" && correct != "c" && correct != "d" && correct != "e" {
				return nil, fmt.Errorf("question %d: correct option must be a, b, c, d, or e", i+1)
			}
			out.OptionA = a
			out.OptionB = b
			out.OptionC = c
			out.OptionD = d
			out.OptionE = e
			out.CorrectOption = correct

		case QTypeVideo:
			if a == "" || b == "" || c == "" || d == "" {
				return nil, fmt.Errorf("question %d: all four options are required for video", i+1)
			}
			if correct == "e" && e == "" {
				return nil, fmt.Errorf("question %d: option E text is required when correct answer is e", i+1)
			}
			if correct != "a" && correct != "b" && correct != "c" && correct != "d" && correct != "e" {
				return nil, fmt.Errorf("question %d: correct option must be a, b, c, d, or e", i+1)
			}
			out.OptionA = a
			out.OptionB = b
			out.OptionC = c
			out.OptionD = d
			out.OptionE = e
			out.CorrectOption = correct

		case QTypeDrawing:
			// Non-graded open-ended: no options or correct answer required.

		default:
			return nil, fmt.Errorf("question %d: unsupported question type %q", i+1, qType)
		}

		normalized = append(normalized, out)
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

// GetQuestionStats returns per-question accuracy for a quiz, only for the owner.
func (s *Quiz) GetQuestionStats(ctx context.Context, userID, quizID string) (*model.QuizStatsResponse, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	if strings.TrimSpace(quizID) == "" {
		return nil, fmt.Errorf("quiz id is required")
	}
	// Verify ownership — GetByID already returns isAuthor; check that.
	detail, err := s.repo.GetByID(ctx, quizID, userID, "")
	if err != nil {
		return nil, fmt.Errorf("quiz not found")
	}
	if !detail.IsAuthor {
		return nil, fmt.Errorf("access denied")
	}
	return s.repo.GetQuestionStats(ctx, quizID)
}

// GetRecentAttempts returns the user's last N completed attempts across all quizzes.
func (s *Quiz) GetRecentAttempts(ctx context.Context, userID string, limit int) ([]model.RecentAttemptItem, error) {
	if limit <= 0 || limit > 20 {
		limit = 5
	}
	return s.repo.GetRecentAttempts(ctx, userID, limit)
}

// GetRecommendedPractice returns quizzes where the user scored below 70%.
func (s *Quiz) GetRecommendedPractice(ctx context.Context, userID string, limit int) ([]model.RecommendedQuizItem, error) {
	if limit <= 0 || limit > 20 {
		limit = 5
	}
	return s.repo.GetRecommendedPractice(ctx, userID, 70, limit)
}

// normalizeMCQMultiCorrect validates and sorts a comma-separated correct-option
// string for mcq_multi questions (e.g. "c,a" → "a,c").
// hasE indicates whether option E was provided, making "e" a valid choice.
func normalizeMCQMultiCorrect(raw string, hasE bool) (string, error) {
	parts := strings.Split(raw, ",")
	seen := map[string]bool{}
	valid := []string{}
	for _, p := range parts {
		p = strings.TrimSpace(strings.ToLower(p))
		if p == "" {
			continue
		}
		if p == "e" && !hasE {
			return "", fmt.Errorf("correct option %q requires option E text to be set", p)
		}
		if p != "a" && p != "b" && p != "c" && p != "d" && p != "e" {
			return "", fmt.Errorf("correct options must be a, b, c, d, or e (got %q)", p)
		}
		if seen[p] {
			return "", fmt.Errorf("duplicate correct option: %q", p)
		}
		seen[p] = true
		valid = append(valid, p)
	}
	if len(valid) < 2 {
		return "", fmt.Errorf("mcq_multi requires at least 2 correct options")
	}
	sort.Strings(valid)
	return strings.Join(valid, ","), nil
}

// ── Invite Links ──────────────────────────────────────────────────────────────

func (s *Quiz) CreateInviteLink(ctx context.Context, quizID, userID string, maxUses *int) (string, error) {
	if strings.TrimSpace(userID) == "" {
		return "", fmt.Errorf("authentication required")
	}
	return s.repo.CreateInviteLink(ctx, quizID, userID, maxUses)
}

func (s *Quiz) UseInviteLink(ctx context.Context, token string) (quizID, quizTitle string, err error) {
	return s.repo.UseInviteLink(ctx, token)
}

func (s *Quiz) ListInviteLinks(ctx context.Context, quizID, userID string) ([]repository.InviteLinkRow, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required")
	}
	return s.repo.ListInviteLinks(ctx, quizID, userID)
}

func (s *Quiz) RevokeInviteLink(ctx context.Context, token, userID string) error {
	if strings.TrimSpace(userID) == "" {
		return fmt.Errorf("authentication required")
	}
	return s.repo.RevokeInviteLink(ctx, token, userID)
}
