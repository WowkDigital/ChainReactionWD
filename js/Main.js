import { SETTINGS } from './Config.js';
import { padNumber } from './Utils.js';
import ChartManager from './ChartManager.js';
import Simulation from './Simulation.js';

// DOM Elements
const canvas = document.getElementById('simulationCanvas');
const statsBar = document.getElementById('stats-bar');
const uniqueCombinationsBar = document.getElementById('unique-combinations-bar');
const chartContainer = document.getElementById('chart-container');
const configSidebar = document.getElementById('config-sidebar');
const configToggleBtn = document.getElementById('config-toggle');
const configCloseBtn = document.getElementById('config-close');
const applyResetBtn = document.getElementById('resetButton');

// Stats Displays
const simTimeDisplay = document.getElementById('simTimeDisplay');
const moleculeCountDisplay = document.getElementById('moleculeCountDisplay');
const electronCountDisplay = document.getElementById('electronCountDisplay');
const uniqueCombinationsDisplay = document.getElementById('uniqueCombinationsDisplay');
const timeScaleDisplay = document.getElementById('timeScaleDisplay');

// Config Sliders & Values
const numMoleculesSlider = document.getElementById('numMoleculesSlider');
const numMoleculesValue = document.getElementById('numMoleculesValue');
const colorCountSlider = document.getElementById('colorCountSlider');
const colorCountValue = document.getElementById('colorCountValue');
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

// Config Selects & Checkboxes
const chartTimeWindowSelect = document.getElementById('chartTimeWindowSelect');
const showChartCheck = document.getElementById('showChartCheck');
const spontaneousGenerationCheck = document.getElementById('spontaneousGenerationCheck');
const spontaneousDecayCheck = document.getElementById('spontaneousDecayCheck');
const addParticleCheck = document.getElementById('addParticleCheck');
const noBoundingBoxCheck = document.getElementById('noBoundingBoxCheck');

// Managers
const chartManager = new ChartManager('discoveryChart');
let simulation = null;

/**
 * Updates simulation bounds according to page elements height/offsets
 */
function updateBounds() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    SETTINGS.width = canvas.width;
    SETTINGS.height = canvas.height;
    SETTINGS.topBoundary = statsBar.offsetHeight + 10;
    SETTINGS.bottomBoundary = uniqueCombinationsBar.offsetTop - 10;
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
    SETTINGS.colorCount = parseInt(colorCountSlider.value);
    SETTINGS.miniParticleScale = parseFloat(miniParticleScaleSlider.value) / 10;
    SETTINGS.lerpFactor = parseFloat(lerpFactorSlider.value) / 1000;
    SETTINGS.simulationSpeed = parseFloat(simSpeedSlider.value) / 10;
    SETTINGS.spawnChanceMultiplier = parseFloat(spawnChanceSlider.value) / 10;
    SETTINGS.decayChanceMultiplier = parseFloat(decayChanceSlider.value) / 10;
    SETTINGS.chartTimeWindow = parseInt(chartTimeWindowSelect.value, 10);
    
    SETTINGS.showChart = showChartCheck.checked;
    SETTINGS.spontaneousGeneration = spontaneousGenerationCheck.checked;
    SETTINGS.spontaneousDecay = spontaneousDecayCheck.checked;
    SETTINGS.addParticleOnClick = addParticleCheck.checked;
    SETTINGS.noBoundingBox = noBoundingBoxCheck.checked;

    // Toggle widgets according to choices
    chartContainer.classList.toggle('hidden', !SETTINGS.showChart);
}

/**
 * Updates slider value bubbles in config sidebar
 */
function updateSliderLabels() {
    numMoleculesValue.textContent = numMoleculesSlider.value;
    colorCountValue.textContent = colorCountSlider.value;
    miniParticleScaleValue.textContent = `${(miniParticleScaleSlider.value / 10).toFixed(1)}x`;
    lerpFactorValue.textContent = (lerpFactorSlider.value / 1000).toFixed(3);
    simSpeedValue.textContent = `${(simSpeedSlider.value / 10).toFixed(1)}x`;
    spawnChanceValue.textContent = `${(spawnChanceSlider.value / 10).toFixed(1)}x`;
    decayChanceValue.textContent = `${(decayChanceSlider.value / 10).toFixed(1)}x`;
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
}

// Event Listeners for Config Panel
configToggleBtn.addEventListener('click', () => {
    configSidebar.classList.add('open');
    configToggleBtn.classList.add('hidden');
    configToggleBtn.setAttribute('aria-expanded', 'true');
});

configCloseBtn.addEventListener('click', () => {
    configSidebar.classList.remove('open');
    configToggleBtn.classList.remove('hidden');
    configToggleBtn.setAttribute('aria-expanded', 'false');
});

applyResetBtn.addEventListener('click', start);

// Immediate setting synchronizations on checkbox toggle
showChartCheck.addEventListener('change', () => {
    SETTINGS.showChart = showChartCheck.checked;
    chartContainer.classList.toggle('hidden', !SETTINGS.showChart);
});

spontaneousGenerationCheck.addEventListener('change', () => {
    SETTINGS.spontaneousGeneration = spontaneousGenerationCheck.checked;
});

spontaneousDecayCheck.addEventListener('change', () => {
    SETTINGS.spontaneousDecay = spontaneousDecayCheck.checked;
});

addParticleCheck.addEventListener('change', () => {
    SETTINGS.addParticleOnClick = addParticleCheck.checked;
});

noBoundingBoxCheck.addEventListener('change', () => {
    SETTINGS.noBoundingBox = noBoundingBoxCheck.checked;
});

chartTimeWindowSelect.addEventListener('change', () => {
    SETTINGS.chartTimeWindow = parseInt(chartTimeWindowSelect.value, 10);
    chartManager.reset();
});

// Real-time slider updates
const allSliders = [
    numMoleculesSlider, colorCountSlider, miniParticleScaleSlider,
    lerpFactorSlider, simSpeedSlider, spawnChanceSlider, decayChanceSlider
];

allSliders.forEach(slider => {
    slider.addEventListener('input', () => {
        updateSliderLabels();
        // Dynamically update runtime settings that do not require full reset
        SETTINGS.colorCount = parseInt(colorCountSlider.value);
        SETTINGS.lerpFactor = parseFloat(lerpFactorSlider.value) / 1000;
        SETTINGS.simulationSpeed = parseFloat(simSpeedSlider.value) / 10;
        SETTINGS.spawnChanceMultiplier = parseFloat(spawnChanceSlider.value) / 10;
        SETTINGS.decayChanceMultiplier = parseFloat(decayChanceSlider.value) / 10;
    });
});

// Click on simulation canvas
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    simulation.handleCanvasClick(x, y);
});

// Handle resize events
window.addEventListener('resize', () => {
    updateBounds();
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

// Begin animation
animate();
