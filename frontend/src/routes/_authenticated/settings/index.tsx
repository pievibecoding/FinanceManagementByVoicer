import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: () => {
    const { t } = useTranslation()
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t('pages.settings')}</h1>
        <p>{t('pages.settingsComingSoon')}</p>
      </div>
    )
  },
})
