import { useState, useMemo } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";

function hasTimeConflict(
  apt1: { startTime: Date | string; endTime: Date | string; masterId: number },
  apt2: { startTime: Date | string; endTime: Date | string; masterId: number }
): boolean {
  if (apt1.masterId !== apt2.masterId) return false;

  const start1 = new Date(apt1.startTime).getTime();
  const end1 = new Date(apt1.endTime).getTime();
  const start2 = new Date(apt2.startTime).getTime();
  const end2 = new Date(apt2.endTime).getTime();

  return start1 < end2 && end1 > start2;
}

export default function Calendar() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMasterId, setSelectedMasterId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: 0,
    serviceId: 0,
    masterId: 0,
    startTime: "",
    status: "scheduled",
  });

  const appointmentsQuery = trpc.appointments.list.useQuery({
    date: selectedDate,
    masterId: selectedMasterId,
    status: selectedStatus,
  });

  const clientsQuery = trpc.clients.list.useQuery({});
  const mastersQuery = trpc.masters.list.useQuery();
  const servicesQuery = trpc.services.list.useQuery();

  const utils = trpc.useUtils();

  const conflictAppointmentIds = useMemo(() => {
    if (!appointmentsQuery.data) return new Set<number>();

    const conflicts = new Set<number>();
    const appointments = appointmentsQuery.data;

    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        if (
          hasTimeConflict(
            {
              startTime: appointments[i].startTime,
              endTime: appointments[i].endTime,
              masterId: appointments[i].masterId,
            },
            {
              startTime: appointments[j].startTime,
              endTime: appointments[j].endTime,
              masterId: appointments[j].masterId,
            }
          )
        ) {
          conflicts.add(appointments[i].id);
          conflicts.add(appointments[j].id);
        }
      }
    }

    return conflicts;
  }, [appointmentsQuery.data]);

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      resetForm();
      setFormError(null);
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT" || error.message.includes("уже есть запись")) {
        setFormError("У мастера уже есть запись в это время. Выберите другое время.");
      } else {
        setFormError("Произошла ошибка при создании записи. Попробуйте ещё раз.");
      }
    },
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
      resetForm();
      setEditingId(null);
      setFormError(null);
    },
    onError: (error) => {
      if (error.data?.code === "CONFLICT" || error.message.includes("уже есть запись")) {
        setFormError("У мастера уже есть запись в это время. Выберите другое время.");
      } else {
        setFormError("Произошла ошибка при обновлении записи. Попробуйте ещё раз.");
      }
    },
  });

  const deleteMutation = trpc.appointments.delete.useMutation({
    onSuccess: () => {
      utils.appointments.list.invalidate();
    },
    onError: () => {
      alert("Произошла ошибка при удалении записи. Попробуйте ещё раз.");
    },
  });

  const resetForm = () => {
    setFormData({
      clientId: 0,
      serviceId: 0,
      masterId: 0,
      startTime: "",
      status: "scheduled",
    });
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.clientId || !formData.serviceId || !formData.masterId || !formData.startTime) {
      setFormError("Заполните все обязательные поля");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (appointment: any) => {
    setEditingId(appointment.id);
    setFormError(null);
    const startTimeStr = new Date(appointment.startTime).toISOString().slice(0, 16);
    setFormData({
      clientId: appointment.clientId,
      serviceId: appointment.serviceId,
      masterId: appointment.masterId,
      startTime: startTimeStr,
      status: appointment.status,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить запись?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getClientName = (clientId: number) => {
    return clientsQuery.data?.find((c) => c.id === clientId)?.name || `Клиент #${clientId}`;
  };

  const getServiceName = (serviceId: number) => {
    return servicesQuery.data?.find((s) => s.id === serviceId)?.name || `Услуга #${serviceId}`;
  };

  const getMasterName = (masterId: number) => {
    return mastersQuery.data?.find((m) => m.id === masterId)?.name || `Мастер #${masterId}`;
  };

  const formatTime = (dateStr: string | Date) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
            <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">Календарь записей</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Дата</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Мастер</label>
              <select
                value={selectedMasterId || ""}
                onChange={(e) =>
                  setSelectedMasterId(e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Все мастера</option>
                {mastersQuery.data?.map((master) => (
                  <option key={master.id} value={master.id}>
                    {master.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Статус</label>
              <select
                value={selectedStatus || ""}
                onChange={(e) => setSelectedStatus(e.target.value || undefined)}
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Все статусы</option>
                <option value="scheduled">Запланированы</option>
                <option value="completed">Завершены</option>
                <option value="canceled">Отменены</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {appointmentsQuery.isLoading ? (
              <p className="text-slate-400">Загрузка...</p>
            ) : appointmentsQuery.data?.length === 0 ? (
              <p className="text-slate-400">Нет записей на выбранную дату</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-300">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Время</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Клиент</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Услуга</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Мастер</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Статус</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderMuted">
                  {appointmentsQuery.data?.map((appointment) => {
                    const isConflict = conflictAppointmentIds.has(appointment.id);
                    return (
                      <tr
                        key={appointment.id}
                        className={`hover:bg-slate-900/60 transition ${
                          isConflict
                            ? "bg-red-900/10 border-l-4 border-red-500"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-200">
                          {formatTime(appointment.startTime)}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {getClientName(appointment.clientId)}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {getServiceName(appointment.serviceId)}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {getMasterName(appointment.masterId)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                appointment.status === "scheduled"
                                  ? "bg-blue-900/50 text-blue-300 border border-blue-800"
                                  : appointment.status === "completed"
                                  ? "bg-green-900/50 text-green-300 border border-green-800"
                                  : "bg-red-900/50 text-red-300 border border-red-800"
                              }`}
                            >
                              {appointment.status === "scheduled"
                                ? "Запланирована"
                                : appointment.status === "completed"
                                ? "Завершена"
                                : "Отменена"}
                            </span>
                            {isConflict && (
                              <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs border border-red-800">
                                Конфликт
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(appointment)}
                              className="px-3 py-1 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition-colors text-sm"
                            >
                              Изменить
                            </button>
                            <button
                              onClick={() => handleDelete(appointment.id)}
                              className="px-3 py-1 bg-red-900/50 text-red-300 rounded hover:bg-red-900/70 transition-colors text-sm"
                            >
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
            <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">
            {editingId ? "Редактировать запись" : "Создать запись"}
          </h2>

          {formError && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Клиент *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => {
                  setFormData({ ...formData, clientId: parseInt(e.target.value) || 0 });
                  setFormError(null);
                }}
                required
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="0">Выберите клиента</option>
                {clientsQuery.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Услуга *
              </label>
              <select
                value={formData.serviceId}
                onChange={(e) => {
                  setFormData({ ...formData, serviceId: parseInt(e.target.value) || 0 });
                  setFormError(null);
                }}
                required
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="0">Выберите услугу</option>
                {servicesQuery.data?.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.durationMinutes} мин)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Мастер *
              </label>
              <select
                value={formData.masterId}
                onChange={(e) => {
                  setFormData({ ...formData, masterId: parseInt(e.target.value) || 0 });
                  setFormError(null);
                }}
                required
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="0">Выберите мастера</option>
                {mastersQuery.data?.map((master) => (
                  <option key={master.id} value={master.id}>
                    {master.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Дата и время начала *
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => {
                  setFormData({ ...formData, startTime: e.target.value });
                  setFormError(null);
                }}
                required
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="scheduled">Запланирована</option>
                <option value="completed">Завершена</option>
                <option value="canceled">Отменена</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-accent text-black font-medium rounded-2xl px-4 py-2 hover:bg-accentMuted/90 active:scale-[0.98] transition"
              >
                {editingId ? "Сохранить" : "Создать"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setEditingId(null);
                  }}
                  className="px-6 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
