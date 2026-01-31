import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";

export default function Dashboard() {
  const { data, isLoading, isError } = trpc.dashboard.overview.useQuery();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() === today.getTime()) {
      return "Сегодня";
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (appointmentDate.getTime() === tomorrow.getTime()) {
      return "Завтра";
    }
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  };

  if (isError) {
    return (
      <DashboardLayout>
        <div className="bg-surface/90 border border-danger rounded-3xl shadow-lg shadow-black/40 p-6">
          <h3 className="text-lg font-semibold text-red-300 mb-2">Ошибка загрузки данных</h3>
          <p className="text-slate-400">
            Что-то пошло не так. Попробуйте обновить страницу.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 blur-3xl"></div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Всего записей</h3>
            {isLoading ? (
              <div className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-semibold text-slate-50 tracking-tight">
                  {data?.totalAppointmentsThisMonth || 0}
                </p>
                <p className="text-sm text-slate-400 mt-2">За текущий месяц</p>
              </>
            )}
          </div>

          <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/10 blur-3xl"></div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Активных клиентов</h3>
            {isLoading ? (
              <div className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-semibold text-slate-50 tracking-tight">
                  {data?.activeClientsLast30Days || 0}
                </p>
                <p className="text-sm text-slate-400 mt-2">За последние 30 дней</p>
              </>
            )}
          </div>

          <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 blur-3xl"></div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Выручка (месяц)</h3>
            {isLoading ? (
              <div className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
            ) : (
              <>
                <p className="text-3xl font-semibold text-accent tracking-tight">
                  ₽{data?.revenueThisMonth?.toLocaleString("ru-RU") || 0}
                </p>
                <p className="text-sm text-slate-400 mt-2">За текущий месяц</p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Ближайшие записи</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-800/50 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            ) : data?.upcomingAppointments && data.upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-borderMuted hover:bg-slate-900/60 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-100">{apt.clientName}</p>
                      <p className="text-sm text-slate-400">
                        {apt.serviceName} • {apt.masterName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-100">
                        {formatTime(apt.startTime)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(apt.startTime)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Нет предстоящих записей</p>
            )}
          </div>

          <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Популярные услуги</h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-800/50 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            ) : data?.topServicesThisMonth && data.topServicesThisMonth.length > 0 ? (
              <div className="space-y-3">
                {data.topServicesThisMonth.map((service) => (
                  <div
                    key={service.serviceId}
                    className="flex items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-borderMuted hover:bg-slate-900/60 transition-colors"
                  >
                    <span className="text-slate-200">{service.serviceName}</span>
                    <span className="font-semibold text-accent">
                      {service.count} записей
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Нет данных</p>
            )}
          </div>
        </div>

        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Записи на сегодня</h3>
          {isLoading ? (
            <div className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-accent">
              {data?.appointmentsTodayCount || 0}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
