import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

type PlanSection = { markdown: string }

type Plan = {
  meta: { industry: string; budget: string; vision: string }
  sections: {
    executive_summary: PlanSection
    problem: PlanSection
    solution: PlanSection
    market: PlanSection & { tam_sam_som?: { tam: string; sam:string; som: string } }
    gtm: PlanSection
    business_model: PlanSection
    competition: PlanSection
    operations: PlanSection
    team: PlanSection
    risks: PlanSection
    milestones: PlanSection
    financials: PlanSection & {
      assumptions?: string[]
      projection_table?: { headers: string[]; rows: string[][] }
    }
  }
}

// Type for the API response from the /plan/:id endpoint
type PlanStatusResponse = {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  result_json?: Plan 
  error_message?: string
}

export default function App() {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  
  const [industry, setIndustry] = useState("")
  const [budget, setBudget] = useState("")
  const [vision, setVision] = useState("")

  const pollingIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      try {
        const response = await fetch(`/api/plan/${jobId}`)
        if (!response.ok) {
          throw new Error(`Polling failed: ${response.statusText}`)
        }
        
        const data = await response.json() as PlanStatusResponse;

        if (data.status === 'done') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
          setPlan(data.result_json ?? null)
          setLoading(false)
          setJobId(null)
        } else if (data.status === 'error') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
          setError(data.error_message || 'An unknown error occurred during generation.')
          setLoading(false)
          setJobId(null)
        }
        // If 'queued' or 'running', do nothing and let it poll again
      } catch (err) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
        setJobId(null)
      }
    }

    // Start polling immediately and then every 3 seconds
    poll()
    pollingIntervalRef.current = window.setInterval(poll, 3000)

  }, [jobId])


  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setPlan(null)
    setError(null)
    setJobId(null)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, budget, vision }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to start job (${response.status}). ${text}`)
      }

      const { jobId: newJobId } = await response.json()
      if (!newJobId) {
        throw new Error('API did not return a job ID.')
      }
      setJobId(newJobId)
      // Polling will be handled by the useEffect hook
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
    }
  };

  const renderSection = (title: string, markdown?: string) => {
    if (!markdown) return null
    return (
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
        <div className="prose prose-invert prose-indigo max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-white mb-4">
            BizPlan<span className="text-indigo-400">Gen</span>
          </h1>
          <p className="text-slate-400 text-lg">AI-powered strategy in seconds.</p>
        </header>

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

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-100 p-6 rounded-2xl mb-8">
            <div className="font-bold mb-2">Error</div>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </div>
        )}

        {plan && (
          <div className="bg-slate-800/30 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
            {renderSection('Executive Summary', plan.sections?.executive_summary?.markdown)}
            {renderSection('Problem', plan.sections?.problem?.markdown)}
            {renderSection('Solution', plan.sections?.solution?.markdown)}
            {renderSection('Market', plan.sections?.market?.markdown)}
            {renderSection('Go-To-Market', plan.sections?.gtm?.markdown)}
            {renderSection('Business Model', plan.sections?.business_model?.markdown)}
            {renderSection('Competition', plan.sections?.competition?.markdown)}
            {renderSection('Operations', plan.sections?.operations?.markdown)}
            {renderSection('Team', plan.sections?.team?.markdown)}
            {renderSection('Risks', plan.sections?.risks?.markdown)}
            {renderSection('Milestones', plan.sections?.milestones?.markdown)}
            {renderSection('Financials', plan.sections?.financials?.markdown)}
          </div>
        )}
      </div>
    </div>
  )
}