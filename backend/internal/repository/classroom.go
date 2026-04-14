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
		SELECT id, name, owner_id, join_code, COALESCE(created_at, NOW())
		FROM public.class_groups
		WHERE owner_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("get owned groups: %w", err)
	}
	defer rows.Close()

	groups := make([]model.OwnedGroup, 0)
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

	sets := make([]model.AvailableClassSet, 0)
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
				COALESCE(c.created_at, NOW()),
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

	challenges := make([]model.MyClassChallenge, 0)
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
		SELECT id, name, owner_id, join_code, COALESCE(created_at, NOW())
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
				COALESCE(m.joined_at, NOW()),
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

	members := make([]model.TeacherClassroomMember, 0)
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
				COALESCE(a.created_at, NOW())
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

	assignments := make([]model.TeacherClassroomAssignment, 0)
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

	quizAssignmentsQuery := `
		WITH assigned AS (
			SELECT a.id, a.quiz_id, a.deadline, a.created_at
			FROM public.class_quiz_assignments a
			WHERE a.group_id = $1
		),
		q_counts AS (
			SELECT quiz_id, COUNT(*)::int AS question_count
			FROM public.quiz_questions
			WHERE quiz_id IN (SELECT quiz_id FROM assigned)
			GROUP BY quiz_id
		),
		student_ids AS (
			SELECT user_id
			FROM public.class_group_members
			WHERE group_id = $1 AND role = 'student'
		),
		best AS (
			SELECT DISTINCT ON (qa.quiz_id, qa.user_id)
				qa.quiz_id,
				qa.user_id,
				qa.percentage
			FROM public.quiz_attempts qa
			WHERE qa.quiz_id IN (SELECT quiz_id FROM assigned)
			  AND qa.completed_at IS NOT NULL
			  AND qa.user_id IN (SELECT user_id FROM student_ids)
			ORDER BY qa.quiz_id, qa.user_id, qa.percentage DESC, qa.time_spent ASC
		),
		quiz_stats AS (
			SELECT
				quiz_id,
				COUNT(*)::int AS completed_count,
				COALESCE(ROUND(AVG(percentage)), 0)::int AS avg_percent
			FROM best
			GROUP BY quiz_id
		),
		total_students AS (
			SELECT COUNT(*)::int AS n FROM student_ids
		)
		SELECT
			a.id,
			a.quiz_id,
			COALESCE(q.title, 'Assigned quiz') AS quiz_title,
			COALESCE(qc.question_count, 0) AS question_count,
			a.deadline,
			a.created_at,
			COALESCE(qs.completed_count, 0) AS completed_count,
			(SELECT n FROM total_students) AS total_students,
			COALESCE(qs.avg_percent, 0) AS avg_percent
		FROM assigned a
		LEFT JOIN public.quizzes q ON q.id = a.quiz_id
		LEFT JOIN q_counts qc ON qc.quiz_id = a.quiz_id
		LEFT JOIN quiz_stats qs ON qs.quiz_id = a.quiz_id
		ORDER BY a.created_at DESC
	`

	quizRows, err := r.pool.Query(ctx, quizAssignmentsQuery, groupID)
	if err != nil {
		return nil, fmt.Errorf("get teacher classroom quiz assignments: %w", err)
	}
	defer quizRows.Close()

	quizAssignments := make([]model.TeacherClassroomQuizAssignment, 0)
	for quizRows.Next() {
		var item model.TeacherClassroomQuizAssignment
		var deadline *time.Time
		var createdAt time.Time

		if err := quizRows.Scan(
			&item.ID,
			&item.QuizID,
			&item.QuizTitle,
			&item.QuestionCount,
			&deadline,
			&createdAt,
			&item.CompletedCount,
			&item.TotalStudents,
			&item.AveragePercent,
		); err != nil {
			return nil, fmt.Errorf("scan teacher classroom quiz assignment: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}
		quizAssignments = append(quizAssignments, item)
	}
	if err := quizRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher classroom quiz assignments: %w", err)
	}

	challengesQuery := `
			SELECT
				c.id,
				c.title,
				c.set_id,
				COALESCE(s.title, 'Class set') AS set_title,
				c.deadline,
				COALESCE(c.created_at, NOW())
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

	challenges := make([]model.TeacherClassroomChallenge, 0)
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

	progress := make([]model.TeacherClassroomProgress, 0)
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
		Group:           group,
		Members:         members,
		Assignments:     assignments,
		QuizAssignments: quizAssignments,
		Challenges:      challenges,
		Progress:        progress,
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
				COALESCE(c.created_at, NOW()),
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
				COALESCE(completed_at, NOW())::text
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

	entries := make([]model.ChallengeRankingEntry, 0)
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

// GetClassQuizLeaderboard returns the per-class leaderboard for a quiz.
// Viewer must be a member of the class (student or owner).
func (r *Classroom) GetClassQuizLeaderboard(
	ctx context.Context,
	viewerID, groupID, quizID string,
) (*model.QuizLeaderboard, error) {
	var (
		groupName string
		ownerID   string
		quizTitle string
		deadline  *time.Time
	)
	err := r.pool.QueryRow(ctx, `
		SELECT g.name, g.owner_id, q.title, a.deadline
		FROM public.class_quiz_assignments a
		JOIN public.class_groups g ON g.id = a.group_id
		JOIN public.quizzes q ON q.id = a.quiz_id
		WHERE a.group_id = $1 AND a.quiz_id = $2
	`, groupID, quizID).Scan(&groupName, &ownerID, &quizTitle, &deadline)
	if err != nil {
		return nil, fmt.Errorf("quiz assignment not found: %w", err)
	}

	// Viewer must either own the class or be a student in it.
	var isMember bool
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM public.class_group_members
			WHERE group_id = $1 AND user_id = $2
		) OR $2 = $3
	`, groupID, viewerID, ownerID).Scan(&isMember); err != nil {
		return nil, fmt.Errorf("membership check: %w", err)
	}
	if !isMember {
		return nil, fmt.Errorf("access denied")
	}

	rows, err := r.pool.Query(ctx, `
		WITH members AS (
			SELECT m.user_id, COALESCE(u.username, 'Student') AS username, u.avatar_url
			FROM public.class_group_members m
			LEFT JOIN public.users u ON u.id = m.user_id
			WHERE m.group_id = $1 AND m.role = 'student'
		),
		best AS (
			SELECT DISTINCT ON (user_id)
				user_id,
				percentage,
				score,
				total_questions,
				time_spent,
				completed_at
			FROM public.quiz_attempts
			WHERE quiz_id = $2
			  AND completed_at IS NOT NULL
			  AND user_id IN (SELECT user_id FROM members)
			ORDER BY user_id, percentage DESC, time_spent ASC
		),
		counts AS (
			SELECT user_id, COUNT(*)::int AS attempts_count
			FROM public.quiz_attempts
			WHERE quiz_id = $2
			  AND user_id IN (SELECT user_id FROM members)
			GROUP BY user_id
		)
		SELECT
			m.user_id,
			m.username,
			m.avatar_url,
			b.percentage,
			b.score,
			b.total_questions,
			b.time_spent,
			COALESCE(c.attempts_count, 0) AS attempts_count,
			b.completed_at
		FROM members m
		LEFT JOIN best b ON b.user_id = m.user_id
		LEFT JOIN counts c ON c.user_id = m.user_id
		ORDER BY
			(b.percentage IS NULL),
			b.percentage DESC NULLS LAST,
			b.time_spent ASC NULLS LAST,
			m.username ASC
	`, groupID, quizID)
	if err != nil {
		return nil, fmt.Errorf("load leaderboard: %w", err)
	}
	defer rows.Close()

	resultRows := make([]model.QuizLeaderboardRow, 0)
	total := 0
	for rows.Next() {
		var row model.QuizLeaderboardRow
		var completedAt *time.Time
		if err := rows.Scan(
			&row.UserID,
			&row.Username,
			&row.AvatarURL,
			&row.BestPercentage,
			&row.BestScore,
			&row.TotalQuestions,
			&row.BestTimeSpent,
			&row.AttemptsCount,
			&completedAt,
		); err != nil {
			return nil, fmt.Errorf("scan leaderboard row: %w", err)
		}
		if completedAt != nil {
			value := completedAt.UTC().Format(time.RFC3339)
			row.CompletedAt = &value
			if deadline != nil && completedAt.After(*deadline) {
				row.Late = true
			}
		}
		resultRows = append(resultRows, row)
		total++
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate leaderboard: %w", err)
	}

	resp := &model.QuizLeaderboard{
		QuizID:        quizID,
		QuizTitle:     quizTitle,
		GroupID:       groupID,
		GroupName:     groupName,
		TotalStudents: total,
		Rows:          resultRows,
	}
	if deadline != nil {
		value := deadline.UTC().Format(time.RFC3339)
		resp.Deadline = &value
	}
	return resp, nil
}

