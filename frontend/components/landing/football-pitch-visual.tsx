"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Calendar, Clock, MapPin, Check, Zap } from "lucide-react";

export function FootballPitchVisual() {
  const [isNightMode, setIsNightMode] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("08:00 PM - 09:00 PM");

  const slots = [
    { time: "05:00 PM - 06:00 PM", status: "booked", price: "$40" },
    { time: "06:00 PM - 07:00 PM", status: "booked", price: "$45" },
    { time: "07:00 PM - 08:00 PM", status: "booked", price: "$50" },
    { time: "08:00 PM - 09:00 PM", status: "available", price: "$50" },
    { time: "09:00 PM - 10:00 PM", status: "available", price: "$45" },
  ];

  return (
    <section id="pitch-preview" className="py-16 md:py-24 bg-muted/30 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
          >
            Interactive Field Simulator
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Experience the Turvo Ground Command Center
          </h2>
          <p className="mt-3 text-muted-foreground">
            Visualize your turf grounds, manage floodlight schedules, and
            inspect live slot availability with a single glance.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
          {/* Football Field Visual */}
          <div className="lg:col-span-7 relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Pitch #1 -
                Champions Turf (7-a-side Synthetic Grass)
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNightMode(!isNightMode)}
                className="h-8 text-xs gap-1.5 border-border/60"
              >
                {isNightMode ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" /> Day Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-indigo-400" /> Floodlight
                    Night
                  </>
                )}
              </Button>
            </div>

            {/* Stadium Pitch graphic */}
            <div
              className={`relative aspect-16/10 w-full rounded-2xl border-4 border-emerald-700/40 overflow-hidden transition-all duration-500 shadow-2xl ${
                isNightMode
                  ? "bg-linear-to-b from-emerald-950 via-emerald-900 to-emerald-950 shadow-emerald-950/50 ring-2 ring-emerald-500/30"
                  : "bg-linear-to-b from-emerald-700 via-emerald-600 to-emerald-700"
              }`}
            >
              {/* Stadium Floodlight Glows */}
              {isNightMode && (
                <>
                  <div className="absolute top-2 left-4 w-12 h-12 bg-amber-200/40 rounded-full blur-lg animate-pulse" />
                  <div className="absolute top-2 right-4 w-12 h-12 bg-amber-200/40 rounded-full blur-lg animate-pulse" />
                  <div className="absolute bottom-2 left-4 w-12 h-12 bg-amber-200/40 rounded-full blur-lg animate-pulse" />
                  <div className="absolute bottom-2 right-4 w-12 h-12 bg-amber-200/40 rounded-full blur-lg animate-pulse" />
                </>
              )}

              {/* Pitch Markings */}
              <div className="absolute inset-4 border-2 border-white/40 rounded-lg flex items-center justify-center">
                {/* Center Circle & Line */}
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/40" />
                <div className="h-28 w-28 rounded-full border-2 border-white/40 flex items-center justify-center">
                  <div className="h-2 w-2 bg-white/70 rounded-full" />
                </div>

                {/* Left Goal Area */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-32 border-r-2 border-y-2 border-white/40" />
                {/* Right Goal Area */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-32 border-l-2 border-y-2 border-white/40" />
              </div>

              {/* Live Overlay Badge */}
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/50 text-xs font-semibold flex items-center gap-2 shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-foreground">
                  Floodlights: {isNightMode ? "ACTIVE (LED 500W)" : "STANDBY"}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Booking Slot Widget */}
          <div className="lg:col-span-5 bg-card border border-border/60 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-foreground">
                  Live Booking Slots
                </h3>
              </div>
              <Badge
                variant="secondary"
                className="text-[11px] bg-emerald-500/10 text-emerald-500"
              >
                Today&apos;s Schedule
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Select a slot to see how Turvo automates instant booking
              confirmations and email receipts.
            </p>

            <div className="space-y-2.5">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={slot.status === "booked"}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                    slot.status === "booked"
                      ? "bg-muted/40 border-border/30 opacity-60 cursor-not-allowed text-muted-foreground"
                      : selectedSlot === slot.time
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold ring-1 ring-emerald-500"
                        : "bg-background border-border/60 hover:border-emerald-500/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span>{slot.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{slot.price}</span>
                    {slot.status === "booked" ? (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">
                        Booked
                      </span>
                    ) : selectedSlot === slot.time ? (
                      <span className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[10px] flex items-center gap-1">
                        <Check className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[10px]">
                        Available
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Instant email receipt & SMS booking voucher triggered
                automatically upon booking.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
