import type { Metadata } from "next";
import { OrgProfile } from "@/components/features/appointments/org-profile";

// Next.js passes URL params to server components via the `params` prop.
// For dynamic routes like /organisations/[slug], params.slug is the URL segment.
interface PageProps {
  params: Promise<{ slug: string }>;
}

// generateMetadata runs on the server so the browser tab shows the org name.
// We use a generic title here since fetching real data server-side would require
// a server-side API call — which is added once the backend is live.
// BACKEND INTEGRATION: replace with a server-side fetch of getOrganizationBySlug.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // Convert slug to a readable title: "acme-health-clinic" → "Acme Health Clinic"
  const name = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${name} — Appointment App`,
    description: `View details and book an appointment with ${name}.`,
  };
}

// Page is a server component — just passes the slug to OrgProfile (client component).
// OrgProfile fetches data itself via TanStack Query on the client.
export default async function OrgProfilePage({ params }: PageProps) {
  const { slug } = await params;
  return <OrgProfile slug={slug} />;
}
