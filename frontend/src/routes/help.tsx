import { createFileRoute } from '@tanstack/react-router'
import { Bot, CreditCard, HelpCircle, LayoutDashboard, PiggyBank, PieChart, Search, Tags, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/help')({
  component: HelpCenterPage,
})

const HELP_TOPICS = [
  { key: 'transactions', icon: CreditCard },
  { key: 'budgets', icon: WalletCards },
  { key: 'debts', icon: HelpCircle },
  { key: 'savings', icon: PiggyBank },
  { key: 'categories', icon: Tags },
  { key: 'charts', icon: LayoutDashboard },
  { key: 'assistant', icon: Bot },
] as const

const FAQ_ITEMS = ['localOnly', 'missingData', 'voiceAssistant', 'notifications'] as const

function HelpCenterPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const visibleTopics = useMemo(() => {
    if (!normalizedQuery) return HELP_TOPICS
    return HELP_TOPICS.filter(({ key }) => {
      const title = t(`helpCenter.topics.${key}.title`).toLowerCase()
      const description = t(`helpCenter.topics.${key}.description`).toLowerCase()
      return title.includes(normalizedQuery) || description.includes(normalizedQuery)
    })
  }, [normalizedQuery, t])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">{t('helpCenter.title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('helpCenter.description')}</p>
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('helpCenter.searchPlaceholder')}
            className="pl-9"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTopics.map(({ key, icon: Icon }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4 text-primary" />
                  {t(`helpCenter.topics.${key}.title`)}
                </CardTitle>
                <CardDescription>{t(`helpCenter.topics.${key}.description`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t(`helpCenter.topics.${key}.steps.0`)}</li>
                  <li>{t(`helpCenter.topics.${key}.steps.1`)}</li>
                  <li>{t(`helpCenter.topics.${key}.steps.2`)}</li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {visibleTopics.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t('helpCenter.noResults')}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>{t('helpCenter.faqTitle')}</CardTitle>
              <CardDescription>{t('helpCenter.faqDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {FAQ_ITEMS.map((key) => (
                <div key={key} className="rounded-lg border border-border bg-muted/10 p-4">
                  <p className="mb-1 text-sm font-medium text-foreground">
                    {t(`helpCenter.faq.${key}.question`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`helpCenter.faq.${key}.answer`)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('helpCenter.supportTitle')}</CardTitle>
              <CardDescription>{t('helpCenter.supportDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
                {t('helpCenter.supportNotice')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
