import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, signInDemoRole, isDemoMode } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(form.email.trim(), form.password);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="glass-panel w-full max-w-md rounded-3xl p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
          Crisis Orchestrator
        </p>
        <h1 className="m-0 text-3xl font-semibold text-stone-900">Operations sign-in</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {isDemoMode
            ? 'Demo mode is enabled. Enter any email containing staff for the staff view, or use the quick buttons below.'
            : 'Use a Firebase Auth account with either `staff` or `hospital` access.'}
        </p>

        {isDemoMode ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => signInDemoRole('hospital')}
              className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
            >
              Demo Hospital View
            </button>
            <button
              type="button"
              onClick={() => signInDemoRole('staff')}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700"
            >
              Demo Staff View
            </button>
            <Link
              to="/guest-intake"
              className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 no-underline"
            >
              Guest Intake Form
            </Link>
          </div>
        ) : null}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-stone-700">
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none ring-0"
              required
            />
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none ring-0"
              required={!isDemoMode}
            />
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </form>
      </section>
    </main>
  );
}
