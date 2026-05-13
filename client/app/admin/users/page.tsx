"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons"

import { ApiError } from "@/lib/api"
import { useAdminUserMutations, useAdminUsers } from "@/hooks/useAdminUsers"
import type { ListUsersQuery, Role, SafeUser } from "@/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

const ROLES: Array<Role | "ALL"> = ["ALL", "ADMIN", "ORGANIZER", "CUSTOMER"]

const ACTIVE_OPTIONS = [
  { label: "Any", value: "ANY" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
] as const

type ActiveFilter = (typeof ACTIVE_OPTIONS)[number]["value"]

const PAGE_SIZE = 20

export default function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL")
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ANY")
  const [skip, setSkip] = useState(0)
  const [roleDialog, setRoleDialog] = useState<SafeUser | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(search.trim())
      setSkip(0)
    }, 300)
    return () => clearTimeout(handle)
  }, [search])

  const query: ListUsersQuery = {
    take: PAGE_SIZE,
    skip,
    ...(debounced ? { q: debounced } : {}),
    ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
    ...(activeFilter !== "ANY" ? { isActive: activeFilter === "ACTIVE" } : {}),
  }

  const usersQuery = useAdminUsers(query)
  const { activateMutation, deactivateMutation } = useAdminUserMutations()

  const total = usersQuery.data?.total ?? 0
  const items = usersQuery.data?.items ?? []

  const onToggleActive = (user: SafeUser) => {
    const action = user.isActive ? deactivateMutation : activateMutation
    action.mutate(user.id, {
      onSuccess: (updated) => {
        toast.success(updated.isActive ? "User activated" : "User deactivated")
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.messages[0] : "Action failed")
      },
    })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Users
        </h1>
        <p className="text-sm text-muted-foreground">
          Search, filter, and moderate platform users.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon icon={UserMultiple02Icon} className="size-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="user-search" className="text-xs">
                Search
              </Label>
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="user-search"
                  placeholder="Email or name"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <div className="flex flex-wrap gap-1">
                {ROLES.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={roleFilter === r ? "default" : "outline"}
                    onClick={() => {
                      setRoleFilter(r)
                      setSkip(0)
                    }}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <div className="flex flex-wrap gap-1">
                {ACTIVE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={activeFilter === opt.value ? "default" : "outline"}
                    onClick={() => {
                      setActiveFilter(opt.value)
                      setSkip(0)
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-end gap-2 text-xs text-muted-foreground">
              {usersQuery.isFetching ? (
                <Spinner className="size-4" />
              ) : (
                <span>
                  {total.toLocaleString()} result{total === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.fullName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                      {!user.emailVerified ? (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          unverified
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "default" : "destructive"}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRoleDialog(user)}
                        >
                          Change role
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isActive ? "destructive" : "default"}
                          onClick={() => onToggleActive(user)}
                          disabled={
                            activateMutation.isPending ||
                            deactivateMutation.isPending
                          }
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        skip={skip}
        take={PAGE_SIZE}
        total={total}
        onChange={setSkip}
      />

      <ChangeRoleDialog user={roleDialog} onClose={() => setRoleDialog(null)} />
    </div>
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

function ChangeRoleDialog({
  user,
  onClose,
}: {
  user: SafeUser | null
  onClose: () => void
}) {
  const { changeRoleMutation } = useAdminUserMutations()
  const [role, setRole] = useState<Role>("CUSTOMER")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setReason("")
    }
  }, [user])

  const submit = () => {
    if (!user) return
    if (role === user.role) {
      toast.info("No role change.")
      return
    }
    changeRoleMutation.mutate(
      { userId: user.id, body: { role, reason: reason.trim() } },
      {
        onSuccess: () => {
          toast.success("Role updated. User has been signed out.")
          onClose()
        },
        onError: (err) => {
          toast.error(
            err instanceof ApiError ? err.messages[0] : "Action failed"
          )
        },
      }
    )
  }

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            {user ? (
              <>
                Update role for <strong>{user.fullName}</strong> ({user.email}).
                Active sessions will be revoked.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">New role</Label>
            <div className="flex flex-wrap gap-1">
              {(["ADMIN", "ORGANIZER", "CUSTOMER"] as Role[]).map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={role === r ? "default" : "outline"}
                  onClick={() => setRole(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="role-reason" className="text-xs">
              Reason (recorded in audit log)
            </Label>
            <Textarea
              id="role-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Why is this change being made?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={changeRoleMutation.isPending || !reason.trim()}
          >
            {changeRoleMutation.isPending ? (
              <Spinner className="size-4" />
            ) : null}
            Update role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
