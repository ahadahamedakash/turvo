"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useLogin } from "@/hooks/auth";
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { RHFInput, RHFPassword } from "@/components/forms";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();

  const { mutate: login, isPending } = useLogin({
    onSuccess: () => {
      console.log("[LoginForm] Login successful, redirecting to:", redirectTo);
      router.push(redirectTo);
    },
  });

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = (values: LoginFormValues) => {
    console.log("[LoginForm] Submitting login for:", values.email);
    login(values);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field - using RHFInput component */}
              <RHFInput
                name="email"
                label="Email"
                type="email"
                placeholder="user@example.com"
                autoComplete="email"
                disabled={isPending}
                required
              />

              {/* Password Field - using RHFPassword component */}
              <RHFPassword
                name="password"
                label="Password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isPending}
                required
              />

              {/* Forgot Password Link */}
              <div className="flex items-center justify-end text-sm">
                <Link
                  href="/forgot-password"
                  className="text-muted-foreground hover:text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Sign Up Link */}
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Contact your administrator
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SearchParamLoader setRedirectTo={setRedirectTo} />
      <LoginForm redirectTo={redirectTo} />
    </Suspense>
  );
}

// Extract search params in a separate component to use Suspense
function SearchParamLoader({
  setRedirectTo,
}: {
  setRedirectTo: (value: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    setRedirectTo(searchParams.get("redirect") || "/dashboard");
  }, [searchParams, setRedirectTo]);

  return null;
}
