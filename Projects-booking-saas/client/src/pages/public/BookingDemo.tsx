import { useState } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";
import { useAuth } from "../../_core/hooks/useAuth";

type Step = "service" | "master" | "details";

export default function BookingDemo() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("service");
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string; masterId: number } | null>(null);
  const [clientData, setClientData] = useState({
    name: "",
    phone: "",
    whatsappPhone: "",
  });

  const tenantId = user?.tenantId || 1;

  const servicesQuery = trpc.publicBooking.listServices.useQuery({ tenantId });
  const mastersQuery = trpc.publicBooking.listMasters.useQuery({ tenantId });
  const slotsQuery = trpc.publicBooking.getAvailableSlots.useQuery(
    {
      tenantId,
      serviceId: selectedService!,
      date: selectedDate,
      masterId: selectedMaster || undefined,
    },
    {
      enabled: !!selectedService && !!selectedDate,
    }
  );

  const createBookingMutation = trpc.publicBooking.createBooking.useMutation({
    onSuccess: () => {
      setStep("success");
    },
  });

  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId);
    setStep("master");
  };

  const handleMasterSelect = (masterId: number) => {
    setSelectedMaster(masterId);
    setStep("details");
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  };

  const handleSlotSelect = (slot: { startTime: string; endTime: string; masterId: number }) => {
    setSelectedSlot(slot);
    setSelectedMaster(slot.masterId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedMaster || !selectedSlot || !clientData.name) {
      return;
    }

    createBookingMutation.mutate({
      tenantId,
      client: clientData,
      serviceId: selectedService,
      masterId: selectedMaster,
      startTime: selectedSlot.startTime,
    });
  };

  const handleReset = () => {
    setStep("service");
    setSelectedService(null);
    setSelectedMaster(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setClientData({ name: "", phone: "", whatsappPhone: "" });
  };

  const selectedServiceData = servicesQuery.data?.find((s) => s.id === selectedService);
  const selectedMasterData = mastersQuery.data?.find((m) => m.id === selectedMaster);

  if (step === "success" && createBookingMutation.data) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-surface/80 border border-borderMuted rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">✅</div>
                <h1 className="text-3xl font-display font-bold text-slate-100 mb-2">
                  Запись успешно создана!
                </h1>
                <p className="text-slate-400">
                  Клиент {clientData.name} записан на услугу "{selectedServiceData?.name}" к мастеру{" "}
                  {selectedMasterData?.name}
                </p>
              </div>

              <div className="bg-slate-950/60 border border-borderMuted rounded-2xl p-6 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Услуга:</span>
                    <span className="text-slate-100 font-medium">{selectedServiceData?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Мастер:</span>
                    <span className="text-slate-100 font-medium">{selectedMasterData?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Время:</span>
                    <span className="text-slate-100 font-medium">
                      {new Date(createBookingMutation.data.startTime).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Длительность:</span>
                    <span className="text-slate-100 font-medium">
                      {selectedServiceData?.durationMinutes} минут
                    </span>
                  </div>
                  {selectedServiceData?.price && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Стоимость:</span>
                      <span className="text-accent font-medium">
                        {selectedServiceData.price.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-accent text-black rounded-2xl hover:bg-accentMuted/90 transition font-medium"
                >
                  Создать ещё одну запись
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold text-slate-100 mb-2">Демо: Запись клиента</h1>
            <p className="text-slate-400">Тестовая страница для проверки функционала записи</p>
          </div>

          <div className="bg-surface/80 border border-borderMuted rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-center mb-8 gap-4">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition ${
                  step === "service"
                    ? "bg-accent border-accent text-black"
                    : "bg-slate-900 border-accent/50 text-slate-400"
                }`}
              >
                1
              </div>
              <div className={`h-1 w-24 ${step !== "service" ? "bg-accent" : "bg-slate-800"}`} />
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition ${
                  step === "master"
                    ? "bg-accent border-accent text-black"
                    : step === "details" || step === "success"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-slate-900 border-accent/50 text-slate-400"
                }`}
              >
                2
              </div>
              <div className={`h-1 w-24 ${step === "details" || step === "success" ? "bg-accent" : "bg-slate-800"}`} />
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition ${
                  step === "details"
                    ? "bg-accent border-accent text-black"
                    : step === "success"
                    ? "bg-accent/20 border-accent text-accent"
                    : "bg-slate-900 border-accent/50 text-slate-400"
                }`}
              >
                3
              </div>
            </div>

            {step === "service" && (
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-100 mb-6">Выберите услугу</h2>
                {servicesQuery.isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : servicesQuery.data && servicesQuery.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {servicesQuery.data.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service.id)}
                        className="bg-slate-950/60 border border-borderMuted rounded-2xl p-6 text-left hover:border-accent hover:bg-slate-900/80 transition"
                      >
                        <h3 className="text-xl font-medium text-slate-100 mb-2">{service.name}</h3>
                        {service.description && (
                          <p className="text-slate-400 text-sm mb-3">{service.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">
                            {service.durationMinutes} минут
                          </span>
                          {service.price && (
                            <span className="text-accent font-medium">
                              {service.price.toLocaleString("ru-RU")} ₽
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    Нет доступных услуг. Создайте услуги в разделе "Услуги".
                  </div>
                )}
              </div>
            )}

            {step === "master" && (
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-100 mb-6">Выберите мастера</h2>
                {mastersQuery.isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : mastersQuery.data && mastersQuery.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mastersQuery.data.map((master) => (
                      <button
                        key={master.id}
                        onClick={() => handleMasterSelect(master.id)}
                        className={`bg-slate-950/60 border rounded-2xl p-6 text-left transition ${
                          selectedMaster === master.id
                            ? "border-accent bg-accent/10"
                            : "border-borderMuted hover:border-accent hover:bg-slate-900/80"
                        }`}
                      >
                        <h3 className="text-xl font-medium text-slate-100">{master.name}</h3>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    Нет доступных мастеров. Создайте мастеров в разделе "Мастера".
                  </div>
                )}
                <button
                  onClick={() => setStep("service")}
                  className="mt-6 px-6 py-2 text-slate-400 hover:text-slate-100 transition"
                >
                  ← Назад
                </button>
              </div>
            )}

            {step === "details" && (
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-100 mb-6">
                  Выберите время и введите данные клиента
                </h2>

                <div className="mb-6">
                  <label className="block text-slate-300 mb-2">Дата</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-borderMuted rounded-2xl text-slate-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>

                {selectedDate && slotsQuery.isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                  </div>
                ) : slotsQuery.data && slotsQuery.data.length > 0 ? (
                  <div className="mb-6">
                    <label className="block text-slate-300 mb-2">Доступное время</label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {slotsQuery.data
                        .filter((slot) => !selectedMaster || slot.masterId === selectedMaster)
                        .map((slot, idx) => {
                          const time = new Date(slot.startTime);
                          const timeStr = time.toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSlotSelect(slot)}
                              className={`px-4 py-2 rounded-xl border transition ${
                                selectedSlot?.startTime === slot.startTime
                                  ? "bg-accent border-accent text-black"
                                  : "bg-slate-950/60 border-borderMuted text-slate-100 hover:border-accent"
                              }`}
                            >
                              {timeStr}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-slate-950/60 border border-borderMuted rounded-2xl text-slate-400 text-center">
                    Нет доступных слотов на выбранную дату. Выберите другую дату.
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 mb-2">Имя клиента *</label>
                    <input
                      type="text"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-slate-950/60 border border-borderMuted rounded-2xl text-slate-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2">Телефон</label>
                    <input
                      type="tel"
                      value={clientData.phone}
                      onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-borderMuted rounded-2xl text-slate-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={clientData.whatsappPhone}
                      onChange={(e) => setClientData({ ...clientData, whatsappPhone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-950/60 border border-borderMuted rounded-2xl text-slate-100 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep("master")}
                      className="px-6 py-3 text-slate-400 hover:text-slate-100 transition"
                    >
                      ← Назад
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedSlot || !clientData.name || createBookingMutation.isPending}
                      className="flex-1 px-6 py-3 bg-accent text-black rounded-2xl hover:bg-accentMuted/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createBookingMutation.isPending ? "Создание..." : "Создать запись"}
                    </button>
                  </div>

                  {createBookingMutation.isError && (
                    <div className="p-4 bg-danger/20 border border-danger/50 rounded-2xl text-danger">
                      {createBookingMutation.error.message || "Ошибка при создании записи"}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

