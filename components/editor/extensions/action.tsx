"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { ArrowUpRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ACTION_GROUPS, ACTION_KINDS, actionInfo, displayTitle, type ActionGroup, type ActionKind } from "@/lib/model";
import { ACTION_ICONS } from "@/components/icons";
import { Combo, type ComboOption } from "../combo";
import { useEditorData } from "../editor-data";
import { ensureParagraphAfter, takeFieldFocus } from "./helpers";

const GROUPED = Object.entries(ACTION_GROUPS).map(([group, label]) => ({
  group: group as ActionGroup,
  label,
  kinds: (Object.keys(ACTION_KINDS) as ActionKind[]).filter((k) => ACTION_KINDS[k].group === group),
}));

function KindMenu({ current, onPick, onClose }: { current: string; onPick: (k: ActionKind) => void; onClose: () => void }) {
  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={onClose} />
      <div className="sw-menu absolute left-0 top-full z-40 mt-1 max-h-80 w-60 overflow-y-auto">
        {GROUPED.map(({ group, label, kinds }) => (
          <div key={group}>
            <div className="sw-menu-label">{label}</div>
            {kinds.map((kind) => {
              const Icon = ACTION_ICONS[kind];
              return (
                <button
                  key={kind}
                  type="button"
                  className="sw-menu-item"
                  data-active={kind === current}
                  onClick={() => onPick(kind)}
                >
                  <Icon size={15} className="text-ink-soft" />
                  {ACTION_KINDS[kind].label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function ActionView({ node, updateAttributes, editor, getPos, selected, deleteNode }: ReactNodeViewProps) {
  const router = useRouter();
  const data = useEditorData();
  const [menuOpen, setMenuOpen] = useState(false);
  const targetRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);

  const kind = String(node.attrs.kind ?? "custom");
  const info = actionInfo(kind);
  const Icon = ACTION_ICONS[(kind in ACTION_KINDS ? kind : "custom") as ActionKind];
  const target = String(node.attrs.target ?? "");
  const value = String(node.attrs.value ?? "");
  const targetId = node.attrs.targetId ? String(node.attrs.targetId) : null;
  const linked = targetId ? data.docsById.get(targetId) : undefined;

  useEffect(() => {
    if (takeFieldFocus(getPos())) targetRef.current?.focus();
  }, [getPos]);

  const exit = () => {
    const pos = getPos();
    if (pos !== undefined) ensureParagraphAfter(editor, pos);
  };

  const targetOptions = (): ComboOption[] => [
    ...(info.refKinds ? data.docsOfKinds(info.refKinds) : []).map((d) => ({
      id: d.id,
      label: displayTitle(d.title, d.kind),
      hint: d.kind,
    })),
    ...data.vocab(info.target).map((text) => ({ label: text })),
  ];

  const onTarget = (text: string, option: ComboOption | null) => {
    let id = option?.id ?? null;
    if (!id && info.refKinds) {
      const needle = text.trim().toLowerCase();
      id = data.docsOfKinds(info.refKinds).find((d) => d.title.trim().toLowerCase() === needle)?.id ?? null;
    }
    updateAttributes({ target: text, targetId: id });
  };

  const pickKind = (next: ActionKind) => {
    const nextInfo = ACTION_KINDS[next] as { refKinds?: string[] };
    updateAttributes({ kind: next, targetId: nextInfo.refKinds ? targetId : null });
    setMenuOpen(false);
    requestAnimationFrame(() => targetRef.current?.focus());
  };

  return (
    <NodeViewWrapper data-type="action" className="group/action">
      <div className={`sw-action ${selected ? "is-selected" : ""}`} data-group={info.group} contentEditable={false}>
        <span className="relative shrink-0">
          <button type="button" className="sw-action-kind" onClick={() => setMenuOpen((o) => !o)} title="Change what happens">
            <Icon size={15} />
            {info.label}
          </button>
          {menuOpen && <KindMenu current={kind} onPick={pickKind} onClose={() => setMenuOpen(false)} />}
        </span>
        <Combo
          inputRef={targetRef}
          wrapperClassName="flex-1"
          className={`w-full ${linked ? "sw-action-linked" : ""}`}
          value={target}
          placeholder={info.target}
          options={targetOptions}
          onChange={onTarget}
          onEnter={() => (info.value ? valueRef.current?.focus() : exit())}
          onEscape={exit}
        />
        {info.value && (
          <>
            <span className="sw-action-sep">→</span>
            <input
              ref={valueRef}
              className="w-28 sm:w-36"
              value={value}
              placeholder={info.value}
              spellCheck={false}
              onChange={(event) => updateAttributes({ value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                  event.preventDefault();
                  exit();
                }
              }}
            />
          </>
        )}
        {linked && (
          <button
            type="button"
            className="rounded-md p-1 text-ink-faint hover:bg-hover hover:text-ink"
            title={`Open ${displayTitle(linked.title, linked.kind)}`}
            onClick={() => router.push(`/d/${linked.id}`)}
          >
            <ArrowUpRight size={14} />
          </button>
        )}
        <button
          type="button"
          className="rounded-md p-1 text-ink-faint opacity-0 transition-opacity hover:bg-hover hover:text-ink group-hover/action:opacity-100"
          title="Remove"
          onClick={() => deleteNode()}
        >
          <X size={14} />
        </button>
      </div>
    </NodeViewWrapper>
  );
}

export const Action = Node.create({
  name: "action",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    const attr = (name: string, fallback: string | null) => ({
      default: fallback,
      parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`) ?? fallback,
      renderHTML: (attrs: Record<string, unknown>) => {
        const key = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        return attrs[key] ? { [`data-${name}`]: attrs[key] } : {};
      },
    });
    return {
      kind: attr("kind", "custom"),
      target: attr("target", ""),
      targetId: attr("target-id", null),
      value: attr("value", ""),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="action"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "action" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ActionView);
  },
});
