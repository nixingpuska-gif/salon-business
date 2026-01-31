import type { Locale } from './types'

const localeMap: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US'
}

export function formatDate(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  return new Intl.DateTimeFormat(localeMap[locale], options).format(date)
}

export function formatCurrency(
  amount: number,
  locale: Locale,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency
  }).format(amount)
}

export function formatNumber(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(localeMap[locale]).format(amount)
}
