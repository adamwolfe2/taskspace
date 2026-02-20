"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-white">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-slate-600 mb-6">
              An unexpected error occurred. Please try again or contact support
              if the problem persists.
            </p>
            {error.digest && (
              <p className="text-xs text-slate-400 mb-4">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
