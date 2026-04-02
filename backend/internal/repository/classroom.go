package repository

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

// Classroom reads teacher/student class challenge data from PostgreSQL.
type Classroom struct {
	pool *pgxpool.Pool
}

func NewClassroom(pool *pgxpool.Pool) *Classroom {
	return &Classroom{pool: pool}
}

func (r *Classroom) GetOwnedGroupsByUserID(
	ctx context.Context,
	userID string,
) ([]model.OwnedGroup, error) {
	query := `
		SELECT id, name, owner_id, join_code, created_at
		FROM public.class_groups
		WHERE owner_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get owned groups: %w", err)
	}
	defer rows.Close()

	var groups []model.OwnedGroup
	for rows.Next() {
		var item model.OwnedGroup
		var createdAt time.Time

		if err := rows.Scan(
			&item.ID,
			&item.Name,
			&item.OwnerID,
			&item.JoinCode,
			&createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan owned group: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		groups = append(groups, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate owned groups: %w", err)
	}

	return groups, nil
}

func (r *Classroom) GetAvailableSetsByUserID(
	ctx context.Context,
	userID string,
) ([]model.AvailableClassSet, error) {
	query := `
		SELECT id, title, description, is_public, user_id, created_at
		FROM public.flashcard_sets
		WHERE user_id = $1
		ORDER BY updated_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get available class sets: %w", err)
	}
	defer rows.Close()

	var sets []model.AvailableClassSet
	for rows.Next() {
		var item model.AvailableClassSet
		var createdAt time.Time

		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&item.Description,
			&item.IsPublic,
			&item.UserID,
			&createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan available class set: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		sets = append(sets, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate available class sets: %w", err)
	}

	return sets, nil
}

