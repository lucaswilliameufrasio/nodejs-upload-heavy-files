package storage

import (
	"fmt"
	"io"
	"log"
	"lucaswilliameufrasio/upload-heavy-files/src/config"
	"mime/multipart"
	"os"
	"path/filepath"
)

type Progress struct {
	TotalSize int64
	BytesRead int64
}

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
	fmt.Printf("Someone's socket id %s\n", *config.SocketID)

	config.Server.BroadcastToNamespace(*config.SocketID, config.OnUploadEvent, pr.BytesRead)
}

func SaveFilesOnLocalStorage(files []*multipart.FileHeader) error {
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
