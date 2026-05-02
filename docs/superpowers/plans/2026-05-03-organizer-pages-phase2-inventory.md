# Phase 2 — Inventory Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Prerequisites:** Phase 1 complete (Tasks 1–9 from `2026-05-03-organizer-pages.md`).

**Goal:** Build `/organization/inventory` with two tabs (Persons, Resources) using the hooks from Phase 1.

**Verification model:** `bun run typecheck` + `bun run lint` + manual smoke test (`bun run dev` → log in as organizer → navigate to /organization/inventory). Local-only — no test framework set up.

---

### Task 10: Build inventory route with Persons tab

**Files:**
- Create: `client/app/organization/inventory/page.tsx`
- Create: `client/components/organization/inventory/persons-table.tsx`
- Create: `client/components/organization/inventory/person-form-dialog.tsx`

Reference: `docs/api/modules/bookable-inventory.md` for field validators.

- [ ] **Step 1: Verify Tabs and Dialog UI primitives exist**

Run: `ls client/components/ui/tabs.tsx client/components/ui/dialog.tsx client/components/ui/table.tsx client/components/ui/badge.tsx`

Expected: all four files listed.

If `tabs.tsx`, `dialog.tsx`, `table.tsx`, or `badge.tsx` is missing, install via shadcn:

```bash
cd client && bunx shadcn@latest add tabs dialog table badge
```

Commit any newly added shadcn primitives separately:

```bash
git add client/components/ui/
git commit -m "ui: add shadcn primitives for inventory page"
```

- [ ] **Step 2: Create person-form-dialog.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { useBookablePersonMutations } from "@/hooks/useBookablePersons";
import type { BookablePerson } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: BookablePerson | null;
};

