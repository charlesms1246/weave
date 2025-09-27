package events

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/pintoinfant/weave/internal/adapter"
	"github.com/pintoinfant/weave/internal/database"
	"github.com/pintoinfant/weave/internal/ethereum"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// Processor handles event processing and parsing
type Processor struct {
	contractAbi   abi.ABI
	app           *pocketbase.PocketBase
	client        *ethereum.Client
	telegramToken string
}

// NewProcessor creates a new event processor
func NewProcessor(contractAbi abi.ABI, app *pocketbase.PocketBase, client *ethereum.Client, telegramToken string) *Processor {
	return &Processor{
		contractAbi:   contractAbi,
		app:           app,
		client:        client,
		telegramToken: telegramToken,
	}
}

// ProcessEvent processes a single log event
func (p *Processor) ProcessEvent(vLog types.Log) {
	if len(vLog.Topics) == 0 {
		fmt.Println("No topics found in log")
		return
	}

	// Find event name by signature
	eventSig := vLog.Topics[0]
	eventName := ""
	for name, event := range p.contractAbi.Events {
		if event.ID == eventSig {
			eventName = name
			break
		}
	}

	if eventName == "" {
		fmt.Printf("Unknown event signature: %s\n", eventSig.Hex())
		return
	}

	fmt.Printf("Event Name: %s\n", eventName)

	// Unpack non-indexed data
	eventData := make(map[string]interface{})
	err := p.contractAbi.UnpackIntoMap(eventData, eventName, vLog.Data)
	if err != nil {
		fmt.Printf("Error unpacking event data: %v\n", err)
		return
	}

	// Parse indexed parameters from topics
	abiEvent := p.contractAbi.Events[eventName]
	topicIndex := 1 // Skip event signature
	for _, input := range abiEvent.Inputs {
		if input.Indexed && topicIndex < len(vLog.Topics) {
			topic := vLog.Topics[topicIndex]
			switch input.Type.T {
			case abi.AddressTy:
				eventData[input.Name] = common.BytesToAddress(topic.Bytes())
			case abi.UintTy, abi.IntTy:
				eventData[input.Name] = topic.Big()
			case abi.BoolTy:
				eventData[input.Name] = topic.Big().Uint64() != 0
			case abi.StringTy, abi.BytesTy:
				eventData[input.Name] = topic.Hex()
			default:
				eventData[input.Name] = topic.Hex()
			}
			topicIndex++
		}
	}

	// Print event parameters
	fmt.Println("Event Parameters:")
	for name, value := range eventData {
		fmt.Printf("  %s: %v\n", name, value)
	}

	// Get block for timestamp
	block, err := p.client.BlockByNumber(context.Background(), big.NewInt(int64(vLog.BlockNumber)))
	if err != nil {
		fmt.Printf("Error fetching block: %v\n", err)
		return
	}

	// Find matching rule
	rules, err := p.app.FindRecordsByFilter(database.RulesCollection, fmt.Sprintf("contract_address = '%s' && active = true", strings.ToLower(vLog.Address.Hex())), "", 0, 0)
	if err != nil {
		fmt.Printf("Error fetching rules: %v\n", err)
		return
	}

	var matchingRule *core.Record
	fmt.Printf("Found %d active rules for contract %s\n", len(rules), vLog.Address.Hex())
	for _, rule := range rules {
		ruleSigStr := rule.GetString("event_signature")
		ruleSig := crypto.Keccak256Hash([]byte(ruleSigStr))
		if ruleSig == eventSig {
			// TODO: Check filters
			matchingRule = rule
			break
		}
	}

	if matchingRule == nil {
		fmt.Println("No matching rule found")
		return
	}

	// Save notification
	collection, err := p.app.FindCollectionByNameOrId(database.Notifications)
	if err != nil {
		fmt.Printf("Error finding notifications collection: %v\n", err)
		return
	}

	record := core.NewRecord(collection)
	record.Set("rule_id", matchingRule.Id)
	record.Set("event_data", eventData)
	record.Set("status", "pending")
	record.Set("block", vLog.BlockNumber)
	record.Set("block_timestamp", time.Unix(int64(block.Time()), 0).Format(time.RFC3339))
	record.Set("tx_hash", vLog.TxHash.Hex())

	if err := p.app.Save(record); err != nil {
		fmt.Printf("Error saving notification: %v\n", err)
		return
	}

	fmt.Println("Notification saved")

	// Send notification based on adapter
	adapterType := matchingRule.GetString("adapter")
	adapterValue := matchingRule.GetString("adapter_value")
	if adapterValue == "" {
		fmt.Println("adapter_value is empty")
		return
	}

	message := p.formatMessage(eventName, eventData, vLog, block)

	if adapterType == "telegram" {
		if p.telegramToken == "" {
			fmt.Println("Telegram token not configured")
			return
		}
		notifier := adapter.NewTelegramNotifier(p.telegramToken)
		if err := notifier.SendMessage(adapterValue, message); err != nil {
			fmt.Printf("Error sending Telegram notification: %v\n", err)
		}
	} else if adapterType == "discord" {
		notifier := adapter.NewDiscordNotifier()
		if err := notifier.SendMessage(adapterValue, message); err != nil {
			fmt.Printf("Error sending Discord notification: %v\n", err)
		}
	} else {
		fmt.Printf("Unknown adapter: %s\n", adapterType)
	}

	record.Set("status", "sent")
	if err := p.app.Save(record); err != nil {
		fmt.Printf("Error updating notification status: %v\n", err)
		return
	}
}

