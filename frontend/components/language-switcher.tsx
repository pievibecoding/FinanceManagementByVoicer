import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

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

function LanguageOptionItems() {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'vi'

  return (
    <>
      {LANGUAGES.map((language) => {
        const isActive = currentLanguage.startsWith(language.code)

        return (
          <DropdownMenuItem
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
          >
            <span>{t(language.labelKey)}</span>
            {isActive && <Check className='ms-auto size-4' />}
          </DropdownMenuItem>
        )
      })}
    </>
  )
}

export function SidebarLanguageSwitcher() {
  const { isMobile } = useSidebar()
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'vi'

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton tooltip={t('language.label')}>
            <Languages />
            <span>{t('language.label')}</span>
            <span className='ms-auto text-xs font-medium uppercase text-muted-foreground'>
              {currentLanguage.slice(0, 2)}
            </span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={isMobile ? 'bottom' : 'right'}
          align='start'
          sideOffset={4}
        >
          <LanguageOptionItems />
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export function LanguageSubMenu() {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'vi'

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages />
        <span>{t('language.label')}</span>
        <span className='ms-auto me-2 text-xs font-medium uppercase text-muted-foreground'>
          {currentLanguage.slice(0, 2)}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <LanguageOptionItems />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
