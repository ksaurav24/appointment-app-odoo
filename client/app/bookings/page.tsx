"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"

import { BookingCard } from "@/components/booking/booking-card"
import { PublicShell } from "@/components/layout/public-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCurrentUser } from "@/hooks/useAuth"
import { useMyAppointments } from "@/hooks/useBooking"
import type { AppointmentWithRelations } from "@/types"

function partition(list: AppointmentWithRelations[]) {
  const now = Date.now()
  const upcoming: AppointmentWithRelations[] = []
  const past: AppointmentWithRelations[] = []
  const cancelled: AppointmentWithRelations[] = []
  for (const a of list) {
    if (a.status === "CANCELLED") {
      cancelled.push(a)
      continue
    }
    const startMs = new Date(a.startTime).getTime()
    if (a.status === "COMPLETED" || a.status === "NO_SHOW" || startMs < now) {
      past.push(a)
    } else {
      upcoming.push(a)
    }
  }
  return { upcoming, past, cancelled }
}

export default function BookingsListPage() {
  const router = useRouter()
  const { data: user, isPending: userPending } = useCurrentUser()
  const { data, isPending, isError, refetch } = useMyAppointments()

  useEffect(() => {
    if (!userPending && !user) {
      router.replace("/login?next=/bookings")
    }
  }, [user, userPending, router])

  const { upcoming, past, cancelled } = useMemo(() => {
    return partition(data ?? [])
  }, [data])

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <header className="mb-6 space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            My bookings
          </h1>
          <p className="text-sm text-muted-foreground">
            Your upcoming, past, and cancelled appointments.
          </p>
        </header>

        {userPending || isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError ? (
          <div className="rounded-xl border bg-muted/30 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load your bookings.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="rounded-xl border bg-muted/30 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any bookings yet.
            </p>
            <Button className="mt-3" render={<Link href="/browse" />}>
              Browse services
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcoming.length})
              </TabsTrigger>
              <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelled.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming bookings.
                </p>
              ) : (
                upcoming.map((a) => (
                  <BookingCard key={a.publicId} appointment={a} />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-3">
              {past.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No past bookings.
                </p>
              ) : (
                past.map((a) => (
                  <BookingCard key={a.publicId} appointment={a} />
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="space-y-3">
              {cancelled.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No cancelled bookings.
                </p>
              ) : (
                cancelled.map((a) => (
                  <BookingCard key={a.publicId} appointment={a} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PublicShell>
  )
}
