package handler

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"gorm.io/gorm"
)

// QuestionReviewHandler handles admin review of AI-generated questions.
type QuestionReviewHandler struct {
	db      *gorm.DB
	seedDir string
}

func NewQuestionReview(db *gorm.DB) *QuestionReviewHandler {
	return &QuestionReviewHandler{db: db, seedDir: "seed/generated"}
}

type pendingQuestion struct {
	Level         string   `json:"level"`
	Category      string   `json:"category"`
	Format        string   `json:"format"`
	Prompt        string   `json:"prompt"`
	CorrectAnswer string   `json:"correctAnswer"`
	Distractors   []string `json:"distractors"`
	Explanation   string   `json:"explanation"`
	Reviewed      bool     `json:"reviewed"`
}

// GET /admin/review-questions — list unreviewed questions from seed files
func (h *QuestionReviewHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(h.seedDir)
	if err != nil {
		if os.IsNotExist(err) {
			jsonOK(w, map[string]any{"questions": []any{}, "files": []string{}})
			return
		}
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var all []pendingQuestion
	var files []string
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		data, err2 := os.ReadFile(filepath.Join(h.seedDir, e.Name()))
		if err2 != nil {
			continue
		}
		var qs []pendingQuestion
		if err3 := json.Unmarshal(data, &qs); err3 != nil {
			continue
		}
		for _, q := range qs {
			if !q.Reviewed {
				all = append(all, q)
			}
		}
		files = append(files, e.Name())
	}

	if all == nil {
		all = []pendingQuestion{}
	}
	jsonOK(w, map[string]any{"questions": all, "files": files})
}

// POST /admin/review-questions/approve — approve a batch and insert into DB
// Body: { questions: [{level, category, format, prompt, correctAnswer, distractors}] }
func (h *QuestionReviewHandler) ApproveBatch(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Questions []struct {
			Level         string   `json:"level"`
			Category      string   `json:"category"`
			Format        string   `json:"format"`
			Prompt        string   `json:"prompt"`
			CorrectAnswer string   `json:"correctAnswer"`
			Distractors   []string `json:"distractors"`
			Explanation   string   `json:"explanation"`
		} `json:"questions"`
	}
	if err := decodeJSON(r, &body); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}

	count := 0
	for _, q := range body.Questions {
		opts, _ := json.Marshal(q.Distractors)
		correct, _ := json.Marshal(q.CorrectAnswer)
		optsStr := string(opts)
		correctStr := string(correct)

		h.db.Exec(`
			INSERT INTO listening_questions (clip_id, question_type, prompt, options, correct_answer)
			SELECT
				lc.id,
				$1,
				$2,
				$3,
				$4
			FROM listening_clips lc
			WHERE lc.level = $5
			ORDER BY random()
			LIMIT 1
			ON CONFLICT DO NOTHING
		`, q.Format, q.Prompt, optsStr, correctStr, q.Level)
		count++
	}

	jsonOK(w, map[string]any{"approved": count})
}
