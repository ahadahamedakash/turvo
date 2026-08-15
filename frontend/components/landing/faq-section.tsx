"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does Turvo prevent double bookings on the same turf slot?",
      answer:
        "Turvo uses a real-time atomic slot lock engine. The moment a player selects a time slot on your public booking link, that slot is locked for 5 minutes during checkout. No two players can select or pay for the same slot simultaneously.",
    },
    {
      question:
        "Are unlimited members really included in the Pro & Enterprise plans?",
      answer:
        "Yes! Unlike legacy platforms that charge per registered player or cap your contact list, Turvo allows you to add and manage unlimited members, team captains, and player profiles at no extra cost.",
    },
    {
      question: "How do automated email services and notifications work?",
      answer:
        "When a booking is confirmed, Turvo automatically dispatches a branded email receipt with booking reference numbers, pitch details, and Google Maps location links. Reminders are also sent prior to match kickoff.",
    },
    {
      question:
        "Can I manage multiple turf grounds (e.g. 5-a-side and 7-a-side)?",
      answer:
        "Absolutely. Turvo supports multi-turf tenant architecture. You can set individual pricing, opening hours, lighting rules, and ground sizes for each pitch under your master dashboard.",
    },
    {
      question: "How long does setup take?",
      answer:
        "You can register your venue, set up your turf operating hours, and generate your public booking link in less than 5 minutes.",
    },
  ];

  return (
    <section id="faq" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
          >
            Frequently Asked Questions
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Got Questions? We Have Answers.
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Everything you need to know about setting up your turf on Turvo.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-foreground font-semibold hover:text-emerald-500 transition-colors"
                  aria-expanded={isOpen}
                  id={`btn-faq-item-${idx}`}
                >
                  <span className="flex items-center gap-3 text-base">
                    <HelpCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-500" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed pl-13 border-t border-border/30 mt-2 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
