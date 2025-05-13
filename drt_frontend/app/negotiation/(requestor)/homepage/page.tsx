"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const flowSteps = [
  { label: "Request OTP (Email)", path: "/drt/verify/requestor/<link_id>" },
  { label: "Verify OTP", path: "/drt/verify/otp/<link_id>" },
  { label: "Get Questionnaire URL", path: "/drt/request_access/<link_id>" },
  { label: "Fill Questionnaire", path: "/drt/fill_questionnaire/<link_id>" },
];

export default function RequestorHome() {
  const [linkId, setLinkId] = useState("");
  const router = useRouter();

  const go = (template: string) => {
    if (!linkId) return alert("Please enter a link ID.");
    const url = template.replace("<link_id>", linkId);
    router.push(url);
  };

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Data Requestor Portal</h1>

      <label className="block mb-4">
        <span className="text-sm">Invitation Link ID</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded p-2"
          placeholder="e.g. 633c8f65-…"
          value={linkId}
          onChange={(e) => setLinkId(e.target.value)}
        />
      </label>

      <div className="space-y-3 mb-6">
        {flowSteps.map(({ label, path }) => (
          <button
            key={path}
            onClick={() => go(path)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {label}
          </button>
        ))}
      </div>

      <hr className="mb-4" />

      <p className="text-sm text-gray-600">
        If you already have a direct link, just paste it in your browser.
      </p>
    </main>
  );
}
