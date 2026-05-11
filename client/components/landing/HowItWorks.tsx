import { Button } from "@/components/ui/button";
import { Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="font-heading text-4xl text-slate-dark text-center">
            Go live in 3 steps
          </h2>
          <p className="text-slate-mid text-center max-w-xl mx-auto mt-4 font-body leading-relaxed">
            Setup is incredibly fast. You can start accepting bookings the same day you sign up.
          </p>
        </div>

        <div className="space-y-4">
          {/* Row 1 */}
          <div className="flex flex-col lg:flex-row items-center gap-12 py-16">
            <div className="flex-1 space-y-5">
              <div className="bg-forest-pale text-forest-light text-xs font-semibold rounded-full px-3 py-1 inline-block">
                Step 01
              </div>
              <h3 className="font-heading text-3xl text-slate-dark">Set up your service</h3>
              <p className="text-slate-mid leading-relaxed max-w-md">
                Define your service, set your duration, capacity, and schedule. It takes less than 2 minutes to get your first service ready.
              </p>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="bg-white rounded-2xl shadow-lg border border-cream-2 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-dark block mb-1.5">Service Name</label>
                    <div className="bg-slate-pale rounded-lg px-4 py-2.5 text-slate-dark text-sm border border-transparent">
                      General Consultation
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-dark block mb-1.5">Duration</label>
                    <div className="flex gap-2">
                      <div className="bg-forest-deep text-white rounded-full px-4 py-1.5 text-sm font-semibold">30 min</div>
                      <div className="bg-slate-pale text-slate-mid rounded-full px-4 py-1.5 text-sm font-semibold">45 min</div>
                      <div className="bg-slate-pale text-slate-mid rounded-full px-4 py-1.5 text-sm font-semibold">60 min</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-dark block mb-1.5">Max per slot</label>
                      <div className="bg-slate-pale rounded-lg px-4 py-2.5 text-slate-dark text-sm text-center font-semibold">
                        3
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-dark block mb-1.5">Schedule</label>
                    <div className="flex gap-2">
                      {['M','T','W','T','F'].map((d,i) => (
                        <div key={i} className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${i < 4 ? 'bg-forest-deep text-white' : 'bg-slate-pale text-slate-mid'}`}>{d}</div>
                      ))}
                    </div>
                  </div>
                  <Button className="bg-amber hover:bg-amber-deep text-white rounded-lg w-full mt-2 h-11 font-semibold">Save & Publish</Button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 py-16">
            <div className="flex-1 space-y-5">
              <div className="bg-forest-pale text-forest-light text-xs font-semibold rounded-full px-3 py-1 inline-block">
                Step 02
              </div>
              <h3 className="font-heading text-3xl text-slate-dark">Share your booking link</h3>
              <p className="text-slate-mid leading-relaxed max-w-md">
                Put your link on Instagram, WhatsApp, or embed it on your website. Customers book directly with no friction.
              </p>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none flex flex-col items-center">
              <div className="bg-white rounded-2xl shadow-lg border border-cream-2 p-8 w-full max-w-sm flex flex-col items-center">
                <div className="w-full bg-forest-pale rounded-xl px-4 py-3 flex items-center gap-3">
                  <HugeiconsIcon icon={Link01Icon} className="w-4 h-4 text-forest-deep" />
                  <span className="font-mono text-forest-deep text-sm truncate">appointly.in/b/healthfirst</span>
                  <Button size="sm" variant="outline" className="ml-auto text-xs rounded-full h-7 px-3 bg-white">Copy</Button>
                </div>
                
                {/* Fake QR code */}
                <div className="w-32 h-32 mx-auto mt-8 grid grid-cols-5 grid-rows-5 gap-1 p-2 border border-cream-2 rounded-xl">
                  {Array.from({length: 25}).map((_, i) => (
                    <div key={i} className={`rounded-sm ${(i%2===0 || i%3===0 || i===12) ? 'bg-forest-deep' : 'bg-transparent'}`} />
                  ))}
                </div>
                
                <div className="flex gap-2 mt-8">
                  <div className="bg-[#25D366]/10 text-[#25D366] text-xs font-semibold rounded-full px-3 py-1.5">WhatsApp</div>
                  <div className="bg-forest-pale text-forest-deep text-xs font-semibold rounded-full px-3 py-1.5">Email</div>
                  <div className="bg-amber-pale text-amber-deep text-xs font-semibold rounded-full px-3 py-1.5">Embed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="flex flex-col lg:flex-row items-center gap-12 py-16">
            <div className="flex-1 space-y-5">
              <div className="bg-forest-pale text-forest-light text-xs font-semibold rounded-full px-3 py-1 inline-block">
                Step 03
              </div>
              <h3 className="font-heading text-3xl text-slate-dark">Manage everything</h3>
              <p className="text-slate-mid leading-relaxed max-w-md">
                Monitor incoming bookings, track revenue, and manage your team from one powerful dashboard.
              </p>
            </div>
            <div className="flex-1 w-full max-w-md lg:max-w-none">
              <div className="bg-white rounded-2xl shadow-lg border border-cream-2 p-6">
                <div className="space-y-0">
                  {[
                    { n: 'JD', name: 'John Doe', time: 'Today, 10:00 AM', status: 'Confirmed', statusColor: 'bg-forest-pale text-forest-deep' },
                    { n: 'SM', name: 'Sarah Miller', time: 'Today, 11:30 AM', status: 'Pending', statusColor: 'bg-amber-pale text-amber-deep' },
                    { n: 'RK', name: 'Rahul Kumar', time: 'Tomorrow, 9:00 AM', status: 'Cancelled', statusColor: 'bg-coral-pale text-coral' },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-cream-2 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-forest-pale text-forest-deep font-semibold flex items-center justify-center text-xs shrink-0">
                        {row.n}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-dark truncate">{row.name}</p>
                        <p className="text-xs text-slate-light">{row.time}</p>
                      </div>
                      <div className={`${row.statusColor} text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-bold shrink-0`}>
                        {row.status}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-cream-2">
                  <div className="bg-slate-pale rounded-xl p-3 text-center">
                    <p className="font-semibold text-slate-dark text-sm">12</p>
                    <p className="text-[10px] text-slate-light uppercase tracking-wider mt-0.5 font-semibold">Today</p>
                  </div>
                  <div className="bg-slate-pale rounded-xl p-3 text-center">
                    <p className="font-semibold text-forest-deep text-sm">₹8.4k</p>
                    <p className="text-[10px] text-slate-light uppercase tracking-wider mt-0.5 font-semibold">Revenue</p>
                  </div>
                  <div className="bg-slate-pale rounded-xl p-3 text-center">
                    <p className="font-semibold text-amber-deep text-sm">2</p>
                    <p className="text-[10px] text-slate-light uppercase tracking-wider mt-0.5 font-semibold">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
