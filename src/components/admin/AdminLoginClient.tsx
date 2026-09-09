'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Kares Studio — Admin Login (Supabase Auth, email+password).
 * No hardcoded passwords, no localStorage flags. Session lives in
 * Supabase auth cookies; middleware protects /admin* routes.
 */
export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Isi email dan password.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(
          /invalid login credentials/i.test(signErr.message)
            ? 'Email atau password salah.'
            : signErr.message
        );
        return;
      }
      router.replace(next.startsWith('/admin') ? next : '/admin');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <form className="admin-panel admin-login" onSubmit={submit}>
        <div className="section-tag" style={{ justifyContent: 'center' }}>
          <span className="star">✹</span>
          <span className="label">[ADMIN LOGIN]</span>
        </div>
        <h1>Kares Admin</h1>
        <p className="admin-muted">
          Masuk dengan akun Supabase Auth yang terdaftar.
        </p>
        {error ? (
          <p className="admin-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="admin-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@karesstudio.com"
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
}
