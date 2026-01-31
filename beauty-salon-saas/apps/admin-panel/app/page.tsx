'use client'

import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/language-switcher'

export default function HomePage() {
  const { t } = useTranslation(['common', 'appointments'])

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>{t('app.name')}</h1>
          <p style={{ margin: '4px 0 0' }}>{t('app.tagline')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <nav style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>{t('navigation.dashboard')}</span>
        <span>{t('navigation.appointments')}</span>
        <span>{t('navigation.clients')}</span>
        <span>{t('navigation.staff')}</span>
        <span>{t('navigation.analytics')}</span>
        <span>{t('navigation.settings')}</span>
      </nav>

      <section style={{ marginTop: 32 }}>
        <h2 style={{ marginBottom: 4 }}>{t('title', { ns: 'appointments' })}</h2>
        <p style={{ marginTop: 0 }}>{t('subtitle', { ns: 'appointments' })}</p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button">{t('create', { ns: 'appointments' })}</button>
          <button type="button">{t('common.save')}</button>
          <button type="button">{t('common.cancel')}</button>
        </div>

        <div style={{ marginTop: 20 }}>
          <strong>{t('form.client', { ns: 'appointments' })}:</strong> Maria Ivanova
        </div>
        <div>
          <strong>{t('form.service', { ns: 'appointments' })}:</strong> Haircut
        </div>
        <div>
          <strong>{t('form.staff', { ns: 'appointments' })}:</strong> Anna
        </div>
        <div>
          <strong>{t('form.date', { ns: 'appointments' })}:</strong> 23.01.2026
        </div>
        <div>
          <strong>{t('form.time', { ns: 'appointments' })}:</strong> 14:00
        </div>
        <div>
          <strong>{t('form.price', { ns: 'appointments' })}:</strong> 50 USD
        </div>

        <div style={{ marginTop: 16 }}>
          <em>{t('messages.created', { ns: 'appointments' })}</em>
        </div>

        <div style={{ marginTop: 12 }}>
          <span>{t('stats.today', { ns: 'appointments' })}: 4</span>
          <span style={{ marginLeft: 12 }}>{t('stats.total', { ns: 'appointments' })}: 18</span>
        </div>
      </section>

      <footer style={{ marginTop: 32 }}>
        <span>{t('common.search')}</span>
        <span style={{ marginLeft: 12 }}>{t('common.loading')}</span>
      </footer>
    </main>
  )
}
