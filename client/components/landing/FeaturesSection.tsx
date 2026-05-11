"use client";

import { useEffect, useRef, useState } from "react";
import { 
  Calendar01Icon, 
  CheckmarkCircle02Icon as CheckmarkCircle01Icon, 
  LockPasswordIcon, 
  CreditCardIcon, 
  Notification01Icon, 
  UserGroupIcon 
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const FEATURES = [
  {
    icon: Calendar01Icon,
    iconColor: "text-forest-light",
    bgClass: "bg-forest-pale",
    title: "Real-time availability",
    body: "See open slots the moment they're added. No double-bookings, no back-and-forth."
  },
  {
    icon: CheckmarkCircle01Icon,
    iconColor: "text-amber",
    bgClass: "bg-amber-pale",
    title: "Instant confirmation",
    body: "Confirmation code + calendar invite fires the second a booking is locked in."
  },
  {
    icon: LockPasswordIcon,
    iconColor: "text-coral",
    bgClass: "bg-coral-pale",
    title: "Slot lock tech",
    body: "A 5-min exclusive hold prevents race conditions. Your slot is yours the moment you pick it."
  },
  {
    icon: CreditCardIcon,
    iconColor: "text-forest-light",
    bgClass: "bg-forest-pale",
    title: "Advance payments",
    body: "Collect Razorpay payments upfront. Automated refunds on cancellation — zero manual work."
  },
  {
    icon: Notification01Icon,
    iconColor: "text-amber",
    bgClass: "bg-amber-pale",
    title: "Smart notifications",
    body: "Configurable email reminders for customers, organisers, and staff at every lifecycle event."
  },
  {
    icon: UserGroupIcon,
    iconColor: "text-forest-light",
    bgClass: "bg-forest-pale",
    title: "Multi-staff support",
    body: "Assign bookings to specific staff members or let AUTO mode pick based on availability."
  }
];

export function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="bg-white py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-forest-light font-semibold uppercase tracking-widest text-xs mb-3">Features</p>
          <h2 className="font-heading text-4xl text-slate-dark text-center">
            Everything you need to fill your calendar
          </h2>
          <p className="text-slate-mid text-center max-w-xl mx-auto mt-4 leading-relaxed font-body">
            Appointly provides all the tools you need to manage your business efficiently and give your clients a premium booking experience.
          </p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`group bg-white border border-cream-2 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 hover:border-forest-pale transition-all duration-300 cursor-default ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.bgClass}`}>
                <HugeiconsIcon icon={f.icon} className={`w-6 h-6 ${f.iconColor}`} />
              </div>
              <h3 className="font-body font-semibold text-slate-dark text-base mb-2 group-hover:text-forest-deep transition-colors">
                {f.title}
              </h3>
              <p className="text-slate-mid text-sm leading-relaxed">
                {f.body}
              </p>
              <div className="text-forest-light text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity mt-4 flex items-center gap-1">
                Learn more <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
