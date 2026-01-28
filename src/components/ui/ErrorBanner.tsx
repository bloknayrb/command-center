interface ErrorBannerProps {
  message: string;
}

/**
 * Shared error banner for dashboard components.
 * Matches the pattern already used in TaskTable and NewItemsFeed.
 */
export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}
