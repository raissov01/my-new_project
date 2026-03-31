package model

// LeaderboardRow represents one user's row in the leaderboard.
type LeaderboardRow struct {
	Rank               int    `json:"rank"`
	UserID             string `json:"userId"`
	Username           string `json:"username"`
	AvatarURL          *string `json:"avatarUrl"`
	RankingScore       int    `json:"rankingScore"`
	TotalCardsReviewed int    `json:"totalCardsReviewed"`
	TotalCorrect       int    `json:"totalCorrect"`
	CompletedSessions  int    `json:"completedSessions"`
	TotalStudyMinutes  int    `json:"totalStudyMinutes"`
	IsCurrentUser      bool   `json:"isCurrentUser"`
}

// LeaderboardResponse is the JSON shape sent to the frontend.
type LeaderboardResponse struct {
	Rows            []LeaderboardRow `json:"rows"`
	CurrentUserRank *int             `json:"currentUserRank"`
}
