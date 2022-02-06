package storage

import (
	"fmt"
	"lucaswilliameufrasio/upload-heavy-files/src/config"
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
