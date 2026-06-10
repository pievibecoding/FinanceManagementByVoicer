import { Link, createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, CreditCard, Languages, Palette, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { AppCard, PageHeader } from '@/components/common'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSwitch } from '@/components/theme-switch'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: SettingsPage,
})

function getInitials(name?: string, email?: string) {
  const source = (name || email || 'User').trim()
  const parts = source.includes('@') ? [source[0]] : source.split(/\s+/)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'
}

function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const displayName = user?.name || user?.email || t('settingsCore.profile.fallbackName')
  const initials = getInitials(user?.name, user?.email)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
        <PageHeader
          title={t('settingsCore.title')}
          description={t('settingsCore.description')}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <AppCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                {t('settingsCore.profile.title')}
              </CardTitle>
              <CardDescription>{t('settingsCore.profile.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center">
                <Avatar className="size-16 rounded-xl">
                  <AvatarFallback className="rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-foreground">{displayName}</h2>
                    <Badge variant="secondary">{t('settingsCore.profile.active')}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <InfoTile label={t('settingsCore.profile.userId')} value={String(user?.id ?? '-')} />
                <InfoTile label={t('settingsCore.profile.email')} value={user?.email || '-'} />
                <InfoTile label={t('settingsCore.profile.plan')} value={t('app.plan')} />
              </div>

              <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                {t('settingsCore.profile.readOnlyNotice')}
              </div>
            </CardContent>
          </AppCard>

          <AppCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                {t('settingsCore.account.title')}
              </CardTitle>
              <CardDescription>{t('settingsCore.account.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingAction
                icon={<Languages className="size-4" />}
                title={t('settingsCore.account.language')}
                description={t('settingsCore.account.languageDescription')}
                action={<LanguageSwitcher />}
              />
              <SettingAction
                icon={<Palette className="size-4" />}
                title={t('settingsCore.account.theme')}
                description={t('settingsCore.account.themeDescription')}
                action={<ThemeSwitch />}
              />
              <SettingAction
                icon={<BadgeCheck className="size-4" />}
                title={t('settingsCore.account.notifications')}
                description={t('settingsCore.account.notificationsDescription')}
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/settings/notifications">{t('settingsCore.actions.configure')}</Link>
                  </Button>
                }
              />
            </CardContent>
          </AppCard>
        </div>

        <AppCard id="billing">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              {t('settingsCore.billing.title')}
            </CardTitle>
            <CardDescription>{t('settingsCore.billing.description')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{t('app.plan')}</Badge>
                <Badge variant="outline">{t('settingsCore.billing.free')}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('settingsCore.billing.notice')}</p>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <span>{t('settingsCore.billing.features.transactions')}</span>
                <span>{t('settingsCore.billing.features.budgets')}</span>
                <span>{t('settingsCore.billing.features.ai')}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="size-4 text-primary" />
                {t('settingsCore.billing.upgradeTitle')}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{t('settingsCore.billing.upgradeDescription')}</p>
              <Button variant="secondary" disabled className="w-full">
                {t('settingsCore.billing.notAvailable')}
              </Button>
            </div>
          </CardContent>
        </AppCard>
      </div>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function SettingAction({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/10 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
