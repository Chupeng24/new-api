package model

import (
	"errors"
	"math"
	"net/mail"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

var (
	ErrPlatformInvalid  = common.NewMessage("Invalid platform request")
	ErrPlatformConflict = common.NewMessage("This request has already been submitted or reviewed")
)

// Identity verification is a business workflow, never an authentication role.
type PlatformIdentity struct {
	Revision          int    `json:"revision"`
	ID                int    `json:"id"`
	UserID            int    `json:"user_id" gorm:"uniqueIndex;not null"`
	Kind              string `json:"kind" gorm:"size:20"`
	Organization      string `json:"organization" gorm:"size:200"`
	ContactEmail      string `json:"contact_email" gorm:"size:254"`
	EvidenceReference string `json:"evidence_reference" gorm:"size:200"`
	Consent           bool   `json:"consent"`
	Status            string `json:"status" gorm:"size:20;index"`
	ReviewNote        string `json:"review_note" gorm:"size:500"`
	ReviewerID        int    `json:"reviewer_id"`
	CreatedAt         int64  `json:"created_at"`
	ReviewedAt        int64  `json:"reviewed_at"`
}

type PlatformInvoice struct {
	Revision int    `json:"revision"`
	ID       int    `json:"id"`
	UserID   int    `json:"user_id" gorm:"index;not null"`
	TopUpID  int    `json:"top_up_id" gorm:"uniqueIndex;not null"`
	Title    string `json:"title" gorm:"size:200"`
	TaxID    string `json:"tax_id" gorm:"size:40"`
	Email    string `json:"email" gorm:"size:254"`
	// Money is the original order amount, not quota or a currency conversion.
	Money         float64 `json:"money"`
	PaymentMethod string  `json:"payment_method" gorm:"size:50"`
	Status        string  `json:"status" gorm:"size:20;index"`
	InvoiceNumber string  `json:"invoice_number" gorm:"size:100"`
	ReviewNote    string  `json:"review_note" gorm:"size:500"`
	ReviewerID    int     `json:"reviewer_id"`
	CreatedAt     int64   `json:"created_at"`
	ReviewedAt    int64   `json:"reviewed_at"`
}

// Immutable transitions remain available even if rejected requests are resubmitted.
type PlatformReview struct {
	ID         int
	Resource   string `gorm:"size:20;index"`
	ResourceID int    `gorm:"index"`
	ActorID    int
	Status     string `gorm:"size:20"`
	Note       string `gorm:"size:500"`
	CreatedAt  int64
}

// Report grants are independent of the gateway's administrator roles.
type PlatformReportAccess struct {
	UserID  int `gorm:"primaryKey"`
	Enabled bool
}

func HasPlatformReportAccess(userID int) (bool, error) {
	var grant PlatformReportAccess
	err := DB.First(&grant, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}
	return grant.Enabled, err
}

func SetPlatformReportAccess(userID, actorID int, enabled bool) error {
	if userID <= 0 || actorID <= 0 {
		return ErrPlatformInvalid
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := lockForUpdate(tx).First(&user, userID).Error; err != nil {
			return err
		}
		if user.Role != common.RoleCommonUser || user.Status != common.UserStatusEnabled {
			return ErrPlatformInvalid
		}
		grant := PlatformReportAccess{UserID: userID, Enabled: enabled}
		if err := tx.Save(&grant).Error; err != nil {
			return err
		}
		status := "revoked"
		if enabled {
			status = "granted"
		}
		return tx.Create(&PlatformReview{Resource: "report", ResourceID: userID, ActorID: actorID, Status: status, CreatedAt: common.GetTimestamp()}).Error
	})
}

func platformText(value string, limit int) bool {
	return strings.TrimSpace(value) != "" && utf8.RuneCountInString(value) <= limit
}

func platformEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value && len(value) <= 254
}

func SubmitPlatformIdentity(userID int, input PlatformIdentity) (*PlatformIdentity, error) {
	input.Organization = strings.TrimSpace(input.Organization)
	input.ContactEmail = strings.TrimSpace(input.ContactEmail)
	input.EvidenceReference = strings.TrimSpace(input.EvidenceReference)
	if userID <= 0 || !input.Consent || (input.Kind != "enterprise" && input.Kind != "student" && input.Kind != "teacher") || !platformText(input.Organization, 200) || !platformEmail(input.ContactEmail) || !platformText(input.EvidenceReference, 200) {
		return nil, ErrPlatformInvalid
	}
	record := PlatformIdentity{Revision: 1, UserID: userID, Kind: input.Kind, Organization: input.Organization, ContactEmail: input.ContactEmail, EvidenceReference: input.EvidenceReference, Consent: true, Status: "pending", CreatedAt: common.GetTimestamp()}
	err := DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := lockForUpdate(tx).Select("id").First(&user, userID).Error; err != nil {
			return err
		}
		var existing PlatformIdentity
		err := tx.Where("user_id = ?", userID).First(&existing).Error
		if err == nil {
			if existing.Status != "rejected" {
				return ErrPlatformConflict
			}
			record.ID = existing.ID
			record.Revision = existing.Revision + 1
			result := tx.Model(&PlatformIdentity{}).Where("id = ? AND status = ?", existing.ID, "rejected").Select("revision", "kind", "organization", "contact_email", "evidence_reference", "consent", "status", "review_note", "reviewer_id", "created_at", "reviewed_at").Updates(&record)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return ErrPlatformConflict
			}
		} else {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return tx.Create(&PlatformReview{Resource: "identity", ResourceID: record.ID, ActorID: userID, Status: "pending", CreatedAt: record.CreatedAt}).Error
	})
	return &record, err
}

