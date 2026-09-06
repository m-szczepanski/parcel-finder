import { LoaderCircle } from 'lucide-react';

type MapOverlayProps = {
  loading: boolean;
  belowMinZoom: boolean;
  showNoResults: boolean;
};

function CenteredHint({ message }: { message: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
      <span className="rounded-md bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
        {message}
      </span>
    </div>
  );
}

export function MapOverlay({ loading, belowMinZoom, showNoResults }: MapOverlayProps) {
  if (belowMinZoom) {
    return <CenteredHint message="Zoom in to see candidate sites" />;
  }

  if (loading) {
    return (
      <div className="pointer-events-none absolute top-2 left-2 z-[1000] flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm text-muted-foreground shadow-sm">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Loading
      </div>
    );
  }

  if (showNoResults) {
    return <CenteredHint message="Nothing found in this area" />;
  }

  return null;
}
