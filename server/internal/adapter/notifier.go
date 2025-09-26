package adapter

// Notifier interface for sending notifications
type Notifier interface {
	SendMessage(chatID string, message string) error
}
