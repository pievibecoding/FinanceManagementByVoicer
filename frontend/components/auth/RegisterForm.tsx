import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: Props) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const hasGoogle = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !username || !password) { setError('Vui lòng điền đầy đủ thông tin'); return; }
    if (password !== confirm)             { setError('Mật khẩu xác nhận không khớp'); return; }
    if (password.length < 8)             { setError('Mật khẩu phải có ít nhất 8 ký tự'); return; }
    setLoading(true);
    try {
      const res = await authApi.register(email.trim(), username.trim(), password);
      login(res.access_token, res.user_id, res.email ?? email, res.name ?? username);
    } catch (err: any) {
      setError(err.message ?? 'Đăng ký thất bại');
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
      setError(err.message ?? 'Đăng ký Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-center text-white">Đăng ký tài khoản</h2>

      {hasGoogle && (
        <>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError('Đăng ký Google thất bại')}
              text="signup_with"
              shape="rectangular"
              width="320"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-700" />
            <span className="text-xs text-zinc-500">hoặc</span>
            <div className="flex-1 h-px bg-zinc-700" />
          </div>
        </>
      )}

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
        <label className="text-sm text-zinc-400">Tên người dùng</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Nguyen Van A"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          disabled={loading}
          autoComplete="username"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Mật khẩu</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Ít nhất 8 ký tự"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          disabled={loading}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-400">Xác nhận mật khẩu</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Nhập lại mật khẩu"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          disabled={loading}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-sm text-center text-rose-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition-all"
      >
        {loading ? 'Đang xử lý...' : 'Đăng ký'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Đã có tài khoản?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-emerald-400 underline">
          Đăng nhập
        </button>
      </p>
    </form>
  );
}
