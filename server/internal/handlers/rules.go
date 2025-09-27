package handlers

import (
	"encoding/json"

	"github.com/pintoinfant/weave/internal/database"
	"github.com/pocketbase/pocketbase/core"
)

type Rules struct {
	ContractAddress string                 `json:"contract_address"`
	EventSignature  string                 `json:"event_signature"`
	Chain           string                 `json:"chain"`
	Filters         map[string]interface{} `json:"filters,omitempty"`
	Adapter         string                 `json:"adapter"`
	AdapterValue    string                 `json:"adapter_value"`
	Active          bool                   `json:"active,omitempty"`
}

// Endpoint to add new rules to the database.
func AddRules(newRulesChan chan<- *core.Record) func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		var rules Rules
		if err := json.NewDecoder(e.Request.Body).Decode(&rules); err != nil {
			return e.BadRequestError("Invalid JSON", err)
		}

		collection, err := e.App.FindCollectionByNameOrId(database.RulesCollection)
		if err != nil {
			return e.InternalServerError("Failed to find collection", err)
		}

		record := core.NewRecord(collection)
		record.Set("contract_address", rules.ContractAddress)
		record.Set("event_signature", rules.EventSignature)
		record.Set("chain", rules.Chain)
		record.Set("filters", rules.Filters)
		record.Set("adapter", rules.Adapter)
		record.Set("adapter_value", rules.AdapterValue)
		record.Set("active", rules.Active)

		if err := e.App.Save(record); err != nil {
			return e.InternalServerError("Failed to save record", err)
		}

		// If active, notify to subscribe
		if record.GetBool("active") {
			select {
			case newRulesChan <- record:
			default:
				// Non-blocking send
			}
		}

		return e.JSON(200, record)
	}
}

func DeleteRule() func(e *core.RequestEvent) error {
	return func(e *core.RequestEvent) error {
		rule_id := e.Request.PathValue("id")
		record, err := e.App.FindRecordById(database.RulesCollection, rule_id)
		if err != nil {
			return err
		}

		return e.App.Delete(record)
	}
}
