import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type MapOverlayProps = {
  loading: boolean;
  belowMinZoom: boolean;
  showNoResults: boolean;
};

function CenteredHint({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
      <span className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
        {children}
      </span>
    </div>
  );
}

export function MapOverlay({ loading, belowMinZoom, showNoResults }: MapOverlayProps) {
  if (belowMinZoom) {
    return <CenteredHint>Zoom in to see candidate sites</CenteredHint>;
  }

  if (loading) {
    return (
      <CenteredHint>
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        Loading
      </CenteredHint>
    );
  }

  if (showNoResults) {
    return <CenteredHint>Nothing found in this area</CenteredHint>;
  }

  return null;
}
