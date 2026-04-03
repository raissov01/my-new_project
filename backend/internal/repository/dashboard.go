package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/midoriya/flashlearn-backend/internal/model"
)

// Dashboard reads dashboard summary data from PostgreSQL.
type Dashboard struct {
	pool *pgxpool.Pool
}

func NewDashboard(pool *pgxpool.Pool) *Dashboard {
	return &Dashboard{pool: pool}
}

func (r *Dashboard) GetTeacherSummaryByUserID(
	ctx context.Context,
	userID string,
) (*model.TeacherDashboardSummary, error) {
	groupsQuery := `
		SELECT
			g.id,
			g.name,
			g.join_code,
			g.created_at,
			COALESCE(member_counts.members_count, 0) AS members_count,
			COALESCE(assignment_counts.assignments_count, 0) AS assignments_count,
			COALESCE(challenge_counts.challenges_count, 0) AS challenges_count
		FROM public.class_groups g
		LEFT JOIN (
			SELECT group_id, COUNT(*) FILTER (WHERE role = 'student')::int AS members_count
			FROM public.class_group_members
			GROUP BY group_id
		) AS member_counts ON member_counts.group_id = g.id
		LEFT JOIN (
			SELECT group_id, COUNT(*)::int AS assignments_count
			FROM public.class_set_assignments
			GROUP BY group_id
		) AS assignment_counts ON assignment_counts.group_id = g.id
		LEFT JOIN (
			SELECT group_id, COUNT(*)::int AS challenges_count
			FROM public.class_challenges
			GROUP BY group_id
		) AS challenge_counts ON challenge_counts.group_id = g.id
		WHERE g.owner_id = $1
		ORDER BY g.created_at DESC
	`

	groupRows, err := r.pool.Query(ctx, groupsQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("get teacher dashboard groups: %w", err)
	}
	defer groupRows.Close()

	groups := make([]model.TeacherDashboardGroup, 0)
	totalAssignments := 0
	totalChallenges := 0

	for groupRows.Next() {
		var item model.TeacherDashboardGroup
		var createdAt time.Time

		if err := groupRows.Scan(
			&item.ID,
			&item.Name,
			&item.JoinCode,
			&createdAt,
			&item.MembersCount,
			&item.AssignmentsCount,
			&item.ChallengesCount,
		); err != nil {
			return nil, fmt.Errorf("scan teacher dashboard group: %w", err)
		}

		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		totalAssignments += item.AssignmentsCount
		totalChallenges += item.ChallengesCount
		groups = append(groups, item)
	}

	if err := groupRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher dashboard groups: %w", err)
	}

	totalStudentsQuery := `
		SELECT COUNT(DISTINCT m.user_id)::int
		FROM public.class_group_members m
		JOIN public.class_groups g ON g.id = m.group_id
		WHERE g.owner_id = $1
			AND m.role = 'student'
	`

	var totalStudents int
	if err := r.pool.QueryRow(ctx, totalStudentsQuery, userID).Scan(&totalStudents); err != nil {
		return nil, fmt.Errorf("get teacher total students: %w", err)
	}

	topStudentsQuery := `
		WITH owner_challenges AS (
			SELECT id
			FROM public.class_challenges
			WHERE group_id IN (
				SELECT id
				FROM public.class_groups
				WHERE owner_id = $1
			)
		),
		best_attempts AS (
			SELECT
				a.user_id,
				a.accuracy::int AS accuracy,
				a.completion_time,
				a.total_incorrect,
				COUNT(*) OVER (PARTITION BY a.user_id)::int AS attempts,
				ROW_NUMBER() OVER (
					PARTITION BY a.user_id
					ORDER BY
						a.accuracy DESC,
						a.completion_time ASC,
						a.total_incorrect ASC,
						a.completed_at ASC
				) AS rank_in_user
			FROM public.class_challenge_attempts a
			JOIN owner_challenges oc ON oc.id = a.challenge_id
		)
		SELECT
			ba.user_id,
			COALESCE(p.username, 'Student') AS username,
			p.avatar_url,
			ba.accuracy,
			ba.completion_time,
			ba.total_incorrect,
			ba.attempts
		FROM best_attempts ba
		LEFT JOIN public.users p ON p.id = ba.user_id
		WHERE ba.rank_in_user = 1
		ORDER BY
			ba.accuracy DESC,
			ba.completion_time ASC,
			ba.total_incorrect ASC
		LIMIT 5
	`

	topStudentRows, err := r.pool.Query(ctx, topStudentsQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("get teacher top students: %w", err)
	}
	defer topStudentRows.Close()

	topStudents := make([]model.DashboardTopStudent, 0)
	for topStudentRows.Next() {
		var item model.DashboardTopStudent

		if err := topStudentRows.Scan(
			&item.UserID,
			&item.Username,
			&item.AvatarURL,
			&item.Accuracy,
			&item.CompletionTime,
			&item.Mistakes,
			&item.Attempts,
		); err != nil {
			return nil, fmt.Errorf("scan teacher top student: %w", err)
		}

		topStudents = append(topStudents, item)
	}

	if err := topStudentRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate teacher top students: %w", err)
	}

	return &model.TeacherDashboardSummary{
		Groups:           groups,
		TotalStudents:    totalStudents,
		TotalAssignments: totalAssignments,
		TotalChallenges:  totalChallenges,
		TopStudents:      topStudents,
	}, nil
}

