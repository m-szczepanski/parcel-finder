import { useMemo, useRef } from 'react';
import { area as turfArea, centroid as turfCentroid } from '@turf/turf';
import { ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useSelectedFeature } from '@/hooks/useSelectedFeature';
import { formatArea } from '@/lib/format';
import { classifyLandUse } from '@/lib/geometry';
import type {
  CandidateSiteFeature,
  LandUseType,
  SelectedFeatureState,
  TakenSiteFeature,
} from '@/types/geo';

const LAND_USE_LABELS: Record<LandUseType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  grass: 'Grass',
  farmland: 'Farmland',
  forest: 'Forest',
  water: 'Water',
  park: 'Park',
  cemetery: 'Cemetery',
  quarry: 'Quarry',
  brownfield: 'Brownfield',
  railway: 'Railway',
  construction: 'Under construction',
  education: 'Education',
  religious: 'Religious',
  garages: 'Garages',
  recreation: 'Recreation',
  military: 'Military',
  unknown: 'Unknown',
};

// features carry status in their properties, so the union narrows on properties
// only — this predicate narrows the whole feature.
function isTakenSite(feature: CandidateSiteFeature | TakenSiteFeature): feature is TakenSiteFeature {
  return feature.properties.status === 'taken';
}

// What occupies a taken site: buildings by tag, everything else via the shared
// land-use classification (config TAKEN_LAND_USE_TYPES).
function occupierLabel(tags: Record<string, string>): string {
  if ('building' in tags) {
    return 'Building';
  }

  return LAND_USE_LABELS[classifyLandUse(tags)];
}

type SiteSummary = {
  id: string;
  isTaken: boolean;
  landUseLabel: string;
  area: number;
  centroid?: [number, number];
  osmUrl: string;
};

// Candidates carry their computed properties from the geometry pass; taken
// sites only carry raw tags, so their area/centroid are derived here on open.
function toSummary(feature: CandidateSiteFeature | TakenSiteFeature): SiteSummary {
  const { id } = feature.properties;
  const osmUrl = `https://www.openstreetmap.org/${id}`;

  if (isTakenSite(feature)) {
    return {
      id,
      isTaken: true,
      landUseLabel: occupierLabel(feature.properties.tags),
      area: turfArea(feature),
      centroid: [...turfCentroid(feature).geometry.coordinates] as [number, number],
      osmUrl,
    };
  }

  const { landuseType, area, centroid } = feature.properties;

  return {
    id,
    isTaken: false,
    landUseLabel: LAND_USE_LABELS[landuseType],
    area,
    centroid,
    osmUrl,
  };
}

function formatCoordinates([longitude, latitude]: [number, number]): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function propertyRows(summary: SiteSummary): { term: string; detail: string }[] {
  const rows = [{ term: 'Area', detail: formatArea(summary.area) }];

  // Taken sites carry the occupier name in the notice instead (step 05).
  if (!summary.isTaken) {
    rows.unshift({ term: 'Land use', detail: summary.landUseLabel });
  }

  if (summary.centroid) {
    rows.push({ term: 'Coordinates', detail: formatCoordinates(summary.centroid) });
  }

  return rows;
}

export function SiteDetails() {
  const { selectedFeature, clearSelection } = useSelectedFeature();

  // Closing clears the selection immediately, but the sheet stays mounted for
  // the slide-out animation — keep rendering the last selection meanwhile.
  const lastFeatureRef = useRef<SelectedFeatureState>(null);

  if (selectedFeature) {
    lastFeatureRef.current = selectedFeature;
  }

  const feature = selectedFeature ?? lastFeatureRef.current;
  const summary = useMemo(() => (feature ? toSummary(feature) : null), [feature]);

  return (
    <Sheet
      open={selectedFeature !== null}
      onOpenChange={(open) => {
        if (!open) {
          clearSelection();
        }
      }}
    >
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{summary?.isTaken ? 'Taken site' : summary?.landUseLabel}</SheetTitle>
          <SheetDescription>{summary ? `OSM ${summary.id}` : null}</SheetDescription>
          {summary?.isTaken && (
            <span
              className="w-fit rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              data-slot="taken-notice"
            >
              {summary.landUseLabel}
            </span>
          )}
        </SheetHeader>
        {summary && (
          <>
            <dl className="flex flex-col gap-2 px-4 text-sm">
              {propertyRows(summary).map((row) => (
                <div key={row.term} className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">{row.term}</dt>
                  <dd className="text-right font-medium">{row.detail}</dd>
                </div>
              ))}
            </dl>
            <a
              className="flex w-fit items-center gap-1.5 px-4 text-sm font-medium underline-offset-4 hover:underline"
              href={summary.osmUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on OpenStreetMap
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <SheetFooter>
              <p className="text-xs text-muted-foreground">
                Heuristic approximation, not a cadastral or legal source.
              </p>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
