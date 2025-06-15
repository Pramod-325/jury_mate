import React from 'react';
import {Link} from 'react-router-dom'
import { Code, FileText, Search,Github, BarChart3, Zap, Shield } from 'lucide-react';
import FeatureCard from './FeatureCard';
import Header from '../components/Header'
function Home() {
     const features = [
    {
      icon: Code,
      title: "Code Analysis",
      description: "Deep dive into repository structure with AI-powered analysis that understands your codebase architecture and complexity.",
      gradient: "from-blue-500 to-cyan-500",
      toLink:'/codeAnalysis'
    },
    {
      icon: FileText,
      title: "README Generator",
      description: "Extract comprehensive project descriptions, goals, and documentation insights automatically from your repository.",
      gradient: "from-green-500 to-emerald-500",
      toLink:'/readme'
    },
    {
      icon: BarChart3,
      title: "Podcasts",
      description: "Identify frameworks, languages, and technologies used in your project with detailed dependency analysis.",
      gradient: "from-orange-500 to-red-500",
      toLink:'/podcast'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <Header/>
      <section className="relative pt-48 px-6">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>
          <div className="container mx-auto text-center relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Main heading with enhanced typography */}
            <div className="mb-8">
              <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-white via-green-400 to-emerald-500 bg-clip-text text-transparent leading-none tracking-tight">
                Jury Mate
              </h1>
              <div className="h-1 w-32 bg-gradient-to-r from-green-500 to-emerald-500 mx-auto rounded-full mb-6" />
              <h2 className="text-2xl md:text-4xl font-bold text-green-400 mb-8">
                Analyze Git Projects in Minutes, Not Hours
              </h2>
            </div>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto">
              Empower judges with AI-driven repository analysis, comprehensive tech stack detection, 
              and instant project insights for faster, more accurate evaluation decisions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link to='/codeAnalysis'  
                className="flex items-center group bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-black font-bold text-xl px-10 py-2 rounded-2xl transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-green-500/25 relative overflow-hidden"
              >
                <Search className="mr-2 h-5 w-5" />
                Analyze Repository
              </Link>
              <button 
                  className="flex items-center group border-2 border-green-500 text-green-400 hover:bg-green-500 hover:text-black text-xl px-10 py-2 rounded-2xl transform hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <FileText className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
                View Demo
              </button>
            </div>
          </div>
        </div>
      </section>
      <section id='features' className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Powerful Analysis Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to evaluate and understand any repository quickly and thoroughly
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <FeatureCard features={feature}/>
              </div>
            ))}
          </div>
          
        </div>
      </section>
    </div>
  );
}

export default Home;
