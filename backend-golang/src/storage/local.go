package storage

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
)

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
