import Link from "next/link";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function Footer() {
  return (
    <footer className="bg-slate-dark pt-16 pb-8 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-white/10">
          <div className="col-span-2 lg:col-span-1 pr-4">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest-pale/10 text-white transition-colors group-hover:bg-white group-hover:text-forest-deep">
                <HugeiconsIcon icon={Calendar01Icon} className="w-4 h-4" />
              </div>
              <span className="font-heading text-white text-xl">Appointly</span>
            </Link>
            <p className="text-white/40 text-sm mt-2 max-w-xs leading-relaxed">
              Scheduling, beautifully simplified.
            </p>
            <div className="flex gap-4 mt-6">
              <Link href="#" className="text-white/30 hover:text-white transition-colors text-sm font-medium">Twitter/X</Link>
              <Link href="#" className="text-white/30 hover:text-white transition-colors text-sm font-medium">LinkedIn</Link>
              <Link href="#" className="text-white/30 hover:text-white transition-colors text-sm font-medium">GitHub</Link>
            </div>
          </div>
          
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Product</h4>
            <div className="space-y-3">
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Features</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Integrations</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Pricing</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Changelog</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Company</h4>
            <div className="space-y-3">
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">About Us</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Careers</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Blog</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">Legal</h4>
            <div className="space-y-3">
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Privacy Policy</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Terms of Service</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Cookie Policy</Link>
              <Link href="#" className="text-white/40 hover:text-white/80 text-sm transition-colors block">Security</Link>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8">
          <p className="text-white/25 text-sm">
            © 2026 Appointly. Built for the Odoo Hackathon.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-white/25 hover:text-white/60 text-sm transition-colors">Privacy</Link>
            <span className="text-white/10">·</span>
            <Link href="#" className="text-white/25 hover:text-white/60 text-sm transition-colors">Terms</Link>
            <span className="text-white/10">·</span>
            <Link href="#" className="text-white/25 hover:text-white/60 text-sm transition-colors">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
