/**
 * Simulation Config and Constants
 */

export const CONSTANTS = Object.freeze({
    // Physics & Movement
    MAX_DRIFT_STRENGTH: 0.005,
    DRIFT_CHANGE_RATE: 0.008,
    
    // Molecule States & Decay
    HIGH_SPEED_THRESHOLD: 3.0,
    HIGH_SPEED_DECAY_TIME: 120, // frames
    INVULNERABILITY_DURATION: 90, // frames
    FADE_OUT_DURATION: 45, // frames
    MAX_SHAKE_AMOUNT: 8, // pixels
    BASE_SPAWN_CHANCE: 0.005,
    BASE_DECAY_CHANCE: 0.0001,
    
    // Combining Physics
    BASE_COMBINE_SPEED_THRESHOLD: 2.0,
    SIZE_THRESHOLD_FACTOR: 0.2,
    MAX_COMBINED_SIZE: 64,
    
    // Matter conservation losses
    MIN_PARTICLE_LOSS_PERCENTAGE: 0.1,
    MAX_PARTICLE_LOSS_PERCENTAGE: 0.9,
    ELECTRON_SPAWN_LIMIT_PERCENTAGE: 0.3,
    
    // Click / collision triggered decay
    DECAY_TIME_MEAN_FRAMES: 75,
    DECAY_TIME_STD_DEV_FRAMES: 15,
    
    // Electron specific
    ELECTRON_FADE_IN_DURATION: 30,
    
    // Visuals & Colors
    COLOR_PALETTE: [
        '#F43F5E', // Rose
        '#EC4899', // Pink
        '#D946EF', // Fuchsia
        '#A855F7', // Purple
        '#8B5CF6', // Violet
        '#6366F1', // Indigo
        '#3B82F6', // Blue
        '#0EA5E9', // Sky
        '#06B6D4', // Cyan
        '#14B8A6', // Teal
        '#10B981', // Emerald
        '#22C55E', // Green
        '#84CC16', // Lime
        '#EAB308'  // Yellow
    ],
    WHITE_COLOR: '#E5E7EB',
    
    // Chart
    CHART_UPDATE_INTERVAL: 2000, // ms
    CHART_DATA_POINTS: 60
});

export const SETTINGS = {
    // Sliders & Values
    numMolecules: 30,
    colorCount: 14,
    miniParticleScale: 1.0,
    lerpFactor: 0.05,
    simulationSpeed: 1.0,
    spawnChanceMultiplier: 1.0,
    decayChanceMultiplier: 1.0,
    driftStrengthMultiplier: 1.0,
    elasticity: 1.0,
    instabilityThreshold: 3.0,
    electronLifespanMultiplier: 1.0,
    
    // Checkboxes / Modes
    showChart: false,
    showDiscoveries: false,
    isPaused: false,
    spontaneousGeneration: false,
    spontaneousDecay: false,
    addParticleOnClick: false,
    noBoundingBox: false,
    
    // Chart Time Window
    chartTimeWindow: 30000, // ms
    
    // Execution State
    effectiveTimeScale: 1.0,
    autoTimeScale: 1.0
};
