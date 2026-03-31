package model

// SetOverview mirrors the flashcard library summary card data used by the frontend.
type SetOverview struct {
	ID            string  `json:"id"`
	Title         string  `json:"title"`
	Description   *string `json:"description"`
	CreatedAt     string  `json:"createdAt"`
	UpdatedAt     string  `json:"updatedAt"`
	CardCount     int     `json:"cardCount"`
	LastStudiedAt *string `json:"lastStudiedAt"`
	Accuracy      int     `json:"accuracy"`
	ReviewCount   int     `json:"reviewCount"`
	WeakCount     int     `json:"weakCount"`
	DueCount      int     `json:"dueCount"`
}
