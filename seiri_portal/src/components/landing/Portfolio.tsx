"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, Users, Zap, Activity, Target } from "lucide-react";

const Portfolio = () => {
  const projects = [
    {
      title: "Seiri Portal",
      category: "Post-Labor Workspace SaaS",
      description: "AI-powered workspace platform where human creativity directs autonomous agents to execute complex projects",
      techStack: ["Agentic AI", "Graph Infrastructure", "Autonomous Workflows", "Human-in-the-Loop"],
      metrics: [
        "90% task automation",
        "Human-in-the-loop control",
        "Zero technical debt accumulation"
      ],
      icon: <img src="/logo.png" alt="Seiri Portal" className="w-16 h-16 object-contain" />,
      gradient: "from-pink-500 to-purple-500",
      link: "/projects/seiri-portal"
    },
    {
      title: "MyceliumQL",
      category: "Healthcare Infrastructure",
      description: "RDF-powered healthcare data federation with GraphQL for seamless healthcare integrations",
      techStack: ["Interoperable Networks", "Decentralized Data", "Zero-Trust Architecture", "Self-Sovereign Systems"],
      metrics: [
        "80% faster healthcare integrations",
        "Zero-copy architecture",
        "Self-discovering connections"
      ],
      icon: <img src="/images/myceliumql-logo.png" alt="MyceliumQL" className="w-16 h-16 object-contain rounded-lg" />,
      gradient: "from-pink-600 to-purple-600",
      link: "/projects/myceliumql"
    },
    {
      title: "MedPact",
      category: "AI-Powered Analytics",
      description: "Medical billing analytics with machine learning predictions for healthcare optimization",
      techStack: ["Predictive Intelligence", "Autonomous Analytics", "Edge Computing", "Post-Labor Optimization"],
      metrics: [
        "225MB+ dataset processing",
        "Real-time predictions",
        "Multi-state compliance"
      ],
      icon: <TrendingUp className="w-16 h-16" />,
      gradient: "from-pink-400 to-purple-400",
      link: "/projects/medpact"
    },
    {
      title: "TangoEje",
      category: "Social Learning Platform",
      description: "Decentralized tango learning platform with ActivityPub federation for global community",
      techStack: ["Decentralized Social", "ActivityPub Protocol", "Federated Learning", "Peer-to-Peer Networks"],
      metrics: [
        "Federated social network",
        "Multi-language support",
        "AI skill matching"
      ],
      icon: <img src="/images/tangoeje-logo.png" alt="TangoEje" className="w-16 h-16 object-contain rounded-lg" />,
      gradient: "from-pink-300 to-purple-300",
      link: "/projects/tangoeje"
    },
    {
      title: "Garrochista",
      category: "Sports Equipment Marketplace",
      description: "Semantic javelin marketplace using ValueFlows framework for athlete equipment management",
      techStack: ["Tokenized Ecosystems", "Decentralized Markets", "Algorithmic Coordination", "Web3 Commerce"],
      metrics: [
        "Semantic equipment matching",
        "Club management system",
        "Athlete performance tracking"
      ],
      icon: <img src="/images/garrochista-logo.png" alt="Garrochista" className="w-16 h-16 object-contain rounded-lg" />,
      gradient: "from-pink-700 to-purple-700",
      link: "/projects/garrochista"
    }
  ];

  return (
    <section id="portfolio" className="py-20 bg-gray-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Our Portfolio
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            From AI-powered workspaces to healthcare infrastructure, we build platforms 
            that define the future of work and human potential.
          </p>
        </div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <Link key={index} href={project.link} className="block">
              <Card className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105 group cursor-pointer h-full hover:shadow-2xl hover:shadow-purple-500/20">
              <CardHeader>
                <div className={`flex items-center justify-center w-24 h-24 p-4 rounded-xl bg-gradient-to-r ${project.gradient} mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <div className="text-white flex items-center justify-center">
                    {project.icon}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white group-hover:text-blue-300 transition-colors duration-300">
                    {project.title}
                  </CardTitle>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <CardDescription className="text-gray-400">
                  {project.category}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {project.description}
                </p>

                {/* Tech Stack */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech, techIndex) => (
                      <Badge 
                        key={techIndex} 
                        variant="secondary" 
                        className="bg-gray-700 text-gray-200 hover:bg-gray-600 text-xs"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Key Metrics</h4>
                  <ul className="space-y-1">
                    {project.metrics.map((metric, metricIndex) => (
                      <li key={metricIndex} className="text-sm text-gray-400 flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${project.gradient} mr-2`} />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Button 
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 group-hover:border-gray-500 transition-all duration-300"
                >
                  View Project Details
                </Button>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-gradient-to-l from-pink-500/5 to-transparent rounded-full" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-transparent rounded-full" />
      </div>
    </section>
  );
};

export default Portfolio;