"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Share01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  shareUrl: string;
  title?: string;
  trigger?: React.ReactElement;
};

export function ShareDialog({ shareUrl, title = "Share Booking", trigger }: Props) {
  const [open, setOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (e) {
      toast.error("Failed to copy link.");
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Check out my booking: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
      } catch (e) {
        // user cancelled or failed
      }
    } else {
      toast.error("Native share not supported on this device.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger || (
          <Button variant="outline" size="sm">
            <HugeiconsIcon icon={Share01Icon} className="mr-2 size-4" />
            Share
          </Button>
        )} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Share this link with anyone so they can view the booking details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 pt-4">
          <Input readOnly value={shareUrl} className="flex-1" />
          <Button type="button" size="sm" onClick={handleCopy} className="px-3">
            <span className="sr-only">Copy</span>
            <HugeiconsIcon icon={Copy01Icon} className="size-4" />
          </Button>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleWhatsApp}>
            <HugeiconsIcon icon={WhatsappIcon} className="mr-2 size-4 text-green-500" />
            WhatsApp
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleNativeShare}>
            <HugeiconsIcon icon={Share01Icon} className="mr-2 size-4" />
            More Options
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
