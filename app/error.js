'use client';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-8">
          {error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-embrace hover:bg-embrace-dark text-white font-medium rounded-xl transition"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
