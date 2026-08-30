function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-slate-950/50">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
          Parcel Finder
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Initial project scaffold</h1>
        <p className="mt-4 text-base text-slate-300">
          This is the empty but configured starting point for the Parcel Finder app described in the
          project docs.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-slate-300">
          <li>• Vite + React + TypeScript</li>
          <li>• Tailwind-ready styling</li>
          <li>• Leaflet / geospatial structure in place</li>
          <li>• Domain folders prepared for map, geometry, hooks, and types</li>
        </ul>
      </div>
    </main>
  );
}

export default App;
