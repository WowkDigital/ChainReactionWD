import { SETTINGS } from './Config.js';
import { padNumber } from './Utils.js';
import ChartManager from './ChartManager.js';
import Simulation from './Simulation.js';

// DOM Elements
const canvas = document.getElementById('simulationCanvas');
const topDashboard = document.getElementById('top-dashboard');
const uniqueCombinationsBar = document.getElementById('unique-combinations-bar');
const chartContainer = document.getElementById('chart-container');
const configSidebar = document.getElementById('config-sidebar');
const configCloseBtn = document.getElementById('config-close');
const applyResetBtn = document.getElementById('resetButton');

// Quick Control Dock Buttons
const btnPlayPause = document.getElementById('btn-play-pause');
const btnModeDecay = document.getElementById('btn-mode-decay');
const btnModeSpawn = document.getElementById('btn-mode-spawn');
const btnSpontaneousGen = document.getElementById('btn-spontaneous-gen');
const btnSpontaneousDecay = document.getElementById('btn-spontaneous-decay');
const btnScreenWrap = document.getElementById('btn-screen-wrap');
const btnToggleChart = document.getElementById('btn-toggle-chart');
const btnToggleDiscoveries = document.getElementById('btn-toggle-discoveries');
const btnReset = document.getElementById('btn-reset');
const btnSettingsToggle = document.getElementById('btn-settings-toggle');
const btnAddTen = document.getElementById('btn-add-ten');
const inputAddCount = document.getElementById('input-add-count');

// Stats Displays
const simTimeDisplay = document.getElementById('simTimeDisplay');
const moleculeCountDisplay = document.getElementById('moleculeCountDisplay');
const electronCountDisplay = document.getElementById('electronCountDisplay');
const uniqueCombinationsDisplay = document.getElementById('uniqueCombinationsDisplay');
const timeScaleDisplay = document.getElementById('timeScaleDisplay');

// Config Sliders & Values
const numMoleculesSlider = document.getElementById('numMoleculesSlider');
const numMoleculesValue = document.getElementById('numMoleculesValue');
const colorCountSelect = document.getElementById('colorCountSelect');
const simulationAreaSlider = document.getElementById('simulationAreaSlider');
const simulationAreaValue = document.getElementById('simulationAreaValue');
const miniParticleScaleSlider = document.getElementById('miniParticleScaleSlider');
const miniParticleScaleValue = document.getElementById('miniParticleScaleValue');
const lerpFactorSlider = document.getElementById('lerpFactorSlider');
const lerpFactorValue = document.getElementById('lerpFactorValue');
const simSpeedSlider = document.getElementById('simSpeedSlider');
const simSpeedValue = document.getElementById('simSpeedValue');
const spawnChanceSlider = document.getElementById('spawnChanceSlider');
const spawnChanceValue = document.getElementById('spawnChanceValue');
const decayChanceSlider = document.getElementById('decayChanceSlider');
const decayChanceValue = document.getElementById('decayChanceValue');

// New Physics Sliders & Values
const driftStrengthSlider = document.getElementById('driftStrengthSlider');
const driftStrengthValue = document.getElementById('driftStrengthValue');
const elasticitySlider = document.getElementById('elasticitySlider');
const elasticityValue = document.getElementById('elasticityValue');
const instabilityThresholdSlider = document.getElementById('instabilityThresholdSlider');
const instabilityThresholdValue = document.getElementById('instabilityThresholdValue');
const electronLifespanSlider = document.getElementById('electronLifespanSlider');
const electronLifespanValue = document.getElementById('electronLifespanValue');

// Config Selects
const chartTimeWindowSelect = document.getElementById('chartTimeWindowSelect');
const gpuOptimizationSelect = document.getElementById('gpuOptimizationSelect');

// Managers
const chartManager = new ChartManager('discoveryChart');
let simulation = null;

/**
 * Updates simulation bounds according to page elements height/offsets
 */
