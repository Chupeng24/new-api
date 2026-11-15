package model

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"os"
	"strings"
	"sync"
	"testing"
)

func TestPlatformConcurrentReview(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.AutoMigrate(&PlatformIdentity{}, &PlatformReview{}))
	user := createReserveTestUser(t, 100)
	record, err := SubmitPlatformIdentity(user.Id, PlatformIdentity{Kind: "enterprise", Organization: "Company", ContactEmail: "a@example.com", EvidenceReference: "123", Consent: true})
	require.NoError(t, err)
	results := make(chan error, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Go(func() {
			results <- ReviewPlatformIdentity(record.ID, user.Id+1, record.Revision, "approved", "Verified")
		})
	}
	wg.Wait()
	close(results)
	successes := 0
	for err := range results {
		if err == nil {
			successes++
		} else {
			require.ErrorIs(t, err, ErrPlatformConflict)
		}
	}
	require.Equal(t, 1, successes)
}

func TestPlatformReportGrantDoesNotElevateUser(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.AutoMigrate(&PlatformReportAccess{}, &PlatformReview{}))
	user := createReserveTestUser(t, 100)
	allowed, err := HasPlatformReportAccess(user.Id)
	require.NoError(t, err)
	require.False(t, allowed)
	require.NoError(t, SetPlatformReportAccess(user.Id, user.Id+1, true))
	allowed, err = HasPlatformReportAccess(user.Id)
	require.NoError(t, err)
	require.True(t, allowed)
	var unchanged User
	require.NoError(t, DB.First(&unchanged, user.Id).Error)
	require.Equal(t, common.RoleCommonUser, unchanged.Role)
	require.NoError(t, SetPlatformReportAccess(user.Id, user.Id+1, false))
	allowed, err = HasPlatformReportAccess(user.Id)
	require.NoError(t, err)
	require.False(t, allowed)
}

// Dedicated disposable databases only. CI runs both engines; never point this at production.
func TestPlatformDatabaseMatrix(t *testing.T) {
	for _, engine := range []string{"mysql", "postgres"} {
		t.Run(engine, func(t *testing.T) {
			dsn := os.Getenv("PLATFORM_TEST_" + strings.ToUpper(engine) + "_DSN")
			if dsn == "" {
				t.Skip("disposable database DSN not configured")
			}
			var dialector gorm.Dialector
			if engine == "mysql" {
				dialector = mysql.Open(dsn)
			} else {
				dialector = postgres.Open(dsn)
			}
			db, err := gorm.Open(dialector, &gorm.Config{})
			require.NoError(t, err)
			previous := DB
			DB = db
			t.Cleanup(func() {
				DB = previous
				sqlDB, _ := db.DB()
				if sqlDB != nil {
					_ = sqlDB.Close()
				}
				common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
			})
			if engine == "mysql" {
				common.SetDatabaseTypes(common.DatabaseTypeMySQL, common.DatabaseTypeMySQL)
			} else {
				common.SetDatabaseTypes(common.DatabaseTypePostgreSQL, common.DatabaseTypePostgreSQL)
			}
			// Existing gateway data predates the additive migration.
			require.NoError(t, db.AutoMigrate(&User{}, &TopUp{}))
			user := createReserveTestUser(t, 100)
			require.NoError(t, db.AutoMigrate(&PlatformIdentity{}, &PlatformInvoice{}, &PlatformReview{}, &PlatformReportAccess{}))
			input := PlatformIdentity{Kind: "student", Organization: "University", ContactEmail: "a@example.edu", EvidenceReference: "123", Consent: true}
			record, err := SubmitPlatformIdentity(user.Id, input)
			require.NoError(t, err)
			// Restart migration preserves both old gateway data and submitted applications.
			require.NoError(t, db.AutoMigrate(&PlatformIdentity{}, &PlatformInvoice{}, &PlatformReview{}, &PlatformReportAccess{}))
			require.NoError(t, SetPlatformReportAccess(user.Id, user.Id+1, true))
			allowed, err := HasPlatformReportAccess(user.Id)
			require.NoError(t, err)
			require.True(t, allowed)
			require.NoError(t, SetPlatformReportAccess(user.Id, user.Id+1, false))
			allowed, err = HasPlatformReportAccess(user.Id)
			require.NoError(t, err)
			require.False(t, allowed)
			var existing PlatformIdentity
			require.NoError(t, db.First(&existing, record.ID).Error)
			require.Equal(t, "pending", existing.Status)
			require.Equal(t, 100, getUserQuotaFromDB(t, user.Id))
			require.NoError(t, ReviewPlatformIdentity(record.ID, user.Id+1, record.Revision, "approved", "Verified"))
			require.ErrorIs(t, ReviewPlatformIdentity(record.ID, user.Id+1, record.Revision, "rejected", "Again"), ErrPlatformConflict)
			order := TopUp{UserId: user.Id, Money: 10, TradeNo: common.GetRandomString(24), Status: common.TopUpStatusSuccess}
			require.NoError(t, db.Create(&order).Error)
			invoice, err := SubmitPlatformInvoice(user.Id, PlatformInvoice{TopUpID: order.Id, Title: "Company", TaxID: "123456789", Email: "a@example.com"})
			require.NoError(t, err)
			require.NoError(t, ReviewPlatformInvoice(invoice.ID, user.Id+1, invoice.Revision, "issued", "INV123", "Delivered"))
			duplicate := PlatformInvoice{TopUpID: order.Id, UserID: user.Id}
			require.Error(t, db.Create(&duplicate).Error)
		})
	}
}

