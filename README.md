# WEAVE 📡 — Visual Automation for 0G

> Visually automate contract alerts on the 0G EVM chain. Drag nodes → pick a contract/event → (optional) filters → choose an adapter → ship real-time alerts to Discord/Telegram. No indexer. No code.

<p align="left">
  <img alt="Dev tooling" src="https://img.shields.io/badge/category-dev%20tooling-blueviolet">
  <img alt="Stack" src="https://img.shields.io/badge/stack-Next.js%20%7C%20Go%20%7C%20PocketBase%20%7C%20go--ethereum-informational">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## ✨ What is WEAVE?

**WEAVE** is a no-code, node-based editor to define **rules** that watch on-chain events and send alerts.

* **Frontend (Next.js + ReactFlow):** a canvas where you build a “Listener” by connecting nodes: *Network → Contract + Event → Filters → Adapter*.
* **Backend (Go + PocketBase):** subscribes to EVM logs over **WebSocket**, **decodes** events using an **ABI**, persists matches, and **dispatches notifications** to Discord/Telegram.

Built primarily for **0G mainnet (EVM)** to give teams fast, reliable observability without writing indexers.

---

## 🧩 Features

* 🎛️ **Visual rule builder** (ReactFlow canvas)
* ⚡ **Real-time** EVM log subscriptions (WS)
* 🧠 **ABI-aware decoding** (indexed & non-indexed params)
* 🔔 **Adapters:** Discord Webhook & Telegram Bot (extensible)
* 🗃️ **PocketBase** storage for `rules` and `notifications`
* 🛠️ MVP-practical: simple schema bootstrap, minimal config

**Planned**
Filters on decoded fields, composite rules (AND/OR + time windows), more adapters (Slack, Email, Webhook), retry/backoff, per-rule ABI, orgs/RBAC, metrics.

---

## 🖼️ Architecture

```
User → Web App (Next.js + ReactFlow)
     → POST /weave/add → PocketBase (rules)
     → WS subscribe (Go + go-ethereum) → 0G EVM node
     → On log: ABI decode → PocketBase (notifications)
     → Adapter send (Discord/Telegram)
```

*(Add `/docs/architecture.png` to your repo if you want a diagram image.)*

---

## 🗂️ Repository Structure

```
/server
  ├─ cmd/server/main.go        # Boot PB, routes, WS client, processor
  ├─ internal/
  │   ├─ config/               # env (WS_RPC, etc.)
  │   ├─ database/             # bootstraps collections
  │   ├─ handlers/             # POST /weave/add, DELETE /weave/delete/:id
  │   ├─ ethereum/             # WS ethclient, ABI loader, subscriptions
  │   ├─ events/               # decoder + match + persist + dispatch
  │   └─ adapter/              # discord.go, telegram.go
  ├─ abi.json                  # ABI used by decoder (MVP: single file)
  └─ .env.example

/web
  ├─ app/page.tsx              # Canvas (ReactFlow)
  ├─ app/rules/page.tsx        # Rules table (PocketBase client)
  ├─ components/flow/nodes/*   # Node UIs
  ├─ components/ui/*           # shadcn/ui kit
  └─ .env.local.example
```

---

## 🔌 PocketBase Schema

**rules**

* `contract_address` (text, required)
* `event_signature` (text, required) — e.g. `Transfer(address,address,uint256)`
* `chain` (text, required) — e.g. `0G Mainnet`
* `filters` (json, optional)
* `adapter` (select: `telegram` | `discord`)
* `adapter_value` (text, required) — webhook URL or chat/channel id
* `active` (bool)
* `created`, `updated` (timestamps)

**notifications**

* `rule_id` (relation → rules)
* `event_data` (json)
* `status` (`pending|sent|failed`)
* `block` (number), `block_timestamp` (text), `tx_hash` (text)
* `created`, `updated` (timestamps)

> **Note:** PocketBase uses `created`/`updated` fields, not `created_at`/`updated_at`.

---

## 🧪 Example JSON Payload (from the canvas → server)

```json
{
  "contract_address": "0x6C231ba135f9a169457B51db0F18aafbfc90E473",
  "event_signature": "Transfer(address,address,uint256)",
  "chain": "0G Mainnet",
  "filters": {},
  "adapter": "discord",
  "adapter_value": "https://discord.com/api/webhooks/XXXX/XXXX",
  "active": true
}
```

---

## 🧰 Prerequisites

* **Go** ≥ 1.21
* **Node.js** ≥ 18, **pnpm**
* **PocketBase** (embedded by the Go app; no separate install needed)
* An **EVM WebSocket RPC** for 0G (WS endpoint required for live logs)
* Optional: **Discord webhook** or **Telegram bot** (adapter)

> For demos, you can deploy a tiny “echo” contract that emits `Echoed(address,string)` on command (guide below).

---

## ⚙️ Setup

### 1) Server

```bash
cd server
cp .env.example .env
# Edit .env → set WS_RPC=wss://<your_0g_ws_rpc>

# (Optional) Put your contract ABI into abi.json (for decoding)
# For an Echo demo (event: Echoed(address,string)) minimal abi.json could be:
# [
#   {"anonymous":false,"inputs":[
#     {"indexed":true,"internalType":"address","name":"caller","type":"address"},
#     {"indexed":false,"internalType":"string","name":"message","type":"string"}],
#    "name":"Echoed","type":"event"}
# ]

go mod download
go run ./cmd/server
```

