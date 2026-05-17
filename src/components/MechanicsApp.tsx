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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden relative">
      <header className="h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Scale size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              压杆稳定虚拟实验 <span className="text-blue-600">/ 晾衣杆承载力分析</span>
            </h1>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider">
              基于材料力学原理，探究影响细长压杆稳定性的关键因素
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 text-white px-4 py-1.5 rounded-md text-xs font-black tracking-widest uppercase">
             LAB READY
           </div>
           <div className="border-2 border-slate-900 px-4 py-1.5 rounded-md text-xs font-black tracking-widest uppercase">
             CASE: CLOTHES_POLE_01
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
          
          {/* Top Visualizer Block */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-900 overflow-hidden flex flex-col p-6">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                 冯·米塞斯应力 (Von Mises)
               </h3>
               <div className="flex rounded-lg overflow-hidden border-2 border-blue-600">
                <button 
                  onClick={() => setViewMode('stress')}
                  className={`px-6 py-1.5 text-xs font-black transition-all ${viewMode === 'stress' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                >
                  应力
                </button>
                <button 
                  onClick={() => setViewMode('strain')}
                  className={`px-6 py-1.5 text-xs font-black transition-all ${viewMode === 'strain' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                >
                  应变
                </button>
               </div>
             </div>
             
             {/* Gradient Legend Placeholder */}
             <div className="w-64 h-4 bg-gradient-to-r from-blue-500 via-green-500 to-red-500 rounded-sm mb-2"></div>
             <div className="flex justify-between w-64 text-[10px] text-slate-500 font-mono mb-8">
               <span>0</span>
               <span>{(results.sigma_cr/1e6).toFixed(1)} MPa</span>
             </div>

             <div className="relative w-full" style={{ height: '200px' }}>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Parameters Block */}
            <div className="lg:col-span-4 bg-slate-50 rounded-2xl shadow-sm border-2 border-slate-900 p-6 flex flex-col gap-6">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-l-4 border-slate-900 pl-2">
                 参数设置 / PARAMETERS
               </h3>
               
               <div className="flex flex-col gap-5">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500">材质选择</label>
                   <select 
                     value={materialId} 
                     onChange={e => setMaterialId(e.target.value)}
                     className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm font-bold shadow-sm"
                   >
                     {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                   <div className="text-[9px] font-mono text-slate-500 bg-slate-200/50 p-2 rounded-md">
                     E = {(results.material.E/1e9).toFixed(1)} GPa, 屈服强度 = {(results.material.sigma_s/1e6).toFixed(0)} MPa
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500">约束条件</label>
                   <select 
                     value={supportId} 
                     onChange={e => setSupportId(e.target.value)}
                     className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm font-bold shadow-sm"
                   >
                     {supports.map(s => <option key={s.id} value={s.id}>{s.name} (μ={s.mu})</option>)}
                   </select>
                   <div className="text-[10px] text-slate-500 font-medium">
                     {supports.find(s => s.id === supportId)?.desc}
                   </div>
                 </div>

                 <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-500">杆长 L (m)</span>
                      <span className="text-blue-600 font-mono text-xs">{length.toFixed(2)} m</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="5.0" step="0.1" 
                      value={length} onChange={e => setLength(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-full appearance-none"
                    />
                 </div>

                 <div className="space-y-2 pt-2">
                   <label className="text-[10px] font-black text-slate-500">截面形状</label>
                   <select 
                     value={sectionType} 
                     onChange={e => setSectionType(e.target.value as any)}
                     className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-sm font-bold shadow-sm"
                   >
                     <option value="hollow-circle">空心圆管 (常见晾衣杆)</option>
                     <option value="solid-circle">实心圆柱</option>
                     <option value="solid-rect">实心矩形</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    {sectionType.includes('circle') && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-slate-500">外径 D (mm)</span>
                          <span className="text-slate-900 font-mono">{(D*1000).toFixed(0)}</span>
                        </div>
                        <input type="range" min="10" max="100" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                      </div>
                    )}
                    {sectionType === 'hollow-circle' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="text-slate-500">内径 d (mm)</span>
                          <span className="text-slate-900 font-mono">{(d*1000).toFixed(0)}</span>
                        </div>
                        <input type="range" min="5" max={(D*1000)-2} value={d*1000} onChange={e => setd(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                      </div>
                    )}
                    {sectionType === 'solid-rect' && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black">
                            <span className="text-slate-500">宽 B (mm)</span>
                            <span className="text-slate-900 font-mono">{(D*1000).toFixed(0)}</span>
                          </div>
                          <input type="range" min="10" max="100" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black">
                            <span className="text-slate-500">高 H (mm)</span>
                            <span className="text-slate-900 font-mono">{(H*1000).toFixed(0)}</span>
                          </div>
                          <input type="range" min="10" max="100" value={H*1000} onChange={e => setH(parseFloat(e.target.value)/1000)} className="w-full accent-slate-900 h-1.5" />
                        </div>
                      </>
                    )}
                 </div>

                 <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black">
                        <span className="text-slate-500">集中载荷 W (N)</span>
                        <span className="text-amber-500 font-mono text-xs">{appliedLoad} N</span>
                      </div>
                      <input 
                        type="range" min="0" max="1000" step="50" 
                        value={appliedLoad} onChange={e => setAppliedLoad(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-full appearance-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black">
                        <span className="text-slate-500">轴向压力 P (N)</span>
                        <span className="text-rose-500 font-mono text-xs">{axialLoad} N</span>
                      </div>
                      <input 
                        type="range" min="0" max="50000" step="500" 
                        value={axialLoad} onChange={e => setAxialLoad(parseFloat(e.target.value))}
                        className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-full appearance-none"
                      />
                    </div>
                 </div>

               </div>
            </div>

            {/* Right Results & Analysis Block */}
            <div className="lg:col-span-8 flex flex-col gap-6">
               
               {/* Verdict Block */}
               <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-900 p-6">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-l-4 border-blue-600 pl-2">
                     压杆稳定计算结果 / BUCKLING VERDICT
                   </h3>
                   <span className="text-[9px] text-slate-400 font-mono">REF: EULER-STABILITY</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-6 text-center">
                      <div className="text-xs font-black text-slate-500 mb-2">临界压力 F_CR</div>
                      <div className="text-3xl font-black font-mono">{(results.F_cr / 1000).toFixed(2)} <span className="text-sm text-slate-400">kN</span></div>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-6 text-center">
                      <div className="text-xs font-black text-slate-500 mb-2">临界应力 Σ_CR</div>
                      <div className="text-3xl font-black font-mono">{(results.sigma_cr / 1e6).toFixed(1)} <span className="text-sm text-slate-400">MPa</span></div>
                    </div>
                    <div className="border border-slate-200 rounded-xl p-6 text-center">
                      <div className="text-xs font-black text-slate-500 mb-2">柔度 λ</div>
                      <div className="text-3xl font-black font-mono">{results.lambda.toFixed(1)}</div>
                    </div>
                    <div className={`rounded-xl p-6 text-center flex flex-col justify-center items-center ${results.safety_factor >= 2.0 ? 'bg-emerald-500 text-white' : results.safety_factor >= 1.0 ? 'bg-amber-400 text-slate-900' : 'bg-rose-500 text-white'}`}>
                      <div className="text-xs font-black mb-1 opacity-90">轴向稳定安全系数 N_ST</div>
                      <div className="text-4xl font-black font-mono leading-none tracking-tighter my-1">
                        {results.safety_factor > 999 ? '>999' : results.safety_factor.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest mt-1">
                        {results.safety_factor >= 2.0 ? 'STABLE' : results.safety_factor >= 1.0 ? 'WARNING' : 'CRITICAL'}
                      </div>
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                 {/* Curve */}
                 <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-900 p-6 flex flex-col">
                   <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2 border-l-4 border-slate-900 pl-2">
                     临界应力图象 / CURVE
                   </h3>
                   <div className="flex-1 w-full text-[10px] font-mono min-h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="lambda" tick={{ fill: '#94A3B8' }} />
                          <YAxis domain={[0, 'auto']} tick={{ fill: '#94A3B8' }} />
                          <RechartsTooltip 
                             contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '12px', color: '#fff' }}
                             itemStyle={{ color: '#F97316' }}
                          />
                          <ReferenceLine x={results.lambda} stroke="#2563EB" strokeWidth={2} strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="sigma" name="临界应力 (MPa)" stroke="#2563EB" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                 </div>

                 {/* Calculations */}
                 <div className="bg-slate-900 text-white rounded-2xl shadow-sm border-2 border-slate-900 p-6 overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                   <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-l-4 border-orange-500 pl-2">
                     计算与分析过程 / ANALYSIS
                   </h3>
                   <div className="space-y-4 font-mono text-xs leading-relaxed z-10 relative">
                     <div className="bg-white/5 rounded-lg p-3">
                       <div className="text-orange-400 font-bold mb-1">Step 01: 几何截面性质计算</div>
                       <div className="text-slate-300">
                         A = {(results.A * 1e4).toFixed(3)} cm²<br/>
                         I = {(results.I * 1e8).toFixed(3)} cm⁴<br/>
                         i = {(results.i * 100).toFixed(3)} cm
                       </div>
                     </div>
                     <div className="bg-white/5 rounded-lg p-3">
                       <div className="text-orange-400 font-bold mb-1">Step 02: 柔度值判定</div>
                       <div className="text-slate-300">
                         λ = μL / i = {results.lambda.toFixed(1)}<br/>
                         参考界限: λp={results.lambda_p.toFixed(1)}, λs={results.lambda_s.toFixed(1)}
                       </div>
                     </div>
                     <div className="bg-white/5 rounded-lg p-3">
                       <div className="text-orange-400 font-bold mb-1">Step 03: 临界应力求值</div>
                       <div className="text-slate-300">
                         {results.bucklingType === 'large' ? '判定为大柔度杆，适用 Euler 公式' : 
                          results.bucklingType === 'medium' ? '判定为中柔度杆，适用经验直线公式' : 
                          '判定为小柔度杆，由屈服强度控制'}<br/>
                         σ_cr = {(results.sigma_cr/1e6).toFixed(1)} MPa
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
