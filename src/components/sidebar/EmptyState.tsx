// Explicit empty states for the side panel (step 08 surfaces them): the
// no-selection variant tells the user how to open the panel, the no-results
// variant distinguishes an area without candidate land from inaction.
const MESSAGES = {
  'no-selection': 'Click a site on the map to inspect it',
  'no-results': 'Nothing found in this area',
} as const;

export type EmptyStateVariant = keyof typeof MESSAGES;

export function EmptyState({ variant }: { variant: EmptyStateVariant }) {
  return (
    <div className="flex items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
      {MESSAGES[variant]}
    </div>
  );
}
