interface CardProps {
  title: string;
  meta?: string;
  children: React.ReactNode;
  loading?: boolean;
}

export function Card({ title, meta, children, loading }: CardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {meta && <span className="text-xs text-gray-400">{meta}</span>}
      </div>
      {loading ? <SkeletonCardContent /> : children}
    </div>
  );
}

function SkeletonCardContent() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
    </div>
  );
}
