"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";

type Props = {
  id: string;
  name: string;
};

export function SectionDanger({ id, name }: Props) {
  const router = useRouter();
  const { deleteMutation } = useAppointmentTypeMutations();

  const handleDelete = () => {
    if (
      !confirm(
        `Delete "${name}"? This action cannot be undone.`,
      )
    )
      return;

    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Deleted");
        router.push("/organization/appointment-types");
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error(
            "Appointment type has bookings; unpublish it instead of deleting",
          );
        } else {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Delete failed";
          toast.error(msg);
        }
      },
    });
  };

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Permanently delete this appointment type and all related configuration.
          Active bookings will prevent deletion.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete"}
        </Button>
      </CardContent>
    </Card>
  );
}
