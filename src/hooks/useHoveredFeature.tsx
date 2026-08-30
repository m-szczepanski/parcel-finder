import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { HoveredFeatureState } from '@/types/geo';

const HoveredFeatureContext = createContext<{
  hoveredFeature: HoveredFeatureState;
  setHoveredFeature: (feature: HoveredFeatureState) => void;
} | null>(null);

export function HoveredFeatureProvider({ children }: { children: ReactNode }) {
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeatureState>(null);
  const value = useMemo(() => ({ hoveredFeature, setHoveredFeature }), [hoveredFeature]);

  return <HoveredFeatureContext.Provider value={value}>{children}</HoveredFeatureContext.Provider>;
}

export function useHoveredFeature() {
  const context = useContext(HoveredFeatureContext);

  if (!context) {
    throw new Error('useHoveredFeature must be used within a HoveredFeatureProvider');
  }

  return context;
}
