import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ShieldCheck, Zap, Laptop, Smartphone, AlertTriangle, Leaf, Globe } from 'lucide-react';

export const FaqKnowledgeBase: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqItems = [
    {
      question: "Why is it slower than my maximum network speed?",
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      answer: (
        <div className="space-y-3 text-slate-600 text-sm">
          <p>
            Expect maximum transfer speeds of between <strong>10 and 100 Mbit per second</strong>. Keep in mind that you are doing both the 'uploading' and downloading at the same time, so this also saves a lot of time.
          </p>
          <p>
            <strong>What determines the maximum transfer speed?</strong><br />
            The maximum transfer speed is determined by the upload speed of the sender or download speed of the receiver, whichever is slower. There also seems to be a maximum speed of around 100Mbit/s on average, although we've also seen speeds of up to 300Mbit/s in rare cases.
          </p>
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1 text-xs">
            <span className="font-bold text-slate-800">Variables that may negatively influence speed:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>A network that blocks direct peer-to-peer connections</li>
              <li>Busy Wi-Fi networks or weak Wi-Fi signal quality</li>
              <li>Excessive firewalls in corporate settings</li>
              <li>Slow devices having trouble processing end-to-end encryption algorithms in real time</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      question: "How can I increase the transfer speed?",
      icon: <Zap className="w-5 h-5 text-emerald-500" />,
      answer: (
        <div className="space-y-2 text-slate-600 text-sm">
          <ul className="list-disc list-inside space-y-2">
            <li>If possible, make sure both devices are connected to the same local network</li>
            <li>Ensure you have a stable Wi-Fi connection that is not congested with other heavy traffic</li>
            <li>Use a cabled (Ethernet) internet connection for at least one of the devices</li>
            <li>Sometimes by simply restarting the transfer, the WebRTC algorithm may discover a shorter STUN path</li>
          </ul>
        </div>
      ),
    },
    {
      question: "How can I send an entire folder?",
      icon: <Laptop className="w-5 h-5 text-indigo-500" />,
      answer: (
        <div className="space-y-3 text-slate-600 text-sm">
          <p>
            You cannot directly send raw uncompressed folders over peer-to-peer streams because creating an archive on-the-fly would slow down the direct transfer connection.
          </p>
          <p>
            <strong>Solution:</strong> Use our built-in <strong>Zip Helper</strong> tool (available in the top menu) to compress your folder into a single ZIP archive right in your browser, then share it instantly!
          </p>
        </div>
      ),
    },
    {
      question: "It starts downloading but then stops halfway — Why?",
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      answer: (
        <div className="space-y-3 text-slate-600 text-sm">
          <p>This could mean two things:</p>
          <div className="space-y-2">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
              <strong className="block font-bold">1. Safari Browser Memory Limit:</strong>
              In Safari, files must be loaded entirely into browser RAM before saving, which can cause large file transfers to stop. We advise using <strong>Firefox</strong> or <strong>Chrome</strong> where data streams directly to disk.
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
              <strong className="block font-bold">2. Mobile App Background Suspension:</strong>
              Some versions of Android automatically close or pause apps if they run in the background for too long during heavy network activity. A simple fix is to <strong>keep the browser open in the foreground</strong> during large file transfers.
            </div>
          </div>
        </div>
      ),
    },
    {
      question: "How does Shareguru guarantee privacy & security?",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      answer: (
        <div className="space-y-2 text-slate-600 text-sm">
          <p>
            Shareguru stores <strong>nothing online</strong>. Simply close your browser tab to stop sending. Our mission is to make sure people keep their data safely in their own hands.
          </p>
          <p>
            Your data is encrypted end-to-end using <strong>DTLS 1.3</strong> and can only be read by you and your receiver. Under the hood, WebRTC uses STUN protocols to discover direct IP routes, completely skipping middleman cloud servers.
          </p>
        </div>
      ),
    },
    {
      question: "What is the origin story of Shareguru?",
      icon: <Globe className="w-5 h-5 text-teal-600" />,
      answer: (
        <div className="space-y-2 text-slate-600 text-sm">
          <p>
            Shareguru initially started out as a native application, running our own proprietary version of the STUN protocol. When we discovered WebRTC had made direct P2P streaming possible inside modern web browsers, we decided to focus on the web platform first.
          </p>
          <p>
            This transition allowed for seamless cross-platform functionality across Windows, Mac, Linux, iOS, and Android without requiring any software downloads.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Frequently Asked Questions & Guide</h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Everything you need to know about peer-to-peer WebRTC file transfers, performance optimization, and device troubleshooting.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 pr-4">
                  {item.icon}
                  <span className="font-bold text-slate-900 text-base">{item.question}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180 text-slate-900' : ''
                  }`}
                />
              </button>

              {isOpen && <div className="px-6 pb-6 pt-2 border-t border-slate-100">{item.answer}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
