package adapter

import (
	"log"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// TelegramNotifier handles sending notifications via Telegram bot
type TelegramNotifier struct {
	bot *tgbotapi.BotAPI
}

// NewTelegramNotifier creates a new Telegram notifier
func NewTelegramNotifier(token string) *TelegramNotifier {
	bot, err := tgbotapi.NewBotAPI(token)
	if err != nil {
		log.Fatalf("Failed to create Telegram bot: %v", err)
	}

	return &TelegramNotifier{
		bot: bot,
	}
}

// SendMessage sends a message to the specified Telegram chat with Markdown formatting
func (t *TelegramNotifier) SendMessage(chatID string, text string) error {
	msg := tgbotapi.NewMessageToChannel(chatID, text)
	msg.ParseMode = tgbotapi.ModeMarkdown

	_, err := t.bot.Send(msg)
	if err != nil {
		log.Printf("Failed to send Telegram message: %v", err)
		return err
	}

	return nil
}
