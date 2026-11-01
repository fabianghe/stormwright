import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <p className="font-display text-3xl">Blown away by the storm.</p>
        <p className="mt-2 text-ink-soft">This page doesn&apos;t exist, or it isn&apos;t yours.</p>
        <Link href="/" className="sw-btn sw-btn-primary mt-6">
          Back home
        </Link>
      </div>
    </div>
  );
}
