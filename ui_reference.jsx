import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, FileText, PieChart, TrendingUp, Settings,
  ChevronRight, Save, Download, Sparkles, CheckCircle, BrainCircuit,
  DollarSign, Target, Menu, X, Globe, Users, Briefcase, ShieldAlert,
  BarChart4, BookOpen, Layers, Printer, Share2, MessageSquare, Send, Loader2
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// --- GEMINI API CONFIGURATION ---
const apiKey = ""; // API Key injected by environment

const callGeminiAPI = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

const callGeminiChat = async (history, message, context) => {
   try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [...history, { role: "user", parts: [{ text: message }] }],
          systemInstruction: { parts: [{ text: `You are an expert business consultant mentor. You are reviewing a business plan with this context: ${JSON.stringify(context)}. Answer the user's questions specifically about their business plan. Keep answers concise, encouraging, and strategic.` }] },
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "Maaf, saya sedang mengalami gangguan koneksi. Silakan coba lagi.";
  }
}

// --- DATA GENERATOR ENGINES ---

// 1. Fallback Mock Data (Used if API fails)
const generateMockData = (industry, location, lang) => {
  const isIndo = lang === 'id';
  const currency = isIndo ? 'IDR' : 'USD';
  const multiplier = isIndo ? 1 : 0.00007;

  // ... existing mock logic ...
  const templates = {
    Technology: {
      gap: isIndo ? "Inefisiensi operasional pada UMKM." : "Operational inefficiencies in SMEs.",
      solution: isIndo ? "Platform SaaS terintegrasi." : "Integrated SaaS platform.",
      tam: 50000000000 * multiplier,
      sam: 15000000000 * multiplier,
      som: 1000000000 * multiplier,
      growthRate: 0.25,
      margin: 0.80,
      opexHigh: true,
      risks: isIndo ? ["Perubahan Teknologi", "Keamanan Data"] : ["Rapid Tech Changes", "Data Security"],
      trends: isIndo ? ["Adopsi AI meningkat", "Remote work"] : ["AI adoption up", "Remote work"]
    },
    // ... other templates fallbacks ...
  };
  const selected = templates.Technology; // Default fallback

  const financialProjections = Array.from({ length: 5 }, (_, i) => ({
      year: `Year ${i + 1}`,
      revenue: 1000 * (i+1),
      cogs: 200 * (i+1),
      opex: 300 * (i+1),
      netProfit: 500 * (i+1),
  }));

  return { ...selected, industry, location, financialProjections, currency, swot: null };
};

// 2. Real AI Generator
const generateBusinessDataWithGemini = async (industry, location, lang) => {
  const isIndo = lang === 'id';
  const currency = isIndo ? 'IDR' : 'USD';
  const langName = isIndo ? 'Indonesian' : 'English';
  
  const systemPrompt = `You are a professional business plan generator. 
  Generate a realistic, data-driven business plan for a ${industry} business in ${location} in ${langName}.
  Output purely valid JSON.
  Ensure 'tam', 'sam', 'som' are numeric values (approximations in ${currency}).
  'financialProjections' must be an array of 5 objects for 5 years, each with 'year' (string "Year 1"), 'revenue' (number), 'cogs' (number), 'opex' (number), 'netProfit' (number).
  'swot' must be an object with 'strengths', 'weaknesses', 'opportunities', 'threats' (arrays of strings).
  'pestel' must be an array of objects { factor, desc }.
  'risks' must be an array of strings.
  'trends' must be an array of strings.
  'gap' and 'solution' should be concise paragraphs.`;

  const userPrompt = `Generate business plan for Industry: ${industry}, Location: ${location}.`;

  const data = await callGeminiAPI(userPrompt, systemPrompt);

  if (!data) return generateMockData(industry, location, lang);

  return {
    ...data,
    industry,
    location,
    currency
  };
};

// --- COMPONENTS ---

