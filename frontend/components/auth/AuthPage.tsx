import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Volume2 } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const clientId  = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
  const hasGoogle = !!clientId;

  const inner = (
    <div className="min-h-screen flex items-center justify-center bg-[#070709]">
      <div className="w-full max-w-sm mx-4">

        {/* Logo / App header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg">
            <Volume2 className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Finance Management</h1>
            <p className="text-sm mt-0.5 text-zinc-400">by Voicer</p>
          </div>
        </div>

        {/* Auth card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {mode === 'login'
            ? <LoginForm    onSwitchToRegister={() => setMode('register')} />
            : <RegisterForm onSwitchToLogin={() => setMode('login')} />
          }
        </div>

        <p className="text-center text-xs mt-6 text-zinc-500">
          Quản lý tài chính cá nhân thông minh với AI
        </p>
      </div>
    </div>
  );

  if (!hasGoogle) return inner;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {inner}
    </GoogleOAuthProvider>
  );
}
