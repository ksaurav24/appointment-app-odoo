"use client"

import { useRouter } from "next/navigation"
import { use, useEffect } from "react"

import { BookingDetailView } from "@/components/booking/booking-detail-view"
import { PublicShell } from "@/components/layout/public-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentUser } from "@/hooks/useAuth"
import { useAppointment } from "@/hooks/useBooking"

type Params = { publicId: string }

export default function BookingDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { publicId } = use(params)
  const router = useRouter()
  const { data: user, isPending: userPending } = useCurrentUser()
  const { data, isPending, isError } = useAppointment(publicId)

  useEffect(() => {
    if (!userPending && !user) {
      router.replace(
        `/login?next=${encodeURIComponent(`/bookings/${publicId}`)}`
      )
    }
  }, [user, userPending, router, publicId])

  return (
    <PublicShell>
      {userPending || isPending ? (
        <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="mx-auto max-w-md px-6 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Booking not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t load this booking.
          </p>
        </div>
      ) : (
        <BookingDetailView appointment={data} />
      )}
    </PublicShell>
  )
}