// GetClassQuizTeacherStats returns per-question aggregates for a class quiz.
// Teacher must own the class.
func (r *Classroom) GetClassQuizTeacherStats(
	ctx context.Context,
	teacherID, groupID, quizID string,
) (*model.QuizTeacherStats, error) {
	var (
		groupName string
		ownerID   string
		quizTitle string
		deadline  *time.Time
	)
	err := r.pool.QueryRow(ctx, `
		SELECT g.name, g.owner_id, q.title, a.deadline
		FROM public.class_quiz_assignments a
		JOIN public.class_groups g ON g.id = a.group_id
		JOIN public.quizzes q ON q.id = a.quiz_id
		WHERE a.group_id = $1 AND a.quiz_id = $2
	`, groupID, quizID).Scan(&groupName, &ownerID, &quizTitle, &deadline)
	if err != nil {
		return nil, fmt.Errorf("quiz assignment not found: %w", err)
	}
	if ownerID != teacherID {
		return nil, fmt.Errorf("access denied")
	}

	var totalStudents, completedCount, avgPercent int
	if err := r.pool.QueryRow(ctx, `
		WITH members AS (
			SELECT user_id FROM public.class_group_members
			WHERE group_id = $1 AND role = 'student'
		),
		best AS (
			SELECT DISTINCT ON (user_id) user_id, percentage
			FROM public.quiz_attempts
			WHERE quiz_id = $2
			  AND completed_at IS NOT NULL
			  AND user_id IN (SELECT user_id FROM members)
			ORDER BY user_id, percentage DESC, time_spent ASC
		)
		SELECT
			(SELECT COUNT(*)::int FROM members),
			(SELECT COUNT(*)::int FROM best),
			COALESCE((SELECT ROUND(AVG(percentage))::int FROM best), 0)
	`, groupID, quizID).Scan(&totalStudents, &completedCount, &avgPercent); err != nil {
		return nil, fmt.Errorf("load quiz summary: %w", err)
	}

	qRows, err := r.pool.Query(ctx, `
		WITH members AS (
			SELECT user_id FROM public.class_group_members
			WHERE group_id = $1 AND role = 'student'
		),
		best_attempt AS (
			SELECT DISTINCT ON (user_id) id
			FROM public.quiz_attempts
			WHERE quiz_id = $2
			  AND completed_at IS NOT NULL
			  AND user_id IN (SELECT user_id FROM members)
			ORDER BY user_id, percentage DESC, time_spent ASC
		),
		question_stats AS (
			SELECT
				aa.question_id,
				COUNT(*)::int AS attempts,
				COUNT(*) FILTER (WHERE aa.is_correct)::int AS correct,
				COUNT(*) FILTER (WHERE NOT aa.is_correct AND aa.selected_option IS NOT NULL)::int AS incorrect,
				COUNT(*) FILTER (WHERE aa.selected_option IS NULL)::int AS skipped
			FROM public.quiz_attempt_answers aa
			WHERE aa.attempt_id IN (SELECT id FROM best_attempt)
			GROUP BY aa.question_id
		)
		SELECT
			q.id,
			q.question_text,
			q.order_index,
			q.correct_option,
			COALESCE(qs.attempts, 0) AS attempts,
			COALESCE(qs.correct, 0) AS correct,
			COALESCE(qs.incorrect, 0) AS incorrect,
			COALESCE(qs.skipped, 0) AS skipped,
			CASE
				WHEN COALESCE(qs.attempts, 0) = 0 THEN 0
				ELSE ROUND(
					100.0 * (COALESCE(qs.incorrect, 0) + COALESCE(qs.skipped, 0))::numeric
					/ qs.attempts
				)::int
			END AS error_rate
		FROM public.quiz_questions q
		LEFT JOIN question_stats qs ON qs.question_id = q.id
		WHERE q.quiz_id = $2
		ORDER BY error_rate DESC, q.order_index ASC
	`, groupID, quizID)
	if err != nil {
		return nil, fmt.Errorf("load question stats: %w", err)
	}
	defer qRows.Close()

	questions := make([]model.QuizQuestionStats, 0)
	for qRows.Next() {
		var q model.QuizQuestionStats
		if err := qRows.Scan(
			&q.QuestionID,
			&q.QuestionText,
			&q.OrderIndex,
			&q.CorrectOption,
			&q.Attempts,
			&q.Correct,
			&q.Incorrect,
			&q.Skipped,
			&q.ErrorRate,
		); err != nil {
			return nil, fmt.Errorf("scan question stats: %w", err)
		}
		questions = append(questions, q)
	}
	if err := qRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate question stats: %w", err)
	}

	resp := &model.QuizTeacherStats{
		QuizID:         quizID,
		QuizTitle:      quizTitle,
		GroupID:        groupID,
		GroupName:      groupName,
		TotalStudents:  totalStudents,
		CompletedCount: completedCount,
		AveragePercent: avgPercent,
		Questions:      questions,
	}
	if deadline != nil {
		value := deadline.UTC().Format(time.RFC3339)
		resp.Deadline = &value
	}
	return resp, nil
}

