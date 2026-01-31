import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
        <p className="text-xl text-slate-400 mb-6">Страница не найдена</p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Вернуться на дашборд
        </Link>
      </div>
    </div>
  );
}
