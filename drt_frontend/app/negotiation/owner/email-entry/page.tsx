// drt_frontend/app/negotiation/owner/email-entry/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import fetchApi from "@/app/api/apiHelper";

export default function OwnerEmailEntry() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function getCSRFToken(): string {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("csrftoken="))
        ?.split("=")[1] ?? ""
    );
  }

  const mutation = useMutation<void, Error, string>({
    mutationFn: async (emailToSend: string) => {
      const res = await fetchApi("/drt/verify/owner-email/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({ email: emailToSend }),
      });

      if (!res.ok) {
        let msg = "Failed to send OTP";
        try {
          const body = await res.json();
          msg = body.error ?? msg;
        } catch {
          console.error("Failed to parse error response:", error);
        }
        throw new Error(msg);
      }
    },
    retry: 1,
    onError(err) {
      setError(err.message);
    },
    onSuccess(_, emailSent) {
      sessionStorage.setItem("ownerEmail", emailSent);
      router.push("/negotiation/owner/verify-otp");
    },
  });

  const isLoading = mutation.status === "pending";
  const isError = mutation.status === "error";

  // Simple email format check
  const isValidEmail = /\S+@\S+\.\S+/.test(email);

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Owner Login</h1>

      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError(null);
        }}
        className="w-full border rounded p-2 mb-2"
      />
    

      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      {!isValidEmail && email && (
        <p className="text-yellow-600 text-sm mb-2">
          Please enter a valid email address.
        </p>
      )}

      <button
        onClick={() => mutation.mutate(email)}
        disabled={isLoading || !isValidEmail}
        className={`w-full py-2 rounded text-white font-semibold transition-colors duration-200 ${
          isLoading || !isValidEmail
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isLoading ? "Sending OTP…" : "Send OTP"}
      </button>
    </main>
  );
}
