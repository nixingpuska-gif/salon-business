import { useState, useMemo } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const tabs = ["overview", "revenue", "masters", "services", "clients"] as const;
type ReportsTab = typeof tabs[number];

type PeriodPreset = "7d" | "30d" | "90d";

const COLORS = ["#F5C76A", "#FDE9B5", "#A67C33", "#22C55E", "#EF4444"];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportsTab>("overview");
  const [preset, setPreset] = useState<PeriodPreset>("30d");

  const [from, to] = useMemo(() => {
    const toDate = new Date();
    const fromDate = new Date();
    if (preset === "7d") {
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (preset === "30d") {
      fromDate.setDate(fromDate.getDate() - 30);
    } else {
      fromDate.setDate(fromDate.getDate() - 90);
    }
    return [fromDate.toISOString(), toDate.toISOString()];
  }, [preset]);

  const overviewQuery = trpc.reports.overview.useQuery({ from, to });
  const revenueQuery = trpc.reports.revenueByPeriod.useQuery({
    from,
    to,
    granularity: "day",
  });
  const mastersQuery = trpc.reports.mastersPerformance.useQuery({ from, to });
  const servicesQuery = trpc.reports.topServices.useQuery({ from, to, limit: 10 });
  const clientsQuery = trpc.reports.clientsActivity.useQuery({ from, to, limit: 20 });

  const formatCurrency = (value: number) => {
    return `₽${value.toLocaleString("ru-RU")}`;
  };

  const averageRevenue = useMemo(() => {
    if (!revenueQuery.data || revenueQuery.data.length === 0) return 0;
    const total = revenueQuery.data.reduce((acc, item) => acc + item.revenue, 0);
    return total / revenueQuery.data.length;
  }, [revenueQuery.data]);

  const averageAppointmentsPerDay = useMemo(() => {
    if (!revenueQuery.data || revenueQuery.data.length === 0) return 0;
    const total = revenueQuery.data.reduce((acc, item) => acc + item.appointmentsCount, 0);
    return total / revenueQuery.data.length;
  }, [revenueQuery.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <h2 className="text-2xl font-display font-semibold text-slate-200">Отчёты</h2>
          <div className="flex gap-2 bg-slate-950/60 rounded-2xl p-1">
            {(["7d", "30d", "90d"] as PeriodPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-4 py-2 rounded-xl text-sm transition ${
                  preset === p
                    ? "bg-accent text-black font-medium shadow"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`}
              >
                {p === "7d" ? "7 дней" : p === "30d" ? "30 дней" : "90 дней"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 bg-slate-950/60 rounded-2xl p-1 w-full md:w-auto overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm transition whitespace-nowrap ${
                activeTab === tab
                  ? "bg-accent text-black font-medium shadow"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
              }`}
            >
              {tab === "overview"
                ? "Обзор"
                : tab === "revenue"
                ? "Выручка"
                : tab === "masters"
                ? "Мастера"
                : tab === "services"
                ? "Услуги"
                : "Клиенты"}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 blur-3xl"></div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Общая выручка</h3>
              {overviewQuery.isLoading ? (
                <div className="h-8 bg-slate-800/50 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-semibold text-accent">
                  {formatCurrency(overviewQuery.data?.totalRevenue || 0)}
                </p>
              )}
            </div>

            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/10 blur-3xl"></div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Всего записей</h3>
              {overviewQuery.isLoading ? (
                <div className="h-8 bg-slate-800/50 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-50">
                  {overviewQuery.data?.totalAppointments || 0}
                </p>
              )}
            </div>

            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/10 blur-3xl"></div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Новые клиенты</h3>
              {overviewQuery.isLoading ? (
                <div className="h-8 bg-slate-800/50 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-50">
                  {overviewQuery.data?.newClients || 0}
                </p>
              )}
            </div>

            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-success/10 blur-3xl"></div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Retention Rate</h3>
              {overviewQuery.isLoading ? (
                <div className="h-8 bg-slate-800/50 rounded animate-pulse"></div>
              ) : (
                <p className="text-2xl font-semibold text-slate-50">
                  {((overviewQuery.data?.retentionRate || 0) * 100).toFixed(0)}%
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "revenue" && (
          <div className="space-y-6">
            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Динамика выручки</h3>
              {revenueQuery.isLoading ? (
                <div className="h-64 bg-slate-800/50 rounded animate-pulse"></div>
              ) : revenueQuery.isError ? (
                <p className="text-slate-400">Ошибка загрузки данных</p>
              ) : revenueQuery.data && revenueQuery.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueQuery.data}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F5C76A" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F5C76A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272F" />
                    <XAxis dataKey="bucket" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#060712",
                        border: "1px solid #27272F",
                        borderRadius: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#F5C76A"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400">Нет данных за выбранный период</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Средняя выручка в день</h4>
                <p className="text-xl font-semibold text-accent">{formatCurrency(averageRevenue)}</p>
              </div>
              <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Средний чек</h4>
                <p className="text-xl font-semibold text-slate-50">
                  {overviewQuery.data && overviewQuery.data.totalAppointments > 0
                    ? formatCurrency(
                        overviewQuery.data.totalRevenue / overviewQuery.data.totalAppointments
                      )
                    : formatCurrency(0)}
                </p>
              </div>
              <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
                <h4 className="text-sm font-medium text-slate-400 mb-2">Среднее записей в день</h4>
                <p className="text-xl font-semibold text-slate-50">
                  {averageAppointmentsPerDay.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "masters" && (
          <div className="space-y-6">
            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Выручка по мастерам</h3>
              {mastersQuery.isLoading ? (
                <div className="h-64 bg-slate-800/50 rounded animate-pulse"></div>
              ) : mastersQuery.isError ? (
                <p className="text-slate-400">Ошибка загрузки данных</p>
              ) : mastersQuery.data && mastersQuery.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mastersQuery.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272F" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#060712",
                        border: "1px solid #27272F",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#F5C76A" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400">Нет данных за выбранный период</p>
              )}
            </div>

            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Детализация по мастерам</h3>
              {mastersQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-800/50 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : mastersQuery.isError ? (
                <p className="text-slate-400">Ошибка загрузки данных</p>
              ) : mastersQuery.data && mastersQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-300">
                        <th className="text-left py-3 px-4 font-semibold">Мастер</th>
                        <th className="text-left py-3 px-4 font-semibold">Записей</th>
                        <th className="text-left py-3 px-4 font-semibold">Выручка</th>
                        <th className="text-left py-3 px-4 font-semibold">Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderMuted">
                      {mastersQuery.data.map((master) => (
                        <tr key={master.masterId} className="hover:bg-slate-900/60 transition">
                          <td className="py-3 px-4 text-slate-200">{master.name}</td>
                          <td className="py-3 px-4 text-slate-300">{master.appointmentsCount}</td>
                          <td className="py-3 px-4 text-accent font-semibold">
                            {formatCurrency(master.revenue)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-accent transition-all"
                                  style={{ width: `${master.utilization * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-slate-400 w-12 text-right">
                                {(master.utilization * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400">Нет данных за выбранный период</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="space-y-6">
            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Топ услуг</h3>
              {servicesQuery.isLoading ? (
                <div className="h-64 bg-slate-800/50 rounded animate-pulse"></div>
              ) : servicesQuery.isError ? (
                <p className="text-slate-400">Ошибка загрузки данных</p>
              ) : servicesQuery.data && servicesQuery.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={servicesQuery.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272F" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#060712",
                        border: "1px solid #27272F",
                        borderRadius: "12px",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#F5C76A" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400">Нет данных за выбранный период</p>
              )}
            </div>

            <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Детализация по услугам</h3>
              {servicesQuery.isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : servicesQuery.isError ? (
                <p className="text-slate-400">Ошибка загрузки данных</p>
              ) : servicesQuery.data && servicesQuery.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-300">
                        <th className="text-left py-3 px-4 font-semibold">Услуга</th>
                        <th className="text-left py-3 px-4 font-semibold">Записей</th>
                        <th className="text-left py-3 px-4 font-semibold">Выручка</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderMuted">
                      {servicesQuery.data.map((service) => (
                        <tr key={service.serviceId} className="hover:bg-slate-900/60 transition">
                          <td className="py-3 px-4 text-slate-200">{service.name}</td>
                          <td className="py-3 px-4 text-slate-300">{service.count}</td>
                          <td className="py-3 px-4 text-accent font-semibold">
                            {formatCurrency(service.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400">Нет данных за выбранный период</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "clients" && (
          <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">Активность клиентов</h3>
            {clientsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse"></div>
                ))}
              </div>
            ) : clientsQuery.isError ? (
              <p className="text-slate-400">Ошибка загрузки данных</p>
            ) : clientsQuery.data && clientsQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-300">
                      <th className="text-left py-3 px-4 font-semibold">Клиент</th>
                      <th className="text-left py-3 px-4 font-semibold">Всего записей</th>
                      <th className="text-left py-3 px-4 font-semibold">Первая запись</th>
                      <th className="text-left py-3 px-4 font-semibold">Последняя запись</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderMuted">
                    {clientsQuery.data.map((client) => (
                      <tr key={client.clientId} className="hover:bg-slate-900/60 transition">
                        <td className="py-3 px-4 text-slate-200">
                          {client.name || `Клиент #${client.clientId}`}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{client.totalAppointments}</td>
                        <td className="py-3 px-4 text-slate-400 text-sm">
                          {new Date(client.firstVisit).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-sm">
                          {new Date(client.lastVisit).toLocaleDateString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400">Нет данных за выбранный период</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
