import { Skeleton } from "@/components/ui/primitives";
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Skeleton className="mb-2 h-8 w-56" /><Skeleton className="mb-6 h-4 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="mt-6 h-72 w-full" />
    </div>
  );
}
