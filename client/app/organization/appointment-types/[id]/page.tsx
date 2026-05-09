"use client";

import { useParams } from "next/navigation";

import { PublishBar } from "@/components/organization/appointment-types/publish-bar";
import { SectionBasics } from "@/components/organization/appointment-types/section-basics";
import { SectionDanger } from "@/components/organization/appointment-types/section-danger";
import { SectionInventory } from "@/components/organization/appointment-types/section-inventory";
import { SectionNotifications } from "@/components/organization/appointment-types/section-notifications";
import { SectionPayment } from "@/components/organization/appointment-types/section-payment";
import { SectionPolicy } from "@/components/organization/appointment-types/section-policy";
import { SectionQuestions } from "@/components/organization/appointment-types/section-questions";
import { SectionSchedule } from "@/components/organization/appointment-types/section-schedule";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useAppointmentType } from "@/hooks/useAppointmentTypes";

export default function AppointmentTypeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const query = useAppointmentType(id);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {(query.error as ApiError | undefined)?.messages[0] ??
          "Failed to load appointment type"}
      </div>
    );
  }

  const type = query.data;

  return (
    <div className="space-y-6">
      <PublishBar type={type} />
      <SectionBasics type={type} />
      <SectionInventory type={type} />
      <SectionSchedule type={type} />
      <SectionPayment type={type} />
      <SectionPolicy type={type} />
      <SectionQuestions type={type} />
      <SectionNotifications type={type} />
      <SectionDanger id={type.id} name={type.name} />
    </div>
  );
}
