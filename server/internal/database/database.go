package database

import (
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

var RulesCollection = "rules"
var Notifications = "notifications"

func InitializeCollections(app *pocketbase.PocketBase) error {
	initFuncs := []func(*pocketbase.PocketBase) error{
		InitializeRulesCollection,
		InitializeNotificationCollection,
	}

	for _, initFunc := range initFuncs {
		if err := initFunc(app); err != nil {
			return err
		}
	}

	return nil
}

func InitializeRulesCollection(app *pocketbase.PocketBase) error {
	if c, _ := app.FindCollectionByNameOrId(RulesCollection); c != nil {
		return nil
	}

	c := core.NewBaseCollection(RulesCollection)
	c.Fields.Add(&core.TextField{Name: "contract_address", Required: true})
	c.Fields.Add(&core.TextField{Name: "event_signature", Required: true})
	c.Fields.Add(&core.TextField{Name: "chain", Required: true})
	c.Fields.Add(&core.JSONField{Name: "filters"})
	c.Fields.Add(&core.SelectField{Name: "adapter", Values: []string{"telegram", "discord"}, Required: true})
	c.Fields.Add(&core.TextField{Name: "adapter_value", Required: true})
	c.Fields.Add(&core.BoolField{Name: "active"})
	c.Fields.Add(&core.AutodateField{Name: "created_at", OnCreate: true})
	c.Fields.Add(&core.AutodateField{Name: "updated_at", OnUpdate: true})

	return app.Save(c)
}

func InitializeNotificationCollection(app *pocketbase.PocketBase) error {
	if c, _ := app.FindCollectionByNameOrId(Notifications); c != nil {
		return nil
	}

	rulesCol, _ := app.FindCollectionByNameOrId(RulesCollection)

	c := core.NewBaseCollection(Notifications)
	c.Fields.Add(&core.RelationField{Name: "rule_id", Required: true, CollectionId: rulesCol.Id})
	c.Fields.Add(&core.JSONField{Name: "event_data", Required: true})
	c.Fields.Add(&core.SelectField{Name: "status", Values: []string{"pending", "sent", "failed"}, Required: true})
	c.Fields.Add(&core.NumberField{Name: "block", Required: true})
	c.Fields.Add(&core.TextField{Name: "block_timestamp", Required: true})
	c.Fields.Add(&core.TextField{Name: "tx_hash", Required: true})
	c.Fields.Add(&core.AutodateField{Name: "created_at", OnCreate: true})
	c.Fields.Add(&core.AutodateField{Name: "updated_at", OnUpdate: true})

	return app.Save(c)
}
