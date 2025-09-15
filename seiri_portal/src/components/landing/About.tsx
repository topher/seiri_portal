"use client";

import { Button } from "@/components/ui/button";
import { Github, Linkedin, Twitter, MapPin, Globe } from "lucide-react";
import Image from "next/image";

const About = () => {
  const socialLinks = [
    { icon: <Github className="w-5 h-5" />, href: "https://github.com", label: "GitHub" },
    { icon: <Linkedin className="w-5 h-5" />, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: <Twitter className="w-5 h-5" />, href: "https://twitter.com", label: "Twitter" }
  ];

  const capabilities = [
    "White-glove development services",
    "AI integration and automation",
    "Healthcare data platforms",
    "Enterprise system architecture",
    "Startup acceleration programs"
  ];

  return (
    <section id="about" className="py-20 bg-gray-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                Building the Future of Work
              </h2>
              <div className="space-y-6 text-lg text-gray-300 leading-relaxed">
                <p>
                  As a digital nomad operating between Medellín, Seattle, and global locations, 
                  I founded Seiri Studios to bridge the gap between human creativity and 
                  AI-powered execution.
                </p>
                <p>
                  With deep expertise in AI, distributed systems, and healthcare technology, 
                  our venture studio philosophy centers on building platforms that amplify 
                  human potential rather than replace it.
                </p>
                <p>
                  We&apos;re creating the post-labor economy—where intelligent systems handle 
                  routine execution while humans focus on strategy, creativity, and meaningful impact.
                </p>
              </div>
            </div>

            {/* Location & Approach */}
            <div className="flex flex-wrap gap-6 items-center text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Medellín • Seattle • Global</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Remote-First</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all duration-200"
                  asChild
                >
                  <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label}>
                    {link.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Right Column - Image & Capabilities */}
          <div className="space-y-8">
            {/* Founder Photo Placeholder */}
            <div className="relative">
              <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-8 flex items-center justify-center border border-gray-600">
                <div className="text-gray-400 text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                    <span className="text-white text-3xl font-bold">CF</span>
                  </div>
                  <p className="text-sm">Professional Photo</p>
                  <p className="text-xs text-gray-500 mt-1">Founder & CEO</p>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">Studio Capabilities</h3>
              <ul className="space-y-3">
                {capabilities.map((capability, index) => (
                  <li key={index} className="flex items-center text-gray-300">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mr-3 flex-shrink-0" />
                    {capability}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-l from-purple-500/10 to-pink-500/10 rounded-full filter blur-3xl" />
    </section>
  );
};

export default About;