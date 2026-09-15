import { Skeleton } from '@/components/ui/skeleton';

export function ReaderSkeleton() {
  return (
    <div className="py-6 space-y-8 animate-pulse">
      <div className="flex flex-col items-center space-y-3 mb-10">
        <Skeleton className="h-4 w-32 bg-muted/60" />
        <Skeleton className="h-8 w-64 bg-muted/80" />
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-px w-12 bg-cinnabar/30" />
          <span className="w-1.5 h-1.5 rotate-45 bg-cinnabar/40" />
          <span className="h-px w-12 bg-cinnabar/30" />
        </div>
      </div>
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-5 w-[92%] bg-muted/50" />
        <Skeleton className="h-5 w-[98%] bg-muted/50" />
        <Skeleton className="h-5 w-[85%] bg-muted/50" />
        <Skeleton className="h-5 w-[95%] bg-muted/50" />
        <Skeleton className="h-5 w-[76%] bg-muted/50" />
        <div className="py-2" />
        <Skeleton className="h-5 w-[90%] bg-muted/50" />
        <Skeleton className="h-5 w-[96%] bg-muted/50" />
        <Skeleton className="h-5 w-[88%] bg-muted/50" />
      </div>
    </div>
  );
}
