import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import Backend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

export const supportedLngs = ['ru', 'en'] as const
export const defaultNS = 'common'

export const initI18n = () => {
  if (i18n.isInitialized) {
    return i18n
  }

  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'ru',
      supportedLngs: [...supportedLngs],
      defaultNS,
      ns: ['common', 'appointments'],
      interpolation: {
        escapeValue: false
      },
      react: {
        useSuspense: false
      },
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json'
      },
      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator'],
        caches: ['cookie', 'localStorage']
      },
      returnNull: false
    })

  return i18n
}

initI18n()

export default i18n