The server starts PocketBase on **[http://127.0.0.1:8090](http://127.0.0.1:8090)** and exposes custom routes:

* `POST /weave/add` — create a rule
* `DELETE /weave/delete/{id}` — delete a rule

### 2) Web

```bash
cd web
cp .env.local.example .env.local
# Ensure NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090

pnpm i
pnpm dev
# open http://localhost:3000
```

---

## 🧪 Demo with EchoRepeater (optional but recommended)

**EchoRepeater.sol** (returns string and emits `Echoed` for listeners):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EchoRepeater {
    event Echoed(address indexed caller, string message);

    function echo(string calldata message) external pure returns (string memory) {
        return message;
    }

    function emitEcho(string calldata message) external {
        emit Echoed(msg.sender, message);
    }
}
```

**Event signature:** `Echoed(address,string)`

1. Deploy EchoRepeater to 0G mainnet (use Foundry or your tool of choice).
2. Export its ABI JSON into `server/abi.json` (or merge appropriately).
3. **Restart** the server so it reloads `abi.json`.
4. In the canvas:

   * Network: `0G Mainnet`
   * Contract Address: `<your_echo_addr>`
   * Event Signature: `Echoed(address,string)`
   * Adapter: `discord` (webhook) or `telegram` (chat id)
   * Active: `true` → **Create Weave**
5. Trigger an event:

   ```bash
   cast send <your_echo_addr> "emitEcho(string)" "hello-0g" \
     --rpc-url https://<your_0g_http_rpc> --private-key 0x...
   ```
6. You should see a **notification** saved and a **message** in your adapter channel.

---

## 🧭 Usage Guide

1. **Launch** server (`go run ./cmd/server`) and web (`pnpm dev`).
2. **Open** the canvas ([http://localhost:3000](http://localhost:3000)).
3. **Build a rule** by placing nodes:

   * Choose Network → Contract+Event → (Optional) Filter(s) → Notification Adapter → Create Request
4. **Create Weave**: the UI POSTs to `/weave/add` and stores the rule.
5. **Events trigger alerts**: backend subscribes to logs (WS), decodes via ABI, persists a notification, and dispatches via adapter.
6. **Inspect rules** at `/rules` and confirm adapter deliveries.

---

## 🔐 Environment Variables

**server/.env**

```dotenv
# Required: EVM WebSocket RPC (for subscriptions)
WS_RPC=wss://<your_0g_ws_rpc>

# Optional: Telegram bot token for telegram adapter
TELEGRAM_BOT_TOKEN=
```

**web/.env.local**

```dotenv
NEXT_PUBLIC_PB_URL=http://127.0.0.1:8090
# (Optional) You may add NEXT_PUBLIC_ECHO_ADDR to show a demo helper page if you build one.
```

---

## 🔗 API Endpoints (server)

* `POST /weave/add`
  Body (JSON): `contract_address`, `event_signature`, `chain`, `filters`, `adapter`, `adapter_value`, `active`
  Returns: created rule record.

* `DELETE /weave/delete/{id}`
  Deletes a rule by id.

> The server internally loads **active** rules and maintains WS subscriptions.

---

## 🛎️ Adapters

* **Discord**: expects a full webhook URL. Returns success on HTTP **204**.
* **Telegram**: Bot API `sendMessage`. Make sure the bot is an admin if sending to a channel.

**Planned:** Slack, Email, generic Webhooks (signed), PagerDuty/Opsgenie.

---

## 🧱 Implementation Notes

* **Event matching:** address + topic (`keccak(eventSignature)`).
* **Decoding:** uses `abi.json`. MVP assumes one ABI file; per-rule ABIs are a near-term upgrade.
* **Filters:** captured in UI and stored; enforcement in processor is a small follow-up (match on decoded fields).
* **Resilience:** basic retries; production hardening would add backoff, DLQ, metrics.
* **Security:** treat adapter secrets (webhooks, tokens) as sensitive; consider encryption at rest.

---

## 🩹 Troubleshooting

* **Rules page not updating:**
  Ensure the list sorts by `-created` (PocketBase uses `created`, not `created_at`) and that the web app points to the same PB base URL as the server (`http://127.0.0.1:8090`).

* **No alerts firing:**

  * Confirm **WS_RPC** is a working **WebSocket** endpoint.
  * Check that **abi.json** contains the event you’re listening for (restart server).
  * Verify exact **event signature** (no spaces, correct types).
  * Verify **adapter_value** (Discord webhook URL / Telegram chat id) and permissions.

* **Decoded fields empty/weird:**
  ABI mismatch. Export the exact contract ABI (or add per-rule ABIs) and restart.

---

## 🗺️ Roadmap (shortlist)

* Field-level filters (`from`, `to`, numeric comparisons, regex)
* Composite rules (AND/OR + time windows)
* More adapters (Slack/Email/Webhook) + retry/backoff
* Per-rule ABI upload/fetch; common ABI auto-resolve
* Health & metrics (Prometheus), rule status panel
* RBAC/orgs, secrets vault, signed webhooks

---

## 🤝 Contributing

PRs are welcome! Please:

1. Open an issue describing the change.
2. Keep diffs focused.
3. Add tests where it makes sense.

---

## 📄 License

MIT. See `LICENSE`.

---

## 🙌 Credits

* ReactFlow (`@xyflow/react`), shadcn/ui, PocketBase, go-ethereum
* Built for the 0G ecosystem to make developer observability fast and friendly.

---

### Appendix: Event Signature Examples

* **ERC-20**: `Transfer(address,address,uint256)`
* **Echo demo**: `Echoed(address,string)`
* **Custom** (example): `RoleGranted(bytes32,address,address)`

> Event signatures are case-sensitive, must include parentheses, and must use valid Solidity types.
