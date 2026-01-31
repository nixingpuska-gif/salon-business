import { useState } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";

export default function Services() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    durationMinutes: 30,
    price: undefined as number | undefined,
    description: "",
  });

  const servicesQuery = trpc.services.list.useQuery();
  const createMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      servicesQuery.refetch();
      resetForm();
    },
  });
  const updateMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      servicesQuery.refetch();
      resetForm();
      setEditingId(null);
    },
  });
  const deleteMutation = trpc.services.delete.useMutation({
    onSuccess: () => {
      servicesQuery.refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      durationMinutes: 30,
      price: undefined,
      description: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price ?? undefined,
      description: service.description ?? "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить услугу?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
          <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">
            {editingId ? "Редактировать услугу" : "Создать услугу"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Название
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Длительность (минуты)
              </label>
              <input
                type="number"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 0 })
                }
                required
                min="1"
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Цена (₽)
              </label>
              <input
                type="number"
                value={formData.price ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                min="0"
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
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
                  className="bg-transparent border border-borderMuted text-slate-200 hover:bg-slate-900/80 rounded-2xl px-4 py-2 transition"
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40">
          <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">Список услуг</h2>
          {servicesQuery.isLoading ? (
            <p className="text-slate-400">Загрузка...</p>
          ) : servicesQuery.data?.length === 0 ? (
            <p className="text-slate-400">Нет услуг</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-300">
                    <th className="text-left py-3 px-4 font-semibold">Название</th>
                    <th className="text-left py-3 px-4 font-semibold">Длительность</th>
                    <th className="text-left py-3 px-4 font-semibold">Цена</th>
                    <th className="text-left py-3 px-4 font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderMuted">
                  {servicesQuery.data?.map((service) => (
                    <tr
                      key={service.id}
                      className="hover:bg-slate-900/60 transition cursor-pointer"
                      onClick={() => handleEdit(service)}
                    >
                      <td className="py-3 px-4 text-slate-200">{service.name}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {service.durationMinutes} мин
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {service.price ? `₽${service.price}` : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(service);
                            }}
                            className="px-3 py-1 bg-transparent border border-borderMuted text-slate-200 hover:bg-slate-900/80 rounded-2xl text-sm transition"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(service.id);
                            }}
                            className="px-3 py-1 bg-danger/20 border border-danger/50 text-danger rounded-2xl hover:bg-danger/30 transition text-sm"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