func (r *Dashboard) GetStudentSummaryByUserID(
	ctx context.Context,
	userID string,
) (*model.StudentDashboardSummary, error) {
	classesQuery := `
		SELECT
			g.id,
			g.name,
			m.joined_at
		FROM public.class_group_members m
		JOIN public.class_groups g ON g.id = m.group_id
		WHERE m.user_id = $1
		ORDER BY m.joined_at DESC
	`

	classRows, err := r.pool.Query(ctx, classesQuery, userID)
	if err != nil {
		return nil, fmt.Errorf("get student dashboard classes: %w", err)
	}
	defer classRows.Close()

	classes := make([]model.StudentDashboardClass, 0)
	var groupIDs []string
	for classRows.Next() {
		var item model.StudentDashboardClass
		var joinedAt time.Time

		if err := classRows.Scan(&item.ID, &item.Name, &joinedAt); err != nil {
			return nil, fmt.Errorf("scan student dashboard class: %w", err)
		}

		item.JoinedAt = joinedAt.UTC().Format(time.RFC3339)
		groupIDs = append(groupIDs, item.ID)
		classes = append(classes, item)
	}

	if err := classRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate student dashboard classes: %w", err)
	}

	if len(groupIDs) == 0 {
		return &model.StudentDashboardSummary{
			Classes:     []model.StudentDashboardClass{},
			Assignments: []model.StudentDashboardAssignment{},
			Challenges:  []model.StudentDashboardChallenge{},
		}, nil
	}

	assignmentsQuery := `
		SELECT
			a.id,
			a.group_id,
			COALESCE(g.name, 'Class') AS group_name,
			a.set_id,
			COALESCE(s.title, 'Assigned set') AS set_title,
			a.deadline
		FROM public.class_set_assignments a
		LEFT JOIN public.class_groups g ON g.id = a.group_id
		LEFT JOIN public.flashcard_sets s ON s.id = a.set_id
		WHERE a.group_id = ANY($1)
		ORDER BY a.created_at DESC
	`

	assignmentRows, err := r.pool.Query(ctx, assignmentsQuery, groupIDs)
	if err != nil {
		return nil, fmt.Errorf("get student dashboard assignments: %w", err)
	}
	defer assignmentRows.Close()

	assignments := make([]model.StudentDashboardAssignment, 0)
	for assignmentRows.Next() {
		var item model.StudentDashboardAssignment
		var deadline *time.Time

		if err := assignmentRows.Scan(
			&item.ID,
			&item.GroupID,
			&item.GroupName,
			&item.SetID,
			&item.SetTitle,
			&deadline,
		); err != nil {
			return nil, fmt.Errorf("scan student dashboard assignment: %w", err)
		}

		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}

		assignments = append(assignments, item)
	}

	if err := assignmentRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate student dashboard assignments: %w", err)
	}

	challengesQuery := `
		SELECT
			c.id,
			c.title,
			c.group_id,
			COALESCE(g.name, 'Class') AS group_name,
			c.deadline,
			EXISTS (
				SELECT 1
				FROM public.class_challenge_participants p
				WHERE p.challenge_id = c.id
					AND p.user_id = $2
			) AS joined
		FROM public.class_challenges c
		LEFT JOIN public.class_groups g ON g.id = c.group_id
		WHERE c.group_id = ANY($1)
		ORDER BY c.created_at DESC
	`

	challengeRows, err := r.pool.Query(ctx, challengesQuery, groupIDs, userID)
	if err != nil {
		return nil, fmt.Errorf("get student dashboard challenges: %w", err)
	}
	defer challengeRows.Close()

	challenges := make([]model.StudentDashboardChallenge, 0)
	for challengeRows.Next() {
		var item model.StudentDashboardChallenge
		var deadline *time.Time

		if err := challengeRows.Scan(
			&item.ID,
			&item.Title,
			&item.GroupID,
			&item.GroupName,
			&deadline,
			&item.Joined,
		); err != nil {
			return nil, fmt.Errorf("scan student dashboard challenge: %w", err)
		}

		if deadline != nil {
			value := deadline.UTC().Format(time.RFC3339)
			item.Deadline = &value
		}

		challenges = append(challenges, item)
	}

	if err := challengeRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate student dashboard challenges: %w", err)
	}

	return &model.StudentDashboardSummary{
		Classes:     classes,
		Assignments: assignments,
		Challenges:  challenges,
	}, nil
}
