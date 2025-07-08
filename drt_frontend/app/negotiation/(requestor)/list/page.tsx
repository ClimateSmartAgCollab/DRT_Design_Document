"use client";
import React, { Suspense } from "react";
import NegotiationListContent from "./NegotiationListContent";

export default function NegotiationListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NegotiationListContent />
    </Suspense>
  );
}
