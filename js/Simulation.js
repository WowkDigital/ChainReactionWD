import { CONSTANTS, SETTINGS } from './Config.js';
import Molecule from './entities/Molecule.js';
import Electron from './entities/Electron.js';
import { 
    getWeightedRandomSize, 
    getRandomNormal, 
    calculateAutoTimeScale 
} from './Utils.js';

export default class Simulation {
    /**
     * @param {HTMLCanvasElement} canvas The simulation surface
     * @param {import('./ChartManager.js').default} chartManager Discovery rate graph controller
     * @param {{
     *   onDiscovery: (molecule: Molecule, discoveryCount: number) => void,
     *   onStatsUpdate: (stats: { elapsedSeconds: number, molecules: number, electrons: number, combinations: number, slowdownPercent: number }) => void
     * }} callbacks Decoupled UI callbacks
     */
    constructor(canvas, chartManager, callbacks = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.chartManager = chartManager;
        this.callbacks = callbacks;

        this.molecules = [];
        this.electrons = [];
        this.uniqueCombinationsSet = new Set();
        this.simulationStartTime = 0;
        this.animationFrameId = null;
    }

    /**
     * Resets state variables and populates initial molecules
     */
    init() {
        this.molecules = [];
        this.electrons = [];
        this.uniqueCombinationsSet.clear();
        
        this.lastTickTime = performance.now();
        this.elapsedTimeAccumulated = 0;
        
        // Reset config context
        SETTINGS.autoTimeScale = 1.0;
        SETTINGS.effectiveTimeScale = 1.0;

        // Spawn starting molecules at random positions inside valid boundaries
        const top = SETTINGS.topBoundary || 0;
        const bottom = SETTINGS.bottomBoundary || this.canvas.height;
        
        for (let i = 0; i < SETTINGS.numMolecules; i++) {
            const size = getWeightedRandomSize();
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * (bottom - top) + top;
            
            const newMolecule = new Molecule(x, y, size);
            newMolecule.invulnerabilityTimer = CONSTANTS.INVULNERABILITY_DURATION;
            this.molecules.push(newMolecule);
        }
    }

