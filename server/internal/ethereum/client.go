package ethereum

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/pintoinfant/weave/internal/database"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

// Client wraps the Ethereum client with additional functionality
type Client struct {
	*ethclient.Client
}

// NewClient creates a new Ethereum client connection
func NewClient(wsURL string) (*Client, error) {
	client, err := ethclient.Dial(wsURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum: %v", err)
	}
	return &Client{Client: client}, nil
}

// LoadContractABI loads and parses a contract ABI from a file
func LoadContractABI(path string) (abi.ABI, error) {
	abiFileContent, err := os.ReadFile(path)
	if err != nil {
		return abi.ABI{}, fmt.Errorf("failed to read contract ABI file: %v", err)
	}

	contractAbi, err := abi.JSON(strings.NewReader(string(abiFileContent)))
	if err != nil {
		return abi.ABI{}, fmt.Errorf("failed to parse ABI: %v", err)
	}

	return contractAbi, nil
}

// GetLatestBlockNumber returns the latest block number
func (c *Client) GetLatestBlockNumber() (uint64, error) {
	latestBlock, err := c.BlockNumber(context.Background())
	if err != nil {
		return 0, fmt.Errorf("failed to get latest block: %v", err)
	}
	return latestBlock, nil
}

// SubscribeToLogs subscribes to new logs for a contract
func (c *Client) SubscribeToLogs(contractAddress common.Address, logsChan chan types.Log) (ethereum.Subscription, error) {
	query := ethereum.FilterQuery{
		Addresses: []common.Address{contractAddress},
	}

	sub, err := c.SubscribeFilterLogs(context.Background(), query, logsChan)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to logs: %v", err)
	}

	return sub, nil
}

// SubscribeToRules subscribes to logs for all active rules from the database
func (c *Client) SubscribeToRules(app *pocketbase.PocketBase, logsChan chan types.Log) ([]ethereum.Subscription, error) {
	records, err := app.FindRecordsByFilter(database.RulesCollection, "active = true", "", 0, 0)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch rules: %v", err)
	}

	var subscriptions []ethereum.Subscription
	for _, record := range records {
		contractAddress := common.HexToAddress(record.GetString("contract_address"))
		eventSigStr := record.GetString("event_signature")
		eventSig := crypto.Keccak256Hash([]byte(eventSigStr))

		query := ethereum.FilterQuery{
			Addresses: []common.Address{contractAddress},
			Topics:    [][]common.Hash{{eventSig}},
		}

		sub, err := c.SubscribeFilterLogs(context.Background(), query, logsChan)
		if err != nil {
			return nil, fmt.Errorf("failed to subscribe to contract %s event %s: %v", contractAddress.Hex(), eventSigStr, err)
		}
		subscriptions = append(subscriptions, sub)
	}

	return subscriptions, nil
}

// SubscribeToRule subscribes to logs for a single rule
func (c *Client) SubscribeToRule(rule *core.Record, logsChan chan types.Log) error {
	contractAddress := common.HexToAddress(rule.GetString("contract_address"))
	eventSigStr := rule.GetString("event_signature")
	eventSig := crypto.Keccak256Hash([]byte(eventSigStr))

	query := ethereum.FilterQuery{
		Addresses: []common.Address{contractAddress},
		Topics:    [][]common.Hash{{eventSig}},
	}

	_, err := c.SubscribeFilterLogs(context.Background(), query, logsChan)
	return err
}
