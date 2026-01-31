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
  Legend,
} from "recharts";

const tabs = ["logs", "analytics", "conversion"] as const;
type Tab = typeof tabs[number];

export default function NotificationLogs() {
  const [activeTab, setActiveTab] = useState<Tab>("logs");
  const [period, setPeriod] = useState<"7" | "30" | "90">("7");
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [analyticsChannel, setAnalyticsChannel] = useState<string>("telegram_booking");
  const [analyticsType, setAnalyticsType] = useState<string>("reminder_24h");

  const now = new Date();
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - Number(period));

  const logsQuery = trpc.notificationLogs.list.useQuery({
    from: fromDate.toISOString(),
    to: now.toISOString(),
    channel: channel !== "all" ? channel : undefined,
    status: status !== "all" ? status : undefined,
    limit: 100,
  });

  const statsQuery = trpc.notificationStats.byTemplateVariant.useQuery({
    channel: analyticsChannel,
    type: analyticsType,
    from: fromDate.toISOString(),
    to: now.toISOString(),
  });

  const timelineQuery = trpc.notificationStats.timelineByVariant.useQuery({
    channel: analyticsChannel,
    type: analyticsType,
    from: fromDate.toISOString(),
    to: now.toISOString(),
  });

  const conversionQuery = trpc.notificationStats.templateConversion.useQuery({
    channel: analyticsChannel,
    type: analyticsType,
    from: fromDate.toISOString(),
    to: now.toISOString(),
  });

  const [adviceText, setAdviceText] = useState<string | null>(null);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  const generateAdviceMutation = trpc.assistant.generateNotificationAdvice.useMutation({
    onSuccess: (data) => {
      setAdviceText(data.advice);
      setAdviceError(null);
    },
    onError: (error) => {
      setAdviceError(error.message);
      setAdviceText(null);
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "telegram_booking":
        return "Telegram бот";
      default:
        return channel;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "reminder_24h":
        return "Напоминание 24ч";
      case "reminder_1h":
        return "Напоминание 1ч";
      default:
        return type;
    }
  };

  const getStatusChip = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "sent":
        return (
          <span className={`${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`}>
            Успешно
          </span>
        );
      case "failed":
        return (
          <span className={`${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`}>
            Ошибка
          </span>
        );
      case "skipped":
        return (
          <span className={`${baseClasses} bg-slate-500/20 text-slate-400 border border-slate-500/30`}>
            Пропущено
          </span>
        );
      default:
        return <span className={`${baseClasses} bg-slate-500/20 text-slate-400`}>{status}</span>;
    }
  };

  const chartData = useMemo(() => {
    if (!timelineQuery.data) return [];

    const dateMap = new Map<string, Record<string, number>>();
    const variantKeys = new Set<string>();

    for (const item of timelineQuery.data) {
      variantKeys.add(item.variantKey);
      if (!dateMap.has(item.date)) {
        dateMap.set(item.date, {});
      }
      dateMap.get(item.date)![item.variantKey] = item.sentCount;
    }

    return Array.from(dateMap.entries())
      .map(([date, variants]) => ({
        date: new Date(date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        ...variants,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [timelineQuery.data]);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-display font-bold text-slate-100 mb-8">Логи уведомлений</h1>

          <div className="flex gap-2 bg-slate-950/60 rounded-2xl p-1 mb-6 w-full md:w-auto">
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
                {tab === "logs" ? "Логи" : "Аналитика по шаблонам"}
              </button>
            ))}
          </div>

          {activeTab === "logs" && (
            <div className="space-y-6">
            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">Фильтры</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Период</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as "7" | "30" | "90")}
                    className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="7">7 дней</option>
                    <option value="30">30 дней</option>
                    <option value="90">90 дней</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Канал</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="all">Все</option>
                    <option value="telegram_booking">Telegram-бот</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="all">Все</option>
                    <option value="sent">Успешно</option>
                    <option value="failed">Ошибка</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => logsQuery.refetch()}
                    className="w-full bg-accent hover:bg-accent/90 text-slate-900 font-semibold py-2 px-4 rounded-xl transition-colors"
                  >
                    Обновить
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">История уведомлений</h2>

              {logsQuery.isLoading && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
              )}

              {logsQuery.isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                  <p className="text-red-400">
                    Не удалось загрузить логи, попробуйте обновить страницу.
                  </p>
                </div>
              )}

              {logsQuery.data && logsQuery.data.length === 0 && (
                <div className="bg-slate-950/60 border border-borderMuted rounded-2xl p-8 text-center">
                  <p className="text-slate-400">За выбранный период логов нет.</p>
                </div>
              )}

              {logsQuery.data && logsQuery.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-borderMuted">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Дата/время</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Канал</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Тип</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Статус</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Клиент</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Запись</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsQuery.data.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-borderMuted/50 hover:bg-slate-950/40 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-slate-300">{formatDate(log.createdAt)}</td>
                          <td className="py-3 px-4 text-sm text-slate-300">{getChannelLabel(log.channel)}</td>
                          <td className="py-3 px-4 text-sm text-slate-300">{getTypeLabel(log.type)}</td>
                          <td className="py-3 px-4">{getStatusChip(log.status)}</td>
                          <td className="py-3 px-4 text-sm text-slate-300">Client #{log.clientId}</td>
                          <td className="py-3 px-4">
                            <a
                              href={`/calendar?appointment=${log.appointmentId}`}
                              className="text-sm text-accent hover:text-accent/80 transition-colors"
                            >
                              #{log.appointmentId}
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">Фильтры аналитики</h2>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Период</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as "7" | "30" | "90")}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="7">7 дней</option>
                      <option value="30">30 дней</option>
                      <option value="90">90 дней</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Канал</label>
                    <select
                      value={analyticsChannel}
                      onChange={(e) => setAnalyticsChannel(e.target.value)}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="telegram_booking">Telegram-бот</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Тип уведомления</label>
                    <select
                      value={analyticsType}
                      onChange={(e) => setAnalyticsType(e.target.value)}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="reminder_24h">Напоминание за 24 часа</option>
                      <option value="reminder_1h">Напоминание за 1 час</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        statsQuery.refetch();
                        timelineQuery.refetch();
                      }}
                      className="w-full bg-accent hover:bg-accent/90 text-slate-900 font-semibold py-2 px-4 rounded-xl transition-colors"
                    >
                      Обновить
                    </button>
                  </div>
                </div>
              </div>

              {statsQuery.isLoading && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
              )}

              {statsQuery.isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                  <p className="text-red-400">Не удалось загрузить аналитику, попробуйте обновить страницу.</p>
                </div>
              )}

              {statsQuery.data && statsQuery.data.length === 0 && (
                <div className="bg-slate-950/60 border border-borderMuted rounded-2xl p-8 text-center">
                  <p className="text-slate-400">За выбранный период данных нет.</p>
                </div>
              )}

              {statsQuery.data && statsQuery.data.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {statsQuery.data.map((variant, idx) => {
                      const isBest = idx === 0 && variant.successRate > 0;
                      return (
                        <div
                          key={`${variant.templateId}_${variant.templateVariantKey}`}
                          className={`bg-surface/80 border rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)] ${
                            isBest ? "border-accent/50" : "border-borderMuted"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-display font-semibold text-slate-100">
                              Вариант {variant.templateVariantKey}
                            </h3>
                            {isBest && (
                              <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-xs font-medium">
                                Работает лучше
                              </span>
                            )}
                          </div>
                          {variant.title && (
                            <p className="text-sm text-slate-400 mb-4">{variant.title}</p>
                          )}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Отправлено:</span>
                              <span className="text-slate-100 font-semibold">{variant.sentCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Ошибок:</span>
                              <span className="text-red-400 font-semibold">{variant.failedCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Успешность:</span>
                              <span className="text-slate-100 font-semibold">{variant.successRate}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Уникальных клиентов:</span>
                              <span className="text-slate-100 font-semibold">{variant.uniqueClients}</span>
                            </div>
                          </div>
                          {variant.bodyPreview && (
                            <div className="mt-4 pt-4 border-t border-borderMuted">
                              <p className="text-xs text-slate-400">{variant.bodyPreview}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                    <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">Таблица вариантов</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-borderMuted">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Вариант</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Название</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Успешность (%)</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Отправлено</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Ошибок</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Клиентов</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statsQuery.data.map((variant) => (
                            <tr
                              key={`${variant.templateId}_${variant.templateVariantKey}`}
                              className="border-b border-borderMuted/50 hover:bg-slate-950/40 transition-colors"
                            >
                              <td className="py-3 px-4 text-sm text-slate-300 font-semibold">
                                {variant.templateVariantKey}
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-300">{variant.title || "—"}</td>
                              <td className="py-3 px-4 text-sm text-slate-100 font-semibold">
                                {variant.successRate}%
                              </td>
                              <td className="py-3 px-4 text-sm text-slate-300">{variant.sentCount}</td>
                              <td className="py-3 px-4 text-sm text-red-400">{variant.failedCount}</td>
                              <td className="py-3 px-4 text-sm text-slate-300">{variant.uniqueClients}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {timelineQuery.data && timelineQuery.data.length > 0 && (
                    <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                      <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">График отправок по дням</h2>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            {Array.from(new Set(statsQuery.data.map((v) => v.templateVariantKey))).map((key, idx) => (
                              <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stackId="1"
                                stroke={idx === 0 ? "#a855f7" : "#ec4899"}
                                fill={idx === 0 ? "#a855f7" : "#ec4899"}
                                fillOpacity={0.6}
                                name={`Вариант ${key}`}
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "conversion" && (
            <div className="space-y-6">
              <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-semibold text-slate-100">Фильтры конверсии</h2>
                  <button
                    onClick={() => {
                      setAdviceText(null);
                      setAdviceError(null);
                      generateAdviceMutation.mutate({
                        channel: analyticsChannel,
                        type: analyticsType,
                        from: fromDate.toISOString(),
                        to: now.toISOString(),
                      });
                    }}
                    disabled={generateAdviceMutation.isPending}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generateAdviceMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Анализирую...</span>
                      </>
                    ) : (
                      <span>Спросить ИИ о шаблонах</span>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Период</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as "7" | "30" | "90")}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="7">7 дней</option>
                      <option value="30">30 дней</option>
                      <option value="90">90 дней</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Канал</label>
                    <select
                      value={analyticsChannel}
                      onChange={(e) => setAnalyticsChannel(e.target.value)}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="telegram_booking">Telegram-бот</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Тип уведомления</label>
                    <select
                      value={analyticsType}
                      onChange={(e) => setAnalyticsType(e.target.value)}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="reminder_24h">Напоминание за 24 часа</option>
                      <option value="reminder_1h">Напоминание за 1 час</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => conversionQuery.refetch()}
                      className="w-full bg-accent hover:bg-accent/90 text-slate-900 font-semibold py-2 px-4 rounded-xl transition-colors"
                    >
                      Обновить
                    </button>
                  </div>
                </div>
              </div>

              {conversionQuery.isLoading && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
              )}

              {conversionQuery.isError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                  <p className="text-red-400">Не удалось загрузить аналитику конверсии, попробуйте обновить страницу.</p>
                </div>
              )}

              {conversionQuery.data && conversionQuery.data.length === 0 && (
                <div className="bg-slate-950/60 border border-borderMuted rounded-2xl p-8 text-center">
                  <p className="text-slate-400">Пока недостаточно данных для анализа конверсии по шаблонам.</p>
                </div>
              )}

              {conversionQuery.data && conversionQuery.data.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {conversionQuery.data.map((variant, idx) => {
                      const maxCompletionRate = Math.max(
                        ...conversionQuery.data!.map((v) => v.completionRate)
                      );
                      const isBest = variant.completionRate === maxCompletionRate && variant.completionRate > 0;
                      const successRate = variant.sentCount + variant.failedCount > 0
                        ? Math.round((variant.sentCount / (variant.sentCount + variant.failedCount)) * 100)
                        : 0;

                      return (
                        <div
                          key={`${variant.templateId}_${variant.templateVariantKey}`}
                          className={`bg-surface/80 border rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)] ${
                            isBest ? "border-accent/50" : "border-borderMuted"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-display font-semibold text-slate-100">
                              {variant.templateVariantKey ? `Вариант ${variant.templateVariantKey}` : "Базовый шаблон"}
                            </h3>
                            {isBest && (
                              <span className="px-3 py-1 bg-accent/20 text-accent border border-accent/30 rounded-full text-xs font-medium">
                                Лучший по конверсии
                              </span>
                            )}
                          </div>
                          {variant.title && (
                            <p className="text-sm text-slate-400 mb-4">{variant.title}</p>
                          )}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Успешность доставки:</span>
                              <span className="text-slate-100 font-semibold">{successRate}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Конверсия в приход:</span>
                              <span className="text-green-400 font-semibold">
                                {Math.round(variant.completionRate * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">No-show:</span>
                              <span className="text-red-400 font-semibold">
                                {Math.round(variant.noShowRate * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-300">Записей в выборке:</span>
                              <span className="text-slate-100 font-semibold">{variant.uniqueAppointments}</span>
                            </div>
                          </div>
                          {variant.bodyPreview && (
                            <div className="mt-4 pt-4 border-t border-borderMuted">
                              <p className="text-xs text-slate-400">{variant.bodyPreview}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                    <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">Таблица конверсии</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-borderMuted">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Вариант</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Заголовок</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Успешность доставки (%)</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Конверсия в завершённые (%)</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">No-show (%)</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Записей</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Клиентов</th>
                          </tr>
                        </thead>
                        <tbody>
                          {conversionQuery.data.map((variant) => {
                            const successRate = variant.sentCount + variant.failedCount > 0
                              ? Math.round((variant.sentCount / (variant.sentCount + variant.failedCount)) * 100)
                              : 0;

                            return (
                              <tr
                                key={`${variant.templateId}_${variant.templateVariantKey}`}
                                className="border-b border-borderMuted/50 hover:bg-slate-950/40 transition-colors"
                              >
                                <td className="py-3 px-4 text-sm text-slate-300 font-semibold">
                                  {variant.templateVariantKey || "—"}
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-300">{variant.title || "—"}</td>
                                <td className="py-3 px-4 text-sm text-slate-100 font-semibold">{successRate}%</td>
                                <td className="py-3 px-4 text-sm text-green-400 font-semibold">
                                  {Math.round(variant.completionRate * 100)}%
                                </td>
                                <td className="py-3 px-4 text-sm text-red-400 font-semibold">
                                  {Math.round(variant.noShowRate * 100)}%
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-300">{variant.uniqueAppointments}</td>
                                <td className="py-3 px-4 text-sm text-slate-300">{variant.uniqueClients}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {conversionQuery.data.length > 0 && (
                    <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                      <h2 className="text-xl font-display font-semibold text-slate-100 mb-4">График конверсии по вариантам</h2>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={conversionQuery.data.map((v) => ({
                            variant: v.templateVariantKey || "—",
                            completionRate: Math.round(v.completionRate * 100),
                            noShowRate: Math.round(v.noShowRate * 100),
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="variant" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "8px",
                              }}
                              formatter={(value: number) => `${value}%`}
                            />
                            <Legend />
                            <Bar dataKey="completionRate" fill="#10b981" name="Конверсия в приход (%)" />
                            <Bar dataKey="noShowRate" fill="#ef4444" name="No-show (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Блок ответа ИИ */}
              {generateAdviceMutation.isPending && (
                <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                  <div className="flex items-center justify-center min-h-[200px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                      <p className="text-slate-300">ИИ анализирует данные...</p>
                    </div>
                  </div>
                </div>
              )}

              {adviceError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                  <h3 className="text-lg font-display font-semibold text-red-400 mb-2">Ошибка</h3>
                  <p className="text-red-300">
                    {adviceError.includes("FAILED_PRECONDITION") || adviceError.includes("не настроен")
                      ? "ИИ для шаблонов пока не настроен. Проверь API-ключ на сервере."
                      : "Не удалось получить рекомендации от ИИ. Попробуй ещё раз позже."}
                  </p>
                </div>
              )}

              {adviceText && (
                <div className="bg-surface/90 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
                  <h3 className="text-xl font-display font-semibold text-slate-100 mb-4">Ответ ИИ</h3>
                  <div className="whitespace-pre-line text-slate-200 leading-relaxed font-sans">
                    {adviceText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
