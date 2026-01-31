import { useState } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";

export default function Masters() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const mastersQuery = trpc.masters.list.useQuery();
  const createMutation = trpc.masters.create.useMutation({
    onSuccess: () => {
      mastersQuery.refetch();
      resetForm();
    },
  });
  const updateMutation = trpc.masters.update.useMutation({
    onSuccess: () => {
      mastersQuery.refetch();
      resetForm();
      setEditingId(null);
    },
  });
  const deleteMutation = trpc.masters.delete.useMutation({
    onSuccess: () => {
      mastersQuery.refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
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

  const handleEdit = (master: any) => {
    setEditingId(master.id);
    setFormData({
      name: master.name,
      phone: master.phone ?? "",
      email: master.email ?? "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить мастера?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
            <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">
            {editingId ? "Редактировать мастера" : "Добавить мастера"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Имя
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
                Телефон
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
            <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">Список мастеров</h2>
          {mastersQuery.isLoading ? (
            <p className="text-slate-400">Загрузка...</p>
          ) : mastersQuery.data?.length === 0 ? (
            <p className="text-slate-400">Нет мастеров</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-300">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Имя</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Телефон</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderMuted">
                  {mastersQuery.data?.map((master) => (
                    <tr
                      key={master.id}
                      className="hover:bg-slate-900/60 transition cursor-pointer"
                      onClick={() => handleEdit(master)}
                    >
                      <td className="py-3 px-4 text-slate-200">{master.name}</td>
                      <td className="py-3 px-4 text-slate-300">{master.phone || "-"}</td>
                      <td className="py-3 px-4 text-slate-300">{master.email || "-"}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(master);
                            }}
                            className="px-3 py-1 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition-colors text-sm"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(master.id);
                            }}
                            className="px-3 py-1 bg-red-900/50 text-red-300 rounded hover:bg-red-900/70 transition-colors text-sm"
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