// GetRecentTeacherQuizActivity returns the latest N completed attempts on
// quizzes owned by the teacher, for the teacher-dashboard widget.
func (r *Classroom) GetRecentTeacherQuizActivity(
	ctx context.Context,
	teacherID string,
	limit int,
) ([]model.RecentQuizActivity, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := r.pool.Query(ctx, `
		SELECT
			qa.id,
			qa.quiz_id,
			COALESCE(q.title, 'Quiz') AS quiz_title,
			qa.user_id,
			COALESCE(u.username, 'Student') AS student_name,
			qa.percentage,
			qa.completed_at
		FROM public.quiz_attempts qa
		JOIN public.quizzes q ON q.id = qa.quiz_id
		LEFT JOIN public.users u ON u.id = qa.user_id
		WHERE q.user_id = $1
		  AND qa.completed_at IS NOT NULL
		  AND qa.user_id <> $1
		ORDER BY qa.completed_at DESC
		LIMIT $2
	`, teacherID, limit)
	if err != nil {
		return nil, fmt.Errorf("load recent quiz activity: %w", err)
	}
	defer rows.Close()

	items := make([]model.RecentQuizActivity, 0)
	for rows.Next() {
		var item model.RecentQuizActivity
		var completedAt time.Time
		if err := rows.Scan(
			&item.AttemptID,
			&item.QuizID,
			&item.QuizTitle,
			&item.StudentID,
			&item.StudentName,
			&item.Percentage,
			&completedAt,
		); err != nil {
			return nil, fmt.Errorf("scan recent quiz activity: %w", err)
		}
		item.CompletedAt = completedAt.UTC().Format(time.RFC3339)
		items = append(items, item)
	}
	return items, rows.Err()
}

