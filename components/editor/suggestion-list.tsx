"use client";

import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import type { LucideIcon } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SuggestionItem = {
  id: string;
  title: string;
  hint?: string;
  group?: string;
  icon?: LucideIcon;
  color?: string | null;
};

type ListProps = {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  emptyText?: string;
};

export type SuggestionListHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

export const SuggestionList = forwardRef<SuggestionListHandle, ListProps>(function SuggestionList(
  { items, command, emptyText },
  ref,
) {
  const [active, setActive] = useState(0);
  const [prevItems, setPrevItems] = useState(items);
  const listRef = useRef<HTMLDivElement>(null);

  if (prevItems !== items) {
    setPrevItems(items);
    setActive(0);
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setActive((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setActive((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const item = items[active];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  return (
    <div ref={listRef} className="sw-menu max-h-80 w-72 overflow-y-auto">
      {items.length === 0 && <div className="px-3 py-2 text-sm text-ink-faint">{emptyText ?? "Nothing found"}</div>}
      {items.map((item, i) => {
        const Icon = item.icon;
        const showGroup = item.group && item.group !== items[i - 1]?.group;
        return (
          <div key={item.id}>
            {showGroup && <div className="sw-menu-label">{item.group}</div>}
            <button
              type="button"
              data-index={i}
              data-active={i === active}
              className="sw-menu-item"
              onMouseEnter={() => setActive(i)}
              onMouseDown={(event) => {
                event.preventDefault();
                command(item);
              }}
            >
              {Icon && (
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface text-ink-soft">
                  <Icon size={15} data-color={item.color ?? undefined} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate">{item.title}</span>
                {item.hint && <span className="block truncate text-xs text-ink-faint">{item.hint}</span>}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});

export function popupRenderer(emptyText?: string) {
  return () => {
    let renderer: ReactRenderer<SuggestionListHandle, ListProps> | null = null;
    let unmount: (() => void) | null = null;

    return {
      onStart: (props: SuggestionProps<SuggestionItem, SuggestionItem>) => {
        renderer = new ReactRenderer(SuggestionList, {
          props: { items: props.items, command: props.command, emptyText },
          editor: props.editor,
        });
        renderer.element.style.zIndex = "60";
        unmount = props.mount(renderer.element);
      },
      onUpdate: (props: SuggestionProps<SuggestionItem, SuggestionItem>) => {
        renderer?.updateProps({ items: props.items, command: props.command, emptyText });
      },
      onKeyDown: (props: SuggestionKeyDownProps) => renderer?.ref?.onKeyDown(props.event) ?? false,
      onExit: () => {
        unmount?.();
        unmount = null;
        renderer?.destroy();
        renderer = null;
      },
    };
  };
}
