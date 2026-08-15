import Link from "next/link";
import { Trophy, Mail, Phone, MapPin } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 bg-background pt-12 pb-8 text-sm text-muted-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-500 ring-1 ring-emerald-500/20">
                <Trophy className="h-5 w-5 text-emerald-500" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Turvo
              </span>
            </Link>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Turvo is the premier SaaS venue operating system for football
              turfs and sports arenas. Simplify slot bookings, manage unlimited
              members, send instant email receipts, and scale revenue.
            </p>
            <div className="flex items-center gap-3 text-muted-foreground">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-500 transition-colors p-1.5 rounded-md hover:bg-muted"
                aria-label="GitHub"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-500 transition-colors p-1.5 rounded-md hover:bg-muted"
                aria-label="Twitter"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-500 transition-colors p-1.5 rounded-md hover:bg-muted"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Product
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#features"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Slot Engine
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Unlimited Members
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Email & SMS Alerts
                </a>
              </li>
              <li>
                <a
                  href="#pitch-preview"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Turf Ground Demo
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Subscription Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Solutions
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#solutions"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Football Turfs
                </a>
              </li>
              <li>
                <a
                  href="#solutions"
                  className="hover:text-emerald-500 transition-colors"
                >
                  5-a-side Arenas
                </a>
              </li>
              <li>
                <a
                  href="#solutions"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Sports Complexes
                </a>
              </li>
              <li>
                <a
                  href="#solutions"
                  className="hover:text-emerald-500 transition-colors"
                >
                  Multi-Venue Franchises
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Contact & Support
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-emerald-500" />{" "}
                support@turvo.app
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-500" /> 01636428995
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Narayanganj,
                Bangladesh
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <div>
            © {new Date().getFullYear()} Turvo SaaS Platform. All rights
            reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-emerald-500">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-emerald-500">
              Terms of Service
            </Link>
            <Link href="/cookies" className="hover:text-emerald-500">
              Cookie Preferences
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
