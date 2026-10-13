import katex from 'katex';

export interface StemSymbolCategory {
  name: string;
  items: Array<{
    label: string;
    latex: string;
    tooltip: string;
  }>;
}

export const STEM_SYMBOLS: StemSymbolCategory[] = [
  {
    name: 'Algebra & Basic',
    items: [
      { label: 'a/b', latex: '\\frac{a}{b}', tooltip: 'Fraction' },
      { label: 'xⁿ', latex: 'x^{2}', tooltip: 'Superscript / Power' },
      { label: 'xₙ', latex: 'x_{i}', tooltip: 'Subscript' },
      { label: '√x', latex: '\\sqrt{x}', tooltip: 'Square Root' },
      { label: 'ⁿ√x', latex: '\\sqrt[n]{x}', tooltip: 'N-th Root' },
      { label: '±', latex: '\\pm', tooltip: 'Plus-Minus' },
      { label: '≠', latex: '\\neq', tooltip: 'Not Equal' },
      { label: '≤', latex: '\\leq', tooltip: 'Less than or equal' },
      { label: '≥', latex: '\\geq', tooltip: 'Greater than or equal' },
      { label: '×', latex: '\\times', tooltip: 'Multiplication' },
      { label: '÷', latex: '\\div', tooltip: 'Division' },
      { label: '≈', latex: '\\approx', tooltip: 'Approximately equal' },
      { label: '∞', latex: '\\infty', tooltip: 'Infinity' }
    ]
  },
  {
    name: 'Calculus & Analysis',
    items: [
      { label: '∫ dx', latex: '\\int f(x)\\,dx', tooltip: 'Indefinite Integral' },
      { label: '∫ₐᵇ', latex: '\\int_{a}^{b} f(x)\\,dx', tooltip: 'Definite Integral' },
      { label: '∑', latex: '\\sum_{i=1}^{n} x_i', tooltip: 'Summation' },
      { label: '∏', latex: '\\prod_{i=1}^{n} x_i', tooltip: 'Product' },
      { label: 'lim', latex: '\\lim_{x \\to 0} f(x)', tooltip: 'Limit' },
      { label: 'dy/dx', latex: '\\frac{dy}{dx}', tooltip: 'Derivative' },
      { label: '∂y/∂x', latex: '\\frac{\\partial y}{\\partial x}', tooltip: 'Partial Derivative' },
      { label: '∇', latex: '\\nabla', tooltip: 'Del / Gradient' }
    ]
  },
  {
    name: 'Greek Letters',
    items: [
      { label: 'α', latex: '\\alpha', tooltip: 'Alpha' },
      { label: 'β', latex: '\\beta', tooltip: 'Beta' },
      { label: 'γ', latex: '\\gamma', tooltip: 'Gamma' },
      { label: 'θ', latex: '\\theta', tooltip: 'Theta' },
      { label: 'λ', latex: '\\lambda', tooltip: 'Lambda' },
      { label: 'μ', latex: '\\mu', tooltip: 'Mu' },
      { label: 'π', latex: '\\pi', tooltip: 'Pi' },
      { label: 'σ', latex: '\\sigma', tooltip: 'Sigma' },
      { label: 'ω', latex: '\\omega', tooltip: 'Omega' },
      { label: 'Δ', latex: '\\Delta', tooltip: 'Capital Delta' },
      { label: 'Ω', latex: '\\Omega', tooltip: 'Capital Omega / Ohm' },
      { label: 'Φ', latex: '\\Phi', tooltip: 'Capital Phi' }
    ]
  },
  {
    name: 'Physics & Vectors',
    items: [
      { label: 'F⃗ = ma⃗', latex: '\\vec{F} = m\\vec{a}', tooltip: 'Vector Force' },
      { label: 'v⃗', latex: '\\vec{v}', tooltip: 'Vector v' },
      { label: 'î', latex: '\\hat{i}', tooltip: 'Unit vector i' },
      { label: 'ĵ', latex: '\\hat{j}', tooltip: 'Unit vector j' },
      { label: 'k̂', latex: '\\hat{k}', tooltip: 'Unit vector k' },
      { label: 'E = mc²', latex: 'E = mc^2', tooltip: 'Mass Energy' },
      { label: 'v = u+at', latex: 'v = u + at', tooltip: 'Kinematics 1' },
      { label: 's = ut+½at²', latex: 's = ut + \\frac{1}{2}at^2', tooltip: 'Kinematics 2' },
      { label: 'λ = h/p', latex: '\\lambda = \\frac{h}{p}', tooltip: 'De Broglie' }
    ]
  },
  {
    name: 'Chemistry & Reactions',
    items: [
      { label: '→', latex: '\\rightarrow', tooltip: 'Reaction Arrow' },
      { label: '⇌', latex: '\\rightleftharpoons', tooltip: 'Equilibrium Arrow' },
      { label: '↑', latex: '\\uparrow', tooltip: 'Gas Evolution' },
      { label: '↓', latex: '\\downarrow', tooltip: 'Precipitate' },
      { label: 'H₂O', latex: '\\text{H}_2\\text{O}', tooltip: 'Water' },
      { label: 'CO₂', latex: '\\text{CO}_2', tooltip: 'Carbon Dioxide' },
      { label: 'H⁺', latex: '\\text{H}^+', tooltip: 'Hydrogen Ion' },
      { label: 'OH⁻', latex: '\\text{OH}^-', tooltip: 'Hydroxide Ion' },
      { label: 'ΔH', latex: '\\Delta H', tooltip: 'Enthalpy Change' },
      { label: 'pH', latex: '\\text{pH} = -\\log[\\text{H}^+]', tooltip: 'pH Formula' }
    ]
  },
  {
    name: 'Matrices & Sets',
    items: [
      { label: '2x2 Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', tooltip: '2x2 Matrix' },
      { label: 'Determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', tooltip: 'Determinant' },
      { label: 'System', latex: '\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}', tooltip: 'System of equations' },
      { label: '∈', latex: '\\in', tooltip: 'Element of' },
      { label: '∉', latex: '\\notin', tooltip: 'Not element of' },
      { label: '⊂', latex: '\\subset', tooltip: 'Subset' },
      { label: '∪', latex: '\\cup', tooltip: 'Union' },
      { label: '∩', latex: '\\cap', tooltip: 'Intersection' }
    ]
  }
];

export function renderLatexToHtml(latex: string, displayMode: boolean = false): string {
  try {
    return katex.renderToString(latex || '', {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml'
    });
  } catch (err) {
    return `<span style="color: red;">Error rendering math</span>`;
  }
}
