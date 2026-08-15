"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter Pitch",
      description:
        "Ideal for single turf owners getting started with digital slot management.",
      monthlyPrice: 999,
      annualPrice: 999,
      popular: false,
      ctaText: "Start Starter Trial",
      features: [
        "1 Turf Ground / Pitch",
        "3 Members & Staff Seats",
        "Up to 500 Bookings / Month",
        "Standard Calendar View",
        "Up to 1,000 Player Directory",
        "Community Support",
      ],
    },
    {
      name: "Pro Stadium",
      description:
        "Everything you need to automate bookings, member retention, & notifications.",
      monthlyPrice: 1499,
      annualPrice: 1499,
      popular: true,
      ctaText: "Start 14-Day Free Trial",
      features: [
        "Up to 5 Turf Grounds / Pitches",
        "10 Members & Staff Seats",
        "UNLIMITED Monthly Bookings",
        "UNLIMITED Members & Players",
        "Automated Booking Notifications",
        "Email Services & Receipt Generation",
        "Real-Time Slot Lock Engine",
        "Online Payment & Deposit Gateway",
        "Revenue & Occupancy Analytics",
      ],
    },
    {
      name: "Enterprise League",
      description:
        "For multi-venue sports hubs and franchise turf networks requiring full control.",
      monthlyPrice: 1999,
      annualPrice: 1999,
      popular: false,
      ctaText: "Contact Sales",
      features: [
        "Own Landing page with domain & hosting",
        "UNLIMITED Turf Grounds & Venues",
        "UNLIMITED Members & Staff Seats",
        "Branded Email Services & SMS Gateway",
        "Custom Domain & White-Label Portal",
        "Dedicated Account Manager",
        "Custom API Access & Webhooks",
        "Priority 24/7 Phone & Chat Support",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
          >
            Simple & Transparent Subscription Plans
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Invest in Your Turf&apos;s Full Operational Potential
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Choose the plan that fits your venue size. Upgrade, downgrade, or
            cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly Billed
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-600/30 p-1 transition-colors border border-emerald-500/40"
              aria-label="Toggle annual billing"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-emerald-500 transition-transform ${
                  isAnnual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium flex items-center gap-1.5 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Annual Billed
              <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] border-emerald-500/30">
                Save 20%
              </Badge>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 md:p-8 flex flex-col justify-between border transition-all ${
                plan.popular
                  ? "border-emerald-500 bg-card shadow-2xl shadow-emerald-950/20 ring-2 ring-emerald-500/30 relative"
                  : "border-border/60 bg-card/60 hover:border-emerald-500/40"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-600 text-white px-3 py-1 font-semibold text-xs shadow-md">
                    <Sparkles className="h-3 w-3 mr-1 inline" /> Most Popular
                  </Badge>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-6 min-h-8">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-foreground">
                    &#2547;{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>

                <div className="space-y-3 mb-8 text-sm">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-foreground">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                asChild
                className={`w-full h-11 text-sm font-semibold shadow-md ${
                  plan.popular
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                    : "bg-muted text-foreground hover:bg-emerald-500 hover:text-white"
                }`}
              >
                <Link
                  href="/login?register=true"
                  id={`btn-pricing-${plan.name.toLowerCase().replace(" ", "-")}`}
                >
                  {plan.ctaText}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
