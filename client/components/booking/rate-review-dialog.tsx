"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { StarIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publicId: string;
};

export function RateReviewDialog({ open, onOpenChange, publicId }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating.");
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call since endpoint is not strictly defined in backend yet
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    toast.success("Review submitted! Thank you for your feedback.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate & Review</DialogTitle>
          <DialogDescription>
            How was your experience? Your feedback helps the organizer improve.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 focus:outline-none"
              >
                <HugeiconsIcon
                  icon={StarIcon}
                  className={`size-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? "text-amber-500 fill-amber-500"
                      : "text-slate-light"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Write a review (optional)..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={500}
            className="min-h-[100px]"
          />
          <p className="text-right text-xs text-muted-foreground">
            {review.length}/500
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
