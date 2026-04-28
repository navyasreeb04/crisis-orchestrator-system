import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { isDemoMode } from '../services/demoMode';
import { getDemoSnapshot, signInDemo, signOutDemo, subscribeDemoState } from '../services/demoStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    role: null,
    hospitalId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (isDemoMode) {
      return subscribeDemoState((demoState) => {
        const session = demoState.session;
        setState({
          user: session
            ? {
                uid: session.uid,
                email: session.email,
              }
            : null,
          role: session?.role || null,
          hospitalId: session?.hospitalId || null,
          loading: false,
          error: null,
        });
      });
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, role: null, hospitalId: null, loading: false, error: null });
        return;
      }

      try {
        const tokenResult = await getIdTokenResult(user, true);
        let role = tokenResult.claims.role || null;
        let hospitalId = tokenResult.claims.hospitalId || null;

        if (!role) {
          const userSnapshot = await getDoc(doc(db, 'users', user.uid));
          role = userSnapshot.data()?.role || null;
        }

        setState({
          user,
          role,
          hospitalId,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState({
          user,
          role: null,
          hospitalId: null,
          loading: false,
          error: error.message,
        });
      }
    });
  }, []);

  const value = {
    ...state,
    async signIn(email, password) {
      if (isDemoMode) {
        const normalized = email.trim().toLowerCase();
        signInDemo({ role: normalized.includes('staff') ? 'staff' : 'hospital' });
        return;
      }
      await signInWithEmailAndPassword(auth, email, password);
    },
    async signInDemoRole(role) {
      signInDemo({ role });
    },
    async signOutUser() {
      if (isDemoMode) {
        signOutDemo();
        return;
      }
      await signOut(auth);
    },
    isDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
