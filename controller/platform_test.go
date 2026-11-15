package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestPlatformReportRequiresIndependentGrantAndSuppressesSmallCohorts(t *testing.T) {
	db := setupManageUserTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.PlatformReportAccess{}, &model.PlatformReview{}, &model.QuotaData{}))
	user := createQuotaTestOperator(t, db, common.RoleCommonUser)
	old := common.DataExportEnabled
	common.DataExportEnabled = true
	t.Cleanup(func() { common.DataExportEnabled = old })
	request := func() *httptest.ResponseRecorder {
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/platform/report", nil)
		c.Set("id", user.Id)
		c.Set("role", common.RoleCommonUser)
		GetPlatformReport(c)
		return recorder
	}
	require.Equal(t, http.StatusForbidden, request().Code)
	require.NoError(t, model.SetPlatformReportAccess(user.Id, user.Id+1, true))
	response := request()
	require.Equal(t, http.StatusOK, response.Code)
	require.Contains(t, response.Body.String(), `"suppressed":true`)
	anchor := time.Now().UTC().Add(-24 * time.Hour)
	end := time.Date(anchor.Year(), anchor.Month(), 1, 0, 0, 0, 0, time.UTC)
	for i := range 5 {
		require.NoError(t, db.Create(&model.QuotaData{UserID: i + 100, Username: "do-not-disclose", ModelName: "private-model", CreatedAt: end.Add(-time.Hour).Unix(), Count: 1, Quota: 10}).Error)
	}
	// Current-month activity is deliberately excluded.
	require.NoError(t, db.Create(&model.QuotaData{UserID: 999, CreatedAt: end.Add(time.Hour).Unix(), Count: 99, Quota: 999}).Error)
	response = request()
	require.Contains(t, response.Body.String(), `"requests":5`)
	require.Contains(t, response.Body.String(), `"quota":50`)
	require.NotContains(t, response.Body.String(), "do-not-disclose")
	require.NotContains(t, response.Body.String(), "private-model")
	require.NoError(t, model.SetPlatformReportAccess(user.Id, user.Id+1, false))
	require.Equal(t, http.StatusForbidden, request().Code)
}

func TestPlatformInvoiceListCannotSelectAnotherUser(t *testing.T) {
	db := setupManageUserTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.PlatformInvoice{}))
	require.NoError(t, db.Create(&model.PlatformInvoice{UserID: 1, TopUpID: 1, Title: "Own invoice"}).Error)
	require.NoError(t, db.Create(&model.PlatformInvoice{UserID: 2, TopUpID: 2, Title: "Private other invoice"}).Error)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/platform/invoices?user_id=2&platform_admin=true", nil)
	c.Set("id", 1)
	c.Set("role", common.RoleCommonUser)
	ListPlatformInvoices(c)
	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), "Own invoice")
	require.NotContains(t, recorder.Body.String(), "Private other invoice")
}
