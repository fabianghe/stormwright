export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <span style={{ display: "block", fontSize: size * 0.82, lineHeight: 1 }}>🪶</span>
    </span>
  );
}
