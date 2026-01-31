'use client'

import { I18nextProvider } from 'react-i18next'
import i18n from '@beauty-salon-saas/localization'

type ProvidersProps = {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
