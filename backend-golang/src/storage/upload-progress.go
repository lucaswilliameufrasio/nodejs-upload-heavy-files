package storage

import (
	"fmt"
	"lucaswilliameufrasio/upload-heavy-files/src/config"
	"mime/multipart"
	"sync/atomic"
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

// https://github.com/aws/aws-sdk-go/commit/50ba1dfe47983b15b160b66c730a3b93d2961f8e
type AwsS3CustomReader struct {
	fp   *multipart.File
	size int64
	read int64
}

func (r *AwsS3CustomReader) Read(p []byte) (int, error) {
	filePointer := *r.fp
	return filePointer.Read(p)
}

func (r *AwsS3CustomReader) ReadAt(p []byte, off int64) (int, error) {
	filePointer := *r.fp
	n, err := filePointer.ReadAt(p, off)
	if err != nil {
		return n, err
	}

	// All those comments are from the commit

	// Got the length have read(or means has uploaded), and you can construct your message
	atomic.AddInt64(&r.read, int64(n))

	// I have no idea why the read length need to be div 2,
	// maybe the request read once when Sign and actually send call ReadAt again
	// It works for me
	// log.Printf("total read:%d    progress:%d%%\n", r.read/2, int(float32(r.read*100/2)/float32(r.size)))

	fmt.Printf("File upload in progress: %d\n", r.read/2)
	fmt.Printf("Someone's socket id %s\n", *config.SocketID)

	config.Server.BroadcastToNamespace(*config.SocketID, config.OnUploadEvent, r.read/2)

	return n, err
}

func (r *AwsS3CustomReader) Seek(offset int64, whence int) (int64, error) {
	filePointer := *r.fp
	return filePointer.Seek(offset, whence)
}
