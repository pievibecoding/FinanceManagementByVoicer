import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const hasGoogle = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu'); return; }
    setLoading(true);
    try {
      const res = await authApi.login(email.trim(), password);
      login(res.access_token, res.user_id, res.email ?? email, res.name ?? '');
    } catch (err: any) {
      setError(err.message ?? 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.googleAuth(credentialResponse.credential);
      login(res.access_token, res.user_id, res.email ?? '', res.name ?? '');
    } catch (err: any) {
      setError(err.message ?? 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-center text-white">Đăng nhập</h2>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          disabled={loading}
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      {error && <p className="text-sm text-center text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition-all"
      >
        {loading ? 'Đang xử lý...' : 'Đăng nhập'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Chưa có tài khoản?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-emerald-400 underline">
          Đăng ký
        </button>
      </p>
    </form>
  );
}