    /**
     * Handles canvas clicks: either spawns a molecule or triggers unstable decay on click target
     * @param {number} mouseX 
     * @param {number} mouseY 
     */
    handleCanvasClick(mouseX, mouseY) {
        if (SETTINGS.addParticleOnClick) {
            const size = getWeightedRandomSize();
            const newMolecule = new Molecule(mouseX, mouseY, size);
            newMolecule.invulnerabilityTimer = CONSTANTS.INVULNERABILITY_DURATION;
            this.molecules.push(newMolecule);
        } else {
            // Find clicked molecule (searching backward to check top-most rendered first)
            for (let i = this.molecules.length - 1; i >= 0; i--) {
                const m = this.molecules[i];
                if (m.invulnerabilityTimer > 0 || m.isUnstable) continue;

                const dx = mouseX - m.x;
                const dy = mouseY - m.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < m.radius * m.radius) {
                    const decayFrames = Math.max(30, getRandomNormal(CONSTANTS.DECAY_TIME_MEAN_FRAMES, CONSTANTS.DECAY_TIME_STD_DEV_FRAMES));
                    m.collisionDecayTimer = decayFrames;
                    m.initialCollisionDecayTime = decayFrames;
                    break; // Action handled
                }
            }
        }
    }

    /**
     * Checks electron collisions against stable molecules, converting electrons into collision-energy triggers
     */
    checkElectronCollisions() {
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const electron = this.electrons[i];
            
            for (let j = this.molecules.length - 1; j >= 0; j--) {
                const molecule = this.molecules[j];
                
                // Electrons can only hit stable molecules
                if (molecule.markedForRemoval || molecule.invulnerabilityTimer > 0 || molecule.isUnstable) {
                    continue;
                }

                const dx = electron.x - molecule.x;
                const dy = electron.y - molecule.y;
                const distSq = dx * dx + dy * dy;
                const minDist = electron.radius + molecule.radius;
                
                // Optimized check using distance squared to bypass slow Math.sqrt
                if (distSq < minDist * minDist) {
                    const decayFrames = Math.max(30, getRandomNormal(CONSTANTS.DECAY_TIME_MEAN_FRAMES, CONSTANTS.DECAY_TIME_STD_DEV_FRAMES));
                    molecule.collisionDecayTimer = decayFrames;
                    molecule.initialCollisionDecayTime = decayFrames;
                    
                    electron.markedForRemoval = true;
                    break; // Electron absorbed
                }
            }
        }
    }

    /**
     * Resolves molecular collisions: triggers high-energy combination, or executes elastic bounces
     */
    checkMoleculeCollisions() {
        for (let i = 0; i < this.molecules.length; i++) {
            for (let j = i + 1; j < this.molecules.length; j++) {
                const m1 = this.molecules[i];
                const m2 = this.molecules[j];

                if (m1.markedForRemoval || m2.markedForRemoval) continue;

                const dx = m2.x - m1.x;
                const dy = m2.y - m1.y;
                const distSq = dx * dx + dy * dy;
                const minDist = m1.radius + m2.radius;

                // Optimization: Skip Math.sqrt unless particles are overlapping
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    
                    const relativeVx = m1.vx - m2.vx;
                    const relativeVy = m1.vy - m2.vy;
                    const relativeSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

                    const potentialCombinedSize = m1.size + m2.size;
                    const requiredSpeed = CONSTANTS.BASE_COMBINE_SPEED_THRESHOLD + 
                                          (potentialCombinedSize / CONSTANTS.MAX_COMBINED_SIZE) * CONSTANTS.SIZE_THRESHOLD_FACTOR;

                    const canCombine = m1.invulnerabilityTimer <= 0 && 
                                       m2.invulnerabilityTimer <= 0 &&
                                       relativeSpeed > requiredSpeed &&
                                       potentialCombinedSize <= CONSTANTS.MAX_COMBINED_SIZE;

                    if (canCombine) {
                        m1.markedForRemoval = true;
                        m2.markedForRemoval = true;
                        
                        // Conservation of mass: part of the combined atoms disintegrates into free electrons
                        const normalizedSizeFactor = (potentialCombinedSize - 2) / (CONSTANTS.MAX_COMBINED_SIZE - 2); 
                        const lossPercentage = CONSTANTS.MIN_PARTICLE_LOSS_PERCENTAGE + 
                                              (CONSTANTS.MAX_PARTICLE_LOSS_PERCENTAGE - CONSTANTS.MIN_PARTICLE_LOSS_PERCENTAGE) * 
                                              normalizedSizeFactor;
                        
                        let actualNewSize = Math.max(2, Math.round(potentialCombinedSize * (1 - lossPercentage)));
                        // Ensure size is even for alternating colors
                        if (actualNewSize % 2 !== 0 && actualNewSize > 2) actualNewSize--;

                        const lostParticlesCount = potentialCombinedSize - actualNewSize;
                        const electronsToSpawn = Math.min(
                            lostParticlesCount, 
                            Math.round(lostParticlesCount * CONSTANTS.ELECTRON_SPAWN_LIMIT_PERCENTAGE)
                        );

                        // Spawn ejected electrons
                        for (let k = 0; k < electronsToSpawn; k++) {
                            this.electrons.push(new Electron(m1.x, m1.y, this.electrons.length));
                        }

                        // Coordinates and velocity averages
                        const newX = (m1.x + m2.x) / 2;
                        const newY = (m1.y + m2.y) / 2;
                        const newVx = (m1.vx + m2.vx) / 2;
                        const newVy = (m1.vy + m2.vy) / 2;

                        // Combine atoms and shuffle colors
                        const combinedBalls = [...m1.balls, ...m2.balls];
                        for (let k = combinedBalls.length - 1; k > 0; k--) {
                            const randIdx = Math.floor(Math.random() * (k + 1));
                            [combinedBalls[k], combinedBalls[randIdx]] = [combinedBalls[randIdx], combinedBalls[k]];
                        }
                        const selectedBalls = combinedBalls.slice(0, actualNewSize);

                        // Spawn combination result
                        const combinedMolecule = new Molecule(newX, newY, actualNewSize, selectedBalls);
                        combinedMolecule.vx = newVx;
                        combinedMolecule.vy = newVy;
                        combinedMolecule.invulnerabilityTimer = CONSTANTS.INVULNERABILITY_DURATION * 2; 
                        this.molecules.push(combinedMolecule);

                        // Register unique structure
                        const combinationString = selectedBalls.map(ball => ball.color).sort().join('');
                        this.registerDiscovery(combinationString, combinedMolecule);

                    } else {
                        // Classical Elastic 2D Collision (Bounce)
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);

                        // Rotate velocities
                        const v1 = { x: m1.vx * cos + m1.vy * sin, y: m1.vy * cos - m1.vx * sin };
                        const v2 = { x: m2.vx * cos + m2.vy * sin, y: m2.vy * cos - m2.vx * sin };

                        // Swap horizontal components
                        [v1.x, v2.x] = [v2.x, v1.x];

                        // Rotate velocities back
                        m1.vx = v1.x * cos - v1.y * sin;
                        m1.vy = v1.y * cos + v1.x * sin;
                        m2.vx = v2.x * cos - v2.y * sin;
                        m2.vy = v2.y * cos + v2.x * sin;

                        // Push particles apart to avoid sticking
                        const overlap = 0.5 * (minDist - dist);
                        m1.x -= overlap * cos;
                        m1.y -= overlap * sin;
                        m2.x += overlap * cos;
                        m2.y += overlap * sin;
                    }
                }
            }
        }
    }

    /**
     * Executes spontaneous event checks
     */
    handleSpontaneousEvents() {
        const top = SETTINGS.topBoundary || 0;
        const bottom = SETTINGS.bottomBoundary || this.canvas.height;

        // Spontaneous Molecule Generation
        const spawnChance = (CONSTANTS.BASE_SPAWN_CHANCE + 
                             (CONSTANTS.BASE_SPAWN_CHANCE * 5) / (1 + this.molecules.length)) * 
                            SETTINGS.spawnChanceMultiplier;
                            
        if (SETTINGS.spontaneousGeneration && Math.random() < spawnChance) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * (bottom - top) + top;
            const size = [4, 8, 16][Math.floor(Math.random() * 3)];
            
            const newMolecule = new Molecule(x, y, size);
            newMolecule.invulnerabilityTimer = CONSTANTS.INVULNERABILITY_DURATION;
            this.molecules.push(newMolecule);
        }

        // Spontaneous Molecule Decay
        if (SETTINGS.spontaneousDecay) {
            const decayChance = CONSTANTS.BASE_DECAY_CHANCE * SETTINGS.decayChanceMultiplier;
            for (const molecule of this.molecules) {
                if (molecule.size >= 4 && 
                    molecule.invulnerabilityTimer <= 0 && 
                    !molecule.isUnstable && 
                    Math.random() < decayChance) {
                    
                    const decayFrames = Math.max(30, getRandomNormal(CONSTANTS.DECAY_TIME_MEAN_FRAMES, CONSTANTS.DECAY_TIME_STD_DEV_FRAMES));
                    molecule.spontaneousDecayTimer = decayFrames;
                    molecule.initialSpontaneousDecayTime = decayFrames;
                }
            }
        }
    }

    /**
     * Adds combination to set, adds timestamp to rate graph, and triggers onDiscovery UI hook
     * @param {string} combinationString 
     * @param {Molecule} molecule 
     */
    registerDiscovery(combinationString, molecule) {
        if (!this.uniqueCombinationsSet.has(combinationString)) {
            this.uniqueCombinationsSet.add(combinationString);
            
            const now = performance.now();
            this.chartManager.addDiscoveryTimestamp(now);
            
            if (this.callbacks.onDiscovery) {
                this.callbacks.onDiscovery(molecule, this.uniqueCombinationsSet.size);
            }
        }
    }

    /**
     * Frame ticker: updates entities, processes collisions, redraws canvas, triggers UI state reports
     */
    tick() {
        const now = performance.now();
        const frameTime = now - this.lastTickTime;
        this.lastTickTime = now;

        if (!SETTINGS.isPaused) {
            this.elapsedTimeAccumulated += frameTime;
            
            // Compute slow-motion scale from active electrons
            const targetAutoTimeScale = calculateAutoTimeScale(this.electrons.length);
            SETTINGS.autoTimeScale += (targetAutoTimeScale - SETTINGS.autoTimeScale) * SETTINGS.lerpFactor;
        }
        
        SETTINGS.effectiveTimeScale = SETTINGS.isPaused ? 0 : (SETTINGS.autoTimeScale * SETTINGS.simulationSpeed);

        // Reset canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const context = {
            molecules: this.molecules,
            electrons: this.electrons,
            registerDiscovery: this.registerDiscovery.bind(this)
        };

        // Update entities (only if not paused)
        if (!SETTINGS.isPaused) {
            this.molecules.forEach(m => m.update(context));
            this.electrons.forEach(e => e.update());
        }

        // Draw entities (always draw)
        this.molecules.forEach(m => m.draw(this.ctx));
        this.electrons.forEach(e => e.draw(this.ctx));

        // Physics steps (only if not paused)
        if (!SETTINGS.isPaused) {
            this.checkElectronCollisions();
            this.checkMoleculeCollisions();
            this.handleSpontaneousEvents();

            // Clear references marked for cleanup
            this.molecules = this.molecules.filter(m => !m.markedForRemoval);
            this.electrons = this.electrons.filter(e => !e.markedForRemoval);
        }

        // Report real-time stats to UI layer
        if (this.callbacks.onStatsUpdate) {
            const elapsed = Math.floor(this.elapsedTimeAccumulated / 1000);
            this.callbacks.onStatsUpdate({
                elapsedSeconds: elapsed,
                molecules: this.molecules.length,
                electrons: this.electrons.length,
                combinations: this.uniqueCombinationsSet.size,
                slowdownPercent: Math.round((1 - SETTINGS.autoTimeScale) * 100)
            });
        }
    }
}