func ReviewPlatformIdentity(id, reviewerID, revision int, status, note string) error {
	note = strings.TrimSpace(note)
	if id <= 0 || reviewerID <= 0 || revision <= 0 || (status != "approved" && status != "rejected") || !platformText(note, 500) {
		return ErrPlatformInvalid
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		result := tx.Model(&PlatformIdentity{}).Where("id = ? AND status = ? AND user_id <> ? AND revision = ?", id, "pending", reviewerID, revision).Updates(map[string]any{"status": status, "review_note": note, "reviewer_id": reviewerID, "reviewed_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrPlatformConflict
		}
		return tx.Create(&PlatformReview{Resource: "identity", ResourceID: id, ActorID: reviewerID, Status: status, Note: note, CreatedAt: now}).Error
	})
}

func SubmitPlatformInvoice(userID int, input PlatformInvoice) (*PlatformInvoice, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.TaxID = strings.TrimSpace(input.TaxID)
	input.Email = strings.TrimSpace(input.Email)
	if userID <= 0 || input.TopUpID <= 0 || !platformText(input.Title, 200) || !platformText(input.TaxID, 40) || !platformEmail(input.Email) {
		return nil, ErrPlatformInvalid
	}
	record := PlatformInvoice{Revision: 1, UserID: userID, TopUpID: input.TopUpID, Title: input.Title, TaxID: input.TaxID, Email: input.Email, Status: "pending", CreatedAt: common.GetTimestamp()}
	err := DB.Transaction(func(tx *gorm.DB) error {
		var order TopUp
		if err := lockForUpdate(tx).Where("id = ? AND user_id = ? AND status = ?", input.TopUpID, userID, common.TopUpStatusSuccess).First(&order).Error; err != nil {
			return err
		}
		if order.Money <= 0 || math.IsNaN(order.Money) || math.IsInf(order.Money, 0) {
			return ErrPlatformInvalid
		}
		record.Money = order.Money
		record.PaymentMethod = order.PaymentMethod
		var existing PlatformInvoice
		err := tx.Where("top_up_id = ?", input.TopUpID).First(&existing).Error
		if err == nil {
			if existing.Status != "rejected" || existing.UserID != userID {
				return ErrPlatformConflict
			}
			record.ID = existing.ID
			record.Revision = existing.Revision + 1
			result := tx.Model(&PlatformInvoice{}).Where("id = ? AND status = ?", existing.ID, "rejected").Select("revision", "title", "tax_id", "email", "status", "invoice_number", "review_note", "reviewer_id", "reviewed_at", "created_at").Updates(&record)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return ErrPlatformConflict
			}
		} else {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return tx.Create(&PlatformReview{Resource: "invoice", ResourceID: record.ID, ActorID: userID, Status: "pending", CreatedAt: record.CreatedAt}).Error
	})
	return &record, err
}

func ReviewPlatformInvoice(id, reviewerID, revision int, status, number, note string) error {
	number = strings.TrimSpace(number)
	note = strings.TrimSpace(note)
	if id <= 0 || reviewerID <= 0 || revision <= 0 || (status != "issued" && status != "rejected") || !platformText(note, 500) || utf8.RuneCountInString(number) > 100 || (status == "issued" && number == "") {
		return ErrPlatformInvalid
	}
	if status == "rejected" {
		number = ""
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		result := tx.Model(&PlatformInvoice{}).Where("id = ? AND status = ? AND user_id <> ? AND revision = ?", id, "pending", reviewerID, revision).Updates(map[string]any{"status": status, "invoice_number": number, "review_note": note, "reviewer_id": reviewerID, "reviewed_at": now})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrPlatformConflict
		}
		return tx.Create(&PlatformReview{Resource: "invoice", ResourceID: id, ActorID: reviewerID, Status: status, Note: note, CreatedAt: now}).Error
	})
}
