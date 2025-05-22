// drt_frontend\app\negotiation\(requestor)\email-entry\page.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import fetchApi from "@/app/api/apiHelper";

export default function OwnerEmailEntry() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function getCSRFToken(): string {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1] ?? ""
    );
  }

  const sendOtp = async () => {
    setError(null);
    const res = await fetchApi("/drt/verify/req-email/", {
      method: "POST",
      credentials: "include",                
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),       
      },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      // pass email along as a query param to OTP page
      router.push(
        `/negotiation/verify-otp/?email=${encodeURIComponent(email)}`
      );
    } else {
      const body = await res.json();
      setError(body.error || "Failed to send OTP");
    }
  };

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Owner Login</h1>
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      />
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <button
        onClick={sendOtp}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        Send OTP
      </button>
    </main>
  );
}
