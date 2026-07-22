import React from 'react';
import { ShieldCheck, HardDrive, ArrowLeftRight, Archive, Gauge, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'workspace' | 'calculator' | 'faq';
  setActiveTab: (tab: 'workspace' | 'calculator' | 'faq') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('workspace')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">Shareguru</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  P2P Direct
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Zero-cloud peer-to-peer file transfer</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'workspace'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Share & Receive</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'calculator'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Gauge className="w-4 h-4" />
              <span>Speed & Eco</span>
            </button>

            <button
              onClick={() => setActiveTab('faq')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                activeTab === 'faq'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>FAQ & Guide</span>
            </button>
          </nav>

          {/* Security Indicator Badge */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>DTLS 1.3 E2EE</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>0% Cloud Storage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Nav */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 px-2 py-2 bg-slate-50 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'workspace' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Share
        </button>
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'calculator' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Calculator
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap ${
            activeTab === 'faq' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          FAQ
        </button>
      </div>
    </header>
  );
};
