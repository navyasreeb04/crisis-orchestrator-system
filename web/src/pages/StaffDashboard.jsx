import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import IncidentCard from '../components/IncidentCard';
import { useAuth } from '../context/AuthContext';
import { useIncidents } from '../hooks/useIncidents';
import { isDemoMode } from '../services/demoMode';
import { assignDemoResponder } from '../services/demoStore';
import { db } from '../services/firebase';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { incidents, loading, error } = useIncidents({ role: 'staff' });
  const [busyIncidentId, setBusyIncidentId] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function handleResponderAssignment(incidentId) {
    setBusyIncidentId(incidentId);
    setActionError(null);

    try {
      if (isDemoMode) {
        assignDemoResponder(incidentId, user?.uid || 'staff-demo-001');
        return;
      }
      await updateDoc(doc(db, 'incidents', incidentId), {
        on_site_responder: user?.uid || 'staff-operator',
      });
    } catch (assignmentError) {
      setActionError(assignmentError.message);
    } finally {
      setBusyIncidentId(null);
    }
  }

  return (
    <section className="space-y-6">
      <header className="glass-panel rounded-3xl p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
          Staff operations
        </p>
        <h1 className="m-0 text-3xl font-semibold text-stone-900">Hotel incident command board</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Staff can watch every incident, coordinate on-site response, and monitor ambulance progress from a single feed.
        </p>
        {isDemoMode ? (
          <p className="mt-3 text-sm text-amber-700">
            Demo mode is active. Staff actions update the local scenario instantly.
          </p>
        ) : null}
        {actionError ? <p className="mt-4 text-sm text-red-700">{actionError}</p> : null}
      </header>

      {loading ? <p className="text-sm text-stone-600">Loading incident board...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-5">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            ctaLabel={incident.on_site_responder ? 'Reassign Responder' : 'On-site Responder'}
            onAction={() => handleResponderAssignment(incident.id)}
            actionLoading={busyIncidentId === incident.id}
            actionSuccessLabel={
              incident.on_site_responder
                ? `Assigned to ${incident.responder?.name || incident.on_site_responder}`
                : null
            }
          />
        ))}
      </div>
    </section>
  );
}
