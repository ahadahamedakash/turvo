/**
 * Auth Layout
 *
 * Layout for authentication pages (login, register, password reset)
 * Provides a clean, centered layout without navigation
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Optional: Background pattern or gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-100 via-background to-background dark:from-neutral-950" />

      {/* Main content */}
      <div className="container relative flex h-[calc(100vh-4rem)] items-center justify-center md:h-screen">
        {children}
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Turvo. All rights reserved.
      </footer>
    </div>
  );
}