function updateBounds() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const areaScale = SETTINGS.simulationAreaScale || 1.0;
    SETTINGS.width = canvas.width * areaScale;
    SETTINGS.height = canvas.height * areaScale;

    // Boundary top accounts for the unified floating top panel height scaled
    SETTINGS.topBoundary = (topDashboard.offsetHeight + 20) * areaScale;
    
    const discoveriesVisible = !uniqueCombinationsBar.classList.contains('hidden');
    SETTINGS.bottomBoundary = discoveriesVisible ? ((uniqueCombinationsBar.offsetTop - 10) * areaScale) : (SETTINGS.height - 10);
}

/**
 * Draws a static mini molecule onto the discovery item's canvas
 * @param {CanvasRenderingContext2D} miniCtx 
 * @param {import('./entities/Molecule.js').default} molecule 
 */
function drawMiniMolecule(miniCtx, molecule) {
    const size = molecule.size;
    // Sort orbits by color for a standardized formula icon representation
    const balls = [...molecule.balls]
        .sort((a, b) => a.color.localeCompare(b.color))
        .map((ball, i) => ({ ...ball, angle: (i / size) * Math.PI * 2 }));

    const moleculeRadius = 4 + size * 1.5;
    const containerSize = Math.min(miniCtx.canvas.width, miniCtx.canvas.height);
    const margin = 5;

    const scale = (containerSize / 2 - margin) / moleculeRadius;
    const radius = moleculeRadius * scale;
    const centerX = miniCtx.canvas.width / 2;
    const centerY = miniCtx.canvas.height / 2;

    miniCtx.clearRect(0, 0, miniCtx.canvas.width, miniCtx.canvas.height);
    miniCtx.save();
    miniCtx.translate(centerX, centerY);

    balls.forEach(ball => {
        const ballRadius = 4 * scale;
        const orbitRadius = radius - ballRadius;
        const ballX = Math.cos(ball.angle) * orbitRadius;
        const ballY = Math.sin(ball.angle) * orbitRadius;
        
        miniCtx.beginPath();
        miniCtx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        miniCtx.fillStyle = ball.color;
        miniCtx.fill();
    });
    miniCtx.restore();
}

/**
 * Injects a discovered unique combination wrapper into the bottom drawer
 * @param {import('./entities/Molecule.js').default} molecule 
 * @param {number} discoveryNumber 
 */
function handleNewDiscovery(molecule, discoveryNumber) {
    const scale = SETTINGS.miniParticleScale;

    const wrapper = document.createElement('div');
    wrapper.className = 'unique-particle-wrapper';

    const container = document.createElement('div');
    container.className = 'unique-particle-container';
    container.style.width = `${70 * scale}px`;
    container.style.height = `${70 * scale}px`;
    
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 70 * scale;
    miniCanvas.height = 70 * scale;
    const miniCtx = miniCanvas.getContext('2d');

    const numberLabel = document.createElement('span');
    numberLabel.className = 'discovery-number';
    numberLabel.textContent = `#${padNumber(discoveryNumber, 3)}`;

    // Draw the static formula configuration on thumbnail canvas
    drawMiniMolecule(miniCtx, molecule);

    container.appendChild(miniCanvas);
    wrapper.appendChild(container);
    wrapper.appendChild(numberLabel);
    uniqueCombinationsBar.prepend(wrapper);

    // Evict oldest discoveries if they overflow horizontally
    while (uniqueCombinationsBar.scrollWidth > uniqueCombinationsBar.clientWidth) {
        if (uniqueCombinationsBar.lastChild) {
            uniqueCombinationsBar.removeChild(uniqueCombinationsBar.lastChild);
        } else {
            break;
        }
    }
}

/**
 * Updates UI stats values in top bar
 */
function handleStatsUpdate(stats) {
    const min = Math.floor(stats.elapsedSeconds / 60);
    const sec = stats.elapsedSeconds % 60;
    
    simTimeDisplay.textContent = `${padNumber(min, 2)}:${padNumber(sec, 2)}`;
    moleculeCountDisplay.textContent = padNumber(stats.molecules, 3);
    electronCountDisplay.textContent = padNumber(stats.electrons, 3);
    uniqueCombinationsDisplay.textContent = padNumber(stats.combinations, 3);
    timeScaleDisplay.textContent = `${stats.slowdownPercent}%`;
}

