import React, { Suspense } from "react";
import AdminVerifyMagicLinkContent from "./AdminVerifyMagicLinkContent";

export default function AdminVerifyMagicLink() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminVerifyMagicLinkContent />
    </Suspense>
  );
}
