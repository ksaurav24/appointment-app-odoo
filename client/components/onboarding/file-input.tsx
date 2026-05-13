"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Upload02Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface FileInputProps {
  id: string;
  accept?: string;
  multiple?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  variant?: "logo" | "gallery";
  selectedFiles?: File[];
}

export function FileInput({
  id,
  accept = "image/*",
  multiple = false,
  onChange,
  disabled = false,
  variant = "logo",
  selectedFiles = [],
}: FileInputProps) {
  const isLogo = variant === "logo";
  const hasFiles = selectedFiles.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        disabled={disabled}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={`Upload ${isLogo ? "logo" : "gallery images"}`}
      />
      <label
        htmlFor={id}
        className={cn(
          "block w-full cursor-pointer rounded-lg border-2 border-dashed transition-all",
          "px-4 py-6 text-center",
          "hover:border-forest hover:bg-forest/5",
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-forest focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          hasFiles
            ? "border-forest/30 bg-forest/5"
            : "border-gray-300 bg-gray-50"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "rounded-full p-2.5 transition-colors",
              hasFiles ? "bg-forest/20" : "bg-gray-200"
            )}
          >
            <HugeiconsIcon
              icon={isLogo ? Upload02Icon : ImageAdd01Icon}
              className={cn(
                "size-5 transition-colors",
                hasFiles ? "text-forest" : "text-gray-600"
              )}
            />
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">
              {hasFiles
                ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLogo
                ? "PNG, JPG, GIF up to 10MB"
                : "PNG, JPG up to 10MB each"}
            </p>
          </div>
        </div>
      </label>
    </div>
  );
}
