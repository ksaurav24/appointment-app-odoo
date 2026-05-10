"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import Link from "next/link";
import { toast } from "sonner";

import { useOrgAppointments } from "@/hooks/useOrgAppointments";
import { AppointmentStatus, EntityType } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAcquireSlotLock, useReleaseSlotLock } from "@/hooks/useBooking";
import { useOrgAppointmentMutations } from "@/hooks/useOrgAppointments";
import { ApiError } from "@/lib/api";
import { useBookablePersons } from "@/hooks/useBookablePersons";
import { useBookableResources } from "@/hooks/useBookableResources";

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  NO_SHOW: "#6b7280",
};

export function CalendarView() {
  const [filterType, setFilterType] = useState<"ALL" | "PERSON" | "RESOURCE">("ALL");
  const [filterEntityId, setFilterEntityId] = useState<string>("ALL");

  const personsQuery = useBookablePersons();
  const resourcesQuery = useBookableResources();

  const persons = personsQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];

  const query = useOrgAppointments({});
  const appointments = query.data ?? [];
  
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  const { rescheduleMutation } = useOrgAppointmentMutations();
  const acquireMutation = useAcquireSlotLock();
  const releaseMutation = useReleaseSlotLock();

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      if (filterType === "ALL") return true;
      if (filterType === "PERSON") {
        if (filterEntityId === "ALL") return app.bookablePersonId !== null;
        return app.bookablePersonId === filterEntityId;
      }
      if (filterType === "RESOURCE") {
        if (filterEntityId === "ALL") return app.bookableResourceId !== null;
        return app.bookableResourceId === filterEntityId;
      }
      return true;
    });
  }, [appointments, filterType, filterEntityId]);

  const events = useMemo(() => {
    return filteredAppointments.map((app) => ({
      id: app.publicId,
      title: `${app.appointmentType.name} - Cust #${app.customerId.slice(-6)}`,
      start: app.startTime,
      end: app.endTime,
      backgroundColor: STATUS_COLORS[app.status],
      borderColor: STATUS_COLORS[app.status],
      extendedProps: { appointment: app },
      editable: app.status === "CONFIRMED" || app.status === "PENDING",
    }));
  }, [filteredAppointments]);

  const handleEventClick = (info: any) => {
    setSelectedAppointmentId(info.event.id);
  };

  const handleEventDrop = async (info: any) => {
    const { event, revert } = info;
    const app = event.extendedProps.appointment;
    const startIso = event.start.toISOString();
    const endIso = event.end ? event.end.toISOString() : new Date(event.start.getTime() + (new Date(app.endTime).getTime() - new Date(app.startTime).getTime())).toISOString();

    const entityId = app.bookablePersonId ?? app.bookableResourceId ?? undefined;
    let lockId: string | null = null;
    try {
      const lock = await acquireMutation.mutateAsync({
        appointmentTypeId: app.appointmentTypeId,
        entityId,
        startTime: startIso,
        endTime: endIso,
      });
      lockId = lock.id;
    } catch (err) {
      const msg = err instanceof ApiError ? err.messages[0] : "Could not hold slot for reschedule";
      toast.error(msg);
      revert();
      return;
    }

    rescheduleMutation.mutate(
      {
        publicId: app.publicId,
        body: { slotLockId: lockId, reason: "Rescheduled via calendar drag and drop" },
      },
      {
        onSuccess: () => {
          toast.success("Appointment rescheduled successfully");
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.messages[0] : "Reschedule failed";
          toast.error(msg);
          if (lockId) {
            releaseMutation.mutate(lockId);
          }
          revert();
        },
      }
    );
  };

  const selectedApp = useMemo(() => appointments.find(a => a.publicId === selectedAppointmentId), [appointments, selectedAppointmentId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select 
          value={filterType} 
          onChange={(e: any) => { setFilterType(e.target.value); setFilterEntityId("ALL"); }}
          className="h-9 w-[180px] rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
        >
          <option value="ALL">All Appointments</option>
          <option value="PERSON">By Staff (Person)</option>
          <option value="RESOURCE">By Resource</option>
        </select>

        {filterType === "PERSON" && (
          <select 
            value={filterEntityId} 
            onChange={(e) => setFilterEntityId(e.target.value)}
            className="h-9 w-[200px] rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
          >
            <option value="ALL">All Staff</option>
            {persons.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {filterType === "RESOURCE" && (
          <select 
            value={filterEntityId} 
            onChange={(e) => setFilterEntityId(e.target.value)}
            className="h-9 w-[200px] rounded-md border border-input bg-background px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors"
          >
            <option value="ALL">All Resources</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5 overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          editable={true}
          height="auto"
        />
      </div>

      <Sheet open={!!selectedAppointmentId} onOpenChange={(open) => !open && setSelectedAppointmentId(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Appointment Details</SheetTitle>
          </SheetHeader>
          {selectedApp && (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Type:</span> 
                <p>{selectedApp.appointmentType.name}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Customer:</span> 
                <p>#{selectedApp.customerId.slice(-8)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Status:</span> 
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedApp.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Start:</span> 
                <p>{new Date(selectedApp.startTime).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">End:</span> 
                <p>{new Date(selectedApp.endTime).toLocaleString()}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Payment:</span> 
                <p>{selectedApp.paymentStatus}</p>
              </div>
              <div className="pt-4">
                <Link href={`/organization/appointments/${selectedApp.publicId}`} className="text-primary hover:underline">
                  View full details &rarr;
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
