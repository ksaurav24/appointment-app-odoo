const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Browse services",
    body: "Pick from the catalog — see duration, price, and availability up front.",
  },
  {
    n: "2",
    title: "Choose a time",
    body: "Real-time slots based on the provider's calendar and capacity.",
  },
  {
    n: "3",
    title: "You're booked",
    body: "Confirmation lands in your inbox. Manage it anytime from My bookings.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="border-t bg-muted/20 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            How it works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Three steps from &ldquo;I need an appointment&rdquo; to &ldquo;see
            you then&rdquo;.
          </p>
        </div>
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="space-y-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
                {s.n}
              </div>
              <h3 className="font-medium">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
