// drt_frontend/app/negotiation/owner/verify-otp/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function OwnerVerifyOtp() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // On mount, load the saved email or redirect
  useEffect(() => {
    const stored = sessionStorage.getItem("ownerEmail");
    if (!stored) {
      router.replace("/negotiation/owner/email-entry");
    } else {
      setEmail(stored);
    }
  }, [router]);

  const verifyOtp = async ({ email, otp }: { email: string; otp: string }): Promise<void> => {
    const res = await fetchApi(
      `/drt/verify/owner-otp/${encodeURIComponent(email)}/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      }
    );
    if (!res.ok) {
      let msg = "OTP verification failed";
      try {
        const body = await res.json();
        msg = body.error ?? msg;
      } catch {
        console.error("Failed to parse error response:", error);
      }
      throw new Error(msg);
    }
    // success 
  };

  const mutation = useMutation<void, Error, { email: string; otp: string }>({
    mutationFn: verifyOtp,
    retry: 1, 
    onError: (err) => {
      
      setError(err.message);
    },
    onSuccess: (_, vars) => {
      router.push("/negotiation/owner/homepage");
    },
  });

  const isLoading = mutation.status === "pending";

  const isDisabled = isLoading || otp.trim().length === 0;

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Enter OTP</h1>

      <input
        type="text"
        placeholder="6-digit code"
        value={otp}
        onChange={(e) => {
          setOtp(e.target.value);
          setError(null);
        }}
        className="w-full border rounded p-2 mb-2"
      />

      {/* show error from server or network */}
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

      <button
        onClick={() => {
          if (!email) return;
          mutation.mutate({ email, otp });
        }}
        disabled={isDisabled}
        className={`w-full py-2 rounded text-white font-semibold transition-colors duration-200 ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isLoading ? "Verifying…" : "Verify OTP"}
      </button>
    </main>
  );
}
