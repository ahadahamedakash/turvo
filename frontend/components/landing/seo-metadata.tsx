import React from "react";

export function SeoStructuredData() {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Turvo - Turf & Sports Facility Booking SaaS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BDT",
      lowPrice: "29",
      highPrice: "199",
      offerCount: "3",
    },
    description:
      "All-in-one SaaS platform for football turf owners and sports venue operators. Automate slot bookings, track unlimited members, send instant email & SMS notifications, and eliminate double bookings.",
    featureList: [
      "Real-Time Slot Calendar Booking",
      "Unlimited Member Management",
      "Automated Email & SMS Booking Notifications",
      "Multi-Turf Facility Control",
      "Online Deposit & Payment Collection",
      "Live Revenue & Occupancy Analytics",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}
