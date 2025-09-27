package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds the application configuration
type Config struct {
	WSRPC            string
	TelegramBotToken string
}

// Load reads configuration from environment variables
func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, falling back to system environment")
	}

	config := &Config{
		WSRPC:            os.Getenv("WS_RPC"),
		TelegramBotToken: os.Getenv("TELEGRAM_BOT_TOKEN"),
	}

	if config.WSRPC == "" {
		log.Fatal("WS_RPC env var is required")
	}

	return config
}
