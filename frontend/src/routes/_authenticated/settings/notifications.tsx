import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  component: () => {
    const { t } = useTranslation()
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('pages.notifications')}</h1>
        <p>{t('pages.notificationsComingSoon')}</p>
      </div>
    )
  },
})
