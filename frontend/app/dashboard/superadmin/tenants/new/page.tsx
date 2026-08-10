"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowLeft, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTurfForm } from "@/components/superadmin/tenants/create-turf-form";

export default function NewTurfPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/dashboard/superadmin/tenants");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back Button & Page Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild className="h-9 w-9">
          <Link href="/dashboard/superadmin/tenants">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to turfs list</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Register New Turf Organization
          </h1>
          <p className="text-xs text-muted-foreground">
            Set up a multi-tenant venue. You will automatically be granted superadmin access to manage courts and staff.
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-4 w-4 text-teal-600" />
            Turf Organization Information
          </CardTitle>
          <CardDescription className="text-xs">
            Complete the form fields below. You can update operating hours, timezone, and description anytime later.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <CreateTurfForm onSuccess={handleSuccess} onCancel={() => router.push("/dashboard/superadmin/tenants")} />
        </CardContent>
      </Card>
    </div>
  );
}
