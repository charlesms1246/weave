"use client"
import { Handle, Position, useNodeId, useUpdateNodeInternals } from "@xyflow/react"
import { useEffect, useRef } from "react"

type FilterKV = { key: string; value: string }

export function AdditionalFilterNode({
  data,
}: { data: { title?: string; filters?: FilterKV[]; onChange?: (id: string, updates: Record<string, any>) => void } }) {
  const id = useNodeId() || ""
  const onChange = data.onChange
  const filters = data.filters || []

  const containerRef = useRef<HTMLDivElement | null>(null)
  const updateNodeInternals = useUpdateNodeInternals()

  useEffect(() => {
    if (!id || !containerRef.current) return
    const ro = new ResizeObserver(() => updateNodeInternals(id))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [id, updateNodeInternals])

  const updateFilter = (index: number, field: "key" | "value", value: string) => {
    const next = filters.map((f, i) => (i === index ? { ...f, [field]: value } : f))
    onChange?.(id, { filters: next })
  }

  const addFilter = () => onChange?.(id, { filters: [...filters, { key: "", value: "" }] })
  const removeFilter = (index: number) => onChange?.(id, { filters: filters.filter((_, i) => i !== index) })

  return (
    <>
      <div
        ref={containerRef}
        className="resize overflow-auto bg-card text-card-foreground rounded-lg border shadow-md p-4 box-border flex flex-col gap-3"
        style={{ minWidth: 300, minHeight: 180 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{data.title || "Additional Filter"}</h3>
          <span className="text-xs text-muted-foreground">Node</span>
        </div>

        <div className="flex flex-col gap-2">
          {filters.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input
                type="text"
                placeholder="key"
                className="col-span-5 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={f.key}
                onChange={(e) => updateFilter(i, "key", e.target.value)}
              />
              <input
                type="text"
                placeholder="value"
                className="col-span-6 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={f.value}
                onChange={(e) => updateFilter(i, "value", e.target.value)}
              />
              <button
                className="col-span-1 inline-flex items-center justify-center rounded-md border border-input bg-secondary text-foreground text-xs h-9"
                onClick={() => removeFilter(i)}
                aria-label="Remove filter"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            className="mt-2 inline-flex items-center justify-center rounded-md border border-input bg-secondary text-foreground text-sm h-9"
            onClick={addFilter}
          >
            Add Filter
          </button>
        </div>

        <p className="text-xs text-muted-foreground">Add optional key/value filters to refine events.</p>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </>
  )
}
