import React, { Suspense } from "react";
import OwnerNegotiationListContent from "./OwnerNegotiationListContent";

export default function NegotiationListPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OwnerNegotiationListContent />
    </Suspense>
  );
}
