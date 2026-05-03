"use client";

import { useSearchParams } from "next/navigation";
import { use } from "react";

import { MeetingRoom } from "@/components/meeting/meeting-room";

type Params = { appointmentId: string };

export default function MeetingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { appointmentId } = use(params);
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? undefined;

  return (
    <MeetingRoom appointmentId={appointmentId} confirmationCode={code} />
  );
}
