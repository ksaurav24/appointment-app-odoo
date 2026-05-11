import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Separator } from "@/components/ui/separator";

const TESTIMONIALS = [
  {
    quote: "Appointly cut our no-shows by 40%. Our front desk saves 3 hours every day — we don't touch the schedule anymore.",
    name: "Rohan M.",
    role: "Clinic Manager, HealthFirst",
    initials: "RM"
  },
  {
    quote: "Setup took 20 minutes. Our turf is 90% booked every weekend. The slot-lock feature is genius.",
    name: "Sneha T.",
    role: "Owner, PowerPlay Turf",
    initials: "ST"
  },
  {
    quote: "My therapy clients love the instant confirmation. No confusion, no missed appointments. It just works.",
    name: "Adit K.",
    role: "Independent Therapist",
    initials: "AK"
  }
];

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-cream py-20 px-6">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-heading text-4xl text-center text-slate-dark">
          Businesses that run on Appointly
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white border border-cream-2 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <HugeiconsIcon icon={StarIcon} key={s} className="w-4 h-4 fill-amber text-amber" />
                ))}
              </div>
              <p className="font-body italic text-slate-dark leading-relaxed text-sm mt-3">
                "{t.quote}"
              </p>
              <Separator className="bg-cream-2 my-4" />
              <div className="flex items-center gap-3">
                <div className="bg-forest-pale text-forest-deep font-semibold rounded-full w-9 h-9 text-sm flex items-center justify-center shrink-0">
                  {t.initials}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-dark text-sm">{t.name}</h4>
                  <p className="text-slate-light text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
