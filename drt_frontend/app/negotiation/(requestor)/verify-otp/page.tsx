// app/owner/verify-otp/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import fetchApi from '@/app/api/apiHelper';

export default function OwnerVerifyOtp() {
  const params = useSearchParams()
  const email = params.get('email') || ''
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string|null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!email) router.replace('/negotiation/email-entry')
  }, [email])

  const verify = async () => {
    setError(null)
    const res = await fetchApi(`/drt/verify/req-otp/${encodeURIComponent(email)}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    })
    if (res.ok) {
      router.push(`/negotiation/homepage?email=${encodeURIComponent(email)}`)
    } else {
      const body = await res.json()
      setError(body.error || 'OTP verification failed')
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Enter OTP</h1>
      <input
        type="text"
        placeholder="6-digit code"
        value={otp}
        onChange={e => setOtp(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      />
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <button
        onClick={verify}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        Verify
      </button>
    </main>
  )
}
