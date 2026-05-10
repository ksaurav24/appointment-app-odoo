"use client";

import { QRCodeSVG } from "qrcode.react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmationCode: string;
  serviceName: string;
};

export function CheckInQrDialog({
  open,
  onOpenChange,
  confirmationCode,
  serviceName,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Check-in QR Code</DialogTitle>
          <DialogDescription>
            Show this QR code at the venue to check in for {serviceName}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <QRCodeSVG
              value={`appointly://checkin/${confirmationCode}`}
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
          <p className="font-mono text-lg font-medium tracking-widest text-foreground">
            {confirmationCode}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
