package config

import (
	"log"

	socketio "github.com/googollee/go-socket.io"
)

var (
	Server        *socketio.Server
	OnUploadEvent = "file-uploaded"
)

var (
	SocketID *string
)

func StartSocketIOServer() {
	Server = socketio.NewServer(nil)

	Server.OnConnect("/", func(s socketio.Conn) error {
		s.SetContext("")
		// s.Join(s.ID())
		Server.JoinRoom(s.ID(), OnUploadEvent, s)
		log.Println("connected:", s.ID())
		return nil
	})

	Server.OnError("/", func(s socketio.Conn, e error) {
		log.Println("meet error:", e)
	})

	Server.OnDisconnect("/", func(s socketio.Conn, reason string) {
		log.Println("closed", reason)
	})

	go func() {
		if err := Server.Serve(); err != nil {
			log.Fatalf("socketio listen error: %s\n", err)
		}
	}()
}