func (r *Classroom) GetMyChallengesByUserID(
	ctx context.Context,
	userID string,
) ([]model.MyClassChallenge, error) {
	query := `
		SELECT
			c.id,
			c.title,
			c.deadline,
			c.created_at,
			COALESCE(g.name, 'Class') AS group_name,
			COALESCE(s.title, 'Set') AS set_title,
			(g.owner_id = $1) AS is_owner,
			EXISTS (
				SELECT 1
				FROM public.class_challenge_participants p
				WHERE p.challenge_id = c.id
					AND p.user_id = $1
			) AS joined,
			COALESCE(pc.participant_count, 0) AS participant_count
		FROM public.class_challenges c
		JOIN public.class_groups g ON g.id = c.group_id
		LEFT JOIN public.flashcard_sets s ON s.id = c.set_id
		LEFT JOIN (
			SELECT challenge_id, COUNT(*)::int AS participant_count
			FROM public.class_challenge_participants
			GROUP BY challenge_id
		) pc ON pc.challenge_id = c.id
		WHERE
			g.owner_id = $1
			OR EXISTS (
				SELECT 1
				FROM public.class_group_members m
				WHERE m.group_id = c.group_id
					AND m.user_id = $1
			)
		ORDER BY c.created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get my class challenges: %w", err)
	}
	defer rows.Close()

	var challenges []model.MyClassChallenge
	for rows.Next() {
		var item model.MyClassChallenge
		var deadline *time.Time
		var createdAt time.Time

		if err := rows.Scan(
			&item.ID,
			&item.Title,
			&deadline,
			&createdAt,
			&item.GroupName,
			&item.SetTitle,
			&item.IsOwner,
			&item.Joined,
			&item.ParticipantCount,
		); err != nil {
			return nil, fmt.Errorf("scan my class challenge: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}

		challenges = append(challenges, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate my class challenges: %w", err)
	}

	return challenges, nil
}

func (r *Classroom) GetTeacherClassroomDetail(
	ctx context.Context,
	userID string,
	groupID string,
) (*model.TeacherClassroomDetail, error) {
	groupQuery := `
		SELECT id, name, owner_id, join_code, created_at
		FROM public.class_groups
		WHERE id = $1
			AND owner_id = $2
	`

	var group model.TeacherClassroomGroup
	var groupCreatedAt time.Time
	err := r.pool.QueryRow(ctx, groupQuery, groupID, userID).Scan(
		&group.ID,
		&group.Name,
		&group.OwnerID,
		&group.JoinCode,
		&groupCreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, err
		}

		return nil, fmt.Errorf("get teacher classroom group: %w", err)
	}
	group.CreatedAt = groupCreatedAt.UTC().Format(time.RFC3339)

	membersQuery := `
		SELECT
			m.user_id,
			m.role,
			m.joined_at,
			COALESCE(p.username, 'User') AS username,
			p.avatar_url,
			COALESCE(p.role, 'student') AS profile_role
		FROM public.class_group_members m
		LEFT JOIN public.users p ON p.id = m.user_id
		WHERE m.group_id = $1
		ORDER BY m.joined_at ASC
	`

	memberRows, err := r.pool.Query(ctx, membersQuery, groupID)
	if err != nil {
		return nil, fmt.Errorf("get teacher classroom members: %w", err)
	}
	defer memberRows.Close()

	var members []model.TeacherClassroomMember
	for memberRows.Next() {
		var item model.TeacherClassroomMember
		var joinedAt time.Time

		if err := memberRows.Scan(
			&item.UserID,
			&item.Role,
			&joinedAt,
			&item.Username,
			&item.AvatarURL,
			&item.ProfileRole,
		); err != nil {
			return nil, fmt.Errorf("scan teacher classroom member: %w", err)
		}

		item.JoinedAt = joinedAt.UTC().Format(time.RFC3339)
		members = append(members, item)
	}

	if err := memberRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher classroom members: %w", err)
	}

	assignmentsQuery := `
		SELECT
			a.id,
			a.set_id,
			COALESCE(s.title, 'Assigned set') AS set_title,
			a.deadline,
			a.created_at
		FROM public.class_set_assignments a
		LEFT JOIN public.flashcard_sets s ON s.id = a.set_id
		WHERE a.group_id = $1
		ORDER BY a.created_at DESC
	`

	assignmentRows, err := r.pool.Query(ctx, assignmentsQuery, groupID)
	if err != nil {
		return nil, fmt.Errorf("get teacher classroom assignments: %w", err)
	}
	defer assignmentRows.Close()

	var assignments []model.TeacherClassroomAssignment
	for assignmentRows.Next() {
		var item model.TeacherClassroomAssignment
		var deadline *time.Time
		var createdAt time.Time

		if err := assignmentRows.Scan(
			&item.ID,
			&item.SetID,
			&item.SetTitle,
			&deadline,
			&createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan teacher classroom assignment: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}

		assignments = append(assignments, item)
	}

	if err := assignmentRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher classroom assignments: %w", err)
	}

	challengesQuery := `
		SELECT
			c.id,
			c.title,
			c.set_id,
			COALESCE(s.title, 'Class set') AS set_title,
			c.deadline,
			c.created_at
		FROM public.class_challenges c
		LEFT JOIN public.flashcard_sets s ON s.id = c.set_id
		WHERE c.group_id = $1
		ORDER BY c.created_at DESC
	`

	challengeRows, err := r.pool.Query(ctx, challengesQuery, groupID)
	if err != nil {
		return nil, fmt.Errorf("get teacher classroom challenges: %w", err)
	}
	defer challengeRows.Close()

	var challenges []model.TeacherClassroomChallenge
	for challengeRows.Next() {
		var item model.TeacherClassroomChallenge
		var deadline *time.Time
		var createdAt time.Time

		if err := challengeRows.Scan(
			&item.ID,
			&item.Title,
			&item.SetID,
			&item.SetTitle,
			&deadline,
			&createdAt,
		); err != nil {
			return nil, fmt.Errorf("scan teacher classroom challenge: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}

		challenges = append(challenges, item)
	}

	if err := challengeRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher classroom challenges: %w", err)
	}

	progressQuery := `
		WITH relevant_sets AS (
			SELECT set_id
			FROM public.class_set_assignments
			WHERE group_id = $1
			UNION
			SELECT set_id
			FROM public.class_challenges
			WHERE group_id = $1
		),
		relevant_progress AS (
			SELECT
				sp.user_id,
				sp.flashcard_id,
				f.set_id,
				sp.times_correct,
				sp.times_incorrect
			FROM public.study_progress sp
			JOIN public.flashcards f ON f.id = sp.flashcard_id
			WHERE f.set_id IN (SELECT set_id FROM relevant_sets)
		)
		SELECT
			m.user_id,
			COALESCE(p.username, 'Student') AS username,
			p.avatar_url,
			COUNT(DISTINCT rp.flashcard_id)::int AS studied_cards,
			COUNT(DISTINCT rp.set_id)::int AS assigned_sets_started,
			COALESCE(SUM(rp.times_correct), 0)::int AS total_correct,
			COALESCE(SUM(rp.times_incorrect), 0)::int AS total_incorrect
		FROM public.class_group_members m
		LEFT JOIN public.users p ON p.id = m.user_id
		LEFT JOIN relevant_progress rp ON rp.user_id = m.user_id
		WHERE m.group_id = $1
			AND m.role = 'student'
		GROUP BY m.user_id, p.username, p.avatar_url
	`

	progressRows, err := r.pool.Query(ctx, progressQuery, groupID)
	if err != nil {
		return nil, fmt.Errorf("get teacher classroom progress: %w", err)
	}
	defer progressRows.Close()

	var progress []model.TeacherClassroomProgress
	for progressRows.Next() {
		var item model.TeacherClassroomProgress
		var totalCorrect int
		var totalIncorrect int

		if err := progressRows.Scan(
			&item.UserID,
			&item.Username,
			&item.AvatarURL,
			&item.StudiedCards,
			&item.AssignedSetsStarted,
			&totalCorrect,
			&totalIncorrect,
		); err != nil {
			return nil, fmt.Errorf("scan teacher classroom progress: %w", err)
		}

		totalAnswers := totalCorrect + totalIncorrect
		if totalAnswers > 0 {
			item.Accuracy = int(float64(totalCorrect) / float64(totalAnswers) * 100)
		}
		item.Mistakes = totalIncorrect
		progress = append(progress, item)
	}

	if err := progressRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher classroom progress: %w", err)
	}

	sort.Slice(progress, func(i, j int) bool {
		if progress[i].Accuracy != progress[j].Accuracy {
			return progress[i].Accuracy > progress[j].Accuracy
		}

		return progress[i].StudiedCards > progress[j].StudiedCards
	})

	return &model.TeacherClassroomDetail{
		Group:       group,
		Members:     members,
		Assignments: assignments,
		Challenges:  challenges,
		Progress:    progress,
	}, nil
}

func (r *Classroom) GetChallengeDetail(
	ctx context.Context,
	userID string,
	challengeID string,
) (*model.ClassChallengeDetail, error) {
	query := `
		SELECT
			c.id,
			c.title,
			c.deadline,
			c.created_at,
			g.id,
			g.name,
			g.owner_id,
			s.id,
			s.title,
			s.description,
			s.is_public,
			COALESCE(pc.participant_count, 0)::int AS participant_count,
			EXISTS (
				SELECT 1
				FROM public.class_challenge_participants p
				WHERE p.challenge_id = c.id
					AND p.user_id = $2
			) AS joined
		FROM public.class_challenges c
		JOIN public.class_groups g ON g.id = c.group_id
		JOIN public.class_group_members m ON m.group_id = g.id AND m.user_id = $2
		LEFT JOIN public.flashcard_sets s ON s.id = c.set_id
		LEFT JOIN (
			SELECT challenge_id, COUNT(*)::int AS participant_count
			FROM public.class_challenge_participants
			GROUP BY challenge_id
		) pc ON pc.challenge_id = c.id
		WHERE c.id = $1
	`

	var detail model.ClassChallengeDetail
	var deadline *time.Time
	var createdAt time.Time
	if err := r.pool.QueryRow(ctx, query, challengeID, userID).Scan(
		&detail.ID,
		&detail.Title,
		&deadline,
		&createdAt,
		&detail.Group.ID,
		&detail.Group.Name,
		&detail.Group.OwnerID,
		&detail.Set.ID,
		&detail.Set.Title,
		&detail.Set.Description,
		&detail.Set.IsPublic,
		&detail.ParticipantCount,
		&detail.Joined,
	); err != nil {
		return nil, fmt.Errorf("get class challenge detail: %w", err)
	}

	detail.CreatedAt = createdAt.UTC().Format(time.RFC3339)
	if deadline != nil {
		value := deadline.UTC().Format(time.RFC3339)
		detail.Deadline = &value
	}

	cardRows, err := r.pool.Query(ctx,
		`SELECT id, term, definition, position
		 FROM public.flashcards
		 WHERE set_id = $1
		 ORDER BY position ASC`,
		detail.Set.ID,
	)
	if err != nil {
		return nil, fmt.Errorf("get class challenge cards: %w", err)
	}
	defer cardRows.Close()

	for cardRows.Next() {
		var card model.ClassChallengeCard
		if err := cardRows.Scan(&card.ID, &card.Term, &card.Definition, &card.Position); err != nil {
			return nil, fmt.Errorf("scan class challenge card: %w", err)
		}
		detail.Cards = append(detail.Cards, card)
	}

	if err := cardRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate class challenge cards: %w", err)
	}

	return &detail, nil
}

func (r *Classroom) GetChallengeRanking(
	ctx context.Context,
	userID string,
	challengeID string,
) (*model.ClassChallengeRankingResponse, error) {
	detail, err := r.GetChallengeDetail(ctx, userID, challengeID)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		WITH ranked_attempts AS (
			SELECT
				a.user_id,
				u.username,
				u.avatar_url,
				a.accuracy,
				a.completion_time,
				a.total_incorrect,
				a.completed_at,
				ROW_NUMBER() OVER (
					PARTITION BY a.user_id
					ORDER BY
						a.accuracy DESC,
						a.completion_time ASC,
						a.total_incorrect ASC,
						a.completed_at ASC
				) AS rn
			FROM public.class_challenge_attempts a
			JOIN public.users u ON u.id = a.user_id
			WHERE a.challenge_id = $1
		)
		SELECT
			user_id,
			username,
			avatar_url,
			accuracy,
			completion_time,
			total_incorrect,
			completed_at::text
		FROM ranked_attempts
		WHERE rn = 1
		ORDER BY
			accuracy DESC,
			completion_time ASC,
			total_incorrect ASC,
			completed_at ASC
	`, challengeID)
	if err != nil {
		return nil, fmt.Errorf("get class challenge ranking: %w", err)
	}
	defer rows.Close()

	var entries []model.ChallengeRankingEntry
	var currentUserRank *int
	rank := 0
	for rows.Next() {
		rank++
		var entry model.ChallengeRankingEntry
		if err := rows.Scan(
			&entry.UserID,
			&entry.Username,
			&entry.AvatarURL,
			&entry.Accuracy,
			&entry.CompletionTime,
			&entry.TotalIncorrect,
			&entry.CompletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan class challenge ranking: %w", err)
		}
		entry.Rank = rank
		if entry.UserID == userID {
			value := rank
			currentUserRank = &value
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate class challenge ranking: %w", err)
	}

	return &model.ClassChallengeRankingResponse{
		Challenge:       *detail,
		Rows:            entries,
		CurrentUserRank: currentUserRank,
	}, nil
}