export function PersonFormDialog({ open, onOpenChange, person }: Props) {
  const isEdit = !!person;
  const { createMutation, updateMutation } = useBookablePersonMutations();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setName(person?.name ?? "");
      setContactEmail(person?.contactEmail ?? "");
      setPhone(person?.phone ?? "");
      setDesignation(person?.designation ?? "");
      setIsActive(person?.isActive ?? true);
    }
  }, [open, person]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      phone: phone.trim() || undefined,
      designation: designation.trim() || undefined,
      isActive,
    };
    const onError = (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Something went wrong";
      toast.error(msg);
    };
    if (isEdit && person) {
      updateMutation.mutate(
        { id: person.id, body },
        {
          onSuccess: () => {
            toast.success("Person updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Person added");
          onOpenChange(false);
        },
        onError,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit person" : "Add person"}</DialogTitle>
            <DialogDescription>
              Bookable persons receive email notifications when their slots
              are booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="person-name">Name</Label>
              <Input
                id="person-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-email">Contact email</Label>
              <Input
                id="person-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                maxLength={254}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-phone">Phone (optional)</Label>
              <Input
                id="person-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="person-designation">Designation (optional)</Label>
              <Input
                id="person-designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="person-active" className="text-sm font-normal">
                Active
              </Label>
              <Switch
                id="person-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

If `client/components/ui/switch.tsx` does not exist, add it:

```bash
cd client && bunx shadcn@latest add switch
```

- [ ] **Step 3: Create persons-table.tsx**

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  useBookablePersonMutations,
  useBookablePersons,
} from "@/hooks/useBookablePersons";
import type { BookablePerson } from "@/types";

import { PersonFormDialog } from "./person-form-dialog";

export function PersonsTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookablePerson | null>(null);
  const list = useBookablePersons(includeInactive);
  const { deleteMutation } = useBookablePersonMutations();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (p: BookablePerson) => {
    setEditing(p);
    setDialogOpen(true);
  };
  const handleDelete = (p: BookablePerson) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    deleteMutation.mutate(p.id, {
      onSuccess: (res) => {
        toast.success(
          res.deleted === "soft"
            ? "Marked inactive (referenced by appointments)"
            : "Deleted",
        );
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Delete failed";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          Show inactive
        </label>
        <Button onClick={openCreate}>Add person</Button>
      </div>

      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load persons"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : list.data && list.data.length > 0 ? (
              list.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.designation ?? "—"}
                  </TableCell>
                  <TableCell>{p.contactEmail}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "outline"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ⋯
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(p)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No bookable persons yet — add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PersonFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        person={editing}
      />
    </div>
  );
}
```

If `client/components/ui/dropdown-menu.tsx` does not exist:

```bash
cd client && bunx shadcn@latest add dropdown-menu skeleton
```

- [ ] **Step 4: Create the inventory page with Persons tab only (Resources tab is a placeholder)**

`client/app/organization/inventory/page.tsx`:

```tsx
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PersonsTable } from "@/components/organization/inventory/persons-table";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage staff and resources that customers can book.
        </p>
      </header>
      <Tabs defaultValue="persons">
        <TabsList>
          <TabsTrigger value="persons">Persons</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        <TabsContent value="persons" className="pt-6">
          <PersonsTable />
        </TabsContent>
        <TabsContent value="resources" className="pt-6">
          <p className="text-sm text-muted-foreground">
            Resources tab — coming up next task.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

Run: `cd client && bun run dev`
- Log in as an organizer with an approved org.
- Visit `http://localhost:3000/organization/inventory`.
- Confirm the Persons tab loads, "Add person" works, edit and delete work, "Show inactive" toggle behaves as expected.

Stop the dev server before committing.

- [ ] **Step 6: Commit**

```bash
git add client/app/organization/inventory client/components/organization/inventory
git commit -m "$(cat <<'EOF'
feat(organization): add inventory page with Persons tab

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Add Resources tab

**Files:**
- Create: `client/components/organization/inventory/resources-table.tsx`
- Create: `client/components/organization/inventory/resource-form-dialog.tsx`
- Modify: `client/app/organization/inventory/page.tsx`

- [ ] **Step 1: Create resource-form-dialog.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useBookableResourceMutations } from "@/hooks/useBookableResources";
import type { BookableResource } from "@/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: BookableResource | null;
};

export function ResourceFormDialog({ open, onOpenChange, resource }: Props) {
  const isEdit = !!resource;
  const { createMutation, updateMutation } = useBookableResourceMutations();

  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setName(resource?.name ?? "");
      setResourceType(resource?.resourceType ?? "");
      setDescription(resource?.description ?? "");
      setCapacity(resource?.capacity ?? 1);
      setLocation(resource?.location ?? "");
      setIsActive(resource?.isActive ?? true);
    }
  }, [open, resource]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: name.trim(),
      resourceType: resourceType.trim() || undefined,
      description: description.trim() || undefined,
      capacity,
      location: location.trim() || undefined,
      isActive,
    };
    const onError = (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.messages[0] : "Something went wrong";
      toast.error(msg);
    };
    if (isEdit && resource) {
      updateMutation.mutate(
        { id: resource.id, body },
        {
          onSuccess: () => {
            toast.success("Resource updated");
            onOpenChange(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Resource added");
          onOpenChange(false);
        },
        onError,
      });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit resource" : "Add resource"}
            </DialogTitle>
            <DialogDescription>
              Resources are rooms or equipment that can be booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="res-name">Name</Label>
              <Input
                id="res-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-type">Type (optional)</Label>
              <Input
                id="res-type"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                placeholder="e.g. treatment-room"
                maxLength={80}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-capacity">Capacity</Label>
              <Input
                id="res-capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) =>
                  setCapacity(Math.max(1, Number(e.target.value) || 1))
                }
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-location">Location (optional)</Label>
              <Input
                id="res-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-desc">Description (optional)</Label>
              <Textarea
                id="res-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="res-active" className="text-sm font-normal">
                Active
              </Label>
              <Switch
                id="res-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

If `client/components/ui/textarea.tsx` is missing:

```bash
cd client && bunx shadcn@latest add textarea
```

- [ ] **Step 2: Create resources-table.tsx**

Same shape as `persons-table.tsx`. Replace columns with: Name, Type, Capacity, Location, Status. Use `useBookableResources` and `useBookableResourceMutations`. Use `ResourceFormDialog` for create/edit.

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  useBookableResourceMutations,
  useBookableResources,
} from "@/hooks/useBookableResources";
import type { BookableResource } from "@/types";

import { ResourceFormDialog } from "./resource-form-dialog";

export function ResourcesTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BookableResource | null>(null);
  const list = useBookableResources(includeInactive);
  const { deleteMutation } = useBookableResourceMutations();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (r: BookableResource) => {
    setEditing(r);
    setDialogOpen(true);
  };
  const handleDelete = (r: BookableResource) => {
    if (!confirm(`Delete ${r.name}?`)) return;
    deleteMutation.mutate(r.id, {
      onSuccess: (res) => {
        toast.success(
          res.deleted === "soft"
            ? "Marked inactive (referenced by appointments)"
            : "Deleted",
        );
      },
      onError: (err) => {
        const msg =
          err instanceof ApiError ? err.messages[0] : "Delete failed";
        toast.error(msg);
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          Show inactive
        </label>
        <Button onClick={openCreate}>Add resource</Button>
      </div>

      {list.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {(list.error as ApiError | undefined)?.messages[0] ??
            "Failed to load resources"}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : list.data && list.data.length > 0 ? (
              list.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.resourceType ?? "—"}
                  </TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "outline"}>
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ⋯
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(r)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No bookable resources yet — add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editing}
      />
    </div>
  );
}
```

- [ ] **Step 3: Replace placeholder in inventory page**

Update `client/app/organization/inventory/page.tsx` — replace the placeholder Resources `<TabsContent>` with `<ResourcesTable />`:

```tsx
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PersonsTable } from "@/components/organization/inventory/persons-table";
import { ResourcesTable } from "@/components/organization/inventory/resources-table";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Inventory
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage staff and resources that customers can book.
        </p>
      </header>
      <Tabs defaultValue="persons">
        <TabsList>
          <TabsTrigger value="persons">Persons</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        <TabsContent value="persons" className="pt-6">
          <PersonsTable />
        </TabsContent>
        <TabsContent value="resources" className="pt-6">
          <ResourcesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `cd client && bun run typecheck && bun run lint`
Expected: PASS.

Run: `cd client && bun run dev`
- Visit `/organization/inventory`, switch to Resources tab.
- Add a resource. Edit. Delete. Toggle "Show inactive".

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add client/app/organization/inventory client/components/organization/inventory
git commit -m "$(cat <<'EOF'
feat(organization): wire Resources tab in inventory page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

**Phase 2 self-review:** Spec §3 covered. No placeholders. Both tables follow the same shape with diverging field sets, matching the spec's "sibling components, not shared base" choice.
