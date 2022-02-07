package storage

import (
	"context"
	"io"
	"log"
	"mime/multipart"
	"time"

	"cloud.google.com/go/storage"
)

// https://adityarama1210.medium.com/simple-golang-api-uploader-using-google-cloud-storage-3d5e45df74a5
const (
	projectID  = "your-project-id"  // FILL IN WITH YOURS
	bucketName = "your-bucket-name" // FILL IN WITH YOURS
)

type GCSClient struct {
	cl         *storage.Client
	projectID  string
	bucketName string
	uploadPath string
}

var gcsClient *GCSClient

func init() {
	client, err := storage.NewClient(context.Background())
	if err != nil {
		log.Printf("Failed to create google cloud storage client: %v", err)
	}

	gcsClient = &GCSClient{
		cl:         client,
		bucketName: bucketName,
		projectID:  projectID,
		uploadPath: "test-folder/",
	}
}

func SaveFilesOnGoogleCloudStorage(files []*multipart.FileHeader) error {
	for _, fileHeader := range files {
		log.Println(fileHeader.Filename)

		file, err := fileHeader.Open()
		if err != nil {
			return err
		}

		defer file.Close()

		ctx := context.Background()

		ctx, cancel := context.WithTimeout(ctx, time.Second*120)
		defer cancel()

		pr := &Progress{
			TotalSize: fileHeader.Size,
		}

		wc := gcsClient.cl.Bucket(gcsClient.bucketName).Object(gcsClient.uploadPath + fileHeader.Filename).NewWriter(ctx)

		if _, err := io.Copy(wc, io.TeeReader(file, pr)); err != nil {
			return err
		}

		if err := wc.Close(); err != nil {
			return err
		}
	}

	return nil
}
