'use client';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-gray-400 mb-8">Page not found</p>
        <a
          href="/dashboard"
          className="px-6 py-3 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