/**
 * Reads values from DOM controls and updates SETTINGS object
 */
function synchronizeConfig() {
    SETTINGS.numMolecules = parseInt(numMoleculesSlider.value);
    SETTINGS.colorCount = parseInt(colorCountSelect.value);
    SETTINGS.simulationAreaScale = parseFloat(simulationAreaSlider.value) / 10;
    SETTINGS.miniParticleScale = parseFloat(miniParticleScaleSlider.value) / 10;
    SETTINGS.lerpFactor = parseFloat(lerpFactorSlider.value) / 1000;
    SETTINGS.simulationSpeed = parseFloat(simSpeedSlider.value) / 10;
    SETTINGS.spawnChanceMultiplier = parseFloat(spawnChanceSlider.value) / 10;
    SETTINGS.decayChanceMultiplier = parseFloat(decayChanceSlider.value) / 10;
    SETTINGS.driftStrengthMultiplier = parseFloat(driftStrengthSlider.value) / 10;
    SETTINGS.elasticity = parseFloat(elasticitySlider.value) / 10;
    SETTINGS.instabilityThreshold = parseFloat(instabilityThresholdSlider.value) / 10;
    SETTINGS.electronLifespanMultiplier = parseFloat(electronLifespanSlider.value) / 10;
    SETTINGS.chartTimeWindow = parseInt(chartTimeWindowSelect.value, 10);
    SETTINGS.gpuOptimization = gpuOptimizationSelect.value === 'enabled';
    
    // Toggle body class for GPU optimization (backdrop-filter disable)
    document.body.classList.toggle('gpu-optimized', SETTINGS.gpuOptimization);
    
    // Sync visibility of containers directly from settings
    chartContainer.classList.toggle('hidden', !SETTINGS.showChart);
    uniqueCombinationsBar.classList.toggle('hidden', !SETTINGS.showDiscoveries);
}

/**
 * Updates active classes on the floating control dock buttons
 */
function syncDockButtonsFromSettings() {
    // 1. Play/Pause
    const playIcon = btnPlayPause.querySelector('.icon-play');
    const pauseIcon = btnPlayPause.querySelector('.icon-pause');
    if (SETTINGS.isPaused) {
        btnPlayPause.classList.add('paused');
        btnPlayPause.classList.remove('active');
        playIcon?.classList.remove('hidden');
        pauseIcon?.classList.add('hidden');
        btnPlayPause.setAttribute('aria-label', 'Resume Simulation');
    } else {
        btnPlayPause.classList.remove('paused');
        btnPlayPause.classList.add('active');
        playIcon?.classList.add('hidden');
        pauseIcon?.classList.remove('hidden');
        btnPlayPause.setAttribute('aria-label', 'Pause Simulation');
    }

    // 2. Interaction Mode
    if (SETTINGS.addParticleOnClick) {
        btnModeSpawn.classList.add('active');
        btnModeSpawn.setAttribute('aria-pressed', 'true');
        btnModeDecay.classList.remove('active');
        btnModeDecay.setAttribute('aria-pressed', 'false');
    } else {
        btnModeDecay.classList.add('active');
        btnModeDecay.setAttribute('aria-pressed', 'true');
        btnModeSpawn.classList.remove('active');
        btnModeSpawn.setAttribute('aria-pressed', 'false');
    }

    // 3. Spontaneous Generation
    btnSpontaneousGen.classList.toggle('active', SETTINGS.spontaneousGeneration);
    btnSpontaneousGen.setAttribute('aria-pressed', SETTINGS.spontaneousGeneration ? 'true' : 'false');

    // 4. Spontaneous Decay
    btnSpontaneousDecay.classList.toggle('active', SETTINGS.spontaneousDecay);
    btnSpontaneousDecay.setAttribute('aria-pressed', SETTINGS.spontaneousDecay ? 'true' : 'false');

    // 5. Screen Wrap
    btnScreenWrap.classList.toggle('active', SETTINGS.noBoundingBox);
    btnScreenWrap.setAttribute('aria-pressed', SETTINGS.noBoundingBox ? 'true' : 'false');

    // 6. Show Chart
    btnToggleChart.classList.toggle('active', SETTINGS.showChart);
    btnToggleChart.setAttribute('aria-pressed', SETTINGS.showChart ? 'true' : 'false');
    chartContainer.classList.toggle('hidden', !SETTINGS.showChart);

    // 7. Show Discoveries
    btnToggleDiscoveries.classList.toggle('active', SETTINGS.showDiscoveries);
    btnToggleDiscoveries.setAttribute('aria-pressed', SETTINGS.showDiscoveries ? 'true' : 'false');
    uniqueCombinationsBar.classList.toggle('hidden', !SETTINGS.showDiscoveries);

    // Refresh bounds since visible components shifted borders
    updateBounds();
}

