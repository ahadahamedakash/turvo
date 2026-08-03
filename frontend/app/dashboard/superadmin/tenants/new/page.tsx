/**
 * Create New Turf Page
 *
 * Dedicated page for creating a new turf/tenant
 */

"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CreateTurfForm } from "@/components/superadmin/tenants/create-turf-form";

export default function NewTurfPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/dashboard/superadmin/tenants");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create New Turf
        </h1>
        <p className="text-sm text-muted-foreground">
          Set up a new turf organization. You&apos;ll be automatically added as
          an admin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Turf Details
          </CardTitle>
          <CardDescription>
            Fill in the information below to create your new turf. You can edit
            these details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTurfForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
