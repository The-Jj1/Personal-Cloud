import React from 'react';
import { 
  Cloud, Shield, Zap, Users, HardDrive, 
  ArrowRight, CheckCircle2, Globe, Lock, 
  Cpu, MessageSquare, Ticket
} from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-accent-100 selection:text-accent-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100">
              <Cloud className="text-gray-900" size={24} />
            </div>
            <span className="font-black text-xl tracking-tighter italic">Personal Cloud</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <a href="#" className="px-5 py-2.5 hover:bg-gray-50 rounded-xl transition-all text-gray-900">Home</a>
            <a href="#features" className="px-5 py-2.5 hover:bg-gray-50 rounded-xl transition-all">Features</a>
            <a href="#pricing" className="px-5 py-2.5 hover:bg-gray-50 rounded-xl transition-all">Pricing</a>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-50 text-accent-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-accent-100 animate-bounce">
            <Zap size={14} /> New: Team Collaboration v2.0
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic">
            Your Digital Life,<br />
            <span className="text-accent-600">Perfectly Organized.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-500 font-bold text-lg leading-relaxed">
            The next generation of private storage. Secure, lightning fast, and built for those who value their digital sovereignty.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:shadow-accent-200 transition-all flex items-center justify-center gap-3 group border-4 border-white"
            >
              Get Started for Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Dashboard Preview Placeholder */}
          <div className="pt-20">
            <div className="max-w-5xl mx-auto p-4 bg-white rounded-[3rem] shadow-2xl border-4 border-gray-50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop" 
                className="w-full rounded-[2rem] shadow-inner grayscale group-hover:grayscale-0 transition-all duration-700" 
                alt="Cloud Interface"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-black italic tracking-tight">Everything you need.</h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Powerful tools for modern users</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "AES-256 Encryption", desc: "Your files are encrypted at rest and in transit. Only you hold the keys to your kingdom." },
              { icon: Users, title: "Team Groups", desc: "Create secure workgroups, chat with members, and share files in a unified environment." },
              { icon: Zap, title: "Instant Sync", desc: "Uploaded files are available across all your devices instantly. Zero latency, maximum speed." },
              { icon: MessageSquare, title: "Secure Chat", desc: "Integrated private messaging system with end-to-end focus on your privacy." },
              { icon: HardDrive, title: "1GB Free Entry", desc: "Start today with 1GB of premium cloud storage for free. No credit card required." },
              { icon: Ticket, title: "Priority Support", desc: "Our integrated ticket system ensures your queries are handled by experts within hours." }
            ].map((f, i) => (
              <div key={i} className="p-10 bg-white rounded-[2.5rem] shadow-sm border-4 border-white hover:border-accent-100 transition-all group">
                <div className="w-14 h-14 bg-gray-50 text-gray-900 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent-600 group-hover:text-white transition-all">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-black mb-3 italic">{f.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl font-black italic tracking-tight">Simple Pricing.</h2>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Start your cloud journey today</p>
          </div>

          <div className="max-w-md mx-auto">
            {/* Free Plan */}
            <div className="p-12 bg-white rounded-[3rem] border-4 border-gray-50 flex flex-col space-y-10 shadow-xl hover:shadow-2xl transition-all text-center items-center">
              <div>
                <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-2">Explorer</h4>
                <div className="text-7xl font-black italic">$0<span className="text-sm font-bold text-gray-300">/forever</span></div>
              </div>
              <ul className="space-y-5 text-left w-full">
                <li className="flex items-center gap-4 font-bold text-sm text-gray-600 px-4 py-3 bg-gray-50 rounded-2xl border-2 border-white shadow-sm"><CheckCircle2 size={20} className="text-green-500" /> 1GB Cloud Storage</li>
                <li className="flex items-center gap-4 font-bold text-sm text-gray-600 px-4 py-3 bg-gray-50 rounded-2xl border-2 border-white shadow-sm"><CheckCircle2 size={20} className="text-green-500" /> Secure AES-256 Vault</li>
                <li className="flex items-center gap-4 font-bold text-sm text-gray-600 px-4 py-3 bg-gray-50 rounded-2xl border-2 border-white shadow-sm"><CheckCircle2 size={20} className="text-green-500" /> Team Collaboration</li>
                <li className="flex items-center gap-4 font-bold text-sm text-gray-600 px-4 py-3 bg-gray-50 rounded-2xl border-2 border-white shadow-sm"><CheckCircle2 size={20} className="text-green-500" /> Professional Tickets</li>
              </ul>
              <button 
                onClick={onGetStarted}
                className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl border-4 border-white active:scale-95"
              >
                Join for Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 px-6 bg-accent-600">
        <div className="max-w-4xl mx-auto text-center text-white space-y-10">
          <h2 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-sm">Your Data. Your Control. Your Cloud.</h2>
          <p className="text-accent-50 font-bold text-lg leading-relaxed">
            Built for maximum privacy with AES-256 encryption and professional collaboration tools. 
            Experience true digital sovereignty with Personal Cloud.
          </p>
          <button 
            onClick={onGetStarted}
            className="px-12 py-6 bg-white text-accent-700 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-gray-50 hover:scale-105 transition-all active:scale-95 border-4 border-white"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:row justify-between items-center gap-10">
          <div className="flex items-center gap-3 opacity-50 grayscale">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Cloud className="text-white" size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter italic">Personal Cloud</span>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">© 2026 Cloud Corp. Built for Privacy.</p>
          <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