/**
 * Updates slider value bubbles in config sidebar
 */
function updateSliderLabels() {
    numMoleculesValue.textContent = numMoleculesSlider.value;
    simulationAreaValue.textContent = `${(simulationAreaSlider.value / 10).toFixed(1)}x`;
    miniParticleScaleValue.textContent = `${(miniParticleScaleSlider.value / 10).toFixed(1)}x`;
    lerpFactorValue.textContent = (lerpFactorSlider.value / 1000).toFixed(3);
    simSpeedValue.textContent = `${(simSpeedSlider.value / 10).toFixed(1)}x`;
    spawnChanceValue.textContent = `${(spawnChanceSlider.value / 10).toFixed(1)}x`;
    decayChanceValue.textContent = `${(decayChanceSlider.value / 10).toFixed(1)}x`;
    driftStrengthValue.textContent = `${(driftStrengthSlider.value / 10).toFixed(1)}x`;
    elasticityValue.textContent = `${(elasticitySlider.value / 10).toFixed(1)}x`;
    instabilityThresholdValue.textContent = (instabilityThresholdSlider.value / 10).toFixed(1);
    electronLifespanValue.textContent = `${(electronLifespanSlider.value / 10).toFixed(1)}x`;
}

/**
 * Initializes and starts the simulation loop
 */
function start() {
    updateBounds();
    synchronizeConfig();
    
    // Instantiate engine if not created
    if (!simulation) {
        simulation = new Simulation(canvas, chartManager, {
            onDiscovery: handleNewDiscovery,
            onStatsUpdate: handleStatsUpdate
        });
    }

    // Reset components
    uniqueCombinationsBar.innerHTML = '';
    chartManager.reset();
    simulation.init();
    syncDockButtonsFromSettings();
}

