import React, { useState } from 'react'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<any>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate a delay for the "AI" to think
    setTimeout(() => {
      setPlan({
        title: "Eco-Tech Solutions",
        summary: "A sustainable approach to urban logistics using modular hardware."
      })
      setLoading(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto pt-20 px-6">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4">
            BizPlan<span className="text-indigo-400">Gen</span>
          </h1>
          <p className="text-slate-400 text-lg">Turn your napkin sketch into a structured strategy.</p>
        </header>

        <form onSubmit={handleGenerate} className="bg-slate-800/50 border border-slate-700 p-8 rounded-3xl shadow-2xl backdrop-blur-sm mb-12">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-300">Industry</label>
              <input type="text" placeholder="e.g. SaaS, Coffee Shop" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-300">Initial Budget</label>
              <input type="text" placeholder="e.g. $50,000" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
            </div>
          </div>
          <button className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center">
            {loading ? <span className="animate-pulse">Analyzing Market Data...</span> : "Generate Business Plan"}
          </button>
        </form>

        {plan && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md">
            <h2 className="text-2xl font-bold text-white mb-4">{plan.title}</h2>
            <p className="text-slate-300 leading-relaxed">{plan.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}