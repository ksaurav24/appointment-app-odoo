"use client"

import { useEffect, useState } from "react"

import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs"
import type { AuditLog, ListAuditLogsQuery, Role } from "@/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

const ACTOR_ROLES: Array<Role | "ANY"> = [
  "ANY",
  "ADMIN",
  "ORGANIZER",
  "CUSTOMER",
]

const PAGE_SIZE = 20

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("")
  const [entityType, setEntityType] = useState("")
  const [actorRole, setActorRole] = useState<Role | "ANY">("ANY")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [skip, setSkip] = useState(0)

  const [debouncedAction, setDebouncedAction] = useState("")
  const [debouncedEntity, setDebouncedEntity] = useState("")

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedAction(action.trim())
      setDebouncedEntity(entityType.trim())
      setSkip(0)
    }, 300)
    return () => clearTimeout(handle)
  }, [action, entityType])

  const query: ListAuditLogsQuery = {
    take: PAGE_SIZE,
    skip,
    ...(debouncedAction ? { action: debouncedAction } : {}),
    ...(debouncedEntity ? { entityType: debouncedEntity } : {}),
    ...(actorRole !== "ANY" ? { actorRole } : {}),
    ...(from ? { from: new Date(from).toISOString() } : {}),
    ...(to ? { to: new Date(to).toISOString() } : {}),
  }

  const logsQuery = useAdminAuditLogs(query)
  const items = logsQuery.data?.items ?? []
  const total = logsQuery.data?.total ?? 0

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Audit logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Review admin and platform activity.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="action" className="text-xs">
                Action
              </Label>
              <Input
                id="action"
                placeholder="organization.approve"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="entity-type" className="text-xs">
                Entity type
              </Label>
              <Input
                id="entity-type"
                placeholder="organization"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Actor role</Label>
              <div className="flex flex-wrap gap-1">
                {ACTOR_ROLES.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={actorRole === r ? "default" : "outline"}
                    onClick={() => {
                      setActorRole(r)
                      setSkip(0)
                    }}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-from" className="text-xs">
                From
              </Label>
              <Input
                id="audit-from"
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setSkip(0)
                }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="audit-to" className="text-xs">
                To
              </Label>
              <Input
                id="audit-to"
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setSkip(0)
                }}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            {logsQuery.isFetching ? (
              <Spinner className="size-4" />
            ) : (
              <span>{total.toLocaleString()} entries</span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAction("")
                setEntityType("")
                setActorRole("ANY")
                setFrom("")
                setTo("")
                setSkip(0)
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {logsQuery.isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No audit log entries match these filters.
            </CardContent>
          </Card>
        ) : (
          items.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </div>

      <Pagination
        skip={skip}
        take={PAGE_SIZE}
        total={total}
        onChange={setSkip}
      />
    </div>
  )
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0

  return (
    <Card>
      <CardContent className="space-y-2 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{log.action}</Badge>
            <Badge variant="outline">{log.entityType}</Badge>
            <span className="font-mono text-xs text-muted-foreground">
              {log.entityId}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(log.createdAt).toLocaleString()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {log.actor ? (
            <span>
              <span className="font-medium text-foreground">
                {log.actor.fullName}
              </span>{" "}
              ({log.actor.email})
            </span>
          ) : log.actorId ? (
            <span className="font-mono">{log.actorId}</span>
          ) : (
            <span>System</span>
          )}
          {log.actorRole ? (
            <Badge variant="secondary" className="text-[10px]">
              {log.actorRole}
            </Badge>
          ) : null}
          {log.ipAddress ? (
            <span className="font-mono">{log.ipAddress}</span>
          ) : null}
        </div>

        {hasMetadata ? (
          <div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setExpanded((s) => !s)}
            >
              {expanded ? "Hide metadata" : "Show metadata"}
            </Button>
            {expanded ? (
              <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Pagination({
  skip,
  take,
  total,
  onChange,
}: {
  skip: number
  take: number
  total: number
  onChange: (next: number) => void
}) {
  const page = Math.floor(skip / take) + 1
  const totalPages = Math.max(1, Math.ceil(total / take))
  if (total <= take) return null
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={skip === 0}
          onClick={() => onChange(Math.max(0, skip - take))}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={skip + take >= total}
          onClick={() => onChange(skip + take)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
