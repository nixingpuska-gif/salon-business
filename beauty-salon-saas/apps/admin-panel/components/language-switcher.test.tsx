import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'

import LanguageSwitcher from './language-switcher'

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}))

const mockUseTranslation = useTranslation as jest.Mock

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockUseTranslation.mockReset()
  })

  it('renders labels and current language', () => {
    const changeLanguage = jest.fn()

    mockUseTranslation.mockReturnValue({
      i18n: { language: 'en', changeLanguage },
      t: (key: string) => key
    })

    render(<LanguageSwitcher />)

    expect(screen.getByText('language.label:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RU' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByText('language.current: en')).toBeInTheDocument()
  })

  it('calls changeLanguage on button click', async () => {
    const changeLanguage = jest.fn()

    mockUseTranslation.mockReturnValue({
      i18n: { language: 'en', changeLanguage },
      t: (key: string) => key
    })

    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    await user.click(screen.getByRole('button', { name: 'RU' }))
    await user.click(screen.getByRole('button', { name: 'EN' }))

    expect(changeLanguage).toHaveBeenCalledWith('ru')
    expect(changeLanguage).toHaveBeenCalledWith('en')
  })

  it('highlights active language', () => {
    const changeLanguage = jest.fn()

    mockUseTranslation.mockReturnValue({
      i18n: { language: 'ru', changeLanguage },
      t: (key: string) => key
    })

    render(<LanguageSwitcher />)

    expect(screen.getByRole('button', { name: 'RU' })).toHaveStyle(
      'font-weight: 700'
    )
    expect(screen.getByRole('button', { name: 'EN' })).toHaveStyle(
      'font-weight: 400'
    )
  })
})
