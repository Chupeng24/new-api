package controller

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/authz"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func platformResult(c *gin.Context, data any, err error) {
	if err == nil {
		common.ApiSuccess(c, data)
		return
	}
	switch {
	case errors.Is(err, model.ErrPlatformInvalid):
		common.ApiErrorStatus(c, http.StatusBadRequest, err)
	case errors.Is(err, model.ErrPlatformConflict):
		common.ApiErrorStatus(c, http.StatusConflict, err)
	case errors.Is(err, gorm.ErrRecordNotFound):
		common.ApiErrorStatus(c, http.StatusNotFound, common.NewMessage("Platform record not found"))
	default:
		common.SysError("platform operation failed: " + err.Error())
		common.ApiErrorStatus(c, http.StatusInternalServerError, common.NewMessage("Platform operation failed"))
	}
}

func GetPlatformHome(c *gin.Context) {
	canReport, err := platformReportAllowed(c)
	if err != nil {
		platformResult(c, nil, err)
		return
	}
	var user model.User
	if err := model.DB.Select("id", "quota", "used_quota", "request_count").First(&user, c.GetInt("id")).Error; err != nil {
		platformResult(c, nil, err)
		return
	}
	var identity model.PlatformIdentity
	err = model.DB.Where("user_id = ?", user.Id).First(&identity).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		platformResult(c, nil, err)
		return
	}
	var identityData *model.PlatformIdentity
	if err == nil {
		identityData = &identity
	}
	common.ApiSuccess(c, gin.H{
		"quota": user.Quota, "used_quota": user.UsedQuota, "request_count": user.RequestCount, "identity": identityData,
		"can_review": c.GetInt("role") >= common.RoleAdminUser,
		"can_report": canReport, "can_manage_report": c.GetInt("role") == common.RoleRootUser,
		"campaign": os.Getenv("PLATFORM_CAMPAIGN_TEXT"), "support_wechat": os.Getenv("PLATFORM_SUPPORT_WECHAT"), "support_whatsapp": os.Getenv("PLATFORM_SUPPORT_WHATSAPP"),
	})
}

func SubmitPlatformIdentity(c *gin.Context) {
	var input model.PlatformIdentity
	if c.ShouldBindJSON(&input) != nil {
		platformResult(c, nil, model.ErrPlatformInvalid)
		return
	}
	record, err := model.SubmitPlatformIdentity(c.GetInt("id"), input)
	platformResult(c, record, err)
}

func SubmitPlatformInvoice(c *gin.Context) {
	var input model.PlatformInvoice
	if c.ShouldBindJSON(&input) != nil {
		platformResult(c, nil, model.ErrPlatformInvalid)
		return
	}
	record, err := model.SubmitPlatformInvoice(c.GetInt("id"), input)
	platformResult(c, record, err)
}

// Fixed-size pages prevent unbounded material export; self routes always scope by owner.
func ListPlatformInvoices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	page = max(1, min(page, 100000))
	query := model.DB.Model(&model.PlatformInvoice{})
	if c.GetBool("platform_admin") != true {
		query = query.Where("user_id = ?", c.GetInt("id"))
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		platformResult(c, nil, err)
		return
	}
	records := make([]model.PlatformInvoice, 0)
	err := query.Order("id DESC").Limit(20).Offset((page - 1) * 20).Find(&records).Error
	platformResult(c, gin.H{"items": records, "total": count, "page": page}, err)
}

func ListPlatformIdentities(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	page = max(1, min(page, 100000))
	var count int64
	if err := model.DB.Model(&model.PlatformIdentity{}).Count(&count).Error; err != nil {
		platformResult(c, nil, err)
		return
	}
	records := make([]model.PlatformIdentity, 0)
	err := model.DB.Order("id DESC").Limit(20).Offset((page - 1) * 20).Find(&records).Error
	platformResult(c, gin.H{"items": records, "total": count, "page": page}, err)
}

func ReviewPlatformRequest(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		platformResult(c, nil, model.ErrPlatformInvalid)
		return
	}
	var input struct {
		Revision      int    `json:"revision"`
		Status        string `json:"status"`
		Note          string `json:"note"`
		InvoiceNumber string `json:"invoice_number"`
	}
	if c.ShouldBindJSON(&input) != nil {
		platformResult(c, nil, model.ErrPlatformInvalid)
		return
	}
	if c.Param("resource") == "identities" {
		err = model.ReviewPlatformIdentity(id, c.GetInt("id"), input.Revision, input.Status, input.Note)
	} else if c.Param("resource") == "invoices" {
		err = model.ReviewPlatformInvoice(id, c.GetInt("id"), input.Revision, input.Status, input.InvoiceNumber, input.Note)
	} else {
		err = model.ErrPlatformInvalid
	}
	platformResult(c, nil, err)
}

func GetPlatformReport(c *gin.Context) {
	allowed, err := platformReportAllowed(c)
	if err != nil {
		platformResult(c, nil, err)
		return
	}
	if !allowed {
		common.ApiErrorStatus(c, http.StatusForbidden, common.NewMessage("Unauthorized, insufficient privileges"))
		return
	}
	// Use a completed UTC calendar month after a 24-hour ingestion grace period.
	// Aggregation is not a legal guarantee of anonymization.
	anchor := time.Now().UTC().Add(-24 * time.Hour)
	end := time.Date(anchor.Year(), anchor.Month(), 1, 0, 0, 0, 0, time.UTC)
	since := end.AddDate(0, -1, 0).Unix()
	type totals struct {
		Requests    int64 `json:"requests"`
		Tokens      int64 `json:"tokens"`
		Quota       int64 `json:"quota"`
		ActiveUsers int64 `json:"active_users"`
	}
	var usage totals
	if !common.DataExportEnabled {
		common.ApiSuccess(c, gin.H{"enabled": false, "since": since, "until": end.Unix()})
		return
	}
	err = model.DB.Model(&model.QuotaData{}).Where("created_at >= ? AND created_at < ?", since, end.Unix()).Select("COALESCE(SUM(count),0) AS requests, COALESCE(SUM(token_used),0) AS tokens, COALESCE(SUM(quota),0) AS quota, COUNT(DISTINCT user_id) AS active_users").Scan(&usage).Error
	// Suppress small populations rather than exposing one person's consumption.
	suppressed := usage.ActiveUsers < 5
	if suppressed {
		usage = totals{}
	}
	platformResult(c, gin.H{"enabled": true, "since": since, "until": end.Unix(), "suppressed": suppressed, "usage": usage}, err)
}

func platformReportAllowed(c *gin.Context) (bool, error) {
	if c.GetInt("role") >= common.RoleAdminUser {
		return authz.Can(c.GetInt("id"), c.GetInt("role"), authz.PlatformReportRead), nil
	}
	return model.HasPlatformReportAccess(c.GetInt("id"))
}

func SetPlatformReportAccess(c *gin.Context) {
	var input struct {
		UserID  int  `json:"user_id"`
		Enabled bool `json:"enabled"`
	}
	if c.ShouldBindJSON(&input) != nil {
		platformResult(c, nil, model.ErrPlatformInvalid)
		return
	}
	platformResult(c, nil, model.SetPlatformReportAccess(input.UserID, c.GetInt("id"), input.Enabled))
}