// 1. Sidebar
const Sidebar = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen, lang, setLang }) => {
  const t = {
    dashboard: lang === 'id' ? 'Dashboard' : 'Dashboard',
    strategy: lang === 'id' ? 'Strategi & Analisis' : 'Strategy & Analysis',
    market: lang === 'id' ? 'Pasar & Kompetitor' : 'Market & Competitors',
    financial: lang === 'id' ? 'Keuangan & Investasi' : 'Financials & Investment',
    roadmap: lang === 'id' ? 'Peta Jalan & Risiko' : 'Roadmap & Risks',
    export: lang === 'id' ? 'Ekspor & Pitch' : 'Export & Pitch',
    mentor: lang === 'id' ? 'Mentor & Ahli' : 'Mentors & Experts',
  };

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'market', label: t.market, icon: PieChart },
    { id: 'strategy', label: t.strategy, icon: Target },
    { id: 'roadmap', label: t.roadmap, icon: Layers },
    { id: 'financial', label: t.financial, icon: DollarSign },
    { id: 'mentor', label: t.mentor, icon: Users },
    { id: 'export', label: t.export, icon: Download },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between h-16 px-6 bg-slate-800 shadow-md">
        <div className="flex items-center gap-2 font-bold text-xl">
          <BrainCircuit className="text-emerald-400" />
          <span>BizPlan<span className="text-emerald-400">Gen</span></span>
        </div>
        <button onClick={() => setIsMobileOpen(false)} className="lg:hidden text-slate-400">
          <X size={24} />
        </button>
      </div>

      <div className="p-4">
        <button 
          onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
          className="flex items-center justify-center w-full px-4 py-2 mb-6 text-xs font-bold text-slate-300 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
        >
          <Globe size={14} className="mr-2" />
          {lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
        </button>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileOpen(false);
              }}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 w-full p-4 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold">FP</div>
          <div>
            <p className="text-sm font-medium text-white">Founder Pro</p>
            <p className="text-xs text-emerald-400">Enterprise Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

// 2. Dashboard View
const DashboardView = ({ data, lang }) => {
  const t = {
    welcome: lang === 'id' ? 'Ringkasan Eksekutif & Visi' : 'Executive Summary & Vision',
    subtitle: lang === 'id' ? 'Gambaran umum rencana bisnis Anda berdasarkan analisis AI.' : 'Overview of your business plan based on AI analysis.',
    problem: lang === 'id' ? 'Masalah (Gap)' : 'Problem (Gap)',
    solution: lang === 'id' ? 'Solusi' : 'Solution',
    vision: lang === 'id' ? 'Visi & Misi' : 'Vision & Mission',
    tamSamSom: lang === 'id' ? 'Ukuran Pasar (TAM, SAM, SOM)' : 'Market Size (TAM, SAM, SOM)',
  };

  const marketData = [
    { name: 'TAM', value: data.tam, fill: '#94a3b8' },
    { name: 'SAM', value: data.sam, fill: '#64748b' },
    { name: 'SOM', value: data.som, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.welcome}</h2>
                <p className="text-slate-500">{t.subtitle}</p>
            </div>
            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-200">
                <Sparkles size={12} /> Powered by Gemini 2.0 Flash
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Problem & Solution Cards */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><ShieldAlert size={20}/></div>
            <h3 className="font-bold text-lg text-slate-800">{t.problem}</h3>
          </div>
          <p className="text-slate-600 flex-grow italic">"{data.gap}"</p>
          <div className="mt-4 pt-4 border-t border-slate-100">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analysis Source: Market Aggregation</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Sparkles size={20}/></div>
            <h3 className="font-bold text-lg text-slate-800">{t.solution}</h3>
          </div>
          <p className="text-slate-600 flex-grow">{data.solution}</p>
           <div className="mt-4 pt-4 border-t border-slate-100">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Validation: AI Strategic Fit</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Vision Mission */}
         <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Target size={20} className="text-emerald-400"/> {t.vision}</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-emerald-400 font-bold text-sm uppercase mb-1">Vision</h4>
                <p className="text-slate-300">To be the market leader in {data.industry} industry in {data.location} by 2030, driving sustainable innovation.</p>
              </div>
              <div>
                <h4 className="text-emerald-400 font-bold text-sm uppercase mb-1">Mission</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                   <li>Provide exceptional value through technology.</li>
                   <li>Empower local communities in {data.location}.</li>
                   <li>Achieve operational excellence and profitability.</li>
                </ul>
              </div>
            </div>
         </div>

         {/* Market Size Chart */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{t.tamSamSom}</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marketData} layout="vertical">
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" width={40} />
                   <Tooltip formatter={(val) => `${data.currency} ${val.toLocaleString()}`} />
                   <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {marketData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center text-xs text-slate-500">
               Total Addressable Market in {data.location}
            </div>
         </div>
      </div>
    </div>
  );
};

