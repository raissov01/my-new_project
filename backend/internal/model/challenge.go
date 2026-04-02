package model

// ChallengeAttemptInput is the input for submitting a challenge attempt.
type ChallengeAttemptInput struct {
	SetID          string `json:"setId"`
	CompletionTime int    `json:"completionTime"`
	Accuracy       int    `json:"accuracy"`
	TotalCorrect   int    `json:"totalCorrect"`
	TotalIncorrect int    `json:"totalIncorrect"`
}

// ChallengeRankingEntry is a single row in a challenge ranking.
type ChallengeRankingEntry struct {
	Rank           int     `json:"rank"`
	UserID         string  `json:"userId"`
	Username       string  `json:"username"`
	AvatarURL      *string `json:"avatarUrl"`
	Accuracy       int     `json:"accuracy"`
	CompletionTime int     `json:"completionTime"`
	TotalIncorrect int     `json:"totalIncorrect"`
	CompletedAt    string  `json:"completedAt"`
}

// ChallengeRankingResponse is the full ranking for a set.
type ChallengeRankingResponse struct {
	SetTitle string                  `json:"setTitle"`
	IsPublic bool                    `json:"isPublic"`
	Rows     []ChallengeRankingEntry `json:"rows"`
}

// ClassChallengeAttemptInput is input for a class challenge attempt.
type ClassChallengeAttemptInput struct {
	ChallengeID    string `json:"challengeId"`
	CompletionTime int    `json:"completionTime"`
	Accuracy       int    `json:"accuracy"`
	TotalCorrect   int    `json:"totalCorrect"`
	TotalIncorrect int    `json:"totalIncorrect"`
}

type ClassChallengeGroupSummary struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	OwnerID string `json:"ownerId"`
}

type ClassChallengeSetSummary struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Description *string `json:"description"`
	IsPublic    bool    `json:"isPublic"`
}

type ClassChallengeCard struct {
	ID         string `json:"id"`
	Term       string `json:"term"`
	Definition string `json:"definition"`
	Position   int    `json:"position"`
}

type ClassChallengeDetail struct {
	ID               string                    `json:"id"`
	Title            string                    `json:"title"`
	Deadline         *string                   `json:"deadline"`
	CreatedAt        string                    `json:"createdAt"`
	Group            ClassChallengeGroupSummary `json:"group"`
	Set              ClassChallengeSetSummary   `json:"set"`
	ParticipantCount int                       `json:"participantCount"`
	Joined           bool                      `json:"joined"`
	Cards            []ClassChallengeCard      `json:"cards"`
}

type ClassChallengeRankingResponse struct {
	Challenge       ClassChallengeDetail     `json:"challenge"`
	Rows            []ChallengeRankingEntry  `json:"rows"`
	CurrentUserRank *int                     `json:"currentUserRank"`
}
