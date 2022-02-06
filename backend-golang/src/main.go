package main

import (
	"fmt"
	"io"
	"log"
	"lucaswilliameufrasio/upload-heavy-files/src/config"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type Progress struct {
	TotalSize int64
	BytesRead int64
}

var (
	socketID *string
)

func (pr *Progress) Write(p []byte) (n int, err error) {
	n, err = len(p), nil
	pr.BytesRead += int64(n)
	pr.Print()
	return
}

func (pr *Progress) Print() {
	if pr.BytesRead == pr.TotalSize {
		fmt.Println("DONE!")
		return
	}

	fmt.Printf("File upload in progress: %d\n", pr.BytesRead)
	fmt.Printf("Someone's socket id %s\n", *socketID)

	config.Server.BroadcastToNamespace(*socketID, config.OnUploadEvent, pr.BytesRead)
}

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

		pr := &Progress{
			TotalSize: fileHeader.Size,
		}

		_, err = io.Copy(f, io.TeeReader(file, pr))
		if err != nil {
			return err
		}
	}

	return nil
}

func uploadFiles(c *gin.Context) {
	socketIDQuery := c.Query("socketId")
	socketID = &socketIDQuery
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

	config.StartSocketIOServer()

	defer config.Server.Close()

	router.GET("/socket.io/*any", gin.WrapH(config.Server))
	router.POST("/socket.io/*any", gin.WrapH(config.Server))
	router.GET("/healthcheck", healthcheck)
	router.POST("/", uploadFiles)

	router.Run(":3000")
}
