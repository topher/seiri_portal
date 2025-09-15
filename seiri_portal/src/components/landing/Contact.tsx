"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ExternalLink, Rocket, Users, Code, Sparkles } from "lucide-react";

const Contact = () => {
  const contactMethods = [
    {
      title: "Start a Project",
      description: "Ready to build the future? Let's discuss your vision.",
      icon: <Rocket className="w-6 h-6" />,
      action: "Email Us",
      href: "mailto:hello@seiristudios.com",
      primary: true
    },
    {
      title: "Client Portal",
      description: "Access your workspace and project dashboard.",
      icon: <Users className="w-6 h-6" />,
      action: "Access Portal",
      href: "/workspaces",
      primary: false
    }
  ];

  const services = [
    {
      icon: <Code className="w-5 h-5" />,
      title: "Custom Development",
      description: "Full-stack applications with AI integration"
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI Automation",
      description: "Intelligent systems that amplify human potential"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Venture Studio",
      description: "End-to-end platform development and scaling"
    }
  ];

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Build the Future?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Whether you&apos;re a startup founder, enterprise team, or visionary leader, 
            let&apos;s create something extraordinary together.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {contactMethods.map((method, index) => (
            <Card 
              key={index} 
              className={`${
                method.primary 
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30" 
                  : "bg-gray-800/50 border-gray-700"
              } hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105 group`}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    method.primary 
                      ? "bg-gradient-to-r from-blue-600 to-purple-600" 
                      : "bg-gray-700"
                  } text-white group-hover:scale-110 transition-transform duration-300`}>
                    {method.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white group-hover:text-blue-300 transition-colors duration-300">
                      {method.title}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {method.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className={`w-full ${
                    method.primary
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0"
                      : "border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 bg-transparent"
                  } transition-all duration-200 transform group-hover:scale-105`}
                  variant={method.primary ? undefined : "outline"}
                  asChild
                >
                  <a href={method.href} className="flex items-center justify-center gap-2">
                    {method.action}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Services Overview */}
        <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700">
          <h3 className="text-2xl font-semibold text-white mb-8 text-center">
            What We Offer
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white mx-auto">
                  {service.icon}
                </div>
                <h4 className="text-lg font-semibold text-white">{service.title}</h4>
                <p className="text-gray-400 text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Contact Info */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-3 bg-gray-800/50 px-6 py-3 rounded-full border border-gray-700">
            <Mail className="w-4 h-4 text-blue-400" />
            <span className="text-gray-300">hello@seiristudios.com</span>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full filter blur-3xl" />
    </section>
  );
};

export default Contact;