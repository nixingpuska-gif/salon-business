import { useState, useEffect } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";

export default function Notifications() {
  const [templateChannel, setTemplateChannel] = useState("telegram_booking");
  const [templateType, setTemplateType] = useState<"reminder_24h" | "reminder_1h">("reminder_24h");
  const [templateVariantKey, setTemplateVariantKey] = useState("A");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testSendSuccess, setTestSendSuccess] = useState(false);
  const [testSendError, setTestSendError] = useState<string | null>(null);
  const [aiVariants, setAiVariants] = useState<Array<{ title: string | null; body: string }>>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  const settingsQuery = trpc.notifications.getSettings.useQuery();
  const updateMutation = trpc.notifications.updateSettings.useMutation({
    onSuccess: () => {
      settingsQuery.refetch();
    },
  });

  const templateQuery = trpc.notificationTemplates.get.useQuery({
    channel: templateChannel,
    type: templateType,
    variantKey: templateVariantKey,
  });

  const variantsQuery = trpc.notificationTemplates.listVariants.useQuery({
    channel: templateChannel,
    type: templateType,
  });

  const upsertMutation = trpc.notificationTemplates.upsert.useMutation({
    onSuccess: () => {
      templateQuery.refetch();
      variantsQuery.refetch();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const resetMutation = trpc.notificationTemplates.resetToDefault.useMutation({
    onSuccess: () => {
      templateQuery.refetch();
      variantsQuery.refetch();
    },
  });

  const sendTestMutation = trpc.notificationTemplates.sendTest.useMutation({
    onSuccess: () => {
      setTestSendSuccess(true);
      setTestSendError(null);
      setTimeout(() => setTestSendSuccess(false), 5000);
    },
    onError: (error) => {
      setTestSendError(error.message);
      setTestSendSuccess(false);
    },
  });

  const generateTemplateMutation = trpc.assistant.generateTemplate.useMutation({
    onSuccess: (data) => {
      if (data.variants.length === 0) {
        setAiError("ИИ не смог предложить варианты.");
        setAiVariants([]);
      } else {
        setAiVariants(data.variants);
        setAiError(null);
      }
    },
    onError: (error) => {
      setAiError(error.message);
      setAiVariants([]);
    },
  });

  const handleGenerateWithAI = () => {
    setAiError(null);
    setAiVariants([]);
    generateTemplateMutation.mutate({
      channel: templateChannel as "telegram_booking",
      type: templateType,
      currentTitle: templateTitle || null,
      currentBody: templateBody,
      tone: settings?.aiTone as "luxury" | "friendly" | "neutral" | undefined,
      businessHint: settings?.businessDescription,
    });
  };

  const applyVariant = (variant: { title: string | null; body: string }) => {
    if (variant.title !== null) {
      setTemplateTitle(variant.title);
    }
    setTemplateBody(variant.body);
    setAiVariants([]);
  };

  const handleVariantChange = (newVariant: string) => {
    if (newVariant === "B" && !variantsQuery.data?.some((v) => v.variantKey === "B")) {
      if (window.confirm("Создать вариант B на основе текущего варианта A?")) {
        upsertMutation.mutate({
          channel: templateChannel,
          type: templateType,
          variantKey: "B",
          title: templateTitle || "Напоминание",
          body: templateBody,
        });
        setTemplateVariantKey("B");
        return;
      }
    }
    setTemplateVariantKey(newVariant);
  };

  useEffect(() => {
    setTemplateVariantKey("A");
  }, [templateChannel, templateType]);

  useEffect(() => {
    if (templateQuery.data) {
      setTemplateTitle(templateQuery.data.title);
      setTemplateBody(templateQuery.data.body);
    } else {
      const defaults: Record<string, { title: string; body: string }> = {
        reminder_24h: {
          title: "Напоминание за 24 часа",
          body: "Напоминание о завтрашней записи\n\n📅 Дата: {date}\n⏰ Время: {time}\n💇 Услуга: {serviceName}\n✂ Мастер: {masterName}\n\nЕсли нужно перенести или отменить запись — напиши /my или /booking.",
        },
        reminder_1h: {
          title: "Напоминание за 1 час",
          body: "Напоминание: до записи около часа\n\n📅 Дата: {date}\n⏰ Время: {time}\n💇 Услуга: {serviceName}\n✂ Мастер: {masterName}\n\nЕсли нужно перенести или отменить запись — напиши /my или /booking.",
        },
      };
      const defaultTemplate = defaults[templateType];
      if (defaultTemplate) {
        setTemplateTitle(defaultTemplate.title);
        setTemplateBody(defaultTemplate.body);
      }
    }
  }, [templateQuery.data, templateType]);

  const handleToggle = (field: string, value: number) => {
    updateMutation.mutate({
      [field]: value,
    });
  };

  const handleSaveTemplate = () => {
    upsertMutation.mutate({
      id: templateQuery.data?.id,
      channel: templateChannel,
      type: templateType,
      variantKey: templateVariantKey,
      title: templateTitle,
      body: templateBody,
    });
  };

  const handleResetTemplate = () => {
    if (confirm("Сбросить шаблон к стандартному тексту?")) {
      resetMutation.mutate({
        channel: templateChannel,
        type: templateType,
      });
    }
  };

  const renderPreview = (body: string) => {
    const demoVars: Record<string, string> = {
      clientName: "Анна",
      serviceName: "Маникюр",
      masterName: "Мария",
      date: "12.12.2025",
      time: "14:30",
      businessName: "ваш салон",
    };

    let result = body;
    for (const [key, value] of Object.entries(demoVars)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, value);
    }
    return result;
  };

  if (settingsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const settings = settingsQuery.data;

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-display font-bold text-slate-100 mb-8">Настройки уведомлений</h1>

          <div className="space-y-6">
            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <h2 className="text-2xl font-display font-bold text-slate-100 mb-4">Общие настройки</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-borderMuted rounded-2xl">
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-1">Включить напоминания</h3>
                    <p className="text-sm text-slate-400">Общий переключатель для всех напоминаний</p>
                  </div>
                  <button
                    onClick={() => handleToggle("reminderEnabled", settings?.reminderEnabled === 1 ? 0 : 1)}
                    disabled={updateMutation.isPending}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.reminderEnabled === 1 ? "bg-accent" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.reminderEnabled === 1 ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-borderMuted rounded-2xl">
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-1">Напоминание за 24 часа</h3>
                    <p className="text-sm text-slate-400">Отправлять напоминание за сутки до записи</p>
                  </div>
                  <button
                    onClick={() => handleToggle("reminder24hEnabled", settings?.reminder24hEnabled === 1 ? 0 : 1)}
                    disabled={updateMutation.isPending || settings?.reminderEnabled !== 1}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.reminder24hEnabled === 1 && settings?.reminderEnabled === 1
                        ? "bg-accent"
                        : "bg-slate-700"
                    } ${settings?.reminderEnabled !== 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.reminder24hEnabled === 1 && settings?.reminderEnabled === 1
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-borderMuted rounded-2xl">
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-1">Напоминание за 1 час</h3>
                    <p className="text-sm text-slate-400">Отправлять напоминание за час до записи</p>
                  </div>
                  <button
                    onClick={() => handleToggle("reminder1hEnabled", settings?.reminder1hEnabled === 1 ? 0 : 1)}
                    disabled={updateMutation.isPending || settings?.reminderEnabled !== 1}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.reminder1hEnabled === 1 && settings?.reminderEnabled === 1
                        ? "bg-accent"
                        : "bg-slate-700"
                    } ${settings?.reminderEnabled !== 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.reminder1hEnabled === 1 && settings?.reminderEnabled === 1
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <h2 className="text-2xl font-display font-bold text-slate-100 mb-4">Напоминания через Telegram-бота</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-borderMuted rounded-2xl">
                  <div>
                    <h3 className="text-lg font-medium text-slate-100 mb-1">Напоминания через Telegram-бота</h3>
                    <p className="text-sm text-slate-400">
                      Если клиент записался через Telegram-бота и привязан к нему, мы будем отправлять напоминания о
                      записи прямо в личные сообщения от бота.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleToggle(
                        "telegramBookingRemindersEnabled",
                        settings?.telegramBookingRemindersEnabled === 1 ? 0 : 1
                      )
                    }
                    disabled={updateMutation.isPending || settings?.reminderEnabled !== 1}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.telegramBookingRemindersEnabled === 1 && settings?.reminderEnabled === 1
                        ? "bg-accent"
                        : "bg-slate-700"
                    } ${settings?.reminderEnabled !== 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.telegramBookingRemindersEnabled === 1 && settings?.reminderEnabled === 1
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 bg-slate-950/60 border border-borderMuted rounded-2xl">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Telegram chat ID для тестовых отправок
                  </label>
                  <input
                    type="text"
                    value={settings?.testTelegramChatId || ""}
                    onChange={(e) => {
                      updateMutation.mutate({
                        testTelegramChatId: e.target.value || null,
                      });
                    }}
                    placeholder="Введите ваш Telegram chat ID"
                    className="w-full bg-slate-900/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    На этапе разработки можно указать свой chat ID. Сообщение придёт именно туда.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <h2 className="text-2xl font-display font-bold text-slate-100 mb-4">AI-настройки для шаблонов</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Тональность текстов от ИИ</label>
                  <select
                    value={settings?.aiTone || "luxury"}
                    onChange={(e) => {
                      updateMutation.mutate({
                        aiTone: e.target.value as "luxury" | "friendly" | "neutral",
                      });
                    }}
                    className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  >
                    <option value="luxury">Lux / премиум</option>
                    <option value="friendly">Дружелюбная</option>
                    <option value="neutral">Нейтральная</option>
                  </select>
                  <p className="mt-2 text-xs text-slate-400">
                    Тональность будет использоваться при генерации текстов шаблонов ИИ.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Краткое описание бизнеса для ИИ
                  </label>
                  <textarea
                    value={settings?.businessDescription || ""}
                    onChange={(e) => {
                      updateMutation.mutate({
                        businessDescription: e.target.value || null,
                      });
                    }}
                    rows={4}
                    placeholder="Например: премиум салон красоты в центре, средний чек 5–7 тысяч, целевая аудитория — женщины 25–40, акцент на уход и сервис."
                    className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    ИИ будет учитывать этот текст при генерации шаблонов напоминаний.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-display font-bold text-slate-100">Шаблоны напоминаний</h2>
                {variantsQuery.data && variantsQuery.data.length > 1 && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-medium">
                    A/B тест активен
                  </span>
                )}
              </div>
              {variantsQuery.data && variantsQuery.data.length > 1 && (
                <p className="text-sm text-slate-400 mb-4">
                  Клиенты автоматически делятся между вариантами A и B.
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Канал</label>
                    <select
                      value={templateChannel}
                      onChange={(e) => setTemplateChannel(e.target.value)}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="telegram_booking">Telegram-бот</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Тип уведомления</label>
                    <select
                      value={templateType}
                      onChange={(e) => setTemplateType(e.target.value as "reminder_24h" | "reminder_1h")}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="reminder_24h">Напоминание за 24 часа</option>
                      <option value="reminder_1h">Напоминание за 1 час</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Вариант шаблона</label>
                    <select
                      value={templateVariantKey}
                      onChange={(e) => handleVariantChange(e.target.value)}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    >
                      <option value="A">Вариант A</option>
                      <option value="B">Вариант B</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-400">
                      Выберите вариант для редактирования. Клиенты автоматически распределяются между вариантами.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Название шаблона</label>
                    <input
                      type="text"
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                      maxLength={100}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      placeholder="Название шаблона"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Текст сообщения</label>
                    <textarea
                      value={templateBody}
                      onChange={(e) => setTemplateBody(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-950/60 border border-borderMuted rounded-xl px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent font-mono text-sm"
                      placeholder="Текст сообщения"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      Доступные переменные: <code className="text-accent">{`{clientName}`}</code>,{" "}
                      <code className="text-accent">{`{serviceName}`}</code>,{" "}
                      <code className="text-accent">{`{masterName}`}</code>,{" "}
                      <code className="text-accent">{`{date}`}</code>, <code className="text-accent">{`{time}`}</code>,{" "}
                      <code className="text-accent">{`{businessName}`}</code>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={upsertMutation.isPending || !templateTitle || !templateBody}
                      className="flex-1 bg-accent hover:bg-accent/90 text-slate-900 font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {upsertMutation.isPending ? "Сохраняем..." : "Сохранить шаблон"}
                    </button>
                    <button
                      onClick={handleResetTemplate}
                      disabled={resetMutation.isPending || !templateQuery.data}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Сбросить
                    </button>
                    {templateChannel === "telegram_booking" && (
                      <button
                        onClick={() => {
                          if (!settings?.testTelegramChatId) {
                            setTestSendError("Не указан Telegram chat ID для тестовых отправок. Укажите его в настройках уведомлений.");
                            return;
                          }
                          setTestSendError(null);
                          sendTestMutation.mutate({
                            channel: templateChannel,
                            type: templateType,
                            bodyOverride: templateBody,
                          });
                        }}
                        disabled={sendTestMutation.isPending || !templateBody}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendTestMutation.isPending ? "Отправляем..." : "Отправить тест"}
                      </button>
                    )}
                    <button
                      onClick={handleGenerateWithAI}
                      disabled={generateTemplateMutation.isPending || !templateBody.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generateTemplateMutation.isPending ? "Генерация..." : "Сгенерировать через ИИ"}
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                      ИИ учитывает тональность и описание бизнеса из настроек выше.
                    </p>
                  </div>

                  {saveSuccess && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
                      Шаблон сохранён
                    </div>
                  )}

                  {testSendSuccess && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
                      Тестовое сообщение отправлено в Telegram.
                    </div>
                  )}

                  {testSendError && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                      {testSendError}
                    </div>
                  )}

                  {aiError && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                      {aiError}
                    </div>
                  )}

                  {(upsertMutation.isError || resetMutation.isError) && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                      Ошибка при сохранении шаблона
                    </div>
                  )}

                  {aiVariants.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-semibold text-slate-100">Варианты от ИИ</h3>
                      {aiVariants.map((variant, index) => (
                        <div
                          key={index}
                          className="bg-slate-950/60 border border-borderMuted rounded-2xl p-4 space-y-3"
                        >
                          {variant.title && (
                            <div className="font-semibold text-slate-100">{variant.title}</div>
                          )}
                          <div className="whitespace-pre-line text-sm text-slate-200">{variant.body}</div>
                          <button
                            type="button"
                            onClick={() => applyVariant(variant)}
                            className="w-full bg-accent hover:bg-accent/90 text-slate-900 font-semibold py-2 px-4 rounded-xl transition-colors"
                          >
                            Использовать этот вариант
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-medium text-slate-100 mb-3">Предпросмотр</h3>
                  <div className="bg-slate-950/60 border border-borderMuted rounded-xl p-4">
                    <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-700">
                      <p className="text-slate-200 whitespace-pre-wrap font-sans">{renderPreview(templateBody)}</p>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Как это увидит клиент (с демо-данными: Анна, Маникюр, Мария, 12.12.2025 14:30)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
