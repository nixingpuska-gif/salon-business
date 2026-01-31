import { DashboardLayout } from "../../components/DashboardLayout";

export default function WhatsAppSettings() {
  return (
    <DashboardLayout>
      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl shadow-md p-6 backdrop-blur-sm">
        <h2 className="text-2xl font-semibold text-slate-200 mb-4">Настройки WhatsApp</h2>
        <p className="text-slate-400">Настройки WhatsApp будут здесь</p>
      </div>
    </DashboardLayout>
  );
}