// Quick Control Dock Event Listeners
btnPlayPause.addEventListener('click', () => {
    SETTINGS.isPaused = !SETTINGS.isPaused;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnModeDecay.addEventListener('click', () => {
    SETTINGS.addParticleOnClick = false;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnModeSpawn.addEventListener('click', () => {
    SETTINGS.addParticleOnClick = true;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnSpontaneousGen.addEventListener('click', () => {
    SETTINGS.spontaneousGeneration = !SETTINGS.spontaneousGeneration;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnSpontaneousDecay.addEventListener('click', () => {
    SETTINGS.spontaneousDecay = !SETTINGS.spontaneousDecay;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnScreenWrap.addEventListener('click', () => {
    SETTINGS.noBoundingBox = !SETTINGS.noBoundingBox;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnToggleChart.addEventListener('click', () => {
    SETTINGS.showChart = !SETTINGS.showChart;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnToggleDiscoveries.addEventListener('click', () => {
    SETTINGS.showDiscoveries = !SETTINGS.showDiscoveries;
    if (simulation) simulation.needsRedraw = true;
    syncDockButtonsFromSettings();
});

btnReset.addEventListener('click', start);

btnSettingsToggle.addEventListener('click', () => {
    configSidebar.classList.toggle('open');
});

// Sidebar Close Event
configCloseBtn.addEventListener('click', () => {
    configSidebar.classList.remove('open');
});

applyResetBtn.addEventListener('click', () => {
    start();
    configSidebar.classList.remove('open');
});

chartTimeWindowSelect.addEventListener('change', () => {
    SETTINGS.chartTimeWindow = parseInt(chartTimeWindowSelect.value, 10);
    chartManager.reset();
});

gpuOptimizationSelect.addEventListener('change', () => {
    SETTINGS.gpuOptimization = gpuOptimizationSelect.value === 'enabled';
    document.body.classList.toggle('gpu-optimized', SETTINGS.gpuOptimization);
    if (simulation) simulation.needsRedraw = true;
});

// Real-time slider updates
const allSliders = [
    numMoleculesSlider, simulationAreaSlider, miniParticleScaleSlider,
    lerpFactorSlider, simSpeedSlider, spawnChanceSlider, decayChanceSlider,
    driftStrengthSlider, elasticitySlider, instabilityThresholdSlider, electronLifespanSlider
];

allSliders.forEach(slider => {
    slider.addEventListener('input', () => {
        updateSliderLabels();
        // Dynamically update runtime settings that do not require full reset
        SETTINGS.simulationAreaScale = parseFloat(simulationAreaSlider.value) / 10;
        updateBounds();
        SETTINGS.lerpFactor = parseFloat(lerpFactorSlider.value) / 1000;
        SETTINGS.simulationSpeed = parseFloat(simSpeedSlider.value) / 10;
        SETTINGS.spawnChanceMultiplier = parseFloat(spawnChanceSlider.value) / 10;
        SETTINGS.decayChanceMultiplier = parseFloat(decayChanceSlider.value) / 10;
        SETTINGS.driftStrengthMultiplier = parseFloat(driftStrengthSlider.value) / 10;
        SETTINGS.elasticity = parseFloat(elasticitySlider.value) / 10;
        SETTINGS.instabilityThreshold = parseFloat(instabilityThresholdSlider.value) / 10;
        SETTINGS.electronLifespanMultiplier = parseFloat(electronLifespanSlider.value) / 10;
        if (simulation) simulation.needsRedraw = true;
    });
});

colorCountSelect.addEventListener('change', () => {
    SETTINGS.colorCount = parseInt(colorCountSelect.value);
    if (simulation) simulation.needsRedraw = true;
});

// Dynamic title update for the spawn button based on the custom count input
function updateAddButtonTitle() {
    const val = inputAddCount.value || 10;
    btnAddTen.setAttribute('title', `Spawn ${val} Random Molecules`);
}

inputAddCount.addEventListener('input', updateAddButtonTitle);
updateAddButtonTitle();

btnAddTen.addEventListener('click', () => {
    if (simulation) {
        let count = parseInt(inputAddCount.value, 10);
        if (isNaN(count) || count < 1) {
            count = 1;
        }
        simulation.spawnMolecules(count);
    }
});

// Click on simulation canvas
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (SETTINGS.simulationAreaScale || 1.0);
    const y = (event.clientY - rect.top) * (SETTINGS.simulationAreaScale || 1.0);
    simulation.handleCanvasClick(x, y);
});

// Handle resize events
window.addEventListener('resize', () => {
    updateBounds();
    if (simulation) simulation.needsRedraw = true;
});

// Start loop
updateSliderLabels();
chartManager.init();
start();

// Running discovery rate calculation independent of animation frame for stability
setInterval(() => {
    if (SETTINGS.showChart) {
        chartManager.update();
    }
}, 2000);

// Animation ticker
function animate() {
    simulation.tick();
    requestAnimationFrame(animate);
}

// Initial Lucide trigger if script loaded
if (window.lucide) {
    window.lucide.createIcons();
}

// Begin animation
animate();
