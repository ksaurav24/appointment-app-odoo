# Search and UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Browse Page search to include provider name (organization) and category, and update types to match the backend payload.

**Architecture:** The backend `publicList` returns `(AppointmentType & { organization: PublicOrganizationSummary })[]`. We need to update the frontend types to reflect this, then update the search filter in `BrowsePage`.

**Tech Stack:** React, Next.js, TypeScript

---

### Task 1: Update Frontend Types

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\types\index.ts`

- [ ] **Step 1: Update AppointmentType type**
We need to update the global `AppointmentType` or create a new type `PublicAppointmentTypeListItem` that includes the `organization` object, since the backend returns it. Wait, the backend actually returns `(AppointmentType & { organization: PublicOrganizationSummary })[]`.

Let's update `client/types/index.ts` to add `PublicAppointmentTypeListItem`.

```typescript
export type PublicOrganizationSummary = Pick<Organization, "id" | "name" | "slug" | "logoUrl">;

export type PublicAppointmentTypeListItem = AppointmentType & {
  organization: PublicOrganizationSummary;
};
```

- [ ] **Step 2: Update API response type**
Modify `F:\Appointment Booking App\appointment-app-odoo\client\lib\api.ts` to use `PublicAppointmentTypeListItem`.

```typescript
export async function listPublicAppointmentTypes(): Promise<PublicAppointmentTypeListItem[]> {
  try {
    const { data } = await api.get<PublicAppointmentTypeListItem[]>(
      "/public/appointment-types",
    );
    return data;
  } catch (err) {
    extractApiError(err);
  }
}
```

- [ ] **Step 3: Update hooks**
Modify `F:\Appointment Booking App\appointment-app-odoo\client\hooks\usePublicAppointments.ts` to use `PublicAppointmentTypeListItem`.

```typescript
export function usePublicAppointmentTypes() {
  return useQuery<PublicAppointmentTypeListItem[]>({
    queryKey: ROOT_KEY,
    queryFn: listPublicAppointmentTypes,
  });
}
```

### Task 2: Update Search Logic

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\app\browse\page.tsx`

- [ ] **Step 1: Update the filter logic**
Modify `client/app/browse/page.tsx` to include `category` and `organization.name` in the search string.

```typescript
    return data.filter((t) => {
      const haystack = `${t.name} ${t.description ?? ""} ${t.slug} ${t.category ?? ""} ${t.organization?.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
```

### Task 3: Display Organization in ServiceCard

**Files:**
- Modify: `F:\Appointment Booking App\appointment-app-odoo\client\components\booking\service-card.tsx`

- [ ] **Step 1: Update ServiceCard props and rendering**
Use `PublicAppointmentTypeListItem` and display the organization name.

```typescript
type ServiceCardProps = {
  type: PublicAppointmentTypeListItem;
};
```

And in the UI, add the organization name above the service name.

```typescript
            <p className="text-xs text-muted-foreground">{type.organization?.name}</p>
            <h3 className="font-heading text-lg tracking-tight text-foreground">
```
