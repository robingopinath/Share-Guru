import React, { useState } from 'react';
import { Gauge, Leaf, Zap, Shield, HelpCircle, HardDrive, ArrowRightLeft } from 'lucide-react';
import { formatBytes } from '../lib/utils';

export const SpeedCarbonCalculator: React.FC = () => {
  const [fileSizeMb, setFileSizeMb] = useState<number>(1024); // 1 GB default

  // Speed math helper
  const calculateTransferTime = (sizeMb: number, speedMbits: number) => {
    const sizeBits = sizeMb * 8 * 1024 * 1024;
    const speedBitsPerSec = speedMbits * 1_000_000;
    const seconds = sizeBits / speedBitsPerSec;
    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    }
    const mins = Math.floor(seconds / 60);
    const remSecs = Math.round(seconds % 60);
    return `${mins}m ${remSecs}s`;
  };

  // Carbon math helper
  // Traditional cloud storage uses approx ~0.015 kWh per GB stored/transmitted + server cooling
  // Shareguru P2P bypasses server storage completely, saving ~85% energy
  const kwhSaved = (fileSizeMb / 1024) * 0.018;
  const co2GramsSaved = Math.round(kwhSaved * 475); // ~475g CO2 per kWh global grid avg

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
          <Leaf className="w-3.5 h-3.5" />
          <span>Eco-Friendly P2P Architecture</span>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Speed & Environmental Impact Estimator</h2>
        <p className="text-sm text-slate-600">
          Discover how peer-to-peer WebRTC technology delivers higher speeds while drastically reducing your digital carbon footprint compared to cloud storage.
        </p>
      </div>

      {/* Interactive Slider Input */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-bold text-slate-900">File Transfer Size</label>
            <span className="text-lg font-mono font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              {formatBytes(fileSizeMb * 1024 * 1024)}
            </span>
          </div>

          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={fileSizeMb}
            onChange={(e) => setFileSizeMb(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
            <span>100 MB</span>
            <span>10 GB</span>
            <span>25 GB</span>
            <span>50 GB</span>
          </div>
        </div>

        {/* Speed Comparison Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Standard Wi-Fi</span>
              <Gauge className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">10 Mbit/s</div>
            <div className="text-xs text-slate-500 mt-1">Est. Time:</div>
            <div className="text-sm font-semibold text-emerald-600 font-mono">
              {calculateTransferTime(fileSizeMb, 10)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Fast Broadband</span>
              <Gauge className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">50 Mbit/s</div>
            <div className="text-xs text-slate-500 mt-1">Est. Time:</div>
            <div className="text-sm font-semibold text-emerald-600 font-mono">
              {calculateTransferTime(fileSizeMb, 50)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Shareguru Average</span>
              <Zap className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">100 Mbit/s</div>
            <div className="text-xs text-slate-500 mt-1">Est. Time:</div>
            <div className="text-sm font-semibold text-emerald-600 font-mono">
              {calculateTransferTime(fileSizeMb, 100)}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">LAN / Fiber Peak</span>
              <Zap className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 font-mono">300 Mbit/s</div>
            <div className="text-xs text-slate-500 mt-1">Est. Time:</div>
            <div className="text-sm font-semibold text-emerald-600 font-mono">
              {calculateTransferTime(fileSizeMb, 300)}
            </div>
          </div>
        </div>
      </div>

      {/* Environmental CO2 Savings Box */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Leaf className="w-4 h-4" />
              <span>Low Carbon Footprint Guarantee</span>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              By using Shareguru instead of cloud servers:
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Because Shareguru never stores data online, we don't require power-hungry server farms, continuous cooling systems, or multi-hop data center replication.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 min-w-[280px]">
            <div className="text-center p-2">
              <span className="text-xs text-slate-400 block font-semibold">Energy Saved</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">{kwhSaved.toFixed(3)} kWh</span>
            </div>
            <div className="text-center p-2 border-l border-slate-700">
              <span className="text-xs text-slate-400 block font-semibold">CO2 Prevented</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">{co2GramsSaved}g</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
