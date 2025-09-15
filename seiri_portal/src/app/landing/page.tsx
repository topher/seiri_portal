import Navigation from "@/components/landing/Navigation";
import Hero from "@/components/landing/Hero";
import Portfolio from "@/components/landing/Portfolio";
import About from "@/components/landing/About";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navigation />
      <Hero />
      <Portfolio />
      <About />
      <Contact />
      <Footer />
    </main>
  );
}

export const metadata = {
  title: "Seiri Studios - Building the Post-Labor Economy",
  description: "AI-powered venture studio creating platforms that transform how work gets done. From healthcare infrastructure to social learning, we build the intelligent systems of tomorrow.",
  keywords: "AI, venture studio, post-labor economy, automation, healthcare, social learning, enterprise systems",
};