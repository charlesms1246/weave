/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import React, { useCallback } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from "@xyflow/react"
// @ts-ignore
import "@xyflow/react/dist/style.css"

import { ChooseNetworkNode } from "../components/flow/nodes/choose-network-node"
import { ContractEventNode } from "../components/flow/nodes/contract-event-node"
import { NotificationAdapterNode } from "../components/flow/nodes/notification-adapter-node"
import { AdditionalFilterNode } from "../components/flow/nodes/additional-filter-node"
import { CreateRequestNode } from "../components/flow/nodes/create-request-node"
import { useToast } from "../components/ui/use-toast"

type FlowNode = Node

const nodeTypes = {
  chooseNetwork: ChooseNetworkNode,
  contractEvent: ContractEventNode,
  notificationAdapter: NotificationAdapterNode,
  additionalFilter: AdditionalFilterNode,
  createRequest: CreateRequestNode,
}

// Initial nodes arranged vertically for a clear, n8n-like pipeline
const initialNodes: FlowNode[] = [
  {
    id: "choose-network",
    type: "chooseNetwork",
    position: { x: 120, y: 40 },
    data: {
      title: "Choose Network",
      network: "0G Mainnet",
    },
    width: 320,
    height: 160,
  },
  {
    id: "contract-event",
    type: "contractEvent",
    position: { x: 120, y: 260 },
    data: {
      title: "Contract Event",
      address: "",
      eventSignature: "",
    },
    width: 360,
    height: 200,
  },
  {
    id: "additional-filter",
    type: "additionalFilter",
    position: { x: 120, y: 520 },
    data: {
      title: "Additional Filter",
      filters: [{ key: "from", value: "" }],
    },
    width: 380,
    height: 240,
  },
  {
    id: "notification-adapter",
    type: "notificationAdapter",
    position: { x: 120, y: 820 },
    data: {
      title: "Notification Adapter",
      adapter: "Discord webhook",
      config: { webhookUrl: "" },
    },
    width: 380,
    height: 260,
  },
  {
    id: "create-request",
    type: "createRequest",
    position: { x: 120, y: 1140 },
    data: {
      title: "Create Weave",
    },
    width: 380,
    height: 120,
  },
]

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "choose-network",
    target: "contract-event",
    animated: true,
    type: "smoothstep",
  },
  {
    id: "e2-3",
    source: "contract-event",
    target: "additional-filter",
    animated: true,
    type: "smoothstep",
  },
  {
    id: "e3-4",
    source: "additional-filter",
    target: "notification-adapter",
    animated: true,
    type: "smoothstep",
  },
  {
    id: "e4-5",
    source: "notification-adapter",
    target: "create-request",
    animated: true,
    type: "smoothstep",
  },
]

export default function Page() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)

  const updateNodeData = useCallback(
    (id: string, updates: Record<string, any>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)))
    },
    [setNodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds)),
    [setEdges],
  )

  const handleCreateRequest = useCallback(async () => {
    setIsLoading(true)
    const payload: Record<string, any> = { active: true }

    nodes.forEach((node) => {
      const data = node.data as any
      switch (node.type) {
        case "chooseNetwork":
          payload.chain = data.network.toLowerCase()
          break
        case "contractEvent":
          payload.contract_address = data.address
          payload.event_signature = data.eventSignature
          break
        case "additionalFilter":
          const filters: Record<string, any> = {}
          if (data.filters) {
            data.filters.forEach((filter: { key: string; value: string }) => {
              if (filter.key && filter.value) {
                filters[filter.key] = filter.value
              }
            })
          }
          payload.filters = filters
          break
        case "notificationAdapter":
          const adapterMapping: Record<string, string> = {
            "Discord webhook": "discord",
            "Telegram bot": "telegram",
            Email: "email",
            Webhook: "webhook",
          }
          payload.adapter = adapterMapping[data.adapter]

          switch (data.adapter) {
            case "Discord webhook":
              payload.adapter_value = data.config.webhookUrl
              break
            case "Telegram bot":
              payload.adapter_value = data.config.chatId
              break
            case "Email":
              payload.adapter_value = data.config.to
              break
            case "Webhook":
              payload.adapter_value = data.config.url
              break
          }
          break
        default:
          break
      }
    })

    console.log("Creating Weave with the following configuration:")
    console.log(JSON.stringify(payload, null, 2))

    try {
      const response = await fetch("http://localhost:8090/weave/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "Weave created successfully!",
          description: "Your new weave is now active.",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error creating Weave",
          description: errorData.message || "An unknown error occurred.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Could not connect to the server. Please check your connection.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [nodes, toast])

  const nodesWithHandlers = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onChange: updateNodeData,
      onCreate: n.type === "createRequest" ? handleCreateRequest : undefined,
      isLoading: n.type === "createRequest" ? isLoading : undefined,
    },
  }))

  return (
    <main className="h-[100vh] bg-background">
      <section className="h-full w-full">
        <ReactFlow
          nodes={nodesWithHandlers}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <MiniMap className="!bg-card !text-card-foreground !rounded-md !border" />
          <Controls className="!bg-card !rounded-md !border" />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </section>
    </main>
  )
}
