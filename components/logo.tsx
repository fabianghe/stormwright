export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <circle cx="16" cy="16" r="14.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11" fill="none" stroke="var(--line)" strokeWidth="1" />
      <path d="M17.6 7.5 10.8 17.4h4.6l-1.6 7.1 7.4-10.4h-4.8l1.2-6.6Z" fill="var(--accent)" />
    </svg>
  );
}
