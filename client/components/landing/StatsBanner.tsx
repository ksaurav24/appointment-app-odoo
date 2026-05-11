"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { prefix: "", num: 2400, suffix: "+", label: "Businesses" },
  { prefix: "", num: 1.2, suffix: "M+", label: "Bookings", isFloat: true },
  { prefix: "", num: 99.9, suffix: "%", label: "Uptime", isFloat: true },
  { prefix: "<", num: 60, suffix: "s", label: "Avg Booking" },
];

export function StatsBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [counts, setCounts] = useState(STATS.map(() => 0));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          
          let start = 0;
          const duration = 2000; // 2s
          
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            
            // easeOutQuad
            const easeOutProgress = 1 - (1 - progress) * (1 - progress);
            
            setCounts(STATS.map(stat => {
              const current = easeOutProgress * stat.num;
              return stat.isFloat ? Number(current.toFixed(1)) : Math.floor(current);
            }));
            
            if (progress < 1) {
              requestAnimationFrame(step);
            }
          };
          
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section ref={containerRef} className="bg-forest-mid py-16 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map((stat, i) => (
            <div key={i}>
              <div className="font-heading text-5xl text-white">
                {stat.prefix}{counts[i]}{stat.suffix}
              </div>
              <div className="text-forest-pale/60 text-xs font-semibold uppercase tracking-widest mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
