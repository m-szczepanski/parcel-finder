import { useEffect, useRef } from 'react';
import type { Path, PathOptions } from 'leaflet';
import { useSelectedFeature } from '@/hooks/useSelectedFeature';

export function useSelectedSiteStyle(defaultStyle: PathOptions, selectedStyle: PathOptions) {
  const { selectedFeature, selectFeature } = useSelectedFeature();
  const selectedLayerRef = useRef<{ id: string; layer: Path } | null>(null);

  useEffect(() => {
    const selection = selectedLayerRef.current;

    if (selection && selection.id !== selectedFeature?.properties.id) {
      selection.layer.setStyle(defaultStyle);
      selectedLayerRef.current = null;
    }
  }, [selectedFeature, defaultStyle]);

  return {
    selectedFeature,
    selectFeature,
    isStyledSelection: (path: Path) => selectedLayerRef.current?.layer === path,
    styleSelection: (path: Path, id: string) => {
      if (selectedLayerRef.current?.layer !== path) {
        selectedLayerRef.current?.layer.setStyle(defaultStyle);
        selectedLayerRef.current = { id, layer: path };
        path.setStyle(selectedStyle);
      }
    },
  };
}
