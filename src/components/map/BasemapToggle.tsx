import { useEffect, useRef } from 'react';
import { DomEvent } from 'leaflet';
import { Toggle } from '@/components/ui/toggle';
import type { Basemap } from '@/lib/mapState';

const OPTIONS: { value: Basemap; label: string }[] = [
  { value: 'osm', label: 'Map' },
  { value: 'satellite', label: 'Satellite' },
];

type BasemapToggleProps = {
  value: Basemap;
  onChange: (basemap: Basemap) => void;
};

export function BasemapToggle({ value, onChange }: BasemapToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      DomEvent.disableClickPropagation(containerRef.current);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Basemap"
      className="absolute top-2 right-2 z-[1000] flex overflow-hidden rounded-md border bg-background p-0.5 shadow-sm"
    >
      {OPTIONS.map((option) => (
        <Toggle
          key={option.value}
          size="sm"
          className="rounded-sm"
          pressed={value === option.value}
          onPressedChange={() => onChange(option.value)}
        >
          {option.label}
        </Toggle>
      ))}
    </div>
  );
}
