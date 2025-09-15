"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: "Client Dashboard", href: "/workspaces" },
    { name: "Admin Portal", href: "http://localhost:3001" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <button
              onClick={scrollToTop}
              className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 transition-all duration-200"
            >
              Seiri Studios
            </button>
            <p className="text-gray-400 text-sm leading-relaxed">
              Building AI-powered platforms for the post-labor economy. 
              Transforming how work gets done through intelligent automation 
              and human-centered design.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <div className="space-y-2">
              {quickLinks.map((link, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white justify-start p-0 h-auto font-normal"
                  asChild
                >
                  <a 
                    href={link.href} 
                    className="flex items-center gap-2"
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {link.name}
                    {link.href.startsWith("http") && <ExternalLink className="w-3 h-3" />}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Get in Touch</h3>
            <div className="space-y-2 text-gray-400 text-sm">
              <p>
                <span className="text-gray-300">Email:</span>{" "}
                <a 
                  href="mailto:hello@seiristudios.com" 
                  className="hover:text-white transition-colors duration-200"
                >
                  hello@seiristudios.com
                </a>
              </p>
              <p>
                <span className="text-gray-300">Location:</span> Global • Remote-First
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Seiri Studios. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <button className="hover:text-white transition-colors duration-200">
                Privacy Policy
              </button>
              <button className="hover:text-white transition-colors duration-200">
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;