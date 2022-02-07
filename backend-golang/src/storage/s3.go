package storage

import (
	"context"
	"log"
	"mime/multipart"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// https://asanchez.dev/blog/amazon-s3-v2-golang/
const (
	awsS3Region = "us-east-1" // Region
	awsS3Bucket = ""          // Bucket
)

type AwsS3Client struct {
	client     *s3.Client
	bucketName string
	uploadPath string
}

var AwsS3 *AwsS3Client

func init() {
	accessKey := os.Getenv("AWS_ACCESS_KEY")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")
	creds := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")

	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithCredentialsProvider(creds), config.WithRegion(awsS3Region))
	if err != nil {
		log.Printf("error: %v", err)
		return
	}

	awsS3Client := s3.NewFromConfig(cfg)

	AwsS3 = &AwsS3Client{
		client:     awsS3Client,
		bucketName: awsS3Bucket,
		uploadPath: "test-folder/",
	}
}

func SaveFilesOnAwsS3(files []*multipart.FileHeader) error {
	for _, fileHeader := range files {
		log.Println(fileHeader.Filename)

		file, err := fileHeader.Open()
		if err != nil {
			return err
		}

		defer file.Close()

		reader := &AwsS3CustomReader{
			fp:   &file,
			size: fileHeader.Size,
		}

		uploader := manager.NewUploader(AwsS3.client)
		result, err := uploader.Upload(context.TODO(), &s3.PutObjectInput{
			Bucket: aws.String(awsS3Bucket),
			Key:    aws.String(AwsS3.uploadPath + fileHeader.Filename),
			Body:   reader,
		})

		if err != nil {
			return err
		}

		log.Printf("File location %s", result.Location)
		log.Printf("File upload id %s", result.UploadID)
	}

	return nil
}
