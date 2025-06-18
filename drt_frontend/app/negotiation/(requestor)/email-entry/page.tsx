// drt_frontend/app/negotiation/(requestor)/email-entry/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function ReqEmailEntry() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  function getCSRFToken(): string {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1] ?? ""
    );
  }

  const {
    mutate: sendOtp,
    isPending,
    isError,
    error,
  } = useMutation<void, Error, string>({
    mutationFn: async (emailToSend: string) => {
      const res = await fetchApi("/drt/verify/req-email/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({ email: emailToSend }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to send OTP");
      }
    },
    onSuccess: (_data, variables) => {
      sessionStorage.setItem("reqEmail", variables);
      router.push("/negotiation/verify-otp/");
    },
  });

  // Simple email format check
  const isValidEmail = /\S+@\S+\.\S+/.test(email);

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Requestor Login</h1>

      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        className="w-full border rounded p-2 mb-2"
      />

      {isError && <p className="text-red-500 text-sm mb-2">{error?.message}</p>}

      {!isValidEmail && email && (
        <p className="text-yellow-600 text-sm mb-2">
          Please enter a valid email address.
        </p>
      )}

      <button
        onClick={() => sendOtp(email)}
        disabled={isPending || !isValidEmail}
        className={`w-full py-2 rounded text-white font-semibold transition-colors duration-200 ${
          isPending || !isValidEmail
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isPending ? "Sending OTP…" : "Send OTP"}
      </button>
    </main>
  );
}
