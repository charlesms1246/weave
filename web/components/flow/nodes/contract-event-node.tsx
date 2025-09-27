"use client"
import { Handle, Position, useNodeId, useUpdateNodeInternals } from "@xyflow/react"
import { useEffect, useRef } from "react"

type Props = {
  data: {
    title?: string
    address?: string
    eventSignature?: string
    onChange?: (id: string, updates: Record<string, any>) => void
  }
}

export function ContractEventNode({ data }: Props) {
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
        style={{ minWidth: 280, minHeight: 160 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{data.title || "Contract Event"}</h3>
          <span className="text-xs text-muted-foreground">Node</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Contract Address</label>
          <input
            type="text"
            placeholder="0x..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={data.address ?? ""}
            onChange={(e) => onChange?.(id, { address: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Event Signature</label>
          <input
            type="text"
            placeholder="Transfer(address,address,uint256)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={data.eventSignature ?? ""}
            onChange={(e) => onChange?.(id, { eventSignature: e.target.value })}
          />
        </div>

        <p className="text-xs text-muted-foreground">Define which smart contract event to listen for.</p>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </>
  )
}
