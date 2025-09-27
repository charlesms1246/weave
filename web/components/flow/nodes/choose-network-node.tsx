"use client"
import { Handle, Position, useNodeId, useUpdateNodeInternals } from "@xyflow/react"
import { useEffect, useRef } from "react"

const networks = ["0G Mainnet"] as const

type Props = {
  data: {
    title?: string
    network?: (typeof networks)[number]
    onChange?: (id: string, updates: Record<string, any>) => void
  }
}

export function ChooseNetworkNode({ data }: Props) {
  const id = useNodeId() || ""
  const onChange = data.onChange
  const containerRef = useRef<HTMLDivElement | null>(null)
  const updateNodeInternals = useUpdateNodeInternals()

  useEffect(() => {
    if (!id || !containerRef.current) return
    const ro = new ResizeObserver(() => updateNodeInternals(id))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [id, updateNodeInternals])

  return (
    <>
      <div
        ref={containerRef}
        className="resize overflow-auto bg-card text-card-foreground rounded-lg border shadow-md p-4 box-border flex flex-col gap-3"
        style={{ minWidth: 240, minHeight: 120 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{data.title || "Choose Network"}</h3>
          <span className="text-xs text-muted-foreground">Node</span>
        </div>

        <label className="text-xs text-muted-foreground">Network</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={data.network || "Ethereum"}
          onChange={(e) => onChange?.(id, { network: e.target.value })}
        >
          {networks.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        <div className="mt-2 text-xs text-muted-foreground">Select the blockchain to monitor.</div>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </>
  )
}
