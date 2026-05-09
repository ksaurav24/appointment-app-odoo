"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatMinorUnits } from "@/lib/format";
import type { CreatePaymentIntentResult, SafeUser } from "@/types";

type RazorpayCheckoutProps = {
  intent: CreatePaymentIntentResult;
  user: SafeUser;
  autoOpen?: boolean;
  onVerified: (handle: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => void;
  onDismissed: () => void;
};

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: unknown) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function RazorpayCheckout({
  intent,
  user,
  autoOpen = true,
  onVerified,
  onDismissed,
}: RazorpayCheckoutProps) {
  const [scriptStatus, setScriptStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const openedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadRazorpayScript().then((ok) => {
      if (cancelled) return;
      setScriptStatus(ok ? "ready" : "error");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = useCallback(() => {
    if (openedRef.current) return;
    if (typeof window === "undefined" || !window.Razorpay) return;
    openedRef.current = true;
    const rzp = new window.Razorpay({
      key: intent.keyId,
      amount: intent.amount,
      currency: intent.currency,
      order_id: intent.orderId,
      name: "appointly",
      prefill: { name: user.fullName, email: user.email },
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        onVerified({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          openedRef.current = false;
          onDismissed();
        },
      },
    });
    rzp.on("payment.failed", () => {
      openedRef.current = false;
      onDismissed();
    });
    rzp.open();
  }, [intent, onDismissed, onVerified, user.email, user.fullName]);

  useEffect(() => {
    if (!autoOpen) return;
    if (scriptStatus !== "ready") return;
    open();
  }, [autoOpen, scriptStatus, open]);

  if (scriptStatus === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Loading payment…
      </div>
    );
  }

  if (scriptStatus === "error") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        Couldn&apos;t load the payment provider. Try refreshing, or contact the
        organizer to complete this booking another way.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Pay <strong>{formatMinorUnits(intent.amount, intent.currency)}</strong> to
        confirm your booking.
      </p>
      <Button onClick={open}>Open payment window</Button>
    </div>
  );
}
