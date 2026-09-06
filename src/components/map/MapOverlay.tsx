import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type MapOverlayProps = {
  loading: boolean;
  belowMinZoom: boolean;
  showNoResults: boolean;
};

function HintPill({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
      {children}
    </span>
  );
}

function CenteredHint({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
      <HintPill>{children}</HintPill>
    </div>
  );
}

export function MapOverlay({ loading, belowMinZoom, showNoResults }: MapOverlayProps) {
  if (belowMinZoom) {
    return <CenteredHint>Zoom in to see candidate sites</CenteredHint>;
  }

  if (loading) {
    return (
      <div className="pointer-events-none absolute top-2 left-1/2 z-[1000] -translate-x-1/2">
        <HintPill>
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Loading
        </HintPill>
      </div>
    );
  }

  if (showNoResults) {
    return <CenteredHint>Nothing found in this area</CenteredHint>;
  }

  return null;
}
