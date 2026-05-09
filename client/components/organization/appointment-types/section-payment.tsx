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
import { ApiError } from "@/lib/api";
import { useAppointmentTypeMutations } from "@/hooks/useAppointmentTypes";
import type { AppointmentTypeWithRelations } from "@/types";

type Props = {
  type: AppointmentTypeWithRelations;
};

export function SectionPayment({ type }: Props) {
  const [editing, setEditing] = useState(false);
  const { updateMutation } = useAppointmentTypeMutations();

  const [advancePaymentEnabled, setAdvancePaymentEnabled] = useState(
    type.advancePaymentEnabled,
  );
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<string>(
    type.advancePaymentAmount ?? "",
  );
  const [price, setPrice] = useState<string>(type.price ?? "");

  const handleEdit = () => {
    setAdvancePaymentEnabled(type.advancePaymentEnabled);
    setAdvancePaymentAmount(type.advancePaymentAmount ?? "");
    setPrice(type.price ?? "");
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = price.trim() === "" ? undefined : Number(price);
    if (priceNum !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      toast.error("Base price must be a non-negative number");
      return;
    }
    if (advancePaymentEnabled) {
      const amt = Number(advancePaymentAmount);
      if (isNaN(amt) || amt <= 0) {
        toast.error("Advance payment amount must be greater than 0");
        return;
      }
    }

    updateMutation.mutate(
      {
        id: type.id,
        body: {
          advancePaymentEnabled,
          advancePaymentAmount: advancePaymentEnabled
            ? Number(advancePaymentAmount)
            : undefined,
          price: priceNum,
        },
      },
      {
        onSuccess: () => {
          toast.success("Payment settings saved");
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
          <CardTitle>Payment</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Base price</dt>
            <dd>
              {type.price != null
                ? Number(type.price) === 0
                  ? "Free"
                  : `₹${Number(type.price).toFixed(2)}`
                : <span className="text-muted-foreground">Not set</span>}
            </dd>
            <dt className="text-muted-foreground">Advance payment</dt>
            <dd>
              {type.advancePaymentEnabled
                ? `Required — ₹${Number(type.advancePaymentAmount ?? 0).toFixed(2)}`
                : "Not required"}
            </dd>
          </dl>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {/* Base price */}
          <div className="space-y-1.5">
            <Label htmlFor="payment-price">Base price (₹)</Label>
            <Input
              id="payment-price"
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00 — leave blank to not display a price"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 to show the service as free. Leave blank to hide price.
            </p>
          </div>

          {/* Advance payment */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch
                id="payment-advance-enabled"
                checked={advancePaymentEnabled}
                onCheckedChange={setAdvancePaymentEnabled}
              />
              <Label htmlFor="payment-advance-enabled">
                Require advance payment at booking
              </Label>
            </div>
            {advancePaymentEnabled && (
              <div className="space-y-1.5 pl-9">
                <Label htmlFor="payment-advance-amount">Amount (₹)</Label>
                <Input
                  id="payment-advance-amount"
                  type="number"
                  step="0.01"
                  min={0.01}
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
