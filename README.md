# TuitionPad Studio 🎓📐

> **The Ultimate STEM PDF Note-Taking, Live LaTeX Typography & Online Tuition Desktop App**

[![Platform: Windows](https://img.shields.io/badge/Platform-Windows_x64-0078D6?style=flat&logo=windows)](https://github.com)
[![Framework: Electron](https://img.shields.io/badge/Framework-Electron_v44-47848F?style=flat&logo=electron)](https://www.electronjs.org/)
[![Renderer: React + Vite](https://img.shields.io/badge/Frontend-React_19_+_Vite_8-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Engine: KaTeX](https://img.shields.io/badge/Math-KaTeX_0.19-3298DC?style=flat)](https://katex.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**TuitionPad Studio** is a purpose-built desktop and presentation studio engineered specifically for online tutors, STEM educators, professors, and students. Say goodbye to awkward annotation tools—TuitionPad gives you smooth digital handwriting, instant live $\LaTeX$ typesetting, geometric coordinate graphing, and presentation superpowers during live classes.

---

## 🌟 Key Features

### 1. 📄 Complete PDF Control
- **Open Any PDF**: Ultra-sharp, high-DPI rendering using Mozilla's PDF engine.
- **Generate Blank Colored Notebooks**: Create scratchpads with any background:
  - ⬛ **Dark Blackboard / Chalkboard** (`#1a1d24`)
  - 🌌 **Midnight Slate** (`#0f172a`)
  - 📐 **Math Quadrille Graph Grid** (25px cells with major rules)
  - 🎯 **Dotted Bullet Grid** (ideal for physics free-body diagrams)
  - 📝 **College-Ruled Lined Paper** with red margin rule
  - 📜 **Warm Parchment / Sepia**
  - 🎨 **Any Custom Hex Color**
- **Dynamic Slide Insertion**: Click `+ Scratchpad` or `Insert Blank Page Here` to insert a fresh workspace right next to any textbook problem.
- **Reorder & Organize**: Visual thumbnail sidebar with drag/reorder and delete controls.

---

### 2. 🧮 Live STEM $\LaTeX$ & Science Typography
- **Clean Typing Anywhere**: Click to type notes or complex formulas without awkward formatting.
- **Interactive $\LaTeX$ / KaTeX Formula Studio**:
  - Live preview with zero latency.
  - **STEM Symbol Palettes**: One-click insertion for:
    - **Algebra**: Fractions ($\frac{a}{b}$), powers ($x^n$), roots ($\sqrt{x}, \sqrt[n]{x}$), $\pm, \neq, \infty$.
    - **Calculus**: Integrals ($\int, \int_a^b$), sums ($\sum$), limits ($\lim_{x \to 0}$), derivatives ($\frac{dy}{dx}, \nabla$).
    - **Greek Alphabet**: $\alpha, \beta, \gamma, \theta, \lambda, \mu, \pi, \sigma, \omega, \Delta, \Omega$.
    - **Physics & Vectors**: $\vec{F} = m\vec{a}$, unit vectors ($\hat{i}, \hat{j}, \hat{k}$), kinematics ($s = ut + \frac{1}{2}at^2$).
    - **Chemistry**: Reaction arrows ($\rightarrow, \rightleftharpoons, \uparrow, \downarrow$), chemical formulas ($\text{H}_2\text{O}, \text{CO}_2, \text{pH}$).
    - **Matrices**: $2 \times 2$ matrices, determinants, and equation systems.
- **Draggable & Editable**: Drag formulas anywhere on the slide; double-click or use the floating toolbar to edit.

---

### 3. ✍️ Professional Digital Ink & Eraser System
- **Smooth Bézier Curve Smoothing**: Catmull-Rom quadratic splining turns mouse or tablet pen inputs into smooth, natural handwriting.
- **Text Highlighter**: Employs `multiply` composite blending so highlighter marks glide behind textbook text without obscuring words.
- **Dual Erasers**:
  - **Stroke Eraser**: Clears entire strokes or shapes with a single click.
  - **Precision Brush**: Fine pixel-level brush eraser.
- **Undo / Redo Stack**: Multi-level history (`Ctrl+Z` / `Ctrl+Y`) per slide.

---

### 4. 📐 STEM Geometric Shapes & Cartesian Graphing
- **Cartesian Coordinate Axes ($X$-$Y$ System)**: One-click drop of a calibrated $x$-$y$ graphing frame with arrowheads, graduation tick marks, and axis labels.
- **Vector & Ray Arrows**: Single and bidirectional arrows with proportional arrowheads for force and dimension diagrams.
- **Geometric Shapes**: Lines, Rectangles / Answer boxes, Circles / Ellipses, Triangles.
- **Angle & Aspect Ratio Lock**: Hold `Shift` while dragging to constrain lines to 0°, 45°, 90° or force perfect 1:1 squares and circles.

---

### 5. 🎯 Live Tuition Superpowers
- **Teacher Laser Pointer Mode**: Fluorescent decaying glow trail that guides students' eyes across diagrams during screen sharing without leaving marks.
- **Snip & Solve (Question Cropper)**: Marquee-select any question on a PDF slide; TuitionPad crops it in high resolution and automatically generates a new blank scratchpad with the problem placed at the top!
- **Bake & Export to Standard PDF**: Compiles the original PDF, all newly inserted scratchpads, notes, shapes, and $\LaTeX$ equations into a clean, standard PDF using `pdf-lib`.

---

## 💻 Download & Installation

### Option 1: Native Windows Executable (`.exe`)
You can install and run TuitionPad Studio directly on Windows:
1. **Windows Installer**: Double-click [`TuitionPad Studio Setup 1.0.0.exe`](release/TuitionPad%20Studio%20Setup%201.0.0.exe) to install with desktop and start menu shortcuts.
2. **Standalone Portable**: Double-click [`TuitionPad Studio 1.0.0.exe`](release/TuitionPad%20Studio%201.0.0.exe) to run instantly without installation.

---

### Option 2: Running or Building from Source

Ensure you have **Node.js** (v18+) installed:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/lets-solve-pdf-forever.git
cd lets-solve-pdf-forever

# 2. Install dependencies
npm install

# 3. Launch in development mode
npm run dev

# 4. Launch with native Electron desktop container
npm run electron:dev

# 5. Build production Windows .exe installer and portable executable
npm run electron:build
```

The output will be placed in the `release/` directory:
- `release/TuitionPad Studio Setup 1.0.0.exe`
- `release/TuitionPad Studio 1.0.0.exe`

---

## ⌨️ Tutor Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo last stroke/action |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `[` | Previous Slide |
| `]` | Next Slide |
| `+` / `-` | Zoom In / Zoom Out |
| `P` | Switch to Pen Tool |
| `H` | Switch to Highlighter Tool |
| `E` | Switch to Eraser Tool |
| `L` | Activate Teacher Laser Pointer |
| `M` | Open $\LaTeX$ Math Formula Builder |
| `Shift + Drag` | Constrain angles (0°/45°/90°) & 1:1 squares/circles |
| `F11` | Toggle Fullscreen Teaching Mode |

---

## 🛠️ Architecture & Tech Stack

```
lets-solve-pdf-forever/
├── electron/
│   ├── main.cjs            # Electron main process & native dialogs
│   └── preload.cjs         # IPC bridge for local file read/save
├── src/
│   ├── components/
│   │   ├── Toolbar.tsx     # High-efficiency top teaching toolbar
│   │   ├── Sidebar.tsx     # Slide thumbnail drawer & page organizer
│   │   ├── PageView.tsx    # Multi-layer high-DPI canvas & math DOM
│   │   ├── MathModal.tsx   # Live KaTeX math & STEM symbol palette
│   │   ├── NewDocModal.tsx # Blank colored notebook generator
│   │   └── LaserCanvas.tsx # Animated decaying laser pointer
│   ├── utils/
│   │   ├── pdfManager.ts   # PDF.js renderer & blank notebook generator
│   │   ├── pdfExport.ts    # pdf-lib compilation & raster/vector baking
│   │   ├── canvasRenderer.ts # Bézier ink splines, Cartesian axes & shapes
│   │   └── mathHelper.ts   # KaTeX HTML renderers & symbol categories
│   ├── types.ts            # TypeScript definitions
│   ├── index.css           # Modern TuitionPad design system & dark aesthetics
│   └── App.tsx             # Root application orchestrator
├── package.json
└── vite.config.ts
```

---

## 📄 License
This project is licensed under the MIT License. Built with passion for educators and students.
