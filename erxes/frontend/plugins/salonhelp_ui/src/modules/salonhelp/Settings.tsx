import { Route, Routes } from 'react-router-dom';
import { lazy } from 'react';

export const SalonHelpSettingsPage = lazy(() =>
  import('~/pages/salonhelp/SalonHelpSettingsPage').then((module) => ({
    default: module.SalonHelpSettingsPage,
  })),
);

const salonHelpSettings = () => {
  return (
    <Routes>
      <Route path="/" element={<SalonHelpSettingsPage />} />
    </Routes>
  );
};

export default salonHelpSettings;
