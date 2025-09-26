package adapter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

// DiscordNotifier handles sending notifications via Discord webhook
type DiscordNotifier struct{}

// NewDiscordNotifier creates a new Discord notifier
func NewDiscordNotifier() *DiscordNotifier {
	return &DiscordNotifier{}
}

// SendMessage sends a message to the specified Discord webhook
func (d *DiscordNotifier) SendMessage(webhookURL string, text string) error {
	payload := map[string]string{"content": text}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 204 {
		return fmt.Errorf("discord webhook failed: %d", resp.StatusCode)
	}

	return nil
}
