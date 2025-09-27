"use client"
import { Handle, Position, useNodeId } from "@xyflow/react"
import { Loader2 } from "lucide-react"

type Props = {
  data: {
    title?: string
    onCreate?: () => void
    isLoading?: boolean
  }
}

export function CreateRequestNode({ data }: Props) {
  const id = useNodeId() || ""

  return (
    <>
      <div
        className="bg-card text-card-foreground rounded-lg border shadow-md p-4 box-border flex flex-col gap-3"
        style={{ minWidth: 300, height: 220 }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{data.title || "Create Request"}</h3>
          <span className="text-xs text-muted-foreground">Action</span>
        </div>

        <button
          className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          onClick={data.onCreate}
          disabled={data.isLoading}
        >
          {data.isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Create Weave"}
        </button>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
    </>
  )
}
