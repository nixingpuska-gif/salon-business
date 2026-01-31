import 'i18next'

export type Locale = 'ru' | 'en'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: {
        app: {
          name: string
          tagline: string
        }
        navigation: {
          dashboard: string
          appointments: string
          clients: string
          staff: string
          analytics: string
          settings: string
        }
        common: {
          save: string
          cancel: string
          delete: string
          edit: string
          search: string
          loading: string
          error: string
          success: string
        }
        language: {
          label: string
          current: string
        }
      }
      appointments: {
        title: string
        subtitle: string
        create: string
        status: {
          planned: string
          confirmed: string
          completed: string
          cancelled: string
        }
        form: {
          client: string
          service: string
          staff: string
          date: string
          time: string
          price: string
        }
        messages: {
          created: string
          updated: string
        }
        stats: {
          today: string
          total: string
        }
      }
    }
  }
}
