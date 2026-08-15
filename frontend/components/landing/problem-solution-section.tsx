import React from "react";
import { Badge } from "@/components/ui/badge";
import { XCircle, CheckCircle2, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";

export function ProblemSolutionSection() {
  const comparisons = [
    {
      problem: "Endless WhatsApp messages & missed phone calls during match hours.",
      solution: "Self-serve public booking link allows players to book 24/7 in <30 seconds.",
    },
    {
      problem: "Double-booked slots causing furious teams and refund arguments at the turf.",
      solution: "Real-time atomic slot lock prevents double booking across all channels instantly.",
    },
    {
      problem: "Uncollected advance deposits leading to last-minute team no-shows.",
      solution: "Automated advance deposit requirement via digital payments before slot lock.",
    },
    {
      problem: "Losing player contact history & manual membership tracking on paper notebooks.",
      solution: "Unlimited member directory with full match history, player profiles, & pass cards.",
    },
    {
      problem: "Manual email/SMS reminders sent one-by-one by venue managers.",
      solution: "Automated booking confirmation emails, match reminders, and receipt generation.",
    },
  ];

  return (
    <section id="solutions" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
            Why Venue Owners Switch to Turvo
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Stop Managing Turfs with Spreadsheets & WhatsApp
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Running a turf complex should be about football, not chasing late payments and fixing double-booked slots. Here is how Turvo transforms your business.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Old Painful Way */}
          <div className="p-6 md:p-8 rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm relative">
            <div className="flex items-center gap-2 mb-6 text-red-500 font-bold text-lg">
              <XCircle className="h-6 w-6" />
              <span>The Old Way (Manual & Chaos)</span>
            </div>

            <div className="space-y-4">
              {comparisons.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{item.problem}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The Turvo SaaS Solution */}
          <div className="p-6 md:p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm relative ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-950/10">
            <div className="flex items-center gap-2 mb-6 text-emerald-500 font-bold text-lg">
              <CheckCircle2 className="h-6 w-6" />
              <span>The Turvo OS Advantage</span>
            </div>

            <div className="space-y-4">
              {comparisons.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-foreground font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item.solution}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
