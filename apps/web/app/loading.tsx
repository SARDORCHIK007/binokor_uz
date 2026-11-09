import { Skeleton } from "@uychibinokor/ui";
import { PAGE } from "@/components/site/PageHeader";

/** Shown while a public page streams in; mirrors the shared page layout. */
export default function PageLoading() {
  return (
    <div className={PAGE} aria-busy="true">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-5 h-10 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3">
            <Skeleton className="size-16 shrink-0 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
