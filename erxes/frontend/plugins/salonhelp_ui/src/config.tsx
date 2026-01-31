import { IconTool } from '@tabler/icons-react';
import { IUIConfig } from 'erxes-ui';
import { lazy, Suspense } from 'react';

const SalonHelpSettingsNavigation = lazy(() =>
  import('./modules/SalonHelpSettingsNavigation').then((module) => ({
    default: module.SalonHelpSettingsNavigation,
  })),
);

export const CONFIG: IUIConfig = {
  name: 'salonhelp',
  path: 'salonhelp',
  settingsNavigation: () => (
    <Suspense fallback={<div />}>
      <SalonHelpSettingsNavigation />
    </Suspense>
  ),
  modules: [
    {
      name: 'salonhelp',
      icon: IconTool,
      path: 'salonhelp',
    },
  ],
};
