package model

// FlashcardInput is a card to create/update.
type FlashcardInput struct {
	ID         *string `json:"id,omitempty"`
	Term       string  `json:"term"`
	Definition string  `json:"definition"`
}

// CreateSetRequest is the input for creating a flashcard set.
type CreateSetRequest struct {
	Title        string           `json:"title"`
	Description  string           `json:"description"`
	Cards        []FlashcardInput `json:"cards"`
	IsPublic     bool             `json:"isPublic"`
	InvitedUsers string           `json:"invitedUsers"`
}

// UpdateSetRequest is the input for updating a flashcard set.
type UpdateSetRequest struct {
	Title        string           `json:"title"`
	Description  string           `json:"description"`
	Cards        []FlashcardInput `json:"cards"`
	IsPublic     bool             `json:"isPublic"`
	InvitedUsers string           `json:"invitedUsers"`
}

// SetDetail is a full set response with cards.
type SetDetail struct {
	ID          string           `json:"id"`
	Title       string           `json:"title"`
	Description *string          `json:"description"`
	IsPublic    bool             `json:"isPublic"`
	UserID      string           `json:"userId"`
	CreatedAt   string           `json:"createdAt"`
	Cards       []FlashcardInput `json:"cards"`
}
