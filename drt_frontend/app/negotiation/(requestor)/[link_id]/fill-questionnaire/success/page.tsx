// app/negotiation/[link_id]/fill-questionnaire/success/page.tsx
"use client";

import React from "react";

export default function FillSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Thank you!</h1>
        <p>Your questionnaire was submitted successfully.</p>
      </div>
    </div>
  );
}
