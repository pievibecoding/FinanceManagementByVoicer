import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

function getLocale(language?: string) {
  return language?.startsWith('en') ? 'en-US' : 'vi-VN'
}

export function useLocaleFormat() {
  const { i18n } = useTranslation()
  const locale = getLocale(i18n.resolvedLanguage || i18n.language)

  return useMemo(() => {
    const currencyFormatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    })

    const numberFormatter = new Intl.NumberFormat(locale)

    const compactNumberFormatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    })

    return {
      locale,
      formatCurrency: (value: number) => currencyFormatter.format(value),
      formatNumber: (value: number) => numberFormatter.format(value),
      formatCompactNumber: (value: number) => compactNumberFormatter.format(value),
      formatDate: (value: string | Date, options?: Intl.DateTimeFormatOptions) =>
        new Date(value).toLocaleDateString(locale, options ?? {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      formatDateTime: (value: string | Date) =>
        new Date(value).toLocaleDateString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    }
  }, [locale])
}
