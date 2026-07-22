import React, { useState } from 'react';
import { Header } from './components/Header';
import { ShareWorkspace } from './components/ShareWorkspace';
import { SpeedCarbonCalculator } from './components/SpeedCarbonCalculator';
import { FaqKnowledgeBase } from './components/FaqKnowledgeBase';
import { Footer } from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'calculator' | 'faq'>('workspace');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'workspace' && <ShareWorkspace />}
        {activeTab === 'calculator' && <SpeedCarbonCalculator />}
        {activeTab === 'faq' && <FaqKnowledgeBase />}
      </main>

      <Footer />
    </div>
  );
}
