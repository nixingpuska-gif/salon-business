import { useState } from "react";
import { trpc } from "../lib/trpc";

type Tab = "booking" | "assistant";

export function ChatDock() {
  const [activeTab, setActiveTab] = useState<Tab>("booking");
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: number; text: string; sender: "user" | "bot" }>
  >([]);
  const [input, setInput] = useState("");

  const assistantMutation = trpc.assistant.chat.useMutation({
    onSuccess: (data) => {
      const botResponse = {
        id: messages.length + 1,
        text: data.reply,
        sender: "bot" as const,
      };
      setMessages((prev) => [...prev, botResponse]);
    },
    onError: () => {
      const botResponse = {
        id: messages.length + 1,
        text: "Произошла ошибка. Попробуйте ещё раз.",
        sender: "bot" as const,
      };
      setMessages((prev) => [...prev, botResponse]);
    },
  });

  const getHistoryForAssistant = () => {
    return messages
      .filter((msg) => activeTab === "assistant" || msg.sender === "bot")
      .slice(-10)
      .map((msg) => ({
        role: msg.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.text,
      }));
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: "user" as const,
    };

    setMessages([...messages, userMessage]);
    const currentInput = input;
    setInput("");

    if (activeTab === "assistant") {
      assistantMutation.mutate({
        message: currentInput,
        context: "owner",
        history: getHistoryForAssistant(),
      });
    } else {
      setTimeout(() => {
        const botResponse = {
          id: messages.length + 2,
          text: "Спасибо за сообщение! Я помогу вам записаться на услугу.",
          sender: "bot" as const,
        };
        setMessages((prev) => [...prev, botResponse]);
      }, 500);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full w-14 h-14 flex items-center justify-center bg-accent text-black shadow-2xl shadow-black/70 border border-accentMuted hover:shadow-[0_0_25px_rgba(245,199,106,0.8)] hover:-translate-y-0.5 transition z-50 text-2xl"
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-md bg-surface/95 border border-borderMuted rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl flex flex-col overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-borderMuted bg-slate-950/80">
            <div className="flex gap-2 bg-slate-950/60 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab("booking")}
                className={`flex-1 text-center text-xs py-1.5 rounded-xl transition ${
                  activeTab === "booking"
                    ? "bg-accent text-black font-medium shadow"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`}
              >
                Запись
              </button>
              <button
                onClick={() => setActiveTab("assistant")}
                className={`flex-1 text-center text-xs py-1.5 rounded-xl transition ${
                  activeTab === "assistant"
                    ? "bg-accent text-black font-medium shadow"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`}
              >
                Ассистент
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-slate-900/80 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400 mt-8">
                <p className="text-3xl mb-2">
                  {activeTab === "booking" ? "🤖" : "👨‍💼"}
                </p>
                <p className="text-lg text-slate-300 mb-1">
                  {activeTab === "booking"
                    ? "Бот записи клиентов"
                    : "Бот-ассистент предпринимателя"}
                </p>
                <p className="text-sm text-slate-400">Начните диалог</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.sender === "user"
                        ? "bg-accent text-black"
                        : "bg-slate-900/80 border border-borderMuted text-slate-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {assistantMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-slate-900/80 border border-borderMuted rounded-2xl px-3 py-2 text-sm text-slate-400">
                  Думаю...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-borderMuted bg-slate-950/80">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !assistantMutation.isPending && handleSend()}
                placeholder="Введите сообщение..."
                disabled={assistantMutation.isPending}
                className="flex-1 px-4 py-2 bg-slate-950/60 border border-borderMuted rounded-2xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={assistantMutation.isPending}
                className="px-6 py-2 bg-accent text-black rounded-2xl hover:bg-accentMuted/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
