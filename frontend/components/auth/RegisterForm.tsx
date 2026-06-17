import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: Props) {
  const { login } = useAuth();
  const { t } = useTranslation();
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
    if (!email || !username || !password) { setError(t('auth.missingRegisterFields')); return; }
    if (password !== confirm)             { setError(t('auth.passwordMismatch')); return; }
    if (password.length < 8)             { setError(t('auth.passwordTooShort')); return; }
    setLoading(true);
    try {
      console.log('Attempting register with:', { email, username });
      const res = await authApi.register(email.trim(), username.trim(), password);
      console.log('Register response:', res);
      login(res.access_token, res.user_id, res.email ?? email, res.username ?? res.name ?? username);
      console.log('Register successful, token set');
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.message ?? t('auth.registerFailed'));
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
      setError(err.message ?? t('auth.googleRegisterFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-center text-foreground">{t('auth.signUpTitle')}</h2>

      {hasGoogle && (
        <>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError(t('auth.googleRegisterFailed'))}
              text="signup_with"
              shape="rectangular"
              width="320"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">{t('auth.email')}</label>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={loading}
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">{t('auth.username')}</label>
        <Input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Nguyen Van A"
          disabled={loading}
          autoComplete="username"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">{t('auth.password')}</label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('auth.passwordPlaceholder')}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">{t('auth.confirmPassword')}</label>
        <Input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder={t('auth.confirmPasswordPlaceholder')}
          disabled={loading}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-sm text-center text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? t('auth.loading') : t('auth.signUpButton')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.hasAccount')}{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-primary underline underline-offset-4">
          {t('auth.signInButton')}
        </button>
      </p>
    </form>
  );
}
