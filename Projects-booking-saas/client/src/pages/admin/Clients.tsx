import { useState } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { trpc } from "../../lib/trpc";

export default function Clients() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsappPhone: "",
    preferredChannel: "auto" as "telegram" | "whatsapp" | "auto",
  });

  const clientsQuery = trpc.clients.list.useQuery({ search: search || undefined });
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
      resetForm();
    },
  });
  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
      resetForm();
      setEditingId(null);
    },
  });
  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      clientsQuery.refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      whatsappPhone: "",
      preferredChannel: "auto",
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

  const handleEdit = (client: any) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      phone: client.phone ?? "",
      whatsappPhone: client.whatsappPhone ?? "",
      preferredChannel: (client.preferredChannel as "telegram" | "whatsapp" | "auto") || "auto",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить клиента?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
            <h2 className="text-2xl font-display font-semibold text-slate-200 mb-4">
            {editingId ? "Редактировать клиента" : "Добавить клиента"}
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
                WhatsApp телефон
              </label>
              <input
                type="text"
                value={formData.whatsappPhone}
                onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Предпочтительный канал
              </label>
              <select
                value={formData.preferredChannel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferredChannel: e.target.value as "telegram" | "whatsapp" | "auto",
                  })
                }
                className="w-full px-3 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="auto">Авто</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
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

        <div className="bg-surface/90 border border-borderMuted rounded-3xl p-5 shadow-lg shadow-black/40 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-slate-200">Список клиентов</h2>
            <input
              type="text"
              placeholder="Поиск по имени или телефону..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {clientsQuery.isLoading ? (
            <p className="text-slate-400">Загрузка...</p>
          ) : clientsQuery.data?.length === 0 ? (
            <p className="text-slate-400">Нет клиентов</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-300">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Имя</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Телефон</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                      Предпочтительный канал
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderMuted">
                  {clientsQuery.data?.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-900/60 transition cursor-pointer"
                      onClick={() => handleEdit(client)}
                    >
                      <td className="py-3 px-4 text-slate-200">{client.name}</td>
                      <td className="py-3 px-4 text-slate-300">{client.phone || "-"}</td>
                      <td className="py-3 px-4 text-slate-300">
                        {client.preferredChannel === "telegram"
                          ? "Telegram"
                          : client.preferredChannel === "whatsapp"
                          ? "WhatsApp"
                          : "Авто"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(client);
                            }}
                            className="px-3 py-1 bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition-colors text-sm"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(client.id);
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
