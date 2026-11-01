"use client";

import { useMemo, useState, type KeyboardEvent, type Ref } from "react";

export type ComboOption = { id?: string; label: string; hint?: string };

type Props = {
  value: string;
  options: ComboOption[] | (() => ComboOption[]);
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (text: string, option: ComboOption | null) => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onBackspaceEmpty?: () => void;
  style?: React.CSSProperties;
  wrapperClassName?: string;
};

export function Combo({
  value,
  options,
  placeholder,
  className,
  wrapperClassName,
  inputRef,
  onChange,
  onEnter,
  onEscape,
  onBackspaceEmpty,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [source, setSource] = useState<ComboOption[]>([]);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    const seen = new Set<string>();
    const out: ComboOption[] = [];
    for (const option of source) {
      const key = option.label.toLowerCase();
      if (seen.has(key) || !option.label.trim()) continue;
      if (query && !key.includes(query)) continue;
      if (key === query && !option.id) continue;
      seen.add(key);
      out.push(option);
      if (out.length >= 8) break;
    }
    return out;
  }, [source, value]);

  const show = open && filtered.length > 0;

  const choose = (option: ComboOption) => {
    onChange(option.label, option);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (show && event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % filtered.length);
    } else if (show && event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (event.key === "Tab" && !event.shiftKey && show) {
      event.preventDefault();
      choose(filtered[Math.max(active, 0)]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (show && active >= 0 && filtered[active]) choose(filtered[active]);
      setOpen(false);
      onEnter?.();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (show) setOpen(false);
      else onEscape?.();
    } else if (event.key === "Backspace" && value === "" && onBackspaceEmpty) {
      event.preventDefault();
      onBackspaceEmpty();
    }
  };

  return (
    <span className={`relative inline-flex min-w-0 ${wrapperClassName ?? ""}`}>
      <input
        ref={inputRef}
        className={className}
        style={style}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onFocus={() => {
          setSource(typeof options === "function" ? options() : options);
          setOpen(true);
          setActive(-1);
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value, null);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
      />
      {show && (
        <span className="sw-menu absolute left-0 top-full z-30 mt-1 flex w-64 flex-col" contentEditable={false}>
          {filtered.map((option, i) => (
            <button
              key={`${option.id ?? ""}:${option.label}`}
              type="button"
              className="sw-menu-item"
              data-active={i === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="truncate">{option.label}</span>
              {option.hint && <span className="ml-auto shrink-0 text-xs text-ink-faint">{option.hint}</span>}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
