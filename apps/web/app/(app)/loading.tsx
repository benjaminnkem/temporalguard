import { Skeleton } from "../../components/ui/surface";

export default function Loading() {
  return (
    <div className="grid gap-5" aria-label="Loading page">
      <Skeleton className="h-24" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
