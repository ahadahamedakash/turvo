/**
 * Invitation Accept Page (Query Param Version)
 *
 * This page handles URLs like /invitations/accept?token=xyz
 * It redirects to the canonical /invite/[token] route for cleaner URLs.
 * This ensures both URL formats work for invitation acceptance.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function InvitationsAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      // Redirect to the canonical route with the token in the path
      router.replace(`/invite/${token}`);
    } else {
      // No token provided, redirect to home
      router.replace("/");
    }
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    </div>
  );
}
