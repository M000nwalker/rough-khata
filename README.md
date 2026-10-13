# Rough Khata 📓✨

> **The Ultimate STEM PDF Note-Taking, Live LaTeX Typography & Infinite Whiteboard App for Teachers & Students**

[![Platform: Windows](https://img.shields.io/badge/Platform-Windows_x64-0078D6?style=flat&logo=windows)](https://github.com/M000nwalker/rough-khata)
[![Framework: Electron](https://img.shields.io/badge/Framework-Electron_v44-47848F?style=flat&logo=electron)](https://www.electronjs.org/)
[![Renderer: React + Vite](https://img.shields.io/badge/Frontend-React_19_+_Vite_8-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Engine: KaTeX](https://img.shields.io/badge/Math-KaTeX_0.19-3298DC?style=flat)](https://katex.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Rough Khata** is the no-nonsense, high-performance note-taking and online tuition studio built for real math, science, and engineering work. No cramped margins, no clunky PDF tools—just unlimited working space, smooth handwriting, live $\LaTeX$ math typesetting, Cartesian graphing, and seamless PDF integration.

---

## 🌟 Key Features

### 1. ♾️ Dual Workspace: Slides/PDF + Infinite Khata
Switch seamlessly between two powerful teaching environments with one click:
- 📑 **Slides & PDF Mode**: Open any textbook, exam paper, or generate blank slide decks.
- ♾️ **Infinite Khata Mode**: An **endless 2D whiteboard plane** with no borders!
  - Pan anywhere smoothly (`Space + Drag`, `Middle Click`, or Pan tool).
  - Infinite zoom from 15% to 500% (`Ctrl + Mouse Wheel`).
  - Procedural dynamic coordinate grid.
  - Floating HUD with `(0,0)` Origin Snap, Zoom Reset, and Instant PNG Snapshot.

---

### 2. 🖥️ Maximum Screen Working Area (Auto-Fit & Page Extender)
- **Edge-to-Edge Canvas**: Minimized paddings and slim collapsible sidebars maximize your screen real estate.
- **Auto-Fit to Width**: Instantly stretches the slide across 100% of your monitor width for comfortable writing and clear reading during Zoom / Google Meet screen shares.
- **Auto-Fit to Screen**: Fits the entire slide vertically and horizontally in one click.
- **+ Extend Page Height (+500px)**: Solution getting too long? Click `+ Extend Page` at the bottom of any slide to add +500px of extra vertical space without breaking existing notes!

---

### 3. ✂️ "Snip & Solve" (Question Cropper)
*Ever had a student ask a problem from a crowded PDF page with zero space to write?*
- Click **Snip**.
- Drag a box over any math question, circuit diagram, or physics problem.
- **Boom!** Rough Khata automatically creates a new blank scratchpad slide with the cropped problem pasted neatly at the top, leaving the rest of the canvas wide open to solve step-by-step!

---

### 4. 🧮 Live STEM $\LaTeX$ & Science Typography
- **Clean Typing Anywhere**: Place crisp mathematical notes anywhere on the canvas.
- **Live KaTeX Formula Studio**:
  - Live preview with zero delay.
  - **STEM Symbol Palettes**: One-click insertion for:
    - **Algebra**: Fractions ($\frac{a}{b}$), powers ($x^n$), roots ($\sqrt{x}, \sqrt[n]{x}$), $\pm, \neq, \infty$.
    - **Calculus**: Integrals ($\int, \int_a^b$), sums ($\sum$), limits ($\lim_{x \to 0}$), derivatives ($\frac{dy}{dx}, \nabla$).
    - **Greek Alphabet**: $\alpha, \beta, \gamma, \theta, \lambda, \mu, \pi, \sigma, \omega, \Delta, \Omega$.
    - **Physics & Vectors**: $\vec{F} = m\vec{a}$, unit vectors ($\hat{i}, \hat{j}, \hat{k}$), kinematics ($s = ut + \frac{1}{2}at^2$).
    - **Chemistry**: Reaction arrows ($\rightarrow, \rightleftharpoons, \uparrow, \downarrow$), chemical formulas ($\text{H}_2\text{O}, \text{CO}_2, \text{pH}$).
    - **Matrices**: $2 \times 2$ matrices, determinants, and equation systems.
- **Draggable & Editable**: Drag formulas anywhere; double-click or use the floating control bar to edit anytime.

---

### 5. ✍️ Professional Digital Ink & Eraser System
- **Smooth Bézier Spline Inking**: Catmull-Rom quadratic curve interpolation turns mouse and tablet pen inputs into smooth, natural handwriting.
- **Text Highlighter**: Employs `multiply` composite blending so highlighter strokes pass behind textbook text without obscuring words.
- **Dual Erasers**: Stroke Eraser (clears whole strokes on contact) and Precision Brush.
- **Full Undo / Redo**: Multi-level history stack (`Ctrl+Z` / `Ctrl+Y`).

---

### 6. 📐 STEM Geometric Shapes & Cartesian Graphing
- **Cartesian Coordinate Axes ($X$-$Y$ System)**: One-click drop of a calibrated $x$-$y$ graphing frame with arrowheads, graduation tick marks, and axis labels.
- **Vector & Ray Arrows**: Single and bidirectional arrows with proportional arrowheads for force and dimension diagrams.
- **Geometric Shapes**: Lines, Rectangles / Answer boxes, Circles / Ellipses, Triangles.
- **Shift-Snap**: Hold `Shift` while dragging to constrain lines to 0°, 45°, 90° or force perfect 1:1 squares and circles.

---

### 7. 🎯 Teacher Laser Pointer & Presentation Mode
- **Teacher Laser Pointer**: Fluorescent decaying glow trail designed specifically for screen sharing during live classes. Directs student attention without leaving permanent marks.
- **Bake & Export to Standard PDF**: Compiles original PDF pages + newly inserted scratchpads + drawings + $\LaTeX$ math into a clean, downloadable standard PDF using `pdf-lib`.

---

## 💻 Download & Installation

### Option 1: Native Windows Executables (`.exe`)
Download the latest pre-compiled build directly from [**GitHub Releases v1.1.0**](https://github.com/M000nwalker/rough-khata/releases/tag/v1.1.0):
1. **[Rough Khata Setup 1.1.0.exe](https://github.com/M000nwalker/rough-khata/releases/download/v1.1.0/Rough.Khata.Setup.1.1.0.exe)**  
   *Standard Windows NSIS Installer (adds Desktop & Start Menu shortcuts)*
2. **[Rough Khata 1.1.0.exe](https://github.com/M000nwalker/rough-khata/releases/download/v1.1.0/Rough.Khata.1.1.0.exe)**  
   *Portable Standalone Executable (Zero installation required, click & run directly from USB or drive)*

---

### Option 2: Running or Building from Source

Ensure you have **Node.js** (v18+) installed:

```bash
# 1. Clone the repository
git clone https://github.com/M000nwalker/rough-khata.git
cd rough-khata

# 2. Install dependencies
npm install

# 3. Launch in development mode
npm run dev

# 4. Launch with native Electron desktop container
npm run electron:dev

# 5. Build production Windows .exe installer and portable executable
npm run electron:build
```

The output executables will be placed in the `release/` directory:
- `release/Rough Khata Setup 1.1.0.exe`
- `release/Rough Khata 1.1.0.exe`

---

## ⌨️ Tutor Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo last stroke/action |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `[` / `]` | Previous Slide / Next Slide |
| `+` / `-` | Zoom In / Zoom Out |
| `Space + Drag` | Pan in Infinite Khata mode |
| `P` | Switch to Pen Tool |
| `H` | Switch to Highlighter Tool |
| `E` | Switch to Eraser Tool |
| `L` | Activate Teacher Laser Pointer |
| `M` | Open $\LaTeX$ Math Formula Builder |
| `Shift + Drag` | Constrain angles (0°/45°/90°) & 1:1 squares/circles |
| `F11` | Toggle Fullscreen Teaching Mode |

---

## 📄 License
This project is licensed under the MIT License. Built with passion for educators and students.
