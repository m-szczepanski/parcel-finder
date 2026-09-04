import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CandidateSiteFeature, SelectedFeatureState, TakenSiteFeature } from '@/types/geo';

const SelectedFeatureContext = createContext<{
  selectedFeature: SelectedFeatureState;
  selectFeature: (feature: CandidateSiteFeature | TakenSiteFeature) => void;
  clearSelection: () => void;
} | null>(null);

export function SelectedFeatureProvider({ children }: { children: ReactNode }) {
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeatureState>(null);
  const value = useMemo(
    () => ({
      selectedFeature,
      selectFeature: setSelectedFeature,
      clearSelection: () => setSelectedFeature(null),
    }),
    [selectedFeature],
  );

  return (
    <SelectedFeatureContext.Provider value={value}>{children}</SelectedFeatureContext.Provider>
  );
}

export function useSelectedFeature() {
  const context = useContext(SelectedFeatureContext);

  if (!context) {
    throw new Error('useSelectedFeature must be used within a SelectedFeatureProvider');
  }

  return context;
}
