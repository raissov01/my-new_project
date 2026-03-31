package repository

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"

	"github.com/midoriya/flashlearn-backend/internal/model"
)

// CreateGroup creates a class group with a unique join code.
func (r *Classroom) CreateGroup(ctx context.Context, ownerID string, req model.CreateGroupRequest) (*model.CreateGroupResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Generate unique join code (8 uppercase alphanumeric)
	joinCode, err := generateJoinCode(ctx, r)
	if err != nil {
		return nil, fmt.Errorf("generate code: %w", err)
	}

	var groupID string
	err = tx.QueryRow(ctx,
		`INSERT INTO class_groups (owner_id, name, join_code) VALUES ($1, $2, $3) RETURNING id`,
		ownerID, req.Name, joinCode,
	).Scan(&groupID)
	if err != nil {
		return nil, fmt.Errorf("insert group: %w", err)
	}

	// Insert owner as a member
	_, err = tx.Exec(ctx,
		`INSERT INTO class_group_members (group_id, user_id, role) VALUES ($1, $2, 'owner')`,
		groupID, ownerID,
	)
	if err != nil {
		return nil, fmt.Errorf("insert owner member: %w", err)
	}

	// Resolve and insert invited members
	if strings.TrimSpace(req.Members) != "" {
		usernames := parseUsernames(req.Members)
		if len(usernames) > 0 {
			rows, err := r.pool.Query(ctx,
				`SELECT id FROM profiles WHERE username = ANY($1) AND id != $2`,
				usernames, ownerID,
			)
			if err == nil {
				defer rows.Close()
				for rows.Next() {
					var memberID string
					if err := rows.Scan(&memberID); err == nil {
						tx.Exec(ctx,
							`INSERT INTO class_group_members (group_id, user_id, role) VALUES ($1, $2, 'student')
							 ON CONFLICT (group_id, user_id) DO NOTHING`,
							groupID, memberID,
						)
					}
				}
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}

	return &model.CreateGroupResponse{GroupID: groupID, JoinCode: joinCode}, nil
}

// JoinByCode adds a student to a class via join code.
func (r *Classroom) JoinByCode(ctx context.Context, userID string, code string) (string, error) {
	var groupID string
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM class_groups WHERE join_code = $1`, strings.ToUpper(strings.TrimSpace(code)),
	).Scan(&groupID)
	if err != nil {
		return "", fmt.Errorf("class not found")
	}

	_, err = r.pool.Exec(ctx,
		`INSERT INTO class_group_members (group_id, user_id, role) VALUES ($1, $2, 'student')
		 ON CONFLICT (group_id, user_id) DO NOTHING`,
		groupID, userID,
	)
	if err != nil {
		return "", fmt.Errorf("join failed: %w", err)
	}
	return groupID, nil
}

// AssignSet assigns a flashcard set to a class group.
func (r *Classroom) AssignSet(ctx context.Context, ownerID string, req model.AssignSetRequest) error {
	// Verify ownership of group
	var gOwner string
	err := r.pool.QueryRow(ctx, `SELECT owner_id FROM class_groups WHERE id = $1`, req.GroupID).Scan(&gOwner)
	if err != nil || gOwner != ownerID {
		return fmt.Errorf("access denied")
	}

	// Verify ownership of set
	var sOwner string
	err = r.pool.QueryRow(ctx, `SELECT user_id FROM flashcard_sets WHERE id = $1`, req.SetID).Scan(&sOwner)
	if err != nil || sOwner != ownerID {
		return fmt.Errorf("set access denied")
	}

	_, err = r.pool.Exec(ctx,
		`INSERT INTO class_set_assignments (group_id, set_id, deadline) VALUES ($1, $2, $3)
		 ON CONFLICT DO NOTHING`,
		req.GroupID, req.SetID, req.Deadline,
	)
	return err
}

// CreateChallenge creates a class challenge.
func (r *Classroom) CreateChallenge(ctx context.Context, ownerID string, req model.CreateClassChallengeRequest) (string, error) {
	// Verify ownership
	var gOwner string
	err := r.pool.QueryRow(ctx, `SELECT owner_id FROM class_groups WHERE id = $1`, req.GroupID).Scan(&gOwner)
	if err != nil || gOwner != ownerID {
		return "", fmt.Errorf("access denied")
	}

	var challengeID string
	err = r.pool.QueryRow(ctx,
		`INSERT INTO class_challenges (group_id, set_id, title, deadline) VALUES ($1, $2, $3, $4) RETURNING id`,
		req.GroupID, req.SetID, req.Title, req.Deadline,
	).Scan(&challengeID)
	if err != nil {
		return "", fmt.Errorf("create challenge: %w", err)
	}
	return challengeID, nil
}

// JoinChallenge adds a student as a participant.
func (r *Classroom) JoinChallenge(ctx context.Context, userID, challengeID string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO class_challenge_participants (challenge_id, user_id) VALUES ($1, $2)
		 ON CONFLICT DO NOTHING`,
		challengeID, userID,
	)
	return err
}

// RemoveStudent removes a student from a class group.
func (r *Classroom) RemoveStudent(ctx context.Context, ownerID string, req model.RemoveStudentRequest) error {
	var gOwner string
	err := r.pool.QueryRow(ctx, `SELECT owner_id FROM class_groups WHERE id = $1`, req.GroupID).Scan(&gOwner)
	if err != nil || gOwner != ownerID {
		return fmt.Errorf("access denied")
	}
	if req.UserID == ownerID {
		return fmt.Errorf("cannot remove yourself")
	}

	_, err = r.pool.Exec(ctx,
		`DELETE FROM class_group_members WHERE group_id = $1 AND user_id = $2`,
		req.GroupID, req.UserID,
	)
	return err
}

// UpdateRole changes a user's role.
func (r *Classroom) UpdateRole(ctx context.Context, userID, role string) error {
	_, err := r.pool.Exec(ctx, `UPDATE profiles SET role = $2 WHERE id = $1`, userID, role)
	return err
}

// ── Helpers ────────────────────────────────────────────────────────────────

func generateJoinCode(ctx context.Context, r *Classroom) (string, error) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no O/0/I/1
	for attempt := 0; attempt < 5; attempt++ {
		code := make([]byte, 8)
		for i := range code {
			n, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
			if err != nil {
				return "", err
			}
			code[i] = chars[n.Int64()]
		}
		codeStr := string(code)

		var exists bool
		r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM class_groups WHERE join_code = $1)`, codeStr).Scan(&exists)
		if !exists {
			return codeStr, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique code")
}

func parseUsernames(raw string) []string {
	raw = strings.ReplaceAll(raw, ",", "\n")
	lines := strings.Split(raw, "\n")
	var result []string
	seen := make(map[string]bool)
	for _, line := range lines {
		u := strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "@"))
		if u != "" && !seen[u] {
			seen[u] = true
			result = append(result, u)
		}
	}
	return result
}
