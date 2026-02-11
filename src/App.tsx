import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [planText, setPlanText] = useState("") // Store the accumulated string
  
  // State for form inputs
  const [industry, setIndustry] = useState("")
  const [budget, setBudget] = useState("")
  const [vision, setVision] = useState("")

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPlanText(""); // Reset for a new plan

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry, budget, vision }),
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      // CRITICAL: Use the functional update (prev => prev + chunk) 
      // to ensure React doesn't miss rapid updates from the stream.
      setPlanText((prev) => prev + chunk); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            BizPlan<span className="text-indigo-400">Gen</span>
          </h1>
          <p className="text-slate-400 text-lg">AI-powered strategy in seconds.</p>
        </header>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-xl mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-300">Industry</label>
              <input 
                value={industry} onChange={(e) => setIndustry(e.target.value)}
                type="text" placeholder="e.g. AI SaaS, Specialty Coffee" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-300">Budget</label>
              <input 
                value={budget} onChange={(e) => setBudget(e.target.value)}
                type="text" placeholder="e.g. $10k - $50k" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-indigo-300">Your Vision</label>
              <textarea 
                value={vision} onChange={(e) => setVision(e.target.value)}
                placeholder="Describe your unique value proposition..." 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <button 
            disabled={loading}
            className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all"
          >
            {loading ? "Generating Strategy..." : "Generate Business Plan"}
          </button>
        </form>

        {/* Result Area */}
        {planText && (
          <div className="prose prose-invert prose-indigo max-w-none bg-slate-800/30 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
            <ReactMarkdown>{planText}</ReactMarkdown>
            {loading && <span className="inline-block w-2 h-5 ml-1 bg-indigo-500 animate-pulse align-middle" />}
          </div>
        )}
      </div>
    </div>
  )
}