export interface BeamState {
  x: number;
  moment: number; // magnitude of total moment M = sqrt(My^2 + Mz^2)
  deflection: number; // vertical deflection v(x)
  axialForce: number; // typically constant P
  sigmaTop: number;
  sigmaBot: number;
  sigmaMax: number;
}

export function calculateBeam(
  length: number,
  D: number, // outer diameter or height
  I: number, // moment of inertia 
  Wz: number, // section modulus
  A: number, // area
  E: number, // elastic modulus
  supportType: string,
  pointLoadY: number, // downwards point load (clothes)
  pointLoadPos: number, // 0 to 1
  uniformLoadZ: number, // sideways uniform load (wind)
  axialLoad: number // compressive axial load
): BeamState[] {
  const N = 200;
  const states: BeamState[] = [];
  const P = axialLoad;
  const q_z = uniformLoadZ;
  const W_y = pointLoadY;
  const a = pointLoadPos * length;
  
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * length;
    let m_y = 0; // moment causing vertical deflection (from W_y)
    let m_z = 0; // moment causing sideways deflection (from q_z)
    let v_y = 0; // vertical deflection

    if (supportType === 'pinned-pinned') {
      // Simply supported
      if (x <= a) {
        m_y = W_y * (length - a) * x / length;
        v_y = (W_y * (length - a) * x) / (6 * E * I * length) * (length * length - Math.pow(length - a, 2) - x * x);
      } else {
        m_y = W_y * a * (length - x) / length;
        v_y = (W_y * a * (length - x)) / (6 * E * I * length) * (length * length - a * a - Math.pow(length - x, 2));
      }
      
      m_z = (q_z * x / 2) * (length - x);
    } else if (supportType === 'fixed-free') {
      // Cantilever (fixed at x=0)
      if (x <= a) {
        m_y = W_y * (a - x);
        v_y = (W_y * x * x) / (6 * E * I) * (3 * a - x);
      } else {
        m_y = 0;
        v_y = (W_y * a * a) / (6 * E * I) * (3 * x - a);
      }
      m_z = (q_z / 2) * Math.pow(length - x, 2);
    }
    
    // Total bending moment magnitude
    const m_total = Math.sqrt(m_y * m_y + m_z * m_z);
    
    // Axial stress Component
    const sigmaA = -P / A; 
    
    // Bending Stress Component +/- max at outer fibers
    const sigmaB = m_total / Wz; 
    
    // Top and bottom stress (assuming bending is in XY plane for visual simplicity, 
    // actually we just show the extreme fibers regardless of angle)
    const sigmaTop = sigmaA - sigmaB; // compression is negative
    const sigmaBot = sigmaA + sigmaB; 
    
    // Von Mises approximation for beam (sigma_x only)
    const sigmaMax = Math.max(Math.abs(sigmaTop), Math.abs(sigmaBot));

    states.push({
      x,
      moment: m_total,
      deflection: v_y,
      axialForce: P,
      sigmaTop,
      sigmaBot,
      sigmaMax
    });
  }
  
  return states;
}
