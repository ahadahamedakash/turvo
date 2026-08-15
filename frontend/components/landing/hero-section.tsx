import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Calendar, Bell, Users, CheckCircle2 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 lg:pt-28">
      {/* Background Glow Accents */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 right-10 w-[300px] h-[300px] bg-teal-500/10 blur-[100px] rounded-full" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Top Product Badge */}
        <div className="inline-flex items-center gap-2 mb-6">
          <Badge
            variant="outline"
            className="py-1.5 px-4 rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs sm:text-sm font-medium backdrop-blur-md shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>The #1 SaaS Operating System for Football & Sports Turfs</span>
          </Badge>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
          Automate Turf Bookings.{" "}
          <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Fill Every Pitch Slot.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Turvo replaces messy WhatsApp chats and paper logs with automated slot scheduling, instant email & SMS notifications, unlimited member tracking, and secure deposit collections.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/25 transition-all hover:scale-[1.02]"
          >
            <Link href="/login?register=true" id="btn-hero-cta-primary">
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <Button
            size="lg"
            variant="outline"
            asChild
            className="w-full sm:w-auto h-12 px-8 text-base font-medium border-border/80 hover:bg-emerald-500/10 hover:border-emerald-500/40"
          >
            <a href="#pitch-preview" id="btn-hero-cta-secondary">
              Interactive Pitch Demo
            </a>
          </Button>
        </div>

        {/* Value Highlights Chips */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Instant Setup in 3 Mins
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Unlimited Members Included
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero Credit Card Required
          </span>
        </div>

        {/* Quick Key Metrics Cards */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
            <Calendar className="h-6 w-6 text-emerald-500 mb-1 mx-auto" />
            <div className="text-2xl font-bold text-foreground">150K+</div>
            <div className="text-xs text-muted-foreground font-medium">Slots Scheduled</div>
          </div>
          <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
            <Users className="h-6 w-6 text-emerald-500 mb-1 mx-auto" />
            <div className="text-2xl font-bold text-foreground">Unlimited</div>
            <div className="text-xs text-muted-foreground font-medium">Members & Players</div>
          </div>
          <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
            <Bell className="h-6 w-6 text-emerald-500 mb-1 mx-auto" />
            <div className="text-2xl font-bold text-foreground">99.8%</div>
            <div className="text-xs text-muted-foreground font-medium">Email/SMS Delivery</div>
          </div>
          <div className="p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
            <Sparkles className="h-6 w-6 text-emerald-500 mb-1 mx-auto" />
            <div className="text-2xl font-bold text-foreground">0%</div>
            <div className="text-xs text-muted-foreground font-medium">Double Bookings</div>
          </div>
        </div>
      </div>
    </section>
  );
}
