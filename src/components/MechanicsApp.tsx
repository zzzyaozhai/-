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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-6 pb-20 select-none overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-6 border-b-2 border-slate-900 pb-2">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              压杆稳定虚拟实验 <span className="text-blue-600">/ 晾衣杆承载力分析</span>
            </h1>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">
              基于材料力学原理，探究影响细长压杆稳定性的关键因素
            </p>
          </div>
          <div className="hidden sm:flex gap-4 mb-1">
            <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-sm">LAB READY</div>
            <div className="px-3 py-1 border border-slate-900 text-[10px] font-bold rounded-sm">CASE: CLOTHES_POLE_01</div>
          </div>
        </header>

        {/* Interactive Simulator Top Row */}
        <div className="bg-white border-2 border-slate-900 rounded-xl mb-4 overflow-hidden relative shadow-sm" style={{ height: '320px' }}>
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
          <div className="absolute top-4 right-4 flex bg-white/90 backdrop-blur-sm border border-slate-300 rounded overflow-hidden shadow-sm">
            <button 
              className={`px-3 py-1 text-xs font-bold ${viewMode === 'stress' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setViewMode('stress')}
            >应力</button>
            <button 
              className={`px-3 py-1 text-xs font-bold ${viewMode === 'strain' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              onClick={() => setViewMode('strain')}
            >应变</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <section className="bg-white border-2 border-slate-900 rounded-xl p-4">
              <h2 className="text-xs font-black uppercase tracking-widest mb-4 border-l-4 border-slate-900 pl-2">参数设置 / Parameters</h2>

              {/* Material */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">材质选择</label>
                <select 
                  value={materialId} 
                  onChange={e => setMaterialId(e.target.value)}
                  className="w-full rounded border border-slate-300 shadow-sm focus:ring-slate-900 focus:border-slate-900 text-sm font-mono p-2 bg-white text-slate-900"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <div className="text-[10px] font-mono text-slate-600 mt-1 bg-slate-100 p-2 rounded">
                  E = {(results.material.E/1e9).toFixed(1)} GPa, 
                  屈服强度 = {(results.material.sigma_s/1e6).toFixed(0)} MPa
                </div>
              </div>

              {/* Support */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">约束条件</label>
                <select 
                  value={supportId} 
                  onChange={e => setSupportId(e.target.value)}
                  className="w-full rounded border border-slate-300 shadow-sm focus:ring-slate-900 focus:border-slate-900 text-sm font-mono p-2 bg-white text-slate-900"
                >
                  {supports.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (μ={s.mu})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">{results.support.desc}</p>
              </div>

              {/* Length */}
              <div className="mb-4">
                <label className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                  <span>杆长 L (m)</span>
                  <span className="text-blue-600 font-bold font-mono">{length.toFixed(2)} m</span>
                </label>
                <input 
                  type="range" min="0.5" max="5.0" step="0.1" 
                  value={length} onChange={e => setLength(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 bg-slate-200 h-1 rounded-full appearance-none outline-none"
                />
              </div>

              {/* Section */}
              <div className="mb-4 border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">截面形状</label>
                <select 
                  value={sectionType} 
                  onChange={e => setSectionType(e.target.value as any)}
                  className="w-full rounded border border-slate-300 shadow-sm focus:ring-slate-900 focus:border-slate-900 text-sm font-mono p-2 mb-3 bg-white text-slate-900"
                >
                  <option value="hollow-circle">空心圆管 (常见晾衣杆)</option>
                  <option value="solid-circle">实心圆杆</option>
                  <option value="solid-rect">实心矩形</option>
                </select>

                {sectionType === 'hollow-circle' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">外径 D (mm)</label>
                      <input type="number" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full border border-slate-300 p-1 rounded text-sm font-mono"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">内径 d (mm)</label>
                      <input type="number" value={d*1000} onChange={e => setd(parseFloat(e.target.value)/1000)} className="w-full border border-slate-300 p-1 rounded text-sm font-mono"/>
                    </div>
                  </div>
                )}
                {sectionType === 'solid-circle' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">直径 D (mm)</label>
                    <input type="number" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full border border-slate-300 p-1 rounded text-sm font-mono"/>
                  </div>
                )}
                {sectionType === 'solid-rect' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">宽 (mm)</label>
                      <input type="number" value={D*1000} onChange={e => setD(parseFloat(e.target.value)/1000)} className="w-full border border-slate-300 p-1 rounded text-sm font-mono"/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">高 (mm)</label>
                      <input type="number" value={H*1000} onChange={e => setH(parseFloat(e.target.value)/1000)} className="w-full border border-slate-300 p-1 rounded text-sm font-mono"/>
                    </div>
                  </div>
                )}
              </div>

              {/* Load */}
              <div className="mb-2 border-t border-slate-100 pt-4">
                <label className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                  <span>衣物重量 (横向集中载荷) W (N)</span>
                  <span className="text-orange-500 font-bold font-mono">{appliedLoad.toFixed(0)} N</span>
                </label>
                <div className="text-[10px] text-slate-500 mb-2 font-mono">约相当于 {(appliedLoad/9.81).toFixed(1)} kg 的衣物重量</div>
                <input 
                  type="range" min="10" max="1000" step="10" 
                  value={appliedLoad} onChange={e => setAppliedLoad(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 bg-slate-200 h-1 rounded-full appearance-none outline-none mb-4"
                />

                <label className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                  <span>风载荷 (横向均布载荷) q (N/m)</span>
                  <span className="text-sky-500 font-bold font-mono">{windLoad.toFixed(0)} N/m</span>
                </label>
                <input 
                  type="range" min="0" max="500" step="10" 
                  value={windLoad} onChange={e => setWindLoad(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 bg-slate-200 h-1 rounded-full appearance-none outline-none mb-4"
                />

                <label className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                  <span>轴向端部压力 P (N)</span>
                  <span className="text-red-500 font-bold font-mono">{axialLoad.toFixed(0)} N</span>
                </label>
                <div className="text-[10px] text-slate-500 mb-2 font-mono">(顶在墙壁上的预紧力导致的由于压杆失稳的载荷)</div>
                <input 
                  type="range" min="0" max="50000" step="100" 
                  value={axialLoad} onChange={e => setAxialLoad(parseFloat(e.target.value))}
                  className="w-full accent-red-500 bg-slate-200 h-1 rounded-full appearance-none outline-none"
                />
              </div>

            </section>
          </div>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Main Result Card */}
            <section className="bg-white border-2 border-slate-900 rounded-xl p-4 flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex-1 w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-black uppercase tracking-widest border-l-4 border-blue-600 pl-2">压杆稳定计算结果 / Buckling Verdict</h2>
                  <span className="font-mono text-[10px] text-slate-400">REF: EULER-STABILITY</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-slate-300 bg-slate-50 p-3 rounded text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">临界压力 <InlineMath math="F_{cr}" /></div>
                    <div className="text-lg font-black text-slate-900 mt-1 font-mono">{(results.F_cr / 1000).toFixed(2)} <span className="text-[10px] font-normal text-slate-500">kN</span></div>
                  </div>
                  <div className="border border-slate-300 bg-slate-50 p-3 rounded text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">临界应力 <InlineMath math="\sigma_{cr}" /></div>
                    <div className="text-lg font-black text-slate-900 mt-1 font-mono">{(results.sigma_cr / 1e6).toFixed(1)} <span className="text-[10px] font-normal text-slate-500">MPa</span></div>
                  </div>
                  <div className="border border-slate-300 bg-slate-50 p-3 rounded text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">柔度 <InlineMath math="\lambda" /></div>
                    <div className="text-lg font-black text-slate-900 mt-1 font-mono">{results.lambda.toFixed(1)}</div>
                  </div>
                  <div className={`p-3 border-2 rounded flex flex-col items-center justify-center text-center ${results.safety_factor >= 2.0 ? 'bg-green-400 border-green-500 text-slate-900' : results.safety_factor >= 1.0 ? 'bg-yellow-400 border-yellow-500 text-slate-900' : 'bg-red-500 border-red-600 text-white'}`}>
                    <div className="text-[10px] font-bold uppercase opacity-90">轴向稳定安全系数 <InlineMath math="n_{st}" /></div>
                    <div className="text-2xl font-black mt-1 font-mono leading-none">
                      {results.safety_factor > 999 ? '>999' : results.safety_factor.toFixed(2)}
                    </div>
                    <div className="text-[10px] mt-1 font-bold tracking-widest uppercase">
                      {results.safety_factor >= 2.0 ? 'STABLE' : results.safety_factor >= 1.0 ? 'MARGINAL' : 'FAIL'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Analysis Tabs & Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
              
              <section className="bg-white border-2 border-slate-900 rounded-xl p-4 flex flex-col">
                <h2 className="text-xs font-black uppercase tracking-widest mb-4 border-l-4 border-blue-600 pl-2">临界应力图象 / Curve</h2>
                <div className="flex-grow min-h-[200px] w-full text-xs font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="lambda" 
                        type="number" 
                        domain={[0, 'dataMax']} 
                        label={{ value: '柔度 λ', position: 'bottom', offset: 0, fill: '#64748B' }} 
                        stroke="#94A3B8"
                      />
                      <YAxis 
                        label={{ value: '临界应力 σcr (MPa)', angle: -90, position: 'insideLeft', fill: '#64748B' }} 
                        stroke="#94A3B8"
                      />
                      <RechartsTooltip formatter={(value: number) => [`${value.toFixed(1)} MPa`, '临界应力']} contentStyle={{ backgroundColor: '#1E293B', color: '#F8FAFC', border: 'none', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }} />
                      <ReferenceLine x={results.lambda_p} stroke="#94A3B8" strokeDasharray="3 3" label={{ position: 'top', value: 'λp', fill: '#94A3B8', fontSize: 10 }} />
                      <ReferenceLine x={results.lambda_s} stroke="#94A3B8" strokeDasharray="3 3" label={{ position: 'top', value: 'λs', fill: '#94A3B8', fontSize: 10 }} />
                      <ReferenceLine x={results.lambda} stroke="#F97316" label={{ position: 'insideBottomRight', value: '当前杆件', fill: '#F97316', fontSize: 10 }} />
                      <ReferenceLine y={results.sigma_cr / 1e6} stroke="#F97316" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="sigma" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-[10px] text-slate-600 bg-slate-100 p-2 rounded border border-slate-200">
                  <span className="font-bold uppercase">状态结论: </span> 
                  {results.bucklingType === 'large' ? '大柔度杆，适用欧拉公式。' : 
                   results.bucklingType === 'medium' ? '中等柔度杆，适用经验直线公式。' : 
                   '小柔度杆，发生强度屈服，不发生失稳。'}
                </div>
              </section>

              <section className="bg-slate-900 text-slate-200 border-2 border-slate-900 rounded-xl p-4 overflow-y-auto max-h-[500px]">
                <div className="sticky top-0 bg-slate-900 pb-2 mb-4 z-10">
                  <h2 className="text-xs font-black uppercase tracking-widest border-l-4 border-orange-500 pl-2">计算与分析过程 / Analysis</h2>
                </div>
                
                <div className="space-y-3 text-[11px] font-mono leading-relaxed">
                  
                  <div className="p-3 bg-white/5 rounded border border-white/10">
                    <p className="text-[10px] text-orange-400 mb-1 tracking-tighter">Step 01: 几何截面性质计算</p>
                    <p>
                      A {sectionType === 'hollow-circle' ? <InlineMath math="= \frac{\pi(D^2 - d^2)}{4}" /> : null} 
                      = {(results.A * 1e4).toFixed(2)} cm²
                    </p>
                    <p>
                      I: {(results.I * 1e8).toFixed(2)} cm⁴，
                      i = <InlineMath math="\sqrt{\frac{I}{A}}" /> = {(results.i * 1e2).toFixed(2)} cm
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded border border-white/10">
                    <p className="text-[10px] text-orange-400 mb-1 tracking-tighter">Step 02: 柔度计算与杆件分类</p>
                    <p>
                      <InlineMath math="l_0" /> = <InlineMath math="\mu l" /> = {results.support.mu} × {length} = {results.l0.toFixed(2)} m
                    </p>
                    <p>
                      <InlineMath math="\lambda" /> = <InlineMath math="\frac{l_0}{i}" /> = {results.lambda.toFixed(1)}
                    </p>
                    <div className="my-2 border-l-2 border-slate-600 pl-2 text-slate-400">
                      材料极限柔度: <InlineMath math="\lambda_p" /> = {results.lambda_p.toFixed(1)}, <InlineMath math="\lambda_s" /> = {results.lambda_s.toFixed(1)}
                    </div>
                    <p className="text-blue-400 flex flex-wrap items-center gap-1 font-bold">
                      {results.bucklingType === 'large' && <><InlineMath math="\lambda \ge \lambda_p" />，大柔度杆</>}
                      {results.bucklingType === 'medium' && <><InlineMath math="\lambda_s \le \lambda < \lambda_p" />，中柔度杆</>}
                      {results.bucklingType === 'small' && <><InlineMath math="\lambda < \lambda_s" />，小柔度杆</>}
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded border border-white/10">
                    <p className="text-[10px] text-orange-400 mb-1 tracking-tighter">Step 03: 临界载荷计算</p>
                    {results.bucklingType === 'large' && (
                      <div>适用欧拉公式：<BlockMath math="\sigma_{cr} = \frac{\pi^2 E}{\lambda^2}" /></div>
                    )}
                    {results.bucklingType === 'medium' && (
                      <div>经验折线公式：<BlockMath math="\sigma_{cr} = a - b\lambda" /></div>
                    )}
                    {results.bucklingType === 'small' && (
                      <div>不发生失稳：<BlockMath math="\sigma_{cr} = \sigma_s" /></div>
                    )}
                    <p className="font-bold text-white mt-1">
                      <InlineMath math="\sigma_{cr}" /> = {(results.sigma_cr / 1e6).toFixed(1)} MPa
                    </p>
                    <p className="font-bold text-white">
                      <InlineMath math="F_{cr}" /> = {(results.F_cr / 1000).toFixed(2)} kN
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded border border-white/10">
                    <p className="text-[10px] text-orange-400 mb-1 tracking-tighter">Step 04: 稳定性校核</p>
                    <p className="text-slate-400 mb-1">
                      给定载荷 F = {appliedLoad} N, 材料自重为 {results.self_weight.toFixed(1)} N。
                    </p>
                    <p className="text-lg font-bold text-white">
                      <InlineMath math="n_{st} = \frac{F_{cr}}{F}" /> = <span className={results.safety_factor >= 2.0 ? 'text-green-400' : 'text-red-400'}>{results.safety_factor.toFixed(2)}</span>
                    </p>
                  </div>

                </div>
              </section>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
