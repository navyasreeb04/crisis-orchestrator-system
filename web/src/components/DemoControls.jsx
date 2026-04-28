import { resetDemoState, spawnDemoIncident } from '../services/demoStore';

export default function DemoControls() {
  return (
    <div className="glass-panel rounded-2xl p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
        Demo Controls
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={spawnDemoIncident}
          className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
        >
          Spawn Demo Incident
        </button>
        <button
          type="button"
          onClick={resetDemoState}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"
        >
          Reset Demo
        </button>
      </div>
    </div>
  );
}
