
import { AppointmentsTable } from "@/components/organization/appointments/appointments-table";
import { CalendarView } from "@/components/organization/appointments/calendar-view";
import { StatusFilterBar } from "@/components/organization/appointments/status-filter-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Appointments
        </h1>
        <p className="text-sm text-muted-foreground">
          Approve, manage, and review every booking.
        </p>
      </header>
      <StatusFilterBar />
      
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-0">
          <AppointmentsTable />
        </TabsContent>
        <TabsContent value="calendar" className="mt-0">
          <CalendarView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
