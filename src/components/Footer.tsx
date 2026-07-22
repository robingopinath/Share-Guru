import React from 'react';
import { ArrowLeftRight, ShieldCheck, Heart, Leaf } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800 text-sm">Shareguru</span>
          <span>— Free & Independent P2P File Sharing</span>
        </div>

        <div className="flex items-center space-x-4 text-slate-600">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>DTLS 1.3 E2EE</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Leaf className="w-3.5 h-3.5 text-teal-600" />
            <span>Zero Cloud Footprint</span>
          </span>
        </div>

        <div>
          <span>Keep your data safely in your own hands.</span>
        </div>
      </div>
    </footer>
  );
};
