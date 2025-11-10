import React, { Suspense } from "react";
import OwnerVerifyMagicLinkContent from "./OwnerVerifyMagicLinkContent";

export default function OwnerVerifyMagicLink() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OwnerVerifyMagicLinkContent />
    </Suspense>
  );
} 