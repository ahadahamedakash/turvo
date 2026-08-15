import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Before Turvo, we were losing around 15-20 prime weekend slots every month due to WhatsApp double bookings and unconfirmed cash deposits. Turvo eliminated double bookings entirely and automated our slot reminders!",
      name: "Tariq Rahman",
      title: "Owner, Green Field Sports Arena",
      location: "Dhaka",
      rating: 5,
    },
    {
      quote:
        "The automated email notification service and unlimited members directory changed how we run our 7-a-side grounds. Players get instant receipts and our slot occupancy jumped from 65% to 94% within 30 days.",
      name: "Samiul Alam",
      title: "Operations Head, Champions Turf Complex",
      location: "Chittagong",
      rating: 5,
    },
    {
      quote:
        "As a multi-turf owner with 4 pitches, Turvo's superadmin dashboard lets me see real-time revenue and lighting usage across all locations from my phone. Absolutely indispensable software.",
      name: "Fahim Ahmed",
      title: "Founder, Apex Football Arenas",
      location: "Sylhet",
      rating: 5,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
          >
            Trusted by Turf Pioneers
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Loved by Turf Owners & Sports Complex Managers
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            See how arena leaders rely on Turvo to power daily slot bookings,
            player communication, and revenue growth.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-border/60 bg-card hover:border-emerald-500/40 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-6 leading-relaxed">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border/40">
                <div className="h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-sm">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.title} • {item.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
