package main

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func healthcheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "Hello, World 👋!",
	})
}

func saveFilesOnLocalStorage(files []*multipart.FileHeader) error {
	for _, fileHeader := range files {
		log.Println(fileHeader.Filename)

		file, err := fileHeader.Open()
		if err != nil {
			return err
		}

		defer file.Close()

		f, err := os.Create(fmt.Sprintf("/tmp/%s%s", fileHeader.Filename, filepath.Ext(fileHeader.Filename)))

		if err != nil {

			return err
		}

		defer f.Close()

		_, err = io.Copy(f, file)
		if err != nil {
			return err
		}
	}

	return nil
}

func uploadFiles(c *gin.Context) {
	log.Print("came here")
	form, _ := c.MultipartForm()
	files := form.File["files[]"]

	err := saveFilesOnLocalStorage(files)

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

	// config.StartSocketIOServer()

	router.GET("/healthcheck", healthcheck)
	router.POST("/", uploadFiles)
	// router.GET("/socket.io/*any", gin.WrapH(config.Server))
	// router.POST("/socket.io/*any", gin.WrapH(config.Server))

	router.Run(":3000")
}
