import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-cream/80 backdrop-blur-md border-b border-cream-2 px-6">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-pale text-forest-deep transition-colors group-hover:bg-forest-deep group-hover:text-white">
            <HugeiconsIcon icon={Calendar01Icon} className="w-5 h-5" />
          </div>
          <span className="font-heading text-slate-dark text-xl">Appointly</span>
        </Link>
        
        <nav className="hidden md:flex gap-8">
          <Link href="#features" className="text-sm font-medium text-slate-mid hover:text-forest-deep transition-colors">Features</Link>
          <Link href="#how-it-works" className="text-sm font-medium text-slate-mid hover:text-forest-deep transition-colors">How it Works</Link>
          <Link href="#testimonials" className="text-sm font-medium text-slate-mid hover:text-forest-deep transition-colors">Testimonials</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-forest-deep hover:text-forest-light hidden sm:block">
            Sign In
          </Link>
          <Button render={<Link href="/signup" />} className="bg-forest-deep hover:bg-forest-mid text-white rounded-full px-5">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
