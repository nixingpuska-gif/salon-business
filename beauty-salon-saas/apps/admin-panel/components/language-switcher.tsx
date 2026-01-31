'use client'

import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' }
]

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{t('language.label')}:</span>
      {languages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => i18n.changeLanguage(language.code)}
          style={{
            fontWeight: i18n.language === language.code ? 700 : 400
          }}
        >
          {language.label}
        </button>
      ))}
      <span style={{ marginLeft: 8 }}>
        {t('language.current')}: {i18n.language}
      </span>
    </div>
  )
}
