"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LockPasswordIcon, StethoscopeIcon, MedicalFileIcon as ToothIcon, Activity01Icon as SoccerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function BookingShowcase() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [date, setDate] = useState(2);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (step === 4) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const resetAll = () => {
    setStep(1);
    setService(null);
    setTime(null);
    setDuration(60);
  };

  const getServiceData = () => {
    if (service === 1) return { name: "General Consultation", provider: "Dr. Anika Mehta", price: "₹500" };
    if (service === 2) return { name: "Dental Checkup", provider: "Dr. Rohan Patel", price: "₹800" };
    if (service === 3) return { name: "Turf Rental – Court A", provider: "PowerPlay Sports", price: "₹600/hr" };
    return { name: "", provider: "", price: "" };
  };

  return (
    <section className="bg-forest-deep py-24 px-4 overflow-hidden relative">
      <div className="mx-auto max-w-4xl text-center mb-12">
        <p className="text-forest-pale/50 text-xs uppercase tracking-widest font-semibold mb-3">See it in action</p>
        <h2 className="font-heading text-4xl lg:text-5xl text-white">
          From discovery to confirmed — in 60 seconds.
        </h2>
        <p className="text-white/50 max-w-lg mx-auto mt-4 text-sm leading-relaxed">
          Experience the exact booking flow your customers will see. No page reloads, real-time slots, and frictionless checkout.
        </p>
      </div>

      <div className="max-w-[680px] mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 min-h-[500px] flex flex-col">
        {/* Progress Header */}
        <div className="border-b border-cream-2 px-6 py-5 flex items-center justify-between">
          {[1, 2, 3, 4].map((s, i) => {
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-8 h-8 rounded-full text-sm font-semibold flex items-center justify-center transition-colors ${
                    isActive ? 'bg-amber text-white shadow-md shadow-amber/30' : 
                    isDone ? 'bg-forest-deep text-white' : 'bg-slate-pale text-slate-light'
                  }`}>
                    {isDone ? '✓' : s}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider mt-2 absolute top-full whitespace-nowrap ${
                    isActive ? 'text-slate-dark' : isDone ? 'text-forest-deep' : 'text-slate-light'
                  }`}>
                    {s === 1 ? 'Service' : s === 2 ? 'Time' : s === 3 ? 'Details' : 'Done'}
                  </span>
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-0.5 mx-3 transition-colors ${isDone ? 'bg-forest-deep' : 'bg-cream-2'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex-1 bg-white relative">
          {/* Step 1 */}
          {step === 1 && (
            <div key={1} className="animate-in fade-in-0 slide-in-from-right-4 duration-300">
              <div className="px-6 py-8">
                <h3 className="font-heading text-2xl text-slate-dark mb-5">Select a service</h3>
                <div className="space-y-3">
                  {[
                    { id: 1, icon: StethoscopeIcon, name: "General Consultation", provider: "Dr. Anika Mehta", dur: "30 min", price: "₹500" },
                    { id: 2, icon: ToothIcon, name: "Dental Checkup", provider: "Dr. Rohan Patel", dur: "45 min", price: "₹800" },
                    { id: 3, icon: SoccerIcon, name: "Turf Rental – Court A", provider: "PowerPlay Sports", dur: "Variable", price: "₹600/hr" },
                  ].map((s) => {
                    const isSelected = service === s.id;
                    return (
                      <div 
                        key={s.id} 
                        onClick={() => setService(s.id)}
                        className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-center gap-4 ${
                          isSelected ? 'border-forest-deep bg-forest-pale/50 shadow-sm border-2' : 'border-cream-2 hover:border-forest-light hover:bg-forest-pale/40'
                        }`}
                      >
                        <div className="bg-white border border-cream-2 rounded-xl p-2.5 w-12 h-12 flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={s.icon} className={`w-6 h-6 ${isSelected ? 'text-forest-deep' : 'text-slate-mid'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-dark text-sm">{s.name}</h4>
                          <p className="text-slate-light text-xs">{s.provider}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-semibold text-forest-deep text-sm">{s.price}</span>
                          <span className="bg-amber-pale text-amber-deep text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5">{s.dur}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="border-t border-cream-2 px-6 py-4 mt-auto absolute bottom-0 w-full bg-white">
                <Button 
                  disabled={service === null} 
                  onClick={() => setStep(2)} 
                  className="w-full bg-amber hover:bg-amber-deep text-white rounded-xl h-12 font-semibold shadow-md shadow-amber/20 transition-all disabled:opacity-40 disabled:shadow-none"
                >
                  Next: Pick a Time →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div key={2} className="animate-in fade-in-0 slide-in-from-right-4 duration-300 flex flex-col h-full">
              <div className="px-6 py-6 pb-24">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-dark text-sm">Select a date</h3>
                  <div className="bg-coral-pale text-coral text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-coral rounded-full animate-pulse" /> 3 slots left today
                  </div>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => {
                    const isActive = i === 2;
                    return (
                      <div key={day} className={`snap-start flex flex-col items-center min-w-[50px] rounded-xl py-2 px-1 cursor-pointer transition-all ${isActive ? 'bg-forest-deep text-white shadow-md' : 'hover:bg-forest-pale text-slate-dark'}`}>
                        <span className={`text-[10px] font-semibold mb-1 ${isActive ? 'text-white/80' : 'text-slate-light'}`}>{day}</span>
                        <span className="text-sm font-semibold">{12 + i}</span>
                        {i === 2 && <div className="w-1 h-1 bg-amber rounded-full mt-1" />}
                      </div>
                    );
                  })}
                </div>

                <h3 className="font-semibold text-slate-dark text-sm mt-6 mb-3">Available times</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM'].map((t, i) => {
                    const isSelected = time === t;
                    const isFull = i === 2 || i === 5;
                    return (
                      <div 
                        key={t}
                        onClick={() => !isFull && setTime(t)}
                        className={`rounded-xl border py-2.5 text-[13px] font-medium text-center transition-all ${
                          isSelected ? 'bg-forest-deep text-white border-forest-deep shadow-md' :
                          isFull ? 'bg-slate-pale text-slate-light border-transparent cursor-not-allowed line-through text-xs' :
                          'border-cream-2 text-slate-dark hover:border-forest-light hover:bg-forest-pale cursor-pointer'
                        }`}
                      >
                        {t}
                      </div>
                    )
                  })}
                </div>

                {service === 3 && (
                  <div className="mt-6 animate-in slide-in-from-top-2 duration-300">
                    <h3 className="font-semibold text-slate-dark text-sm mb-3">Select duration</h3>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { val: 60, label: '1 hr', price: '₹600' },
                        { val: 90, label: '1.5 hr', price: '₹900' },
                        { val: 120, label: '2 hr', price: '₹1,200' },
                      ].map((d) => (
                        <div 
                          key={d.val}
                          onClick={() => setDuration(d.val)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                            duration === d.val ? 'bg-forest-deep text-white shadow-sm' : 'bg-slate-pale text-slate-mid hover:bg-cream-2'
                          }`}
                        >
                          {d.label} · {d.price}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {time && (
                  <div className="bg-amber-pale border border-amber/20 rounded-xl p-3 mt-6 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 text-amber-deep">
                      <HugeiconsIcon icon={LockPasswordIcon} className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">Your slot is held for 5:00</span>
                    </div>
                    <div className="h-1.5 bg-amber/20 rounded-full mt-2 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-amber rounded-full animate-[drain_300s_linear_forwards]" style={{ width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-cream-2 px-6 py-4 mt-auto absolute bottom-0 w-full bg-white flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-mid">Back</Button>
                <Button 
                  disabled={time === null} 
                  onClick={() => setStep(3)} 
                  className="flex-1 bg-amber hover:bg-amber-deep text-white rounded-xl h-12 font-semibold shadow-md shadow-amber/20 transition-all disabled:opacity-40 disabled:shadow-none"
                >
                  Next: Your Details →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div key={3} className="animate-in fade-in-0 slide-in-from-right-4 duration-300 flex flex-col h-full">
              <div className="px-6 py-6 pb-24">
                {/* Minified lock bar */}
                <div className="bg-amber-pale rounded-lg px-3 py-1.5 flex items-center justify-between text-amber-deep mb-6">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={LockPasswordIcon} className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Slot locked</span>
                  </div>
                  <span className="text-xs font-bold font-mono">4:32</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-3 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-dark block mb-1.5 uppercase tracking-wider">Full name</label>
                      <input type="text" placeholder="Jane Doe" className="bg-slate-pale/50 border border-cream-2 rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-forest-light/30 font-body text-slate-dark placeholder:text-slate-light" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-dark block mb-1.5 uppercase tracking-wider">Phone number</label>
                      <input type="tel" placeholder="+91 98765 43210" className="bg-slate-pale/50 border border-cream-2 rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-forest-light/30 font-body text-slate-dark placeholder:text-slate-light" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-dark block mb-1.5 uppercase tracking-wider">Notes (optional)</label>
                      <textarea rows={2} placeholder="Any special requests?" className="bg-slate-pale/50 border border-cream-2 rounded-xl px-4 py-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-forest-light/30 font-body text-slate-dark placeholder:text-slate-light resize-none" />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="bg-forest-pale rounded-2xl p-5 border border-forest-light/10">
                      <h4 className="font-bold text-forest-deep text-xs uppercase tracking-wider mb-4">Your booking</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-mid">Service</span>
                          <span className="font-semibold text-slate-dark text-right max-w-[120px] truncate">{getServiceData().name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-mid">When</span>
                          <span className="font-semibold text-slate-dark text-right">Wed 14, {time}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-mid">Provider</span>
                          <span className="font-semibold text-slate-dark text-right truncate max-w-[100px]">{getServiceData().provider}</span>
                        </div>
                        <Separator className="bg-forest-light/20 my-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-mid">Total</span>
                          <span className="font-semibold text-slate-dark">{getServiceData().price}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-mid">Advance</span>
                          <span className="font-semibold text-amber-deep">50%</span>
                        </div>
                        <Separator className="bg-forest-deep/10 my-2" />
                        <div className="flex justify-between text-base">
                          <span className="font-bold text-forest-deep">Due now</span>
                          <span className="font-bold text-forest-deep">₹{service === 1 ? '250' : service === 2 ? '400' : '300'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-cream-2 px-6 py-4 mt-auto absolute bottom-0 w-full bg-white flex gap-3">
                <Button variant="ghost" onClick={() => setStep(2)} className="text-slate-mid">Back</Button>
                <Button 
                  onClick={() => setStep(4)} 
                  className="flex-1 bg-amber hover:bg-amber-deep text-white rounded-xl h-12 font-semibold shadow-md shadow-amber/20 transition-all"
                >
                  Confirm & Pay ₹{service === 1 ? '250' : service === 2 ? '400' : '300'} →
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div key={4} className="animate-in fade-in-0 zoom-in-95 duration-500 flex flex-col h-full items-center justify-center p-10 text-center relative">
              {showConfetti && Array.from({ length: 40 }).map((_, i) => (
                <div 
                  key={i} 
                  className="fixed w-3 h-3 rounded-sm z-50 pointer-events-none"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-10px',
                    backgroundColor: ['#1A3C34', '#E8A020', '#E85D3A', '#4A8573'][Math.floor(Math.random() * 4)],
                    animation: `confettiFall ${2 + Math.random() * 2}s linear forwards`,
                    animationDelay: `${Math.random() * 0.5}s`
                  }}
                />
              ))}

              <svg viewBox="0 0 80 80" className="w-24 h-24 mx-auto mb-6">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#E8F2EE" strokeWidth="6" />
                <circle 
                  cx="40" cy="40" r="36" fill="none" stroke="#1A3C34" strokeWidth="6" 
                  strokeDasharray="226" strokeDashoffset="226" 
                  strokeLinecap="round"
                  className="animate-[drawCircle_0.6s_ease-out_forwards]"
                  transform="rotate(-90 40 40)"
                />
                <path 
                  d="M25 40 L35 50 L55 30" fill="none" stroke="#E8A020" strokeWidth="6" 
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="50" strokeDashoffset="50"
                  className="animate-[drawCheck_0.4s_ease-out_0.4s_forwards]"
                />
              </svg>

              <h3 className="font-heading text-4xl text-slate-dark mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">Booking Confirmed!</h3>
              <p className="text-slate-mid text-sm mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">We've sent a calendar invite and receipt to your email.</p>
              
              <div className="bg-forest-pale text-forest-deep px-6 py-3 rounded-xl border border-forest-light/20 mb-8 inline-block animate-in zoom-in-95 duration-500 delay-500 fill-mode-both">
                <span className="text-[10px] font-bold uppercase tracking-widest block text-forest-light mb-1">Confirmation Code</span>
                <span className="font-mono text-lg font-bold tracking-[0.1em]">CC-A7X9K2M</span>
              </div>

              <div className="flex gap-3 justify-center mb-8 w-full max-w-sm animate-in slide-in-from-bottom-4 duration-500 delay-700 fill-mode-both">
                <Button variant="outline" className="flex-1 rounded-full border-forest-deep text-forest-deep hover:bg-forest-pale">Add to Calendar</Button>
                <Button className="flex-1 rounded-full bg-forest-deep text-white hover:bg-forest-mid">View Details</Button>
              </div>

              <button onClick={resetAll} className="text-slate-light hover:text-slate-dark text-xs font-semibold uppercase tracking-wider transition-colors animate-in fade-in duration-500 delay-1000 fill-mode-both">
                Start over ↺
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes drawCircle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}} />
    </section>
  );
}