func TestPlatformIdentityReview(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.AutoMigrate(&PlatformIdentity{}, &PlatformInvoice{}, &PlatformReview{}, &PlatformReportAccess{}))
	user := createReserveTestUser(t, 100)
	input := PlatformIdentity{Kind: "student", Organization: "Example University", ContactEmail: "student@example.edu", EvidenceReference: "Verification 123", Consent: true}
	record, err := SubmitPlatformIdentity(user.Id, input)
	require.NoError(t, err)
	require.Equal(t, "pending", record.Status)
	_, err = SubmitPlatformIdentity(user.Id, input)
	require.ErrorIs(t, err, ErrPlatformConflict)
	require.ErrorIs(t, ReviewPlatformIdentity(record.ID, user.Id, record.Revision, "approved", "Checked"), ErrPlatformConflict)
	require.NoError(t, ReviewPlatformIdentity(record.ID, user.Id+1, record.Revision, "rejected", "Need current verification"))
	previousRevision := record.Revision
	record, err = SubmitPlatformIdentity(user.Id, input)
	require.NoError(t, err)
	require.ErrorIs(t, ReviewPlatformIdentity(record.ID, user.Id+1, previousRevision, "approved", "Stale page"), ErrPlatformConflict)
	require.NoError(t, ReviewPlatformIdentity(record.ID, user.Id+1, record.Revision, "approved", "Verified manually"))
	require.ErrorIs(t, ReviewPlatformIdentity(record.ID, user.Id+1, record.Revision, "rejected", "Again"), ErrPlatformConflict)
	var after User
	require.NoError(t, DB.First(&after, user.Id).Error)
	require.Equal(t, common.RoleCommonUser, after.Role)
	require.Equal(t, 100, after.Quota)
}

func TestPlatformIdentityRejectsInvalidInput(t *testing.T) {
	for _, input := range []PlatformIdentity{
		{Kind: "root", Organization: "Test", ContactEmail: "a@b.com", EvidenceReference: "123", Consent: true},
		{Kind: "student", Organization: "Test", ContactEmail: "invalid", EvidenceReference: "123", Consent: true},
		{Kind: "student", Organization: "Test", ContactEmail: "a@b.com", EvidenceReference: "123"},
		{Kind: "student", Organization: strings.Repeat("a", 201), ContactEmail: "a@b.com", EvidenceReference: "123", Consent: true},
	} {
		_, err := SubmitPlatformIdentity(1, input)
		require.ErrorIs(t, err, ErrPlatformInvalid)
	}
}

func TestPlatformInvoiceOwnershipDuplicateAndReview(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.AutoMigrate(&PlatformIdentity{}, &PlatformInvoice{}, &PlatformReview{}, &PlatformReportAccess{}))
	user := createReserveTestUser(t, 100)
	order := TopUp{UserId: user.Id, Money: 10, Amount: 10, TradeNo: common.GetRandomString(24), Status: common.TopUpStatusSuccess}
	require.NoError(t, DB.Create(&order).Error)
	input := PlatformInvoice{TopUpID: order.Id, Title: "Example Ltd", TaxID: "91310000123456789X", Email: "finance@example.com"}
	_, err := SubmitPlatformInvoice(user.Id+1, input)
	require.Error(t, err)
	invoice, err := SubmitPlatformInvoice(user.Id, input)
	require.NoError(t, err)
	require.Equal(t, 10.0, invoice.Money)
	_, err = SubmitPlatformInvoice(user.Id, input)
	require.ErrorIs(t, err, ErrPlatformConflict)
	require.ErrorIs(t, ReviewPlatformInvoice(invoice.ID, user.Id, invoice.Revision, "issued", "INV001", "Done"), ErrPlatformConflict)
	require.ErrorIs(t, ReviewPlatformInvoice(invoice.ID, user.Id+1, invoice.Revision, "issued", "", "Done"), ErrPlatformInvalid)
	require.NoError(t, ReviewPlatformInvoice(invoice.ID, user.Id+1, invoice.Revision, "rejected", "", "Wrong title"))
	previousRevision := invoice.Revision
	input.Title = "Correct Ltd"
	invoice, err = SubmitPlatformInvoice(user.Id, input)
	require.NoError(t, err)
	require.ErrorIs(t, ReviewPlatformInvoice(invoice.ID, user.Id+1, previousRevision, "issued", "INV001", "Stale page"), ErrPlatformConflict)
	require.NoError(t, ReviewPlatformInvoice(invoice.ID, user.Id+1, invoice.Revision, "issued", "INV001", "Delivered to verified contact"))
	require.ErrorIs(t, ReviewPlatformInvoice(invoice.ID, user.Id+1, invoice.Revision, "rejected", "", "Again"), ErrPlatformConflict)
	_, err = SubmitPlatformInvoice(user.Id, input)
	require.ErrorIs(t, err, ErrPlatformConflict)
}
