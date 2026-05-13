"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockPasswordIcon, StarIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/browse');
    }
  };

  return (
    <section className="relative overflow-hidden bg-cream px-6 py-20 lg:py-28 min-h-[90vh] flex items-center">
      {/* Background Blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] -translate-y-1/4 translate-x-1/4 rounded-full bg-forest-pale opacity-40 blur-[80px]"
      />

      <div className="mx-auto max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column (55%) */}
        <div className="lg:col-span-7 space-y-8 max-w-2xl">
          <Badge className="bg-forest-pale text-forest-light border-0 font-semibold text-xs tracking-widest uppercase px-4 py-1.5 rounded-full">
            ✦ Hassle-free booking starts here
          </Badge>
          
          <h1 className="font-heading text-[52px] lg:text-[64px] leading-[1.1] text-slate-dark">
            Book smarter.<br />
            <span className="relative inline-block mt-2">
              <em className="italic text-forest-deep relative z-10">Grow faster.</em>
              {/* Hand-drawn underline simulation */}
              <svg className="absolute w-full h-4 -bottom-1 left-0 z-0 text-amber animate-in slide-in-from-left-8 duration-700 delay-300" viewBox="0 0 200 12" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path d="M2 9C60 2 140 2 198 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-slate-mid text-lg font-body max-w-md leading-relaxed">
            The all-in-one scheduling platform for clinics, salons, tutors, and venues. Real-time slots. Zero double-bookings. Payments built in.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 pt-2 max-w-lg w-full">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <HugeiconsIcon icon={Search01Icon} className="w-5 h-5 text-slate-light" />
              </div>
              <input
                type="text"
                placeholder="Search by service, provider, or category..."
                className="w-full pl-11 pr-4 py-4 rounded-full border border-slate-dark/10 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-light focus:border-transparent text-slate-dark transition-all placeholder:text-slate-light"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto bg-amber hover:bg-amber-deep text-white rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-amber/20 shrink-0">
              Search
            </Button>
          </form>
          
          <div className="flex gap-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => router.push('/browse')} 
              className="rounded-full px-8 py-6 text-base font-semibold border-forest-deep text-forest-deep hover:bg-forest-pale"
            >
              Browse All Services
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <HugeiconsIcon icon={StarIcon} key={s} className="w-4 h-4 fill-amber text-amber" />
              ))}
            </div>
            <span className="text-slate-light text-sm font-medium">
              4.9 · 800+ reviews · No credit card
            </span>
          </div>
        </div>

        {/* Right Column (45%) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="bg-white rounded-2xl shadow-2xl shadow-slate-dark/10 p-5 w-full max-w-[360px] relative animate-[float_4s_ease-in-out_infinite]">
            
            {/* Top row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-forest-pale text-forest-deep text-sm font-semibold w-9 h-9 rounded-full flex items-center justify-center shrink-0">
                AM
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-dark text-sm truncate">Dr. Anika Mehta</h3>
                <p className="text-slate-light text-xs truncate">General Consultation</p>
              </div>
              <div className="bg-amber-pale text-amber-deep text-xs rounded-full px-2 py-0.5 font-semibold shrink-0">
                30 min
              </div>
            </div>

            {/* Date strip */}
            <div className="flex gap-1.5 overflow-hidden mb-5">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => {
                const isActive = i === 2;
                return (
                  <div key={day} className={`flex flex-col items-center flex-1 rounded-xl px-1 py-2 cursor-pointer transition-colors ${isActive ? 'bg-forest-deep text-white shadow-sm' : 'hover:bg-slate-pale text-slate-dark'}`}>
                    <span className={`text-[10px] font-semibold mb-1 ${isActive ? 'text-white/80' : 'text-slate-light'}`}>{day}</span>
                    <span className="text-sm font-semibold">{12 + i}</span>
                    {i === 2 && <div className="w-1 h-1 bg-amber rounded-full mt-1" />}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-3 gap-2">
              {['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'].map((time, i) => {
                const isSelected = i === 3;
                const isUnavailable = i === 2 || i === 5;
                return (
                  <div key={time} className={`rounded-xl border py-2.5 text-[13px] font-medium text-center transition-all ${
                    isSelected ? 'bg-forest-deep text-white border-forest-deep shadow-md' :
                    isUnavailable ? 'bg-slate-pale text-slate-light line-through border-transparent cursor-not-allowed text-xs' :
                    'border-cream-2 text-slate-dark hover:border-forest-light hover:bg-forest-pale cursor-pointer'
                  }`}>
                    {time}
                  </div>
                );
              })}
            </div>

            {/* Slot lock bar */}
            <div className="bg-amber-pale rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-semibold text-amber-deep mt-4 relative overflow-hidden">
              <HugeiconsIcon icon={LockPasswordIcon} className="w-3.5 h-3.5 z-10" />
              <span className="z-10">Slot held · 4:59</span>
              {/* Progress bar simulation */}
              <div className="absolute inset-y-0 left-0 bg-amber/20 z-0 animate-[drain_5s_linear_infinite]" style={{ width: '100%' }} />
            </div>

            {/* CTA */}
            <Button className="w-full bg-amber hover:bg-amber-deep text-white rounded-xl h-11 font-semibold mt-3 shadow-md shadow-amber/20">
              Confirm Booking
            </Button>

            {/* Floating badges */}
            <div className="absolute -top-3 -right-3 bg-forest-pale text-forest-deep text-xs font-semibold rounded-full px-3 py-1.5 shadow-md border border-white">
              ✓ Instant Confirmation
            </div>
            <div className="absolute -bottom-3 -left-3 bg-white border border-cream-2 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-coral flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              Live · 3 slots left
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes drain {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}} />
    </section>
  );
}
