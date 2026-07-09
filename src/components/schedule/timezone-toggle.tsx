"use client";

import { useEffect, useState } from "react";
import {
  TIMEZONE_OPTIONS,
  TIMEZONE_STORAGE_KEY,
  type DisplayTimezone,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

type TimezoneToggleProps = {
  className?: string;
};

export function TimezoneToggle({ className }: TimezoneToggleProps) {
  const [timezone, setTimezone] = useState<DisplayTimezone>("CET");

  useEffect(() => {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored === "CET" || stored === "CST") {
      setTimezone(stored);
    }
  }, []);

  function select(next: DisplayTimezone) {
    setTimezone(next);
    localStorage.setItem(TIMEZONE_STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent("timezone-change", { detail: next }));
  }

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5",
        className
      )}
    >
      {TIMEZONE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => select(option.id)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            timezone === option.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function useDisplayTimezone(): DisplayTimezone {
  const [timezone, setTimezone] = useState<DisplayTimezone>("CET");

  useEffect(() => {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored === "CET" || stored === "CST") {
      setTimezone(stored);
    }

    function handleChange(event: Event) {
      const detail = (event as CustomEvent<DisplayTimezone>).detail;
      if (detail === "CET" || detail === "CST") {
        setTimezone(detail);
      }
    }

    window.addEventListener("timezone-change", handleChange);
    return () => window.removeEventListener("timezone-change", handleChange);
  }, []);

  return timezone;
}
