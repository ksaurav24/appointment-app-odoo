import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section className="bg-amber-pale border-y border-amber/20 py-24 px-6 text-center">
      <div className="mx-auto max-w-2xl">
        <p className="text-amber-deep text-xs font-semibold uppercase tracking-widest mb-3">
          Get started today
        </p>
        <h2 className="font-heading text-4xl lg:text-5xl text-slate-dark mb-4">
          Ready to fill your calendar?
        </h2>
        <p className="text-slate-mid max-w-md mx-auto mb-6 leading-relaxed font-body">
          Join thousands of professionals who have eliminated no-shows and simplified their booking process.
        </p>
        
        <Button render={<Link href="/signup" />} className="bg-forest-deep hover:bg-forest-mid text-white rounded-full px-12 py-6 text-base font-semibold shadow-lg shadow-forest-deep/20 mt-2">
          Get Started Free →
        </Button>
        
        <div className="flex gap-3 justify-center flex-wrap mt-8">
          <div className="bg-white border border-cream-2 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-mid shadow-sm">
            ✓ No credit card
          </div>
          <div className="bg-white border border-cream-2 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-mid shadow-sm">
            ✓ Free forever plan
          </div>
          <div className="bg-white border border-cream-2 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-mid shadow-sm">
            ✓ Setup in 20 min
          </div>
        </div>
      </div>
    </section>
  );
}
