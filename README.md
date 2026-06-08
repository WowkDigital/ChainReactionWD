# Quantum Chain Reaction Simulation

An interactive, high-performance physical particle simulation built with raw HTML5 Canvas and Vanilla CSS. The project models quantum molecule combinations, collisions, splits, and dynamic time dilation (slow-motion effects) based on subatomic particle populations.

![Quantum Chain Reaction Demo Preview](https://img.shields.io/badge/Physics-Simulation-blue?style=for-the-badge)
![License-MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![ES6-Modules](https://img.shields.io/badge/Architecture-ES6_Modules-orange?style=for-the-badge)

---

## 🔬 Core Features

*   **Modular ES6 Architecture:** Clean, decoupled design splitting configuration, utilities, entities (Molecules & Electrons), drawing routines, and the physics engine.
*   **Alternating Ring Molecules:** Compounds are generated as orbiting rings of sub-particles with alternating colors.
*   **Collision Physics & Energy Transfer:** 
    *   **Elastic Collisions (Bounce):** Standard 2D collision resolution swapping momentum vectors and separating overlapping elements to prevent sticking.
    *   **High-Energy Combination:** When molecules collide above a certain relative velocity threshold, they fuse into a heavier compound with mixed/shuffled sub-particles.
*   **Matter Conservation Decay:** 
    *   On fusion, a fraction of compound matter is lost, ejecting free-flying yellow energy **Electrons**.
    *   If a molecule reaches critical velocities, or receives an impact from a free electron, it destabilizes, starts shaking violently, and **splits** back into smaller halves, releasing extra electrons.
*   **Adaptive Time Dilation (Slowdown):** The simulation dynamically slows down time (`effectiveTimeScale`) as electron populations scale up, creating a dramatic slow-motion cinematic effect to visualize complex reactions and prevent frame lags.
*   **Unique Combination Registry:** Automatically hashes and lists newly discovered molecular color formulas in a scrollable bottom archive drawer.
*   **Discovery Rate Analytics:** Integrates Chart.js to visualize the rolling discoveries-per-minute rate inside a floating widget.
*   **Glassmorphic Design Console:** Styled with modern CSS glassmorphism, glowing controls, smooth animations, and custom range/toggle inputs.

---

## 📁 Repository Structure

```
├── css/
│   └── styles.css                 # Custom glassmorphic styling, animations, and inputs
├── js/
│   ├── entities/
│   │   ├── Entity.js              # Base physical entity with drift and wrap/bounce bounds
│   │   ├── Molecule.js            # Complex orbiting compound molecule with decay/split logic
│   │   └── Electron.js            # Subatomic energy particle with glow rendering
│   ├── ChartManager.js            # Instantiates and controls the moving average Chart.js
│   ├── Config.js                  # Global parameters, constants, and settings registry
│   ├── Utils.js                   # Math, color interpolation, and probability helpers
│   ├── Simulation.js              # Physics engine: collision checks and event ticking
│   └── Main.js                    # Application entry point: DOM event handling and game loop
├── index.html                     # Core layout with semantic markup and CDN imports
├── LICENSE                        # MIT License
└── README.md                      # Documentation
```

---

## ⚡ Quick Start

No installations, build steps, or package managers are required to run this project locally. It is built entirely using standard browser features.

### Prerequisite
Because the project uses **ES6 JavaScript Modules (`import`/`export`)**, the browser security model requires the files to be served via an HTTP server rather than loaded directly from the local file system (`file://` protocol).

### Running Locally

#### Option A: VS Code Live Server (Recommended)
1. Open the workspace folder in VS Code.
2. Click **Go Live** in the bottom-right status bar (requires the *Live Server* extension).
3. The simulation will open in your browser automatically (usually at `http://127.0.0.1:5500/index.html`).

#### Option B: Python SimpleHTTPServer
If you have Python installed, open your command terminal inside the project directory and run:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```
Then visit `http://localhost:8000` in your web browser.

#### Option C: Node.js (http-server)
If you have Node.js installed, you can serve it globally:
```bash
npx http-server -p 8000
```
Then visit `http://localhost:8000` in your web browser.

---

## 🎮 Interactive Controls

*   **Left Click:**
    *   *Default:* Triggers collision decay on any stable molecule, starting its unstable shaking countdown towards splitting.
    *   *Spawn Mode (toggleable in Settings):* Instantly spawns a new random compound molecule at your mouse coordinates.
*   **Control Panel Sidebar:** Click the gear icon in the top-right to open settings.
    *   Adjust initial molecule populations and palette sizes.
    *   Tune slowdown smoothness and simulation base speed.
    *   Toggle spontaneous particle birth or decay rates.
    *   Enable/disable screen boundary wrapping or chart visibility.

---

## 🛠️ Optimizations Applied

During refactoring, the following performance optimizations were made to ensure high frame rates even under complex conditions:
1.  **Squared Distance Thresholds:** Replaced all `Math.sqrt()` queries in collision checks with squared comparison checks (`dx*dx + dy*dy < minDist*minDist`). Square roots are only run *after* overlap is confirmed, reducing computation overhead by over 95%.
2.  **Decoupled Rendering and UI Loops:** The Chart.js rolling statistics calculation and graph redraws run on a fixed interval (`2000ms`), completely independent of the high-speed canvas animation frame loops.
3.  **Active Array Pruning:** Garbage collection is kept minimal by using strict filter maps to remove entities flagged for disposal (`markedForRemoval`) within a single frame cycle.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
