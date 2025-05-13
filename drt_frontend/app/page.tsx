// app/page.tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-12">
        <h1 className="text-4xl font-extrabold text-center text-gray-800">
          Welcome to DRT
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Requestor Card */}
          <Link href="/negotiation/homepage" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center 
                            transform transition hover:shadow-2xl hover:scale-105">
              <div className="text-6xl mb-4 transition group-hover:scale-110">👤</div>
              <span className="text-xl font-semibold text-gray-700 group-hover:text-gray-900">
                I’m a Requestor
              </span>
            </div>
          </Link>

          {/* Owner Card */}
          <Link href="/negotiation/owner/homepage" className="group">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center 
                            transform transition hover:shadow-2xl hover:scale-105">
              <div className="text-6xl mb-4 transition group-hover:scale-110">🛡️</div>
              <span className="text-xl font-semibold text-gray-700 group-hover:text-gray-900">
                I’m an Owner
              </span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}
