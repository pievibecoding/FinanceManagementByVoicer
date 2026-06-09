import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function QuickActions() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex gap-3">
      <button
        onClick={() => navigate({ to: '/transactions' })}
        className="flex items-center gap-2 px-4 py-2 bg-white/6 border border-white/18 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-all text-white text-sm"
      >
        <span>{t('dashboard.viewAllTransactions')}</span>
        <span>→</span>
      </button>
      
      <button
        onClick={() => navigate({ to: '/analytics' })}
        className="flex items-center gap-2 px-4 py-2 bg-white/6 border border-white/18 rounded-lg backdrop-blur-sm hover:bg-white/10 transition-all text-white text-sm"
      >
        <span>{t('dashboard.viewAnalytics')}</span>
        <span>📊</span>
      </button>
    </div>
  );
}
