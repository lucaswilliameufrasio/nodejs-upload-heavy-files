package main

import (
	"log"
	"lucaswilliameufrasio/upload-heavy-files/src/config"
	"lucaswilliameufrasio/upload-heavy-files/src/storage"
	"net/http"

	"github.com/gin-gonic/gin"
)

func healthcheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Hello, World 👋!",
	})
}

func uploadFiles(c *gin.Context) {
	socketIDQuery := c.Query("socketId")
	config.SocketID = &socketIDQuery
	log.Print("came here")
	form, _ := c.MultipartForm()
	files := form.File["files[]"]

	// err := storage.SaveFilesOnLocalStorage(files)
	err := storage.SaveFilesOnGoogleCloudStorage(files)

	if err != nil {
		c.JSON(http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(201, gin.H{
		"message": "Upload completed 🤖",
	})
}

func main() {
	router := gin.New()

	config.StartSocketIOServer()

	defer config.Server.Close()

	router.GET("/socket.io/*any", gin.WrapH(config.Server))
	router.POST("/socket.io/*any", gin.WrapH(config.Server))
	router.GET("/healthcheck", healthcheck)
	router.POST("/", uploadFiles)

	router.Run(":3000")
}
