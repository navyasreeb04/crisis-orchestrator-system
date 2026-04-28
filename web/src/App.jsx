import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import DemoControls from './components/DemoControls';
import LoginPage from './pages/LoginPage';
import GuestIntakePage from './pages/GuestIntakePage';
import HospitalDashboard from './pages/HospitalDashboard';
import StaffDashboard from './pages/StaffDashboard';
import { useAuth } from './context/AuthContext';

function Shell({ children }) {
  const { role, signOutUser, user, isDemoMode } = useAuth();
  const navigate = useNavigate();

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
              Live orchestration
            </p>
            <h1 className="m-0 text-2xl font-semibold text-stone-900">
              {role === 'hospital' ? 'Hospital Console' : 'Staff Console'}
            </h1>
            <p className="mt-2 text-sm text-stone-600">{user?.email || user?.phoneNumber || user?.uid}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/guest-intake')}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"
            >
              Guest Intake
            </button>
            <button
              type="button"
              onClick={() => navigate(role === 'hospital' ? '/hospital' : '/staff')}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"
            >
              Refresh View
            </button>
            <button
              type="button"
              onClick={signOutUser}
              className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Sign out
            </button>
          </div>
        </header>
        {isDemoMode ? <div className="mb-6"><DemoControls /></div> : null}
        {children}
      </div>
    </main>
  );
}

export default function App() {
  const { loading, user, role, error } = useAuth();

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-stone-600">Loading console...</main>;
  }

  if (error) {
    return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-red-700">{error}</main>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/guest-intake" element={<GuestIntakePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (role !== 'staff' && role !== 'hospital') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="glass-panel rounded-3xl p-8">
          <p className="text-sm text-red-700">This account does not have dashboard access.</p>
        </div>
      </main>
    );
  }

  return (
    <Routes>
      <Route
        path="/hospital"
        element={
          <Shell>
            <HospitalDashboard />
          </Shell>
        }
      />
      <Route
        path="/staff"
        element={
          <Shell>
            <StaffDashboard />
          </Shell>
        }
      />
      <Route
        path="/guest-intake"
        element={
          <Shell>
            <GuestIntakePage />
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to={role === 'hospital' ? '/hospital' : '/staff'} replace />} />
    </Routes>
  );
}
