"use client";

import { Send } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { APP_NAME } from "@/lib/brand";
import { api } from "@/lib/client-api";
import { FEEDBACK_INFO, FEEDBACK_KINDS, type FeedbackKind } from "@/lib/model";
import { FEEDBACK_ICONS } from "@/components/feedback-kind-icon";

export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const send = async () => {
    if (!message.trim() || state === "sending") return;
    setState("sending");
    try {
      await api("/api/feedback", { body: { kind, message, path: pathname } });
      setState("sent");
    } catch {
      setState("error");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Send feedback"
        className="sw-menu w-full max-w-lg !p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {state === "sent" ? (
          <div className="py-4 text-center">
            <h2 className="font-display text-2xl">Thank you!</h2>
            <p className="mt-2 text-ink-soft">Your message has been sent. It really helps shape {APP_NAME}.</p>
            <button type="button" autoFocus className="sw-btn sw-btn-primary mt-6" onClick={onClose}>
              Back to writing
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-display text-2xl">Send feedback</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {APP_NAME} is in beta. Ideas, problems, wishes: everything helps.
            </p>
            <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Kind of feedback">
              {FEEDBACK_KINDS.map((k) => {
                const Icon = FEEDBACK_ICONS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    className={`sw-chip ${kind === k ? "!border-accent !bg-accent-soft !text-ink" : ""}`}
                    onClick={() => {
                      setKind(k);
                      messageRef.current?.focus();
                    }}
                  >
                    <Icon size={13} /> {FEEDBACK_INFO[k].label}
                  </button>
                );
              })}
            </div>
            <textarea
              ref={messageRef}
              autoFocus
              rows={6}
              maxLength={4000}
              value={message}
              placeholder={FEEDBACK_INFO[kind].placeholder}
              className="sw-input mt-3 resize-none leading-relaxed"
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void send();
                }
              }}
            />
            {state === "error" && (
              <p className="mt-2 text-sm text-(--c-effects)">Couldn&apos;t send that. Please try again.</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="mr-auto hidden text-xs text-ink-faint sm:inline">⌘ Enter to send</span>
              <button type="button" className="sw-btn sw-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="sw-btn sw-btn-primary disabled:opacity-50"
                disabled={!message.trim() || state === "sending"}
                onClick={() => void send()}
              >
                <Send size={14} /> {state === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
