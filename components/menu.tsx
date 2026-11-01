"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  side?: "bottom" | "top";
  className?: string;
};

export function Menu({ trigger, children, align = "left", side = "bottom", className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={`sw-menu absolute z-50 min-w-52 ${align === "right" ? "right-0" : "left-0"} ${
            side === "top" ? "bottom-full mb-2" : "top-full mt-2"
          } ${className ?? ""}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
