import { useState, useEffect } from 'react';
import { materials, supports, calculateBuckling, SectionProps } from '../utils/mechanics';
import { BeamSimulator } from './BeamSimulator';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine, ResponsiveContainer 
} from 'recharts';
import { Info, Settings, Lightbulb, Scale, Wind } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export function MechanicsApp() {
  const [materialId, setMaterialId] = useState('Q235');
  const [supportId, setSupportId] = useState('pinned-pinned');
  const [length, setLength] = useState(2.0); // meters
  const [sectionType, setSectionType] = useState<SectionProps['type']>('hollow-circle');
  const [D, setD] = useState(0.04); // meters (40mm)
  const [d, setd] = useState(0.036); // meters (36mm)
  const [H, setH] = useState(0.04); // meters
  const [appliedLoad, setAppliedLoad] = useState(500); // N (about 50kg clothes)
  
  // New Simulator states
  const [loadPos, setLoadPos] = useState(0.5);
  const [windLoad, setWindLoad] = useState(0); // Wind N/m
  const [axialLoad, setAxialLoad] = useState(0); // Compression force (for buckling sim)
  const [viewMode, setViewMode] = useState<'stress'|'strain'>('stress');

  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    let currentD = D;
    let currentd = d;
    if (sectionType === 'hollow-circle' && currentd >= currentD) {
      currentd = currentD - 0.002;
      setd(currentd);
    }
    const res = calculateBuckling(
      materialId, 
      supportId, 
      { type: sectionType, D: currentD, d: currentd, H: H }, 
      length, 
      axialLoad > 0 ? axialLoad : 1 // Evaluate buckling via axial load mainly
    );
    setResults(res);
  }, [materialId, supportId, length, sectionType, D, d, H, axialLoad]);

  const generateCurveData = () => {
    if (!results) return [];
    const data = [];
    const maxLambda = Math.max(250, results.lambda_p * 1.5);
    for (let lam = 0; lam <= maxLambda; lam += 5) {
      let sig = 0;
      if (lam >= results.lambda_p) {
        sig = (Math.PI * Math.PI * results.material.E) / (lam * lam);
      } else if (lam >= results.lambda_s) {
        sig = results.material.a - results.material.b * lam;
      } else {
        sig = results.material.sigma_s;
      }
      data.push({
        lambda: lam,
        sigma: sig / 1e6, // Convert to MPa
        label: lam.toFixed(0)
      });
    }
    return data;
  };

  const curveData = generateCurveData();

  if (!results) return null;

  return (
    <div className="min-h-screen bg-neutral-900 text-slate-900 font-sans flex items-center justify-center p-0 md:p-8 select-none">
      {/* Mobile Frame / APK Style Container */}
      <div className="w-full h-[100dvh] md:w-[420px] md:h-[840px] md:max-h-[90vh] bg-slate-50 md:rounded-[3rem] md:shadow-2xl overflow-hidden relative flex flex-col border-0 md:border-[12px] border-slate-900 shadow-blue-500/20">
        
        {/* Status Bar Placeholder (Hidden on small mobile screens to use native) */}
        <div className="hidden md:flex h-8 w-full bg-slate-50 justify-between items-center px-8 pt-4 shrink-0">
          <div className="text-[10px] font-black text-slate-400">9:41</div>
          <div className="flex gap-1.5 items-center">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
             <div className="w-4 h-2 rounded-[2px] border border-slate-300 relative">
                <div className="absolute inset-x-0.5 inset-y-0.5 bg-slate-400 rounded-[1px]"></div>
             </div>
          </div>
        </div>

        {/* Header */}
        <header className="px-5 py-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
               <Scale size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight">材料力学 Pro</h1>
              <div className="text-[8px] font-bold text-blue-600 tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"></span>
                SYSTEM ACTIVE
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href="/Mechanics_Offline_App.html" 
              download="Mechanics_Offline_App.html"
              title="下载离线版"
              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Wind size={18} />
            </a>
            <button className="p-2 bg-slate-50 text-slate-400 rounded-xl">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-[#F8FAFC]">
          
          {/* Simulator Visualizer Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-0 overflow-hidden relative shadow-2xl shadow-blue-900/20 border border-white/5" style={{ height: '260px' }}>
             <BeamSimulator 
              length={length}
              section={{ type: sectionType, D, d, H }}
              material={results.material}
              supportId={supportId}
              pointLoadMagnitude={appliedLoad}
              pointLoadPosition={loadPos}
              onPositionChange={setLoadPos}
              uniformLoad={windLoad}
              axialLoad={axialLoad}
              viewMode={viewMode}
            />
            <div className="absolute top-4 right-4 flex bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 p-1">
              <button 
                className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all ${viewMode === 'stress' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60'}`}
                onClick={() => setViewMode('stress')}
              >应力</button>
              <button 
                className={`px-4 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all ${viewMode === 'strain' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/60'}`}
                onClick={() => setViewMode('strain')}
              >应变</button>
            </div>
          </div>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 gap-4">
             <div className={`p-5 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-lg transition-colors duration-500 ${results.safety_factor >= 2.0 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : results.safety_factor >= 1.0 ? 'bg-amber-400 text-slate-900 shadow-amber-400/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
                <div className="text-[9px] font-black uppercase opacity-70 mb-1 tracking-widest">安全指数</div>
                <div className="text-4xl font-black font-mono leading-none tracking-tighter">
                  {results.safety_factor > 99 ? 'MAX' : results.safety_factor.toFixed(1)}
                </div>
                <div className="text-[9px] mt-2 font-black bg-black/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  {results.safety_factor >= 2.0 ? 'STABLE' : results.safety_factor >= 1.0 ? 'WARNING' : 'CRITICAL'}
                </div>
              </div>

              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
                 <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full scale-150 opacity-50 group-hover:scale-175 transition-transform"></div>
                 <div className="relative">
                   <div className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">临界载荷</div>
                   <div className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{(results.F_cr / 1000).toFixed(2)} <span className="text-[10px] text-slate-400 font-medium">kN</span></div>
                   <div className="mt-2 text-[8px] text-blue-600 font-bold uppercase tracking-tighter">
                      {results.bucklingType === 'large' ? 'Euler Standard' : results.bucklingType === 'medium' ? 'Linear Empirical' : 'Plastic Yield'}
                   </div>
                 </div>
              </div>
          </div>

          {/* Control Center */}
          <section className="space-y-4">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">控制中心 / UI Control</h3>
                 <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded-md">LIVE SYNC</div>
               </div>
               
               <div className="space-y-6">
                  <div className="group">
                    <div className="flex justify-between text-[10px] font-black mb-3">
                      <span className="text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">杆件长度 (Length)</span>
                      <span className="text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-md">{length.toFixed(2)}m</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="5.0" step="0.1" 
                      value={length} onChange={e => setLength(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-2 rounded-full bg-slate-100 appearance-none outline-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-widest">材质选择 (Material)</span>
                      <span className="text-slate-900 font-mono">CODE: {results.material.id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       {materials.map(m => (
                         <button 
                           key={m.id}
                           onClick={() => setMaterialId(m.id)}
                           className={`px-4 py-3 text-[10px] font-black rounded-2xl border-2 transition-all duration-300 transform active:scale-95 ${materialId === m.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/30' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                         >
                           {m.name}
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="group">
                    <div className="flex justify-between text-[10px] font-black mb-3">
                      <span className="text-slate-400 uppercase tracking-widest group-hover:text-orange-500 transition-colors">横向载荷 (Point Load)</span>
                      <span className="text-orange-500 font-mono bg-orange-50 px-2 py-0.5 rounded-md">{appliedLoad}N</span>
                    </div>
                    <input 
                      type="range" min="10" max="1000" step="10" 
                      value={appliedLoad} onChange={e => setAppliedLoad(parseFloat(e.target.value))}
                      className="w-full accent-orange-500 h-2 rounded-full bg-slate-100 appearance-none outline-none cursor-pointer"
                    />
                    <div className="mt-2 text-[8px] text-slate-400 font-bold uppercase text-right">EQUIV: {(appliedLoad/9.81).toFixed(1)}kg</div>
                  </div>
               </div>
            </div>

            {/* Support Config Card */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">约束边界 / Edge Conditions</h3>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  {supports.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSupportId(s.id)}
                      className={`p-4 rounded-[1.5rem] border-2 text-left transition-all duration-300 relative overflow-hidden group/btn ${supportId === s.id ? 'bg-blue-50 border-blue-600' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}
                    >
                      {supportId === s.id && <div className="absolute right-2 top-2 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                      <div className={`text-[10px] font-black tracking-tight ${supportId === s.id ? 'text-blue-700' : 'text-slate-500'}`}>{s.name}</div>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">μ = {s.mu}</div>
                    </button>
                  ))}
               </div>
            </div>

            {/* Analysis Stats (Dark Mode Card) */}
            <div className="bg-slate-900 text-white p-7 rounded-[3rem] shadow-2xl shadow-slate-900/40 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
               <h3 className="text-[10px] font-black mb-6 uppercase tracking-widest text-blue-400 border-l-2 border-blue-500 pl-3">核心计算参数 / Core Stats</h3>
               <div className="space-y-5 font-mono text-[10px]">
                  <div className="flex justify-between items-baseline group">
                    <span className="text-slate-400 uppercase text-[9px] group-hover:text-white transition-colors">杆件截面积 (Area)</span>
                    <span className="text-sm font-bold tracking-tighter">{(results.A * 1e4).toFixed(2)} <span className="text-[10px] opacity-40 font-normal">cm²</span></span>
                  </div>
                  <div className="flex justify-between items-baseline group">
                    <span className="text-slate-400 uppercase text-[9px] group-hover:text-white transition-colors">截面惯性矩 (Mom. I)</span>
                    <span className="text-sm font-bold tracking-tighter">{(results.I * 1e8).toFixed(2)} <span className="text-[10px] opacity-40 font-normal">cm⁴</span></span>
                  </div>
                  <div className="flex justify-between items-baseline group">
                    <span className="text-slate-400 uppercase text-[9px] group-hover:text-white transition-colors">结构柔度 (Slenderness)</span>
                    <span className={`text-sm font-bold tracking-tighter ${results.lambda > results.lambda_p ? 'text-rose-400' : 'text-emerald-400'}`}>{results.lambda.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-baseline group pt-2 border-t border-white/10">
                    <span className="text-slate-400 uppercase text-[9px] group-hover:text-white transition-colors">临界应力 (Crit. Stress)</span>
                    <span className="text-sm font-bold text-blue-400 tracking-tighter">{(results.sigma_cr / 1e6).toFixed(1)} <span className="text-[10px] opacity-40 font-normal">MPa</span></span>
                  </div>
               </div>
            </div>

            {/* Mini Chart Area */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100">
               <div className="text-[10px] font-black mb-6 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                 <span>稳定性曲线图象</span>
                 <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">REALTIME</span>
               </div>
               <div className="h-44 w-full text-[8px] font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData}>
                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="lambda" hide />
                      <YAxis hide domain={[0, 'auto']} />
                      <ReferenceLine x={results.lambda} stroke="#F97316" strokeWidth={3} strokeLinecap="round" />
                      <Line type="monotone" dataKey="sigma" stroke="#2563EB" strokeWidth={4} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-4 text-[9px] text-center text-slate-400 font-bold uppercase tracking-wider bg-slate-50 py-2 rounded-xl">
                  当前状态: <span className="text-slate-900">{results.bucklingType === 'large' ? '高柔度/Euler' : results.bucklingType === 'medium' ? '中柔度/直线' : '极低柔度/强度'}</span>
               </div>
            </div>

            <div className="h-16"></div> {/* Bottom navigation buffer */}
          </section>
        </div>

        {/* Bottom Navigation Tab Bar (APK Style) */}
        <nav className="h-20 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-4 pb-4 shrink-0 z-30">
          <button className="flex flex-col items-center gap-1.5 flex-1 transition-all transform active:scale-90 text-blue-600">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Scale size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">分析</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 flex-1 transition-all transform active:scale-90 text-slate-400">
            <div className="w-10 h-10 flex items-center justify-center">
              <Info size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">理论书</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 flex-1 transition-all transform active:scale-90 text-slate-400">
            <div className="w-10 h-10 flex items-center justify-center relative">
              <Lightbulb size={22} />
              <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white translate-x-1 translate-y-1"></div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">引导台</span>
          </button>
        </nav>

        {/* Home Indicator / Gesture Bar */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
           <div className="h-1.5 w-32 bg-slate-900/5 rounded-full overflow-hidden">
              <div className="h-full w-full bg-slate-900 opacity-20"></div>
           </div>
        </div>
      </div>
    </div>
  );
}