// 3. Strategy View (SWOT, PESTEL, PORTER)
const StrategyView = ({ lang, data }) => {
  const t = {
    title: lang === 'id' ? 'Analisis Strategis Komprehensif' : 'Comprehensive Strategic Analysis',
    swot: 'SWOT Analysis',
    tows: 'TOWS Matrix (Strategic Implications)',
    pestel: 'PESTEL Analysis',
    porter: "Porter's Five Forces",
  };

  // Convert AI generated SWOT arrays into quantitative data for Radar Chart
  // This calculates a 'score' based on number of items generated (mock logic for viz)
  const swotScore = {
    strengths: (data.swot?.strengths?.length || 3) * 20,
    weaknesses: (data.swot?.weaknesses?.length || 3) * 15,
    opportunities: (data.swot?.opportunities?.length || 3) * 20,
    threats: (data.swot?.threats?.length || 3) * 15,
  };

  const swotChartData = [
    { subject: 'Strengths', A: Math.min(swotScore.strengths, 100), fullMark: 100 },
    { subject: 'Weaknesses', A: Math.min(swotScore.weaknesses, 100), fullMark: 100 },
    { subject: 'Opportunities', A: Math.min(swotScore.opportunities, 100), fullMark: 100 },
    { subject: 'Threats', A: Math.min(swotScore.threats, 100), fullMark: 100 },
  ];

  const pestelData = data.pestel || [
    { factor: 'Political', desc: 'Government support for SMEs, Stable regulation.' },
    { factor: 'Economic', desc: 'Growing middle class, Inflation rate 3%.' },
    { factor: 'Social', desc: 'Shift to digital lifestyle, Gen Z dominance.' },
    { factor: 'Technological', desc: '5G expansion, AI adoption rising.' },
    { factor: 'Environmental', desc: 'Sustainable practice demand.' },
    { factor: 'Legal', desc: 'Data privacy laws (PDP Law).' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.title}</h2>
      </div>

      {/* SWOT & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{t.swot} Visual</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={swotChartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Biz" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
         </div>
         
         <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-4">{t.tows} & SWOT Detail</h3>
            <div className="grid grid-cols-2 gap-4 h-full overflow-y-auto max-h-80">
               <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 mb-2">Strengths</h4>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {data.swot?.strengths?.slice(0,3).map((s,i) => <li key={i}>{s}</li>) || <li>Strong technical team</li>}
                  </ul>
               </div>
               <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <h4 className="font-bold text-amber-800 mb-2">Weaknesses</h4>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {data.swot?.weaknesses?.slice(0,3).map((s,i) => <li key={i}>{s}</li>) || <li>Limited budget</li>}
                  </ul>
               </div>
               <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-bold text-blue-800 mb-2">Opportunities</h4>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {data.swot?.opportunities?.slice(0,3).map((s,i) => <li key={i}>{s}</li>) || <li>Market growth</li>}
                  </ul>
               </div>
               <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h4 className="font-bold text-red-800 mb-2">Threats</h4>
                  <ul className="list-disc list-inside text-sm text-slate-700">
                    {data.swot?.threats?.slice(0,3).map((s,i) => <li key={i}>{s}</li>) || <li>Competitors</li>}
                  </ul>
               </div>
            </div>
         </div>
      </div>

      {/* PESTEL Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="font-bold text-lg text-slate-800 mb-4">{t.pestel}</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                     <th className="p-4 font-bold text-slate-700">Factor</th>
                     <th className="p-4 font-bold text-slate-700">Analysis & Impact</th>
                  </tr>
               </thead>
               <tbody>
                  {pestelData.map((item, idx) => (
                     <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-4 font-bold text-slate-800">{item.factor}</td>
                        <td className="p-4 text-slate-600">{item.desc}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
      
       {/* Porter's 5 Forces (Static visualization for MVP) */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="font-bold text-lg text-slate-800 mb-4">{t.porter}</h3>
         <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {[
               {name: "Supplier Power", val: "Low", col: "bg-green-100 text-green-800"},
               {name: "Buyer Power", val: "High", col: "bg-red-100 text-red-800"},
               {name: "Competitive Rivalry", val: "High", col: "bg-red-100 text-red-800"},
               {name: "Threat of Substitution", val: "Medium", col: "bg-amber-100 text-amber-800"},
               {name: "Threat of New Entry", val: "Medium", col: "bg-amber-100 text-amber-800"},
            ].map((force, i) => (
               <div key={i} className={`p-4 rounded-lg flex flex-col items-center justify-center text-center ${force.col}`}>
                  <span className="text-xs uppercase font-bold tracking-wide mb-1">{force.name}</span>
                  <span className="text-xl font-bold">{force.val}</span>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
};

// 4. Financial View
const FinancialView = ({ data, lang }) => {
   const t = {
    title: lang === 'id' ? 'Proyeksi Keuangan 5 Tahun (AI Generated)' : '5-Year Financial Projections (AI Generated)',
    chartTitle: lang === 'id' ? 'Pertumbuhan Pendapatan & Laba Bersih' : 'Revenue & Net Profit Growth',
    tableTitle: lang === 'id' ? 'Detail Laba Rugi (P&L)' : 'Profit & Loss (P&L) Details',
    metrics: lang === 'id' ? 'Metrik Kunci Investasi' : 'Key Investment Metrics',
  };

  const financials = data.financialProjections || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">{t.title}</h2>
        <div className="flex gap-2">
           <span className="px-3 py-1 bg-slate-100 rounded text-xs font-mono">Currency: {data.currency}</span>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="font-bold text-lg text-slate-800 mb-4">{t.chartTitle}</h3>
         <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={financials} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                     <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                  <Area type="monotone" dataKey="netProfit" stroke="#6366f1" fillOpacity={1} fill="url(#colorProf)" name="Net Profit" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* P&L Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <h3 className="font-bold text-lg text-slate-800 mb-4">{t.tableTitle}</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
               <thead>
                  <tr className="bg-slate-50 text-slate-700">
                     <th className="p-3 text-left">Component</th>
                     {financials.map(y => <th key={y.year} className="p-3">{y.year}</th>)}
                  </tr>
               </thead>
               <tbody>
                  <tr className="border-b border-slate-100 font-bold text-slate-800">
                     <td className="p-3 text-left">Revenue</td>
                     {financials.map(y => <td key={y.year} className="p-3">{y.revenue.toLocaleString()}</td>)}
                  </tr>
                  <tr className="border-b border-slate-100 text-red-500">
                     <td className="p-3 text-left">COGS</td>
                     {financials.map(y => <td key={y.year} className="p-3">({y.cogs.toLocaleString()})</td>)}
                  </tr>
                  <tr className="border-b border-slate-100 text-slate-600">
                     <td className="p-3 text-left">Gross Profit</td>
                     {financials.map(y => <td key={y.year} className="p-3">{(y.revenue - y.cogs).toLocaleString()}</td>)}
                  </tr>
                  <tr className="border-b border-slate-100 text-red-500">
                     <td className="p-3 text-left">OPEX</td>
                     {financials.map(y => <td key={y.year} className="p-3">({y.opex.toLocaleString()})</td>)}
                  </tr>
                  <tr className="bg-slate-50 font-bold text-emerald-600">
                     <td className="p-3 text-left">Net Profit</td>
                     {financials.map(y => <td key={y.year} className="p-3">{y.netProfit.toLocaleString()}</td>)}
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

// 5. Roadmap & Risk View
const RoadmapView = ({ lang, data }) => {
    const t = {
        title: lang === 'id' ? 'Peta Jalan Bisnis & Manajemen Risiko' : 'Business Roadmap & Risk Management',
        roadmap: lang === 'id' ? 'Peta Jalan 5 Tahun' : '5-Year Roadmap',
        risks: lang === 'id' ? 'Mitigasi Risiko' : 'Risk Mitigation',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.title}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800 mb-6">{t.roadmap}</h3>
                    <div className="relative border-l-2 border-emerald-500 ml-4 space-y-8">
                        {[
                            { year: 'Year 1', title: 'Market Penetration', desc: 'Launch MVP, Acquire first 1000 users, Reach BEP.' },
                            { year: 'Year 2', title: 'Product Development', desc: 'Add AI module, Mobile App Launch, Team expansion to 20.' },
                            { year: 'Year 3', title: 'Market Development', desc: 'Expand to 2nd tier cities, B2B Partnerships.' },
                            { year: 'Year 4', title: 'Diversification', desc: 'Launch Enterprise solution, Series B Funding.' },
                            { year: 'Year 5', title: 'Domination', desc: 'Regional expansion (SEA), IPO Preparation.' },
                        ].map((item, i) => (
                            <div key={i} className="relative pl-6">
                                <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></span>
                                <h4 className="font-bold text-slate-800 text-sm">{item.year}: {item.title}</h4>
                                <p className="text-slate-600 text-sm mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">{t.risks}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3">Risk Factor</th>
                                    <th className="p-3">Impact</th>
                                    <th className="p-3">Mitigation (AI Suggested)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.risks?.map((risk, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="p-3 font-medium text-slate-700">{risk}</td>
                                        <td className="p-3 text-red-500 font-medium">High</td>
                                        <td className="p-3 text-slate-600">Continuous monitoring and proactive strategy adjustment.</td>
                                    </tr>
                                )) || <tr><td colSpan="3" className="p-3 text-slate-400">No risks detected by AI</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 6. Mentor & Export View (WITH AI CHAT)
const MentorExportView = ({ lang, contextData }) => {
    const [messages, setMessages] = useState([
        { role: 'model', text: lang === 'id' ? 'Halo! Saya mentor AI bisnis Anda. Ada yang bisa saya bantu terkait rencana bisnis Anda?' : 'Hello! I am your AI business mentor. How can I help with your business plan?' }
    ]);
    const [input, setInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef(null);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsChatting(true);

        const historyForApi = messages.map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] }));
        const responseText = await callGeminiChat(historyForApi, userMsg, contextData);

        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        setIsChatting(false);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* AI Chat Mentor Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50 rounded-t-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">{lang === 'id' ? 'Konsultasi AI Mentor' : 'AI Expert Mentor'}</h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online • Powered by Gemini
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isChatting && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-3 rounded-xl rounded-bl-none shadow-sm flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-indigo-500"/>
                                    <span className="text-xs text-slate-400">Typing...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex gap-2">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={lang === 'id' ? 'Tanya tentang strategi...' : 'Ask about strategy...'}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                        <button type="submit" disabled={isChatting} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                            <Send size={20} />
                        </button>
                    </form>
                </div>

                {/* Export Section */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Printer size={24} className="text-blue-500"/> {lang === 'id' ? 'Ekspor Dokumen' : 'Export Documents'}</h2>
                        <p className="text-slate-500 mb-6 text-sm">Download your comprehensive business plan in professional formats.</p>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="p-4 border border-slate-200 rounded-lg flex flex-col items-center justify-center hover:bg-slate-50 transition-all group">
                                <FileText size={32} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-slate-700">MS Word (.docx)</span>
                                <span className="text-xs text-slate-400">Full Report</span>
                            </button>
                            <button className="p-4 border border-slate-200 rounded-lg flex flex-col items-center justify-center hover:bg-slate-50 transition-all group">
                                <Share2 size={32} className="text-orange-600 mb-2 group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-slate-700">Pitch Deck (.pptx)</span>
                                <span className="text-xs text-slate-400">Investor Ready</span>
                            </button>
                            <button className="p-4 border border-slate-200 rounded-lg flex flex-col items-center justify-center hover:bg-slate-50 transition-all group">
                                <BarChart4 size={32} className="text-green-600 mb-2 group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-slate-700">Financials (.xlsx)</span>
                                <span className="text-xs text-slate-400">Editable Sheets</span>
                            </button>
                            <button className="p-4 border border-slate-200 rounded-lg flex flex-col items-center justify-center hover:bg-slate-50 transition-all group">
                                <Layers size={32} className="text-purple-600 mb-2 group-hover:scale-110 transition-transform"/>
                                <span className="font-bold text-slate-700">One Pager (.pdf)</span>
                                <span className="text-xs text-slate-400">Executive Summary</span>
                            </button>
                        </div>
                    </div>
                     {/* Human Mentor List (Static) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={24} className="text-emerald-500"/> {lang === 'id' ? 'Mentor Manusia (Premium)' : 'Human Mentors (Premium)'}</h2>
                        <div className="space-y-4">
                            {[
                                { name: 'Dr. Sarah Wijaya', role: 'Venture Capitalist', spec: 'Investment Strategy' },
                                { name: 'Budi Santoso, MBA', role: 'Ex-Unicorn Founder', spec: 'GTM & Scaling' },
                            ].map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-bold">{m.name.charAt(0)}</div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{m.name}</h4>
                                            <p className="text-xs text-slate-500">{m.role}</p>
                                        </div>
                                    </div>
                                    <button className="text-emerald-600 text-xs font-bold hover:underline">Profile</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    )
}

// 7. Input Form (The Entry Point)
const InputForm = ({ onGenerate, lang }) => {
  const [industry, setIndustry] = useState('Technology');
  const [location, setLocation] = useState('Jakarta, Indonesia');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onGenerate(industry, location);
    // setIsLoading(false); // No need as component unmounts on success
  };

  const t = {
    title: lang === 'id' ? 'Buat Rencana Bisnis Profesional' : 'Create Professional Business Plan',
    subtitle: lang === 'id' ? 'Platform SaaS berbasis AI untuk wirausahawan, startup, dan konsultan.' : 'AI-powered SaaS platform for entrepreneurs, startups, and consultants.',
    industryLabel: lang === 'id' ? 'Pilih Industri' : 'Select Industry',
    locLabel: lang === 'id' ? 'Lokasi Bisnis' : 'Business Location',
    btn: lang === 'id' ? 'Generate Business Plan' : 'Generate Business Plan',
    loading: lang === 'id' ? 'Sedang Menganalisis Pasar...' : 'Analyzing Market Data...',
    aiNote: lang === 'id' ? 'Menghubungi Gemini AI untuk data real-time...' : 'Contacting Gemini AI for real-time data...',
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <BrainCircuit size={64} className="text-emerald-500 animate-pulse mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">{t.loading}</h2>
        <p className="text-slate-500 mt-2 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500"/> {t.aiNote}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Visual/Info */}
        <div className="w-full md:w-1/2 bg-slate-900 text-white p-10 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
             <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500 rounded-full blur-3xl"></div>
             <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-bold text-2xl mb-6">
              <BrainCircuit className="text-emerald-400" size={32}/>
              <span>BizPlan<span className="text-emerald-400">Gen</span></span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{t.title}</h1>
            <p className="text-slate-300 text-lg mb-8">{t.subtitle}</p>
            
            <div className="space-y-4">
              {['Data-Driven Analysis', 'Financial Projections', 'Investor Ready Format'].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-400" />
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.industryLabel}</label>
              <select 
                value={industry} 
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="Technology">Technology / SaaS</option>
                <option value="FnB">Food & Beverage (Cafe/Resto)</option>
                <option value="Retail">Retail & E-commerce</option>
                <option value="Consulting">Professional Services</option>
                <option value="Agriculture">Agriculture / Agrotech</option>
                <option value="Fashion">Fashion & Apparel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.locLabel}</label>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. Jakarta, Indonesia"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={20} />
              {t.btn}
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">Powered by Gemini 2.0 • Trusted by 10,000+ Founders</p>
        </div>
      </div>
    </div>
  );
};


// --- MAIN APP ---
const App = () => {
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lang, setLang] = useState('en'); // 'en' or 'id'

  const handleGenerate = async (industry, location) => {
    // Call the Async AI Generator
    const data = await generateBusinessDataWithGemini(industry, location, lang);
    setGeneratedData(data);
    setHasGenerated(true);
  };

  if (!hasGenerated) {
    return <InputForm onGenerate={handleGenerate} lang={lang} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        lang={lang}
        setLang={setLang}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsMobileOpen(true)}
               className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
             >
               <Menu size={24} />
             </button>
             <h1 className="text-lg font-bold text-slate-700 hidden sm:block">
               Plan: <span className="text-emerald-600">{generatedData.industry} in {generatedData.location}</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <button className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                <Share2 size={16}/> Share
             </button>
             <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-md">
                <Save size={16}/> Save Project
             </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && <DashboardView data={generatedData} lang={lang} />}
          {activeTab === 'market' && <div className="text-center p-10"><PieChart size={48} className="mx-auto text-slate-300 mb-4"/><h3 className="text-xl text-slate-500 font-bold">Market Analysis Module</h3><p className="text-slate-400">AI has generated detailed STP. Please refer to Strategy & Roadmap for actionable insights.</p></div>}
          {activeTab === 'strategy' && <StrategyView lang={lang} data={generatedData} />}
          {activeTab === 'financial' && <FinancialView data={generatedData} lang={lang} />}
          {activeTab === 'roadmap' && <RoadmapView lang={lang} data={generatedData} />}
          {activeTab === 'mentor' && <MentorExportView lang={lang} contextData={generatedData} />}
          {activeTab === 'export' && <MentorExportView lang={lang} contextData={generatedData} />}
        </main>
      </div>
    </div>
  );
};

export default App;