// ProcessLogs processes multiple logs
func (p *Processor) ProcessLogs(logs []types.Log) {
	fmt.Printf("Found %d logs\n", len(logs))

	for i, vLog := range logs {
		fmt.Printf("\n--- Log %d ---\n", i+1)
		fmt.Printf("Transaction Hash: %s\n", vLog.TxHash.Hex())
		fmt.Printf("Block Number: %d\n", vLog.BlockNumber)
		fmt.Printf("Contract Address: %s\n", vLog.Address.Hex())

		p.ProcessEvent(vLog)
	}
}

// formatMessage formats the event data into a human-readable Markdown message
func (p *Processor) formatMessage(eventName string, eventData map[string]interface{}, vLog types.Log, block *types.Block) string {
	message := fmt.Sprintf("*New Event Detected*\n\n**Event:** %s\n**Contract:** %s\n**Block:** %d\n**Timestamp:** %s\n**Tx Hash:** %s\n\n**Parameters:**\n",
		eventName,
		vLog.Address.Hex(),
		vLog.BlockNumber,
		time.Unix(int64(block.Time()), 0).Format("2006-01-02 15:04:05 UTC"),
		vLog.TxHash.Hex(),
	)

	for key, value := range eventData {
		var valStr string
		switch v := value.(type) {
		case common.Address:
			valStr = v.Hex()
		case *big.Int:
			valStr = v.String()
		case bool:
			valStr = fmt.Sprintf("%t", v)
		default:
			valStr = fmt.Sprintf("%v", v)
		}
		message += fmt.Sprintf("- *%s:* %s\n", key, valStr)
	}

	return message
}

// formatEventMessage formats the event data into a human-readable Markdown message
func (p *Processor) formatEventMessage(eventName string, eventData map[string]interface{}, vLog types.Log, block *types.Block) string {
	message := fmt.Sprintf("*Event Detected: %s*\n\n", eventName)
	message += fmt.Sprintf("*Transaction Hash:* `%s`\n", vLog.TxHash.Hex())
	message += fmt.Sprintf("*Block Number:* `%d`\n", vLog.BlockNumber)
	message += fmt.Sprintf("*Block Timestamp:* `%s`\n", time.Unix(int64(block.Time()), 0).Format(time.RFC3339))
	message += fmt.Sprintf("*Contract Address:* `%s`\n\n", vLog.Address.Hex())
	message += "*Event Parameters:*\n"

	for name, value := range eventData {
		message += fmt.Sprintf("• *%s:* `%v`\n", name, value)
	}

	return message
}

// sendTelegramMessage sends a message to a Telegram chat
func (p *Processor) sendTelegramMessage(chatID, message string) error {
	// Implement Telegram message sending logic here
	return nil
}
