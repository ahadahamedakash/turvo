import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden bg-linear-to-b from-emerald-950 via-emerald-900 to-slate-950 text-white">
      {/* Glow Effects */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-75 bg-emerald-500/20 blur-[100px] rounded-full" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 mb-4 bg-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/30">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>Transform Your Turf Arena Today</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Ready to Automate Your Turf & Fill Every Slot?
        </h2>

        <p className="mt-4 text-emerald-100/80 text-base sm:text-lg max-w-2xl mx-auto">
          Join hundreds of venue managers operating frictionless sports grounds
          with zero double bookings and automated email notifications.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            asChild
            className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/30"
          >
            <Link href="/login?register=true" id="btn-bottom-cta-primary">
              Start Your 14-Day Free Trial{" "}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center items-center gap-6 text-xs text-emerald-200/70">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No Credit Card
            Required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 5-Minute Setup
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cancel Anytime
          </span>
        </div>
      </div>
    </section>
  );
}
