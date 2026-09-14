import { useSelectedFeature } from '@/hooks/useSelectedFeature';

export function SelectionProbe() {
  const { selectedFeature, clearSelection } = useSelectedFeature();

  return (
    <div>
      <span data-testid="selection">
        {selectedFeature
          ? `${selectedFeature.properties.id}:${selectedFeature.properties.status}`
          : 'none'}
      </span>
      <button type="button" onClick={clearSelection}>
        clear
      </button>
    </div>
  );
}
