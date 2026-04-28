import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { isDemoMode } from '../services/demoMode';
import { getDemoIncidents, subscribeDemoState } from '../services/demoStore';

export function useIncidents({ role, hospitalId }) {
  const [state, setState] = useState({
    incidents: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!role) {
      setState({ incidents: [], loading: false, error: null });
      return undefined;
    }

    if (isDemoMode) {
      return subscribeDemoState(() => {
        setState({
          incidents: getDemoIncidents({ role, hospitalId }),
          loading: false,
          error: null,
        });
      });
    }

    let incidentsQuery;
    if (role === 'hospital' && hospitalId) {
      incidentsQuery = query(
        collection(db, 'incidents'),
        where('hospital_id', '==', hospitalId),
        orderBy('timestamp', 'desc'),
      );
    } else if (role === 'staff') {
      incidentsQuery = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'));
    } else {
      setState({ incidents: [], loading: false, error: null });
      return undefined;
    }

    return onSnapshot(
      incidentsQuery,
      (snapshot) => {
        const incidents = snapshot.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        setState({ incidents, loading: false, error: null });
      },
      (error) => {
        setState({ incidents: [], loading: false, error: error.message });
      },
    );
  }, [hospitalId, role]);

  return state;
}
