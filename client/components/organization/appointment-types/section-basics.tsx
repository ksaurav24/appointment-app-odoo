"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = {
  type: AppointmentTypeWithRelations;
};

export function SectionBasics({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { updateMutation } = useAppointmentTypeMutations();

  const [name, setName] = useState(type.name);
  const [slug, setSlug] = useState(type.slug);
  const [description, setDescription] = useState(type.description ?? "");
  const [manualConfirmation, setManualConfirmation] = useState(
    type.manualConfirmation,
  );
  const [advancePaymentEnabled, setAdvancePaymentEnabled] = useState(
    type.advancePaymentEnabled,
  );
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<string>(
    type.advancePaymentAmount ?? "",
  );

  const handleEdit = () => {
    setName(type.name);
    setSlug(type.slug);
    setDescription(type.description ?? "");
    setManualConfirmation(type.manualConfirmation);
    setAdvancePaymentEnabled(type.advancePaymentEnabled);
    setAdvancePaymentAmount(type.advancePaymentAmount ?? "");
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(
      {
        id: type.id,
        body: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          manualConfirmation,
          advancePaymentEnabled,
          advancePaymentAmount: advancePaymentEnabled
            ? Number(advancePaymentAmount)
            : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Saved");
          setEditing(false);
        },
        onError: (err) => {
          const msg =
            err instanceof ApiError ? err.messages[0] : "Failed to save";
          toast.error(msg);
        },
      },
    );
  };

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{type.name}</dd>
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="font-mono text-xs">{type.slug}</dd>
            <dt className="text-muted-foreground">Description</dt>
            <dd>{type.description ?? <span className="text-muted-foreground">—</span>}</dd>
            <dt className="text-muted-foreground">Manual confirmation</dt>
            <dd>{type.manualConfirmation ? "Yes" : "No"}</dd>
            <dt className="text-muted-foreground">Advance payment</dt>
            <dd>
              {type.advancePaymentEnabled
                ? `Enabled — ${type.advancePaymentAmount ?? "—"}`
                : "Disabled"}
            </dd>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basics</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="basics-name">Name</Label>
            <Input
              id="basics-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="basics-slug">Slug</Label>
            <Input
              id="basics-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="basics-description">Description</Label>
            <Textarea
              id="basics-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="basics-manual-confirm"
              checked={manualConfirmation}
              onCheckedChange={setManualConfirmation}
            />
            <Label htmlFor="basics-manual-confirm">
              Require manual confirmation
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="basics-advance-payment"
                checked={advancePaymentEnabled}
                onCheckedChange={setAdvancePaymentEnabled}
              />
              <Label htmlFor="basics-advance-payment">
                Advance payment required
              </Label>
            </div>
            {advancePaymentEnabled && (
              <div className="space-y-1.5 pl-9">
                <Label htmlFor="basics-payment-amount">Amount</Label>
                <Input
                  id="basics-payment-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={advancePaymentAmount}
                  onChange={(e) => setAdvancePaymentAmount(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
