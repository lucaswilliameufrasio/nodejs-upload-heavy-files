package main

import (
	"github.com/gofiber/fiber/v2"
)

func healthcheck(c *fiber.Ctx) error {
	return c.JSON(map[string]interface{}{
		"message": "Hello, World 👋!",
	})
}

func main() {
	app := fiber.New()

	app.Get("/healthcheck", healthcheck)

	app.Listen(":3000")
}
