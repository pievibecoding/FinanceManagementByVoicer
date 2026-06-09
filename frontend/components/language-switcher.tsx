import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGUAGES = [
  { code: 'vi', labelKey: 'language.vietnamese' },
  { code: 'en', labelKey: 'language.english' },
] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'vi'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 gap-2'>
          <Languages className='size-4' />
          <span className='uppercase'>{currentLanguage.slice(0, 2)}</span>
          <span className='sr-only'>{t('language.label')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
          >
            <span>{t(language.labelKey)}</span>
            {currentLanguage.startsWith(language.code) && (
              <span className='ms-auto text-xs text-muted-foreground'>
                {language.code.toUpperCase()}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
