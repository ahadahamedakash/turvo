import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Bell,
  Building2,
  CreditCard,
  BarChart3,
  Mail,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: "Real-Time Slot Booking Calendar",
      description:
        "Customizable hourly and custom-range slot scheduling. Automatically locks selected slots to prevent double bookings across mobile and desktop.",
    },
    {
      icon: Users,
      title: "Unlimited Member Directory",
      description:
        "Manage unlimited players, team captains, and regular club members without per-user pricing penalties or artificial subscriber caps.",
    },
    {
      icon: Mail,
      title: "Automated Email Services & SMS",
      description:
        "Instant confirmation receipts, match reminder alerts, invoice PDFs, and cancellation notices dispatched automatically to players.",
    },
    {
      icon: Building2,
      title: "Multi-Turf & Facility Management",
      description:
        "Operate 5-a-side, 7-a-side, or multi-venue complexes under one master dashboard with dedicated pitch settings and lighting schedules.",
    },
    {
      icon: CreditCard,
      title: "Advance Deposit & Online Checkout",
      description:
        "Collect advance partial payments or full slot fees seamlessly via Stripe/bKash/card integration before confirming the match.",
    },
    {
      icon: BarChart3,
      title: "Live Occupancy & Revenue Analytics",
      description:
        "Track peak hour utilization, monthly revenue breakdown, top customer leaderboards, and booking channel performance.",
    },
  ];

  return (
    <section id="features" className="py-16 md:py-24 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
            Comprehensive Platform Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Everything You Need to Run a World-Class Turf Business
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Purpose-built tools for sports venue management, team reservations, player engagement, and financial accounting.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border/60 bg-card hover:border-emerald-500/50 hover:shadow-lg transition-all group"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-emerald-500 transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
