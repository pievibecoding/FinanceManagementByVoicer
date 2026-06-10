import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { authApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onSwitchToRegister: () => void;
}

export function LoginForm({ onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const hasGoogle = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError(t('auth.missingCredentials')); return; }
    setLoading(true);
    try {
      console.log('Attempting login with:', email);
      const res = await authApi.login(email.trim(), password);
      console.log('Login response:', res);
      login(res.access_token, res.user_id, res.email ?? email, res.username ?? res.name ?? '');
      console.log('Login successful, token set');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message ?? t('auth.loginFailed'));
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
      setError(err.message ?? t('auth.googleLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-center text-foreground">{t('auth.signInTitle')}</h2>

      {hasGoogle && (
        <>
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError(t('auth.googleLoginFailed'))}
              text="continue_with"
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
        <label className="text-sm text-muted-foreground">{t('auth.password')}</label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={loading}
          autoComplete="current-password"
        />
      </div>

      {error && <p className="text-sm text-center text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? t('auth.loading') : t('auth.signInButton')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-primary underline underline-offset-4">
          {t('auth.signUpButton')}
        </button>
      </p>
    </form>
  );
}
