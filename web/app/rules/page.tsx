"use client"

import { useEffect, useState } from "react"
import PocketBase from "pocketbase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const pb = new PocketBase("http://127.0.0.1:8090/")

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRules() {
      try {
        const records = await pb.collection("rules").getFullList({
          sort: "-created_at",
          requestKey: null
        })
        console.log("Fetched rules:", records)
        setRules(records)
      } catch (error) {
        console.error("Failed to fetch rules:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRules()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <main className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Weave Rules</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Weaves</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Contract Address</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Adapter</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length > 0 ? (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant={rule.active ? "default" : "outline"}>
                        {rule.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{rule.chain}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs max-w-xs truncate">{rule.contract_address}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{rule.event_signature}</TableCell>
                    <TableCell className="capitalize">{rule.adapter}</TableCell>
                    <TableCell>{new Date(rule.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No rules found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
