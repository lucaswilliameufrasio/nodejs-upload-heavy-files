package main

import (
	"lucaswilliameufrasio/upload-heavy-files/src/config"

	"github.com/gin-gonic/gin"
)

func healthcheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Hello, World 👋!",
	})
}

func main() {
	router := gin.New()

	config.StartSocketIOServer()

	router.GET("/socket.io/*any", gin.WrapH(config.Server))
	router.POST("/socket.io/*any", gin.WrapH(config.Server))
	router.GET("/healthcheck", healthcheck)

	router.Run(":3000")
}
