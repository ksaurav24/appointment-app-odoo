"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, disabled, onKeyDown, onKeyUp, onBlur, onFocus, ...props }, ref) {
    const [visible, setVisible] = React.useState(false);
    const [capsLock, setCapsLock] = React.useState(false);
    const [focused, setFocused] = React.useState(false);

    const updateCapsLock = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      setCapsLock(e.getModifierState("CapsLock"));
    }, []);

    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={ref}
            type={visible ? "text" : "password"}
            className={cn("pr-10", className)}
            disabled={disabled}
            onKeyDown={(e) => {
              updateCapsLock(e);
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              updateCapsLock(e);
              onKeyUp?.(e);
            }}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              setCapsLock(false);
              onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <HugeiconsIcon
              icon={visible ? ViewOffIcon : ViewIcon}
              strokeWidth={2}
              className="size-4"
            />
          </button>
        </div>
        {focused && capsLock ? (
          <p
            role="status"
            className="text-xs font-medium text-amber-600 dark:text-amber-500"
          >
            Caps Lock is on
          </p>
        ) : null}
      </div>
    );
  },
);
