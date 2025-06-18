// drt_frontend/app/negotiation/(requestor)/verify-otp/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function ReqVerifyOtp() {
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const router = useRouter();

  // load email or bounce back
  useEffect(() => {
    const stored = sessionStorage.getItem("reqEmail");
    if (!stored) {
      router.replace("/negotiation/email-entry");
    } else {
      setEmail(stored);
    }
  }, [router]);

  const verifyOtpFn = async ({
    email,
    otp,
  }: {
    email: string;
    otp: string;
  }): Promise<void> => {
    const res = await fetchApi(
      `/drt/verify/req-otp/${encodeURIComponent(email)}/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      }
    );
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "OTP verification failed");
    }
  };

  const {
    mutate: verifyOtp,
    isPending,
    isError,
    error,
  } = useMutation<void, Error, { email: string; otp: string }>({
    mutationFn: verifyOtpFn,
    onSuccess: () => {
      router.push("/negotiation/homepage");
    },
  });

  const isDisabled = isPending || otp.trim().length === 0;

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Enter OTP</h1>

      <input
        type="text"
        placeholder="6-digit code"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="w-full border rounded p-2 mb-2"
      />

      {isError && <p className="text-red-500 text-sm mb-2">{error?.message}</p>}

      <button
        onClick={() => email && verifyOtp({ email, otp })}
        disabled={isDisabled}
        className={`w-full py-2 rounded text-white font-semibold transition-colors duration-200 ${
          isDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isPending ? "Verifying…" : "Verify OTP"}
      </button>
    </main>
  );
}
