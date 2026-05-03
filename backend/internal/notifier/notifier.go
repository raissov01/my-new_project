// Package notifier writes rows into the in-app notifications table.
// Other handlers/services call these helpers after a user-visible event
// (friend request, quiz assignment, challenge created, etc).
package notifier

import (
	"log"

	"github.com/midoriya/flashlearn-backend/internal/models"
	"gorm.io/gorm"
)

// Create writes a single notification. Errors are logged, never returned —
// failing to write a notification must not fail the originating action.
func Create(db *gorm.DB, userID, ntype, title, body string, link *string) {
	if db == nil || userID == "" || title == "" {
		return
	}
	n := models.Notification{
		UserID: userID,
		Type:   ntype,
		Title:  title,
		Body:   body,
		Link:   link,
	}
	if err := db.Create(&n).Error; err != nil {
		log.Printf("notifier: failed to create notification for user=%s type=%s: %v", userID, ntype, err)
	}
}

// CreateForGroupMembers fans out a notification to every member of a class
// group, optionally excluding a single user (typically the actor).
func CreateForGroupMembers(db *gorm.DB, groupID, excludeUserID, ntype, title, body string, link *string) {
	if db == nil || groupID == "" || title == "" {
		return
	}
	var memberIDs []string
	q := db.Model(&models.ClassGroupMember{}).
		Where("group_id = ?", groupID)
	if excludeUserID != "" {
		q = q.Where("user_id <> ?", excludeUserID)
	}
	if err := q.Pluck("user_id", &memberIDs).Error; err != nil {
		log.Printf("notifier: failed to load group members for group=%s: %v", groupID, err)
		return
	}
	for _, uid := range memberIDs {
		Create(db, uid, ntype, title, body, link)
	}
}
