import StatusBadge from './StatusBadge';

function formatLocation(location) {
  if (!location?.latitude || !location?.longitude) {
    return 'Location unavailable';
  }

  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export default function IncidentCard({
  incident,
  ctaLabel,
  onAction,
  actionDisabled = false,
  actionLoading = false,
  actionSuccessLabel = null,
}) {
  return (
    <article className="glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Incident {incident.incident_id || incident.id}
          </p>
          <h3 className="m-0 text-xl font-semibold text-stone-900">
            {incident.triage?.type || 'Unknown'} emergency
          </h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {incident.triage?.summary || 'Awaiting triage summary.'}
          </p>
        </div>
        <StatusBadge status={incident.status} />
      </div>

      <div className="mt-5 grid gap-3 text-sm text-stone-700 md:grid-cols-2">
        <div>
          <span className="font-semibold text-stone-900">Guest:</span> {incident.guest?.name || incident.user_id}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Severity:</span> {incident.triage?.severity || 'medium'}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Blood group:</span>{' '}
          {incident.guest?.blood_group || 'Unknown'}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Floor:</span> {incident.floor_info || 'Not provided'}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Medical history:</span>{' '}
          {incident.guest?.medical_history || 'Not provided'}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Location:</span> {formatLocation(incident.location)}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Emergency contact:</span>{' '}
          {incident.guest?.emergency_contacts?.[0] || 'Not provided'}
        </div>
        <div>
          <span className="font-semibold text-stone-900">Acknowledged:</span>{' '}
          {incident.acknowledged ? 'Yes' : 'No'}
        </div>
        <div>
          <span className="font-semibold text-stone-900">On-site responder:</span>{' '}
          {incident.responder?.name || incident.on_site_responder || 'Unassigned'}
        </div>
      </div>

      {ctaLabel ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled || actionLoading}
            className="inline-flex items-center rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading ? 'Working...' : ctaLabel}
          </button>
          {actionSuccessLabel ? (
            <span className="text-sm font-medium text-emerald-700">{actionSuccessLabel}</span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
