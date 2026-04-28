import { useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import IncidentCard from '../components/IncidentCard';
import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { isDemoMode } from '../services/demoMode';
import { acceptDemoIncident } from '../services/demoStore';
import { functions } from '../services/firebase';

export default function HospitalDashboard() {
  const { hospitalId } = useAuth();
  const { incidents, loading, error } = useIncidents({ role: 'hospital', hospitalId });
  const [busyIncidentId, setBusyIncidentId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const toneContext = useRef(null);
  const previousIncidentIds = useRef([]);

  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status === 'searching' || incident.status === 'accepted'),
    [incidents],
  );

  useEffect(() => {
    const currentIds = activeIncidents.map((incident) => incident.id);
    const hasNewIncident = currentIds.some((id) => !previousIncidentIds.current.includes(id));
    previousIncidentIds.current = currentIds;

    if (!hasNewIncident) {
      return;
    }

    try {
      toneContext.current = toneContext.current || new window.AudioContext();
      const oscillator = toneContext.current.createOscillator();
      const gainNode = toneContext.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(toneContext.current.destination);
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.04;
      oscillator.start();
      oscillator.stop(toneContext.current.currentTime + 0.35);
    } catch (audioError) {
      console.warn('Unable to play dashboard alert tone:', audioError);
    }
  }, [activeIncidents]);

  async function handleAcceptIncident(incidentId) {
    setBusyIncidentId(incidentId);
    setActionError(null);

    try {
      if (isDemoMode) {
        acceptDemoIncident(incidentId);
        return;
      }
      const callable = httpsCallable(functions, 'acceptIncident');
      await callable({ incidentId });
    } catch (acceptError) {
      setActionError(acceptError.message);
    } finally {
      setBusyIncidentId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="glass-panel rounded-3xl p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
          Hospital response
        </p>
        <h1 className="m-0 text-3xl font-semibold text-stone-900">Assigned emergency feed</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Incidents appear here the moment dispatch reaches this hospital. Accepting one locks the assignment and starts ambulance tracking.
        </p>
        {isDemoMode ? (
          <p className="mt-3 text-sm text-amber-700">
            Demo mode is active. Dispatch, acceptance, and ambulance movement are simulated locally.
          </p>
        ) : null}
        {actionError ? <p className="mt-4 text-sm text-red-700">{actionError}</p> : null}
      </header>

      {loading ? <p className="text-sm text-stone-600">Loading hospital incidents...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-5">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            ctaLabel={incident.status === 'searching' ? 'Accept Dispatch' : null}
            onAction={() => handleAcceptIncident(incident.id)}
            actionLoading={busyIncidentId === incident.id}
            actionDisabled={incident.status !== 'searching'}
          />
        ))}
        {!loading && incidents.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-sm text-stone-600">
            No incidents are currently assigned to this hospital.
          </div>
        ) : null}
      </div>
    </section>
  );
}
