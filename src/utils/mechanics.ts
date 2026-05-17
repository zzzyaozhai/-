export interface MaterialProps {
  id: string;
  name: string;
  E: number; // Elastic Modulus in Pa
  sigma_p: number; // Proportional Limit in Pa
  sigma_s: number; // Yield Stress in Pa
  a: number; // Empirical parameter a in Pa
  b: number; // Empirical parameter b in Pa
  density: number; // kg/m^3
}

export const materials: MaterialProps[] = [
  {
    id: 'Q235',
    name: 'Q235 钢',
    E: 206e9,
    sigma_p: 200e6,
    sigma_s: 235e6,
    a: 304e6,
    b: 1.12e6,
    density: 7850,
  },
  {
    id: 'Al6061',
    name: '6061 铝合金',
    E: 70e9,
    sigma_p: 215e6,
    sigma_s: 275e6,
    a: 280e6,
    b: 1.2e6,
    density: 2700,
  },
  {
    id: 'Wood',
    name: '木材 (松木)',
    E: 10e9,
    sigma_p: 20e6,
    sigma_s: 30e6,
    a: 30e6,
    b: 0.15e6,
    density: 500,
  },
  {
    id: 'Plastic',
    name: '塑料 (PVC)',
    E: 3.2e9,
    sigma_p: 35e6,
    sigma_s: 45e6,
    a: 45e6,
    b: 0.1e6,
    density: 1380,
  }
];

export const supports = [
  { id: 'pinned-pinned', name: '两端铰支', mu: 1.0, desc: '适用于普通晾衣架的顶部承重杆，两端可以轻微转动。' },
  { id: 'fixed-free', name: '一端固定一端自由', mu: 2.0, desc: '适用于落地式立式衣架的主干。' },
  { id: 'fixed-pinned', name: '一端固定一端铰支', mu: 0.7, desc: '部分墙体固定的横杆，另一端挂有支线。' },
  { id: 'fixed-fixed', name: '两端固定', mu: 0.5, desc: '两端刚性嵌入墙体的晾衣杆。' }
];

export interface SectionProps {
  type: 'hollow-circle' | 'solid-circle' | 'solid-rect';
  D: number; // Outer diameter / Width (m)
  d?: number; // Inner diameter (m)
  H?: number; // Height (m)
}

export function calculateSectionProperties(section: SectionProps) {
  let A = 0;
  let I = 0; // Minimum moment of inertia
  let y_max = 0;

  if (section.type === 'hollow-circle') {
    const D = section.D;
    const d = section.d || 0;
    A = Math.PI * (D * D - d * d) / 4;
    I = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64;
    y_max = D / 2;
  } else if (section.type === 'solid-circle') {
    const D = section.D;
    A = Math.PI * D * D / 4;
    I = Math.PI * Math.pow(D, 4) / 64;
    y_max = D / 2;
  } else if (section.type === 'solid-rect') {
    const b = section.D;
    const h = section.H || section.D;
    A = b * h;
    // For buckling, the rod buckles about the weaker axis
    I = Math.min(b * h * h * h / 12, h * b * b * b / 12);
    y_max = Math.max(b / 2, h / 2);
  }

  const i = Math.sqrt(I / A); // Radius of gyration

  return { A, I, i, y_max };
}

export function calculateBuckling(
  materialId: string,
  supportId: string,
  section: SectionProps,
  length: number, // m
  appliedLoad: number // N
) {
  const material = materials.find(m => m.id === materialId) || materials[0];
  const support = supports.find(s => s.id === supportId) || supports[0];

  const { A, I, i } = calculateSectionProperties(section);

  const l0 = support.mu * length; // Effective length
  const lambda = l0 / i; // Slenderness ratio

  const lambda_p = Math.sqrt((Math.PI * Math.PI * material.E) / material.sigma_p);
  const lambda_s = (material.a - material.sigma_s) / material.b;

  let sigma_cr = 0;
  let bucklingType = '';

  if (lambda >= lambda_p) {
    // Large slenderness: Euler
    sigma_cr = (Math.PI * Math.PI * material.E) / (lambda * lambda);
    bucklingType = 'large';
  } else if (lambda >= lambda_s) {
    // Medium slenderness: Empirical (straight line)
    sigma_cr = material.a - material.b * lambda;
    bucklingType = 'medium';
  } else {
    // Small slenderness: Yielding
    sigma_cr = material.sigma_s;
    bucklingType = 'small';
  }

  const F_cr = sigma_cr * A;
  const F_actual = appliedLoad;
  const safety_factor = F_cr / F_actual;
  
  const self_weight = A * length * material.density * 9.81;

  return {
    A, I, i, l0, lambda, lambda_p, lambda_s,
    sigma_cr, F_cr, bucklingType, material, support,
    safety_factor, self_weight
  };
}
