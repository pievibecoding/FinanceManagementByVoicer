import { createFileRoute } from '@tanstack/react-router'
import { Bell, Bot, CalendarClock, PiggyBank, ReceiptText, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppCard, PageHeader } from '@/components/common'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

export const Route = createFileRoute('/_authenticated/settings/notifications')({
  component: NotificationsPage,
})

const PREFERENCES = [
  { key: 'budgetAlerts', icon: WalletCards },
  { key: 'debtReminders', icon: ReceiptText },
  { key: 'savingsProgress', icon: PiggyBank },
  { key: 'monthlySummary', icon: CalendarClock },
  { key: 'aiConfirmations', icon: Bot },
] as const

type PreferenceKey = (typeof PREFERENCES)[number]['key']

const DEFAULT_STATE: Record<PreferenceKey, boolean> = {
  budgetAlerts: true,
  debtReminders: true,
  savingsProgress: true,
  monthlySummary: false,
  aiConfirmations: true,
}

function NotificationsPage() {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState(DEFAULT_STATE)

  const togglePreference = (key: PreferenceKey) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-6">
        <PageHeader
          title={t('notificationsPage.title')}
          description={t('notificationsPage.description')}
        />

        <AppCard className="py-2">
          <CardHeader className="px-6 pb-4 pt-6">
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              {t('notificationsPage.preferencesTitle')}
            </CardTitle>
            <CardDescription>{t('notificationsPage.preferencesDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {PREFERENCES.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/10 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t(`notificationsPage.preferences.${key}.title`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`notificationsPage.preferences.${key}.description`)}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences[key]}
                  onCheckedChange={() => togglePreference(key)}
                  aria-label={t(`notificationsPage.preferences.${key}.title`)}
                />
              </div>
            ))}
          </CardContent>
        </AppCard>

        <AppCard className="py-2">
          <CardHeader className="px-6 pb-4 pt-6">
            <CardTitle>{t('notificationsPage.deliveryTitle')}</CardTitle>
            <CardDescription>{t('notificationsPage.deliveryDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="rounded-lg border border-border bg-muted/10 px-5 py-4 text-sm text-muted-foreground">
              {t('notificationsPage.localOnlyNotice')}
            </div>
          </CardContent>
        </AppCard>
      </div>
    </div>
  )
}
