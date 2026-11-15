package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
	"net/http"
)

func setPlatformRouter(api *gin.RouterGroup) {
	platform := api.Group("/platform", middleware.UserAuth(), middleware.DisableCache())
	platform.GET("/home", controller.GetPlatformHome)
	platform.GET("/invoices", controller.ListPlatformInvoices)
	// Bound even authenticated request bodies; no proof images or attachments here.
	writeLimit := func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16*1024)
		c.Next()
	}
	platform.POST("/identity", middleware.CriticalRateLimit(), writeLimit, controller.SubmitPlatformIdentity)
	platform.POST("/invoices", middleware.CriticalRateLimit(), writeLimit, controller.SubmitPlatformInvoice)
	platform.GET("/report", controller.GetPlatformReport)
	platform.POST("/report-access", middleware.RootAuth(), middleware.CriticalRateLimit(), writeLimit, controller.SetPlatformReportAccess)
	admin := platform.Group("/admin", middleware.AdminAuth())
	admin.Use(func(c *gin.Context) { c.Set("platform_admin", true); c.Next() })
	admin.GET("/identities", controller.ListPlatformIdentities)
	admin.GET("/invoices", controller.ListPlatformInvoices)
	admin.POST("/:resource/:id/review", middleware.CriticalRateLimit(), writeLimit, controller.ReviewPlatformRequest)
}
