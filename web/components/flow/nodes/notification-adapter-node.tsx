"use client"
import { Handle, Position, useNodeId, useUpdateNodeInternals } from "@xyflow/react"
import { useEffect, useRef } from "react"

const adapters = ["Discord webhook", "Telegram bot", "Email", "Webhook"] as const
type Adapter = (typeof adapters)[number]

type Props = {
  data: {
    title?: string
    adapter?: Adapter
    config?: Record<string, any>
    onChange?: (id: string, updates: Record<string, any>) => void
  }
}

export function NotificationAdapterNode({ data }: Props) {
  const id = useNodeId() || ""
  const onChange = data.onChange
  const adapter = (data.adapter || "Discord webhook") as Adapter
  const config = data.config || {}

  const setConfig = (partial: Record<string, any>) => {
    onChange?.(id, { config: { ...config, ...partial } })
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    if (!id || !containerRef.current) return
    const ro = new ResizeObserver(() => updateNodeInternals(id))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [id, updateNodeInternals])

  const renderFields = () => {
    switch (adapter) {
      case "Discord webhook":
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Webhook URL</label>
            <input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={config.webhookUrl ?? ""}
              onChange={(e) => setConfig({ webhookUrl: e.target.value })}
            />
          </div>
        )
      case "Telegram bot":
        return (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Chat ID</label>
              <input
                type="text"
                placeholder="@channel or numeric id"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config.chatId ?? ""}
                onChange={(e) => setConfig({ chatId: e.target.value })}
              />
          </div>
        )
      case "Email":
        return (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Recipient Email</label>
            <input
              type="email"
              placeholder="user@example.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={config.to ?? ""}
              onChange={(e) => setConfig({ to: e.target.value })}
            />
          </div>
        )
      case "Webhook":
        return (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-muted-foreground">URL</label>
              <input
                type="url"
                placeholder="https://your-service.com/hook"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config.url ?? ""}
                onChange={(e) => setConfig({ url: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Method</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config.method ?? "POST"}
                onChange={(e) => setConfig({ method: e.target.value })}
              >
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Content-Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={config.contentType ?? "application/json"}
                onChange={(e) => setConfig({ contentType: e.target.value })}
              >
                <option>application/json</option>
                <option>text/plain</option>
                <option>application/x-www-form-urlencoded</option>
              </select>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className="resize overflow-auto bg-card text-card-foreground rounded-lg border shadow-md p-4 box-border flex flex-col gap-3"
        style={{ minWidth: 300, minHeight: 200 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{data.title || "Notification Adapter"}</h3>
          <span className="text-xs text-muted-foreground">Node</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Adapter</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={adapter}
            onChange={(e) =>
              onChange?.(id, {
                adapter: e.target.value,
                config: {}, // reset config on adapter change
              })
            }
          >
            {adapters.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {renderFields()}

        <p className="text-xs text-muted-foreground">Configure how notifications are sent.</p>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </>
  )
}
