import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Checkout Canceled | Taskspace",
  robots: { index: false, follow: false },
}

export default function CheckoutCancelPage() {
  return (
    <div className="bg-white min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <ArrowLeft className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-black mb-3">
          Checkout canceled
        </h1>
        <p className="text-gray-600 mb-2">
          No worries — you haven't been charged. Your free plan is still active.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Ready to try again? All paid plans include a 14-day free trial.
          You won't be charged until day 15.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            View Plans <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
