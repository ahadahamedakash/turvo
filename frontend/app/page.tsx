import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { FootballPitchVisual } from "@/components/landing/football-pitch-visual";
import { ProblemSolutionSection } from "@/components/landing/problem-solution-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { SeoStructuredData } from "@/components/landing/seo-metadata";

export const metadata: Metadata = {
  title: "Turvo | Premier Football Turf & Sports Venue Booking SaaS",
  description:
    "All-in-one SaaS platform for football turf owners & venue managers. Automate slot bookings, track unlimited members, send instant email & SMS notifications, and prevent double bookings.",
  keywords: [
    "turf booking saas",
    "football turf management software",
    "turf ground booking app",
    "sports facility scheduling",
    "unlimited member management",
    "automated booking notifications",
    "multi turf venue software",
  ],
  openGraph: {
    title: "Turvo | Football Turf & Sports Venue Booking SaaS",
    description:
      "Automate pitch slot reservations, track unlimited members, and send instant booking notifications with Turvo.",
    type: "website",
    url: "https://turvo.app",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground selection:bg-emerald-500/20 selection:text-emerald-400">
      <SeoStructuredData />
      <LandingHeader />
      <main className="flex-1">
        <HeroSection />
        <FootballPitchVisual />
        <ProblemSolutionSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
