import React, { useRef, useEffect, useState } from 'react';
import { MaterialProps, SectionProps } from '../utils/mechanics';
import { calculateBeam, BeamState } from '../utils/beamCalculations';

interface BeamSimulatorProps {
  length: number;
  section: SectionProps;
  material: MaterialProps;
  supportId: string;
  pointLoadMagnitude: number;
  pointLoadPosition: number;
  onPositionChange: (pos: number) => void;
  uniformLoad: number;
  axialLoad: number;
  viewMode: 'stress' | 'strain';
}

function getColormapColor(value: number, maxVal: number) {
  // colormap from blue to red (Jet or Turbo approximation)
  const t = maxVal === 0 ? 0 : Math.min(Math.max(value / maxVal, 0), 1);
  const r = Math.max(0, Math.min(255, 255 * (4 * t - 1.5)));
  const g = Math.max(0, Math.min(255, 255 * (2 - Math.abs(4 * t - 2))));
  const b = Math.max(0, Math.min(255, 255 * (1.5 - 4 * t)));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

export function BeamSimulator(props: BeamSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [beamStates, setBeamStates] = useState<BeamState[]>([]);
  const [yieldFlag, setYieldFlag] = useState(false);

  // Sync dimensions
  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height
        });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute physics
  useEffect(() => {
    let area = 0;
    let inertia = 0;
    let wz = 0;
    const { type, D, d = 0, H = 0 } = props.section;
    
    if (type === 'hollow-circle') {
      area = Math.PI * (D * D - d * d) / 4;
      inertia = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64;
      wz = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / (32 * D);
    } else if (type === 'solid-circle') {
      area = Math.PI * D * D / 4;
      inertia = Math.PI * Math.pow(D, 4) / 64;
      wz = Math.PI * Math.pow(D, 3) / 32;
    } else if (type === 'solid-rect') {
      area = D * H;
      inertia = (D * Math.pow(H, 3)) / 12;
      wz = (D * Math.pow(H, 2)) / 6;
    }
    
    // Scale user inputs to realistic units if needed, but assuming they are standard (N, m)
    const states = calculateBeam(
      props.length,
      props.section.D,
      inertia,
      wz,
      area,
      props.material.E,
      props.supportId,
      props.pointLoadMagnitude,
      props.pointLoadPosition,
      props.uniformLoad,
      props.axialLoad
    );
    setBeamStates(states);
    
    // Check if yield
    let hasYielded = false;
    states.forEach(s => {
      if (s.sigmaMax >= props.material.sigma_s) hasYielded = true;
    });
    setYieldFlag(hasYielded);
  }, [props.length, props.section, props.material, props.supportId, props.pointLoadMagnitude, props.pointLoadPosition, props.uniformLoad, props.axialLoad]);

  // Render canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || dimensions.width === 0 || dimensions.height === 0 || beamStates.length === 0) return;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    
    const scaleX = dimensions.width * 0.8; 
    const offsetX = dimensions.width * 0.1;
    const centerY = dimensions.height * 0.5;
    
    // Find max deflection to scale it visually
    let maxDeflectionActual = 0;
    beamStates.forEach(s => {
      maxDeflectionActual = Math.max(maxDeflectionActual, Math.abs(s.deflection));
    });
    
    // Visual multiplier for deflection. Max visual deflection is 20% of canvas height
    const maxVisualDeflection = dimensions.height * 0.2;
    const vScale = maxDeflectionActual > 0 ? maxVisualDeflection / maxDeflectionActual : 0.0;
    // Limit over-exaggeration
    const safeVScale = Math.min(vScale, (dimensions.height * 0.4) / (props.length * 0.1));

    // Calculate thickness ratio
    const visualThickness = Math.max(10, Math.min(dimensions.height * 0.15, (props.section.D / props.length) * scaleX));

    // Target max color magnitude
    const maxColorVal = props.material.sigma_s; 
    
    // Draw Supports
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    
    if (props.supportId === 'pinned-pinned') {
       // Left pin
       ctx.beginPath();
       ctx.moveTo(offsetX, centerY);
       ctx.lineTo(offsetX - 15, centerY + 20);
       ctx.lineTo(offsetX + 15, centerY + 20);
       ctx.closePath();
       ctx.fill();
       
       // Right roller/pin
       ctx.beginPath();
       ctx.moveTo(offsetX + scaleX, centerY);
       ctx.lineTo(offsetX + scaleX - 15, centerY + 20);
       ctx.lineTo(offsetX + scaleX + 15, centerY + 20);
       ctx.closePath();
       ctx.fill();
    } else if (props.supportId === 'fixed-free') {
       // Left fixed wall
       ctx.fillRect(offsetX - 20, centerY - visualThickness - 20, 20, visualThickness * 2 + 40);
       for(let i=0; i<5; i++) {
         ctx.beginPath();
         ctx.moveTo(offsetX - 20, centerY - visualThickness - 10 + i*15);
         ctx.lineTo(offsetX - 30, centerY - visualThickness + i*15);
         ctx.stroke();
       }
    }

    // Draw the beam polygons representing gradient slices
    for (let i = 0; i < beamStates.length - 1; i++) {
       const s1 = beamStates[i];
       const s2 = beamStates[i+1];
       
       const x1 = offsetX + (s1.x / props.length) * scaleX;
       const x2 = offsetX + (s2.x / props.length) * scaleX;
       
       const y1 = centerY + s1.deflection * safeVScale;
       const y2 = centerY + s2.deflection * safeVScale;
       
       const val1Top = props.viewMode === 'stress' ? Math.abs(s1.sigmaTop) : Math.abs(s1.sigmaTop) / props.material.E;
       const val1Bot = props.viewMode === 'stress' ? Math.abs(s1.sigmaBot) : Math.abs(s1.sigmaBot) / props.material.E;
       const val2Top = props.viewMode === 'stress' ? Math.abs(s2.sigmaTop) : Math.abs(s2.sigmaTop) / props.material.E;
       const val2Bot = props.viewMode === 'stress' ? Math.abs(s2.sigmaBot) : Math.abs(s2.sigmaBot) / props.material.E;
       
       const c1Top = getColormapColor(val1Top, maxColorVal * (props.viewMode==='stress'?1: 1/props.material.E));
       const c1Bot = getColormapColor(val1Bot, maxColorVal * (props.viewMode==='stress'?1: 1/props.material.E));
       const c2Top = getColormapColor(val2Top, maxColorVal * (props.viewMode==='stress'?1: 1/props.material.E));
       const c2Bot = getColormapColor(val2Bot, maxColorVal * (props.viewMode==='stress'?1: 1/props.material.E));
       
       const grad = ctx.createLinearGradient(x1, y1 - visualThickness/2, x1, y1 + visualThickness/2);
       grad.addColorStop(0, c1Top);
       grad.addColorStop(1, c1Bot);
       
       ctx.fillStyle = grad;
       ctx.beginPath();
       ctx.moveTo(x1, y1 - visualThickness/2);
       ctx.lineTo(x2, y2 - visualThickness/2);
       ctx.lineTo(x2, y2 + visualThickness/2);
       ctx.lineTo(x1, y1 + visualThickness/2);
       ctx.closePath();
       ctx.fill();
    }
    
    // Draw Beam Outline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    beamStates.forEach((s, idx) => {
      const x = offsetX + (s.x / props.length) * scaleX;
      const y = centerY + s.deflection * safeVScale - visualThickness/2;
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    beamStates.slice().reverse().forEach((s) => {
      const x = offsetX + (s.x / props.length) * scaleX;
      const y = centerY + s.deflection * safeVScale + visualThickness/2;
      ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw Wind Force representation
    if (props.uniformLoad > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      const arrowCount = 10;
      for(let i=1; i<arrowCount; i++) {
        const x = offsetX + (i/arrowCount) * scaleX;
        ctx.beginPath();
        // wind direction arrow (from top right roughly)
        ctx.moveTo(x + 20, centerY - 60);
        ctx.lineTo(x, centerY - 20);
        ctx.lineTo(x + 5, centerY - 30);
        ctx.moveTo(x, centerY - 20);
        ctx.lineTo(x + 12, centerY - 22);
        ctx.stroke();
      }
    }
    
    // Draw Axial Force
    if (props.axialLoad > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      // Right end pressing in
      ctx.beginPath();
      ctx.moveTo(offsetX + scaleX + 50, centerY);
      ctx.lineTo(offsetX + scaleX + 10, centerY);
      ctx.lineTo(offsetX + scaleX + 20, centerY - 10);
      ctx.moveTo(offsetX + scaleX + 10, centerY);
      ctx.lineTo(offsetX + scaleX + 20, centerY + 10);
      ctx.stroke();
      
      // Left end pressing in
      ctx.beginPath();
      ctx.moveTo(offsetX - 50, centerY);
      ctx.lineTo(offsetX - 10, centerY);
      ctx.lineTo(offsetX - 20, centerY - 10);
      ctx.moveTo(offsetX - 10, centerY);
      ctx.lineTo(offsetX - 20, centerY + 10);
      ctx.stroke();
    }
  }, [beamStates, dimensions, props]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPos = e.clientX - rect.left;
    const scaleX = dimensions.width * 0.8;
    const offsetX = dimensions.width * 0.1;
    let newPos = (xPos - offsetX) / scaleX;
    newPos = Math.max(0, Math.min(newPos, 1));
    props.onPositionChange(newPos);
  };
  
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  // Calculate visual position of draggable icon
  const scaleX = dimensions.width * 0.8;
  const offsetX = dimensions.width * 0.1;
  const iconX = offsetX + props.pointLoadPosition * scaleX;
  
  // Find local deflection
  const localState = beamStates.length > 0 ? beamStates[Math.floor(props.pointLoadPosition * (beamStates.length - 1))] : null;
  
  let maxDeflectionActual = 0;
  beamStates.forEach(s => {
    maxDeflectionActual = Math.max(maxDeflectionActual, Math.abs(s.deflection));
  });
  const maxVisualDeflection = dimensions.height * 0.2;
  const vScale = maxDeflectionActual > 0 ? maxVisualDeflection / maxDeflectionActual : 0.0;
  const safeVScale = Math.min(vScale, (dimensions.height * 0.4) / (props.length * 0.1));
  const iconY = dimensions.height * 0.5 + (localState?.deflection || 0) * safeVScale;

  // Find overall max stress for the legend
  let absoluteMaxVal = 0;
  beamStates.forEach(s => {
    absoluteMaxVal = Math.max(absoluteMaxVal, s.sigmaMax);
  });
  const legendMax = props.material.sigma_s;

  return (
    <div className="relative w-full h-full bg-slate-50 flex flex-col" ref={containerRef}>
       <div className="absolute top-4 left-4 z-10 flex flex-col space-y-1">
          <div className="text-sm font-semibold text-slate-700">
             {props.viewMode === 'stress' ? '冯·米塞斯应力 (Von Mises)' : '等效应变 (Equivalent Strain)'}
             {yieldFlag && <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">屈服警告!</span>}
          </div>
          <div className="w-64 h-4 rounded shadow-sm border border-slate-300" 
               style={{ background: 'linear-gradient(to right, rgb(0,0,255), rgb(0,255,255), rgb(0,255,0), rgb(255,255,0), rgb(255,0,0))' }}>
          </div>
          <div className="flex justify-between w-64 text-xs text-slate-500 font-mono">
            <span>0</span>
            <span>{props.viewMode === 'stress' ? (legendMax / 1e6).toFixed(1) + ' MPa' : (legendMax / props.material.E).toExponential(2)}</span>
          </div>
       </div>
       
       <canvas 
         ref={canvasRef} 
         width={dimensions.width} 
         height={dimensions.height}
         className="w-full h-full touch-none"
       />
       
       {/* Draggable Load Icon */}
       {dimensions.width > 0 && props.pointLoadMagnitude > 0 && (
         <div 
           className="absolute z-20 flex flex-col items-center justify-center cursor-ew-resize group"
           style={{
             left: `${iconX}px`,
             top: `${iconY}px`,
             transform: 'translate(-50%, -50%)',
             touchAction: 'none'
           }}
           onPointerDown={handlePointerDown}
           onPointerMove={handlePointerMove}
           onPointerUp={handlePointerUp}
         >
            <div className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow absolute -top-6 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {Math.round(props.pointLoadMagnitude)} N
            </div>
            <div className="w-6 h-12 flex flex-col items-center shadow-lg rounded-full bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors border-2 border-transparent hover:border-indigo-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mt-1">
                 <path d="M12 2v20M17 17l-5 5-5-5"/>
               </svg>
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 hidden group-hover:block absolute -bottom-6">
                 <path d="M4 14l8-4 8 4"/>
                 <path d="M12 10v12"/>
               </svg>
            </div>
         </div>
       )}
    </div>
  );
}
