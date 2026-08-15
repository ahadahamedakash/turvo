"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUserData } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Trophy, Menu, X, ArrowRight, ShieldCheck } from "lucide-react";

export function LandingHeader() {
  const { isAuthenticated, isLoading } = useUserData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          id="landing-logo-link"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-500 ring-1 ring-emerald-500/20 group-hover:scale-105 transition-transform">
            <Trophy className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 bg-clip-text text-transparent">
              Turvo
            </span>
            <span className="text-[10px] uppercase font-medium tracking-widest text-muted-foreground -mt-1">
              Turf OS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a
            href="#features"
            className="hover:text-emerald-500 transition-colors"
          >
            Features
          </a>
          <a
            href="#solutions"
            className="hover:text-emerald-500 transition-colors"
          >
            Why Turvo
          </a>
          <a
            href="#pitch-preview"
            className="hover:text-emerald-500 transition-colors"
          >
            Turf Demo
          </a>
          <a
            href="#pricing"
            className="hover:text-emerald-500 transition-colors"
          >
            Pricing
          </a>
          <a href="#faq" className="hover:text-emerald-500 transition-colors">
            FAQ
          </a>
        </nav>

        {/* CTA & User Status */}
        <div className="hidden md:flex items-center gap-3">
          {!isLoading && isAuthenticated ? (
            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
            >
              <Link href="/dashboard" id="btn-header-dashboard">
                <ShieldCheck className="mr-2 h-4 w-4" /> Go to Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
              >
                <Link href="/login?register=true" id="btn-header-signup">
                  Start Free Trial <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Toggle navigation menu"
          id="btn-mobile-menu-toggle"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/50 bg-background/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-3 text-sm font-medium">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground"
            >
              Features
            </a>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground"
            >
              Why Turvo
            </a>
            <a
              href="#pitch-preview"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground"
            >
              Turf Demo
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-muted text-foreground"
            >
              FAQ
            </a>
          </nav>
          <div className="pt-2 flex flex-col gap-2">
            {!isLoading && isAuthenticated ? (
              <Button
                asChild
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Link href="/login?register=true">Start Free Trial</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
