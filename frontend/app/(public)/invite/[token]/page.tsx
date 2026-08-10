"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useVerifyInvitation, useAcceptInvitation } from "@/hooks/invitations";
import {
  Building2,
  Mail,
  Shield,
  User,
  LockKeyhole,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/hooks/auth";
import { establishSession } from "@/lib/auth/session-manager";

// Schema for new user registration
const acceptInvitationSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
});

type AcceptInvitationForm = z.infer<typeof acceptInvitationSchema>;

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const { user, isAuthenticated } = useAuth();

  const [isNewUser, setIsNewUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify invitation
  const {
    data: invitation,
    isLoading: isVerifying,
    error: verifyError,
  } = useVerifyInvitation(token || "", {
    enabled: !!token,
  });

  // Accept invitation mutation
  const acceptInvitation = useAcceptInvitation();

  const form = useForm<AcceptInvitationForm>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      gender: undefined,
    },
  });

  // Check if this is a new user or existing user
  useEffect(() => {
    if (invitation) {
      // If authenticated and email matches, this is an existing user
      if (isAuthenticated && user?.email === invitation.email) {
        setIsNewUser(false);
      }
    }
  }, [invitation, isAuthenticated, user]);

  const onSubmit = async (values: AcceptInvitationForm) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      const result = await acceptInvitation.mutateAsync({
        token,
        ...values,
      });

      // Establish session using the session manager
      if (result.accessToken) {
        establishSession(result.accessToken);
      }

      // Update auth context
      toast.success("Invitation accepted!", {
        description: "You can now access your dashboard.",
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptAsExisting = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    // If logged in, accept with just the token
    setIsSubmitting(true);
    try {
      await acceptInvitation.mutateAsync({ token });

      toast.success("Invitation accepted!", {
        description: "You can now access your dashboard.",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while verifying
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (verifyError || !invitation) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription>
            {verifyError instanceof Error
              ? verifyError.message
              : "This invitation link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <a href="/login">Go to Login</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Success state - show invitation details and form
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/10">
          <Building2 className="h-6 w-6 text-teal-600" />
        </div>
        <CardTitle>You're Invited!</CardTitle>
        <CardDescription>
          Join <strong>{invitation.tenantName}</strong> as a{" "}
          <strong>{invitation.roleName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invitation Details */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Organization:</span>
            <span className="font-medium">{invitation.tenantName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Role:</span>
            <span className="font-medium">{invitation.roleName}</span>
          </div>
        </div>

        {/* Existing User Flow */}
        {isAuthenticated && user?.email === invitation.email ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              You're already logged in as {invitation.email}. Accept this
              invitation to join the team.
            </p>
            <Button
              onClick={handleAcceptAsExisting}
              disabled={isSubmitting || acceptInvitation.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting || acceptInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          </div>
        ) : isAuthenticated ? (
          // Logged in as different user
          <div className="space-y-4">
            <p className="text-center text-sm text-destructive">
              You're logged in as {user?.email}. Please log out first, then use
              this invitation link.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </div>
        ) : (
          // New User Flow
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  placeholder="John"
                  disabled={isSubmitting}
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  placeholder="Doe"
                  disabled={isSubmitting}
                />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4" />
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                  placeholder="Create a password"
                  disabled={isSubmitting}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+880 1XXX-XXXXXX"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender (Optional)</Label>
                <select
                  id="gender"
                  {...form.register("gender")}
                  disabled={isSubmitting}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || acceptInvitation.isPending}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isSubmitting || acceptInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept & Create Account
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By accepting, you agree to join {invitation.tenantName} as a{" "}
              {invitation.roleName}.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