// GetStudentQuizAssignments returns quiz assignments visible to a student.
// Status per row: not_started | completed | overdue | late.
func (r *Classroom) GetStudentQuizAssignments(
	ctx context.Context,
	userID string,
) ([]model.StudentQuizAssignment, error) {
	rows, err := r.pool.Query(ctx, `
		WITH my_groups AS (
			SELECT group_id FROM public.class_group_members
			WHERE user_id = $1
		),
		assigned AS (
			SELECT
				a.id,
				a.group_id,
				a.quiz_id,
				a.deadline,
				a.created_at,
				g.name AS group_name
			FROM public.class_quiz_assignments a
			JOIN public.class_groups g ON g.id = a.group_id
			WHERE a.group_id IN (SELECT group_id FROM my_groups)
		),
		q_counts AS (
			SELECT quiz_id, COUNT(*)::int AS question_count
			FROM public.quiz_questions
			WHERE quiz_id IN (SELECT quiz_id FROM assigned)
			GROUP BY quiz_id
		),
		best AS (
			SELECT DISTINCT ON (quiz_id)
				quiz_id,
				percentage,
				completed_at
			FROM public.quiz_attempts
			WHERE user_id = $1
			  AND quiz_id IN (SELECT quiz_id FROM assigned)
			  AND completed_at IS NOT NULL
			ORDER BY quiz_id, percentage DESC, time_spent ASC
		),
		my_counts AS (
			SELECT quiz_id, COUNT(*)::int AS attempts_count, MAX(completed_at) AS last_attempt_at
			FROM public.quiz_attempts
			WHERE user_id = $1
			  AND quiz_id IN (SELECT quiz_id FROM assigned)
			  AND completed_at IS NOT NULL
			GROUP BY quiz_id
		)
		SELECT
			a.id,
			a.group_id,
			a.group_name,
			a.quiz_id,
			COALESCE(q.title, 'Assigned quiz') AS quiz_title,
			COALESCE(qc.question_count, 0) AS question_count,
			a.deadline,
			a.created_at,
			b.percentage,
			COALESCE(mc.attempts_count, 0) AS attempts_count,
			mc.last_attempt_at,
			b.completed_at AS best_completed_at
		FROM assigned a
		LEFT JOIN public.quizzes q ON q.id = a.quiz_id
		LEFT JOIN q_counts qc ON qc.quiz_id = a.quiz_id
		LEFT JOIN best b ON b.quiz_id = a.quiz_id
		LEFT JOIN my_counts mc ON mc.quiz_id = a.quiz_id
		ORDER BY a.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load student quiz assignments: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	items := make([]model.StudentQuizAssignment, 0)
	for rows.Next() {
		var item model.StudentQuizAssignment
		var deadline *time.Time
		var createdAt time.Time
		var lastAttempt *time.Time
		var bestCompletedAt *time.Time

		if err := rows.Scan(
			&item.ID,
			&item.GroupID,
			&item.GroupName,
			&item.QuizID,
			&item.QuizTitle,
			&item.QuestionCount,
			&deadline,
			&createdAt,
			&item.BestPercentage,
			&item.AttemptsCount,
			&lastAttempt,
			&bestCompletedAt,
		); err != nil {
			return nil, fmt.Errorf("scan student quiz assignment: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}
		if lastAttempt != nil {
			value := lastAttempt.UTC().Format(time.RFC3339)
			item.LastAttemptAt = &value
		}

		switch {
		case item.BestPercentage == nil:
			if deadline != nil && now.After(*deadline) {
				item.Status = "overdue"
			} else {
				item.Status = "not_started"
			}
		case deadline != nil && bestCompletedAt != nil && bestCompletedAt.After(*deadline):
			item.Status = "late"
		default:
			item.Status = "completed"
		}

		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate student quiz assignments: %w", err)
	}

	return items, nil
}
