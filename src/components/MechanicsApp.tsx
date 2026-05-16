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
  const [activeTab, setActiveTab] = useState<'analysis' | 'theory' | 'tutorial'>('analysis');

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
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {activeTab === 'analysis' && (
            <div className="px-5 py-5 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              </div>

              {/* View Mode Selector */}
              <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-100">
                <button 
                  onClick={() => setViewMode('stress')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'stress' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  应力分布 (Stress)
                </button>
                <button 
                  onClick={() => setViewMode('strain')}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'strain' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                >
                  应变云图 (Strain)
                </button>
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
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">模型控制 / Lab Control</h3>
                    <div className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded-md">PRO MODE</div>
                  </div>
                  
                  <div className="space-y-6">
                      {/* Length Slider */}
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

                      {/* Section Type & Dimensions */}
                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-slate-400 uppercase tracking-widest">截面与尺寸 (Section)</span>
                        </div>
                        <div className="flex gap-2">
                          {['hollow-circle', 'solid-circle', 'solid-rect'].map(type => (
                            <button 
                              key={type}
                              onClick={() => setSectionType(type as any)}
                              className={`flex-1 py-2 text-[8px] font-black rounded-xl border transition-all ${sectionType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                            >
                              {type === 'hollow-circle' ? '空心圆' : type === 'solid-circle' ? '实心圆' : '矩形'}
                            </button>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {sectionType.includes('circle') && (
                            <div className="group">
                              <div className="flex justify-between text-[8px] font-black mb-2">
                                <span className="text-slate-400">外径 D (mm)</span>
                                <span className="text-slate-900">{(D*1000).toFixed(0)}</span>
                              </div>
                              <input type="range" min="10" max="100" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                            </div>
                          )}
                          {sectionType === 'hollow-circle' && (
                            <div className="group">
                              <div className="flex justify-between text-[8px] font-black mb-2">
                                <span className="text-slate-400">内径 d (mm)</span>
                                <span className="text-slate-900">{(d*1000).toFixed(0)}</span>
                              </div>
                              <input type="range" min="5" max={(D*1000)-2} value={d*1000} onChange={e => setd(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                            </div>
                          )}
                          {sectionType === 'solid-rect' && (
                            <>
                              <div className="group">
                                <div className="flex justify-between text-[8px] font-black mb-2">
                                  <span className="text-slate-400">宽 B (mm)</span>
                                  <span className="text-slate-900">{(D*1000).toFixed(0)}</span>
                                </div>
                                <input type="range" min="10" max="100" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                              </div>
                              <div className="group">
                                <div className="flex justify-between text-[8px] font-black mb-2">
                                  <span className="text-slate-400">高 H (mm)</span>
                                  <span className="text-slate-900">{(H*1000).toFixed(0)}</span>
                                </div>
                                <input type="range" min="10" max="100" value={H*1000} onChange={e => setH(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Material Multi-select */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-slate-400 uppercase tracking-widest">材质 (Material)</span>
                          <span className="text-blue-600 text-[8px]">{results.material.E/1e9}GPa / {results.material.sigma_s/1e6}MPa</span>
                        </div>
                        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar">
                          {materials.map(m => (
                            <button 
                              key={m.id}
                              onClick={() => setMaterialId(m.id)}
                              className={`px-4 py-2 shrink-0 text-[10px] font-black rounded-xl border-2 transition-all ${materialId === m.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-400'}`}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Loads */}
                      <div className="space-y-6 pt-2">
                        <div className="group">
                          <div className="flex justify-between text-[10px] font-black mb-3">
                            <span className="text-slate-400 uppercase tracking-widest group-hover:text-amber-500 transition-colors">集中载荷 W (N)</span>
                            <span className="text-amber-500 font-mono bg-amber-50 px-2 py-0.5 rounded-md">{appliedLoad}N</span>
                          </div>
                          <input 
                            type="range" min="0" max="1000" step="50" 
                            value={appliedLoad} onChange={e => setAppliedLoad(parseFloat(e.target.value))}
                            className="w-full accent-amber-500 h-2 rounded-full bg-slate-100 appearance-none outline-none cursor-pointer"
                          />
                        </div>

                        <div className="group">
                          <div className="flex justify-between text-[10px] font-black mb-3">
                            <span className="text-slate-400 uppercase tracking-widest group-hover:text-sky-500 transition-colors">风载荷 q (N/m)</span>
                            <span className="text-sky-500 font-mono bg-sky-50 px-2 py-0.5 rounded-md">{windLoad}N/m</span>
                          </div>
                          <input 
                            type="range" min="0" max="500" step="50" 
                            value={windLoad} onChange={e => setWindLoad(parseFloat(e.target.value))}
                            className="w-full accent-sky-500 h-2 rounded-full bg-slate-100 appearance-none outline-none cursor-pointer"
                          />
                        </div>

                        <div className="group">
                          <div className="flex justify-between text-[10px] font-black mb-3">
                            <span className="text-slate-400 uppercase tracking-widest group-hover:text-rose-500 transition-colors">轴向压力 P (N)</span>
                            <span className="text-rose-500 font-mono bg-rose-50 px-2 py-0.5 rounded-md">{axialLoad}N</span>
                          </div>
                          <input 
                            type="range" min="0" max="20000" step="500" 
                            value={axialLoad} onChange={e => setAxialLoad(parseFloat(e.target.value))}
                            className="w-full accent-rose-500 h-2 rounded-full bg-slate-100 appearance-none outline-none cursor-pointer"
                          />
                        </div>
                      </div>
                  </div>
                </div>

                {/* Support Config Card */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">边界条件 / Boundary</h3>
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
                          <div className="text-[8px] font-mono text-slate-400 mt-0.5 text-balance">{s.desc}</div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Analysis Stats (Dark Mode Card) */}
                <div className="bg-slate-900 text-white p-7 rounded-[3rem] shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                  <h3 className="text-[10px] font-black mb-6 uppercase tracking-widest text-blue-400 border-l-2 border-blue-500 pl-3">详细计算步骤 / Step-by-Step</h3>
                  <div className="space-y-6 font-mono text-[9px] leading-relaxed">
                      <div className="group">
                        <div className="text-orange-400 mb-1 font-black">STEP 1: 几何参数</div>
                        <div className="pl-2 border-l border-white/10 opacity-80">
                          A = {(results.A * 1e4).toFixed(2)} cm² | I = {(results.I * 1e8).toFixed(2)} cm⁴
                          <br/>惯性半径 i = {(results.i * 100).toFixed(2)} cm
                        </div>
                      </div>
                      <div className="group">
                        <div className="text-orange-400 mb-1 font-black">STEP 2: 柔度 λ</div>
                        <div className="pl-2 border-l border-white/10 opacity-80">
                          计算柔度 λ = {results.lambda.toFixed(1)}
                          <br/>材料限制: λp = {results.lambda_p}, λs = {results.lambda_s}
                        </div>
                      </div>
                      <div className="group">
                        <div className="text-orange-400 mb-1 font-black">STEP 3: 临界应力判断</div>
                        <p className="pl-2 border-l border-white/10 text-blue-300 font-bold">
                          {results.bucklingType === 'large' ? 'λ ≥ λp: 适用欧拉公式 σcr = π²E/λ²' : 
                            results.bucklingType === 'medium' ? 'λs < λ < λp: 适用经验公式 σcr = a - bλ' : 
                            'λ ≤ λs: 强度破坏 σcr = σs'}
                        </p>
                      </div>
                      <div className="group pt-2 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 uppercase">临界载荷 F_cr</span>
                          <span className="text-sm font-bold text-blue-400">{(results.F_cr / 1000).toFixed(2)} kN</span>
                        </div>
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
          )}

          {activeTab === 'theory' && (
            <div className="px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center space-y-2">
                 <h2 className="text-2xl font-black tracking-tighter">力学理论库</h2>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mechanics Fundamentals</p>
               </div>

               <div className="space-y-6">
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                   <h3 className="text-xs font-black text-blue-600 mb-4 flex items-center gap-2">
                     <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                     1. 欧拉临界力公式
                   </h3>
                   <div className="bg-slate-50 p-4 rounded-2xl mb-4 font-mono text-center">
                     <BlockMath math="F_{cr} = \frac{\pi^2 EI}{(\mu l)^2}" />
                   </div>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                     适用于<span className="text-slate-900 font-bold">高柔度杆件</span> (λ ≥ λp)。说明理想压杆在失稳时刻的临界压力只与材料弹性模量 E、截面惯性矩 I 以及计算长度 μl 有关。
                   </p>
                 </div>

                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                   <h3 className="text-xs font-black text-rose-600 mb-4 flex items-center gap-2">
                     <span className="w-1.5 h-6 bg-rose-600 rounded-full"></span>
                     2. 经验公式 (直线公式)
                   </h3>
                   <div className="bg-slate-50 p-4 rounded-2xl mb-4 font-mono text-center">
                     <BlockMath math="\sigma_{cr} = a - b\lambda" />
                   </div>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                     适用于<span className="text-slate-900 font-bold">中柔度杆件</span> (λs &lt; λ &lt; λp)。此时材料处于弹塑性阶段，临界应力随柔度线性下降。
                   </p>
                 </div>

                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                   <h3 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-2">
                     <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
                     3. 常用长度系数 μ
                   </h3>
                   <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                      <div className="bg-slate-50 p-3 rounded-xl flex justify-between">
                        <span className="text-slate-400">两端铰支</span>
                        <span>μ = 1.0</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl flex justify-between">
                        <span className="text-slate-400">一端固定一端自由</span>
                        <span>μ = 2.0</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl flex justify-between">
                        <span className="text-slate-400">两端固定</span>
                        <span>μ = 0.5</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl flex justify-between">
                        <span className="text-slate-400">一端固定一端铰支</span>
                        <span>μ ≈ 0.7</span>
                      </div>
                   </div>
                 </div>
               </div>
               <div className="h-10"></div>
            </div>
          )}

          {activeTab === 'tutorial' && (
            <div className="px-8 py-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/40">
                    <Lightbulb size={40} />
                  </div>
                  <h2 className="text-3xl font-black tracking-tighter">快速引导</h2>
                  <p className="text-sm text-slate-400 font-bold">掌握 Pro 版的高级功能</p>
               </div>

               <div className="space-y-4">
                  {[
                    { title: "实时仿真", desc: "顶部渲染窗口支持交互，可以通过滑块实时看到物理模型的变化。" },
                    { title: "多重载荷", desc: "Pro 版支持同时施加集中力、风载荷及轴向压力，模拟复杂工况。" },
                    { title: "计算书生成", desc: "点击底部'分析'标签页下的黑色卡片，可查看完整的逻辑推导过程。" },
                    { title: "跨平台同步", desc: "右上角的绿色按钮支持下载离线单文件版，方便在 PC 端运行。" }
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-5 items-start bg-white p-6 rounded-[2.5rem] border border-slate-100">
                       <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-sm">
                         {i+1}
                       </div>
                       <div className="space-y-1">
                         <h4 className="font-black text-slate-900">{tip.title}</h4>
                         <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{tip.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
               <div className="h-10"></div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Tab Bar (APK Style) */}
        <nav className="h-20 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around px-4 pb-4 shrink-0 z-30">
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all transform active:scale-90 ${activeTab === 'analysis' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeTab === 'analysis' ? 'bg-blue-50' : ''}`}>
              <Scale size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">分析</span>
          </button>
          <button 
            onClick={() => setActiveTab('theory')}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all transform active:scale-90 ${activeTab === 'theory' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${activeTab === 'theory' ? 'bg-blue-50' : ''}`}>
              <Info size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">理论书</span>
          </button>
          <button 
            onClick={() => setActiveTab('tutorial')}
            className={`flex flex-col items-center gap-1.5 flex-1 transition-all transform active:scale-90 ${activeTab === 'tutorial' ? 'text-blue-600' : 'text-slate-400'}`}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center relative ${activeTab === 'tutorial' ? 'bg-blue-50' : ''}`}>
              <Lightbulb size={22} />
              {activeTab !== 'tutorial' && <div className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white translate-x-1 translate-y-1"></div>}
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
