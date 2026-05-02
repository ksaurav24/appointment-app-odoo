import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Home — Appointment App",
  description: "Formal, minimal landing page for appointment booking.",
};

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-8">
        <p className="text-xs text-gray-500">Simple Appointment Platform</p>
        <h1 className="text-2xl font-semibold leading-none text-gray-900">
          Manage bookings with a clean and reliable flow.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-700">
          Create appointments, verify customers with OTP, and keep your daily
          schedule organized from one place.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/signup">Create account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Fast onboarding</h2>
          <p className="mt-2 text-sm text-gray-700">
            Sign up in seconds with strong password rules and clear feedback.
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Secure login</h2>
          <p className="mt-2 text-sm text-gray-700">
            Authenticate with email and password, then verify actions with OTP.
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">Password recovery</h2>
          <p className="mt-2 text-sm text-gray-700">
            Recover access quickly through a dedicated forgot password flow.
          </p>
        </article>
      </section>
    </div>
  );
}
