import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BookingShowcase } from "@/components/landing/BookingShowcase";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsBanner } from "@/components/landing/StatsBanner";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

export default function Page() {
  return (
    <div className="min-h-screen bg-cream font-body">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <BookingShowcase />
      <Testimonials />
      <StatsBanner />
      <CtaBanner />
      <Footer />
    </div>
  );
}
