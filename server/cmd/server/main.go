package main

import (
	"log"
	"os"

	"github.com/ethereum/go-ethereum/core/types"
	"github.com/charlesms1246/weave/internal/config"
	"github.com/charlesms1246/weave/internal/database"
	ethclient "github.com/charlesms1246/weave/internal/ethereum"
	"github.com/charlesms1246/weave/internal/events"
	"github.com/charlesms1246/weave/internal/handlers"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	cfg := config.Load()

	app := pocketbase.New()

	// Allow PB to listen on custom port if PB_PORT is set (fallback to PB default 8090)
	if port := os.Getenv("PB_PORT"); port != "" {
		app.RootCmd.SetArgs([]string{"serve", "--http", ":" + port})
	}

	// Register routes after PocketBase boot.
	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if err := database.InitializeCollections(app); err != nil {
			return err
		}

		logsChan := make(chan types.Log)
		newRulesChan := make(chan *core.Record)

		se.Router.POST("/weave/add", handlers.AddRules(newRulesChan))
		se.Router.DELETE("/weave/delete/{id}", handlers.DeleteRule())

		// Initialize Ethereum client and subscribe to rules
		ethClient, err := ethclient.NewClient(cfg.WSRPC)
		if err != nil {
			return err
		}

		contractAbi, err := ethclient.LoadContractABI("abi.json")
		if err != nil {
			return err
		}

		processor := events.NewProcessor(contractAbi, app, ethClient, cfg.TelegramBotToken)

		_, err = ethClient.SubscribeToRules(app, logsChan)
		if err != nil {
			return err
		}

		// Start goroutine to process logs and new rules
		go func() {
			for {
				select {
				case vLog := <-logsChan:
					processor.ProcessEvent(vLog)
				case newRule := <-newRulesChan:
					// Subscribe to new rule
					ethClient.SubscribeToRule(newRule, logsChan)
				}
			}
		}()

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
