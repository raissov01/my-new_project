package model

// SetOverview mirrors the flashcard library summary card data used by the frontend.
type SetOverview struct {
	ID            string  `json:"id"`
	UserID        string  `json:"userId"`
	Title         string  `json:"title"`
	Description   *string `json:"description"`
	IsPublic      bool    `json:"isPublic"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
	CardCount     int     `json:"cardCount"`
	LastStudiedAt *string `json:"lastStudiedAt"`
	Accuracy      int     `json:"accuracy"`
	ReviewCount   int     `json:"reviewCount"`
	WeakCount     int     `json:"weakCount"`
	DueCount      int     `json:"dueCount"`
}
