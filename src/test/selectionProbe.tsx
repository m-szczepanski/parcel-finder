import { useSelectedFeature } from '@/hooks/useSelectedFeature';

// Renders the current selection state (`id:status`, or `none`) plus a button
// that clears it — lets layer tests drive deselection from outside.
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
