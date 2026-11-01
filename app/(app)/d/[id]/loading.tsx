export default function Loading() {
  return (
    <div className="px-0 pt-14 sm:px-6">
      <div className="sw-page mx-auto h-[70vh] max-w-[48rem] animate-pulse px-14 py-14 sm:rounded-2xl">
        <div className="mb-6 h-5 w-40 rounded-full bg-hover" />
        <div className="mb-8 h-10 w-2/3 rounded-lg bg-hover" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-hover" />
          <div className="h-4 w-5/6 rounded bg-hover" />
          <div className="h-4 w-4/6 rounded bg-hover" />
        </div>
      </div>
    </div>
  );
}
