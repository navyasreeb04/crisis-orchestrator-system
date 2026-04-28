import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDemoMode } from '../services/demoMode';
import { createDemoIncident } from '../services/demoStore';

const triageOptions = [
  { value: 'respiratory', label: 'Respiratory distress', severity: 'high', summary: 'Guest reports rapid breathing and visible distress.' },
  { value: 'cardiac', label: 'Cardiac symptoms', severity: 'critical', summary: 'Guest reports chest pain, sweating, and weakness.' },
  { value: 'fall', label: 'Fall injury', severity: 'medium', summary: 'Guest fell and may have a limb injury.' },
  { value: 'bleeding', label: 'Bleeding', severity: 'high', summary: 'Guest has active bleeding and needs immediate attention.' },
  { value: 'allergic', label: 'Allergic reaction', severity: 'high', summary: 'Guest shows swelling, rash, and breathing discomfort.' },
];

export default function GuestIntakePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    bloodGroup: 'Unknown',
    medicalHistory: '',
    emergencyContact: '',
    floorInfo: '',
    incidentType: 'respiratory',
  });
  const [submittedIncidentId, setSubmittedIncidentId] = useState(null);

  const selectedTriage = useMemo(
    () => triageOptions.find((option) => option.value === form.incidentType) || triageOptions[0],
    [form.incidentType],
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!isDemoMode) {
      return;
    }

    const normalizedName = form.name.trim() || 'Guest Walk-in';
    createDemoIncident({
      name: normalizedName,
      bloodGroup: form.bloodGroup.trim() || 'Unknown',
      medicalHistory: form.medicalHistory.trim() || 'No history provided.',
      emergencyContact: form.emergencyContact.trim(),
      floorInfo: form.floorInfo.trim() || 'Front desk intake',
      incidentType: selectedTriage.value,
      severity: selectedTriage.severity,
      summary: `${selectedTriage.summary} Intake logged for ${normalizedName}.`,
    });

    setSubmittedIncidentId(`Created ${normalizedName}'s emergency dispatch.`);
    setForm({
      name: '',
      bloodGroup: 'Unknown',
      medicalHistory: '',
      emergencyContact: '',
      floorInfo: '',
      incidentType: 'respiratory',
    });
  }

  return (
    <section className="space-y-6">
      <header className="glass-panel rounded-3xl p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
          Guest intake
        </p>
        <h1 className="m-0 text-3xl font-semibold text-stone-900">Emergency profile intake</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Use this screen as a front desk or concierge alternative to mobile sign-in. It captures guest details and immediately creates a live incident for hospital and staff dashboards.
        </p>
        {isDemoMode ? (
          <p className="mt-3 text-sm text-amber-700">
            Demo mode is active. Every submission creates a simulated SOS dispatch with guest medical details.
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form className="glass-panel rounded-3xl p-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Guest name
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Riya Kapoor"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Blood group
              <input
                type="text"
                value={form.bloodGroup}
                onChange={(event) => updateField('bloodGroup', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="B+"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Emergency contact
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(event) => updateField('emergencyContact', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="+91 98765 43210"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Location or room
              <input
                type="text"
                value={form.floorInfo}
                onChange={(event) => updateField('floorInfo', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
                placeholder="Room 506, East Wing"
              />
            </label>
          </div>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Previous diseases / medical history
            <textarea
              value={form.medicalHistory}
              onChange={(event) => updateField('medicalHistory', event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
              placeholder="Asthma, allergy to penicillin, recent surgery..."
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Emergency type
            <select
              value={form.incidentType}
              onChange={(event) => updateField('incidentType', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none"
            >
              {triageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Create Demo SOS
            </button>
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700"
            >
              Go To Staff Board
            </button>
          </div>
        </form>

        <aside className="glass-panel rounded-3xl p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Interactive flow
          </p>
          <div className="space-y-4 text-sm leading-6 text-stone-700">
            <p>1. Fill guest profile details here instead of phone sign-in.</p>
            <p>2. Submit to create an emergency case with blood group and medical history attached.</p>
            <p>3. Open Staff Console to assign an on-site responder.</p>
            <p>4. Open Hospital Console to accept dispatch and watch status move forward.</p>
          </div>
          {submittedIncidentId ? (
            <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {submittedIncidentId}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
