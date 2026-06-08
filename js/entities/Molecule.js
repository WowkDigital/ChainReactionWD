import { CONSTANTS, SETTINGS } from '../Config.js';
import { easeInOut, lerpColorToFull } from '../Utils.js';
import Entity from './Entity.js';
import Electron from './Electron.js';

export default class Molecule extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} size Number of atoms / balls forming the ring
     * @param {Array<{angle: number, radius: number, color: string}>} [inheritedBalls] Colors and positioning inherited on combination or split
     */
    constructor(x, y, size, inheritedBalls = null) {
        const radius = 4 + size * 1.5;
        super(x, y, radius);
        
        this.size = size;
        this.invulnerabilityTimer = 0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.01;
        this.highSpeedTimer = 0;
        this.isUnstable = false;
        
        // Decay timers
        this.spontaneousDecayTimer = -1;
        this.initialSpontaneousDecayTime = -1;
        this.collisionDecayTimer = -1;
        this.initialCollisionDecayTime = -1;
        
        this.decayProgress = 0;

        if (inheritedBalls) {
            // Re-map inherited sub-particles to current size ratios
            this.balls = inheritedBalls.map((ball, i) => ({
                angle: (i / this.size) * Math.PI * 2,
                radius: ball.radius,
                color: ball.color
            }));
        } else {
            this.balls = this.createInitialBalls();
        }

        this.spriteCanvas = null;
    }

    /**
     * Creates the circular ring of atoms with alternating colors
     * @returns {Array<{angle: number, radius: number, color: string}>}
     */
    createInitialBalls() {
        const newBalls = [];
        const activePalette = CONSTANTS.COLOR_PALETTE.slice(0, SETTINGS.colorCount);
        const randomColor = activePalette[Math.floor(Math.random() * activePalette.length)];
        
        for (let i = 0; i < this.size; i++) {
            const angle = (i / this.size) * Math.PI * 2;
            const color = i % 2 === 0 ? CONSTANTS.WHITE_COLOR : randomColor;
            newBalls.push({ angle: angle, radius: 4, color: color });
        }
        return newBalls;
    }

    /**
     * Caches the molecule sub-atoms onto an offscreen canvas sprite
     */
    cacheSprite() {
        const size = Math.ceil(this.radius * 2 + 10);
        this.spriteCanvas = document.createElement('canvas');
        this.spriteCanvas.width = size;
        this.spriteCanvas.height = size;
        const sCtx = this.spriteCanvas.getContext('2d');
        
        const center = size / 2;
        sCtx.translate(center, center);
        
        this.balls.forEach(ball => {
            const ballRadius = 4;
            const orbitRadius = this.radius - ballRadius;
            const ballX = Math.cos(ball.angle) * orbitRadius;
            const ballY = Math.sin(ball.angle) * orbitRadius;
            
            sCtx.beginPath();
            sCtx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            sCtx.fillStyle = ball.color;
            sCtx.fill();
        });
    }

    /**
     * Updates physics, decay state, and triggers division if necessary
     * @param {{molecules: Array<Molecule>, electrons: Array<Electron>, registerDiscovery: Function}} context Simulation scope to inject children
     */
    update(context) {
        super.update();
        const dt = SETTINGS.effectiveTimeScale;
        
        if (this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= 1 * dt;
        }

        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > SETTINGS.instabilityThreshold) {
            this.highSpeedTimer += 1 * dt;
        } else {
            this.highSpeedTimer = 0;
        }
        
        // Compute decay progress across multiple possible decay causes
        let progress = 0;
        if (this.highSpeedTimer > 0) {
            progress = Math.max(progress, this.highSpeedTimer / CONSTANTS.HIGH_SPEED_DECAY_TIME);
        }
        if (this.spontaneousDecayTimer > 0 && this.initialSpontaneousDecayTime > 0) {
            progress = Math.max(progress, 1 - (this.spontaneousDecayTimer / this.initialSpontaneousDecayTime));
        }
        if (this.collisionDecayTimer > 0 && this.initialCollisionDecayTime > 0) {
            progress = Math.max(progress, 1 - (this.collisionDecayTimer / this.initialCollisionDecayTime));
        }

        this.isUnstable = (this.highSpeedTimer > CONSTANTS.HIGH_SPEED_DECAY_TIME * 0.75) || 
                          (this.spontaneousDecayTimer > 0) || 
                          (this.collisionDecayTimer > 0);
        this.decayProgress = progress;

        // Perform splits if timers expire
        if (this.highSpeedTimer > CONSTANTS.HIGH_SPEED_DECAY_TIME) {
            this.split(context);
        }
        
        if (this.spontaneousDecayTimer > 0) {
            this.spontaneousDecayTimer -= 1 * dt;
            if (this.spontaneousDecayTimer <= 0) {
                this.split(context);
            }
        }
        
        if (this.collisionDecayTimer > 0) {
            this.collisionDecayTimer -= 1 * dt;
            if (this.collisionDecayTimer <= 0) {
                this.split(context);
            }
        }
    }

    /**
     * Renders the molecule on canvas, applying shake effects when unstable or newly combined
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const dt = SETTINGS.effectiveTimeScale;
        this.rotation += this.rotationSpeed * dt;
        
        ctx.save();
        let shakeX = 0, shakeY = 0;
        let currentShakeIntensity = 0;

        // Apply visual shaking for instability
        if (this.isUnstable) {
            currentShakeIntensity = Math.max(currentShakeIntensity, easeInOut(this.decayProgress) * CONSTANTS.MAX_SHAKE_AMOUNT);
        }
        
        // Apply smooth scale settling-down shake on combination / birth
        if (this.invulnerabilityTimer > 0) {
            const invulnProgress = 1 - (this.invulnerabilityTimer / (CONSTANTS.INVULNERABILITY_DURATION * 2));
            const combinationShakeFactor = invulnProgress * (2 - invulnProgress);
            currentShakeIntensity = Math.max(currentShakeIntensity, (1 - combinationShakeFactor) * CONSTANTS.MAX_SHAKE_AMOUNT);
        }
        
        if (currentShakeIntensity > 0) {
            shakeX = (Math.random() - 0.5) * currentShakeIntensity;
            shakeY = (Math.random() - 0.5) * currentShakeIntensity;
        }

        ctx.translate(this.x + shakeX, this.y + shakeY);
        ctx.rotate(this.rotation);

        // Draw quantum field glowing background (simulated glow via pre-rendered gradient)
        if (currentShakeIntensity > 0) {
            const glowRadius = (this.radius * 0.8 + currentShakeIntensity * 0.5) * 1.6; 
            const glowAlpha = Math.min(0.5, currentShakeIntensity / CONSTANTS.MAX_SHAKE_AMOUNT * 0.5);
            
            const oldAlpha = ctx.globalAlpha;
            ctx.globalAlpha = oldAlpha * glowAlpha;
            ctx.drawImage(getGlowSprite(), -glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2);
            ctx.globalAlpha = oldAlpha;
        }

        // Draw orbiting sub-atoms (using offscreen cache if stable, drawing dynamically only during grayscale intro transition)
        if (this.invulnerabilityTimer > 0) {
            this.balls.forEach(ball => {
                const ballRadius = 4;
                const orbitRadius = this.radius - ballRadius;
                const ballX = Math.cos(ball.angle) * orbitRadius;
                const ballY = Math.sin(ball.angle) * orbitRadius;
                
                ctx.beginPath();
                ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
                
                const transitionFactor = 1 - (this.invulnerabilityTimer / (CONSTANTS.INVULNERABILITY_DURATION * 2));
                ctx.fillStyle = lerpColorToFull(ball.color, transitionFactor);
                ctx.fill();
            });
        } else {
            if (!this.spriteCanvas) {
                this.cacheSprite();
            }
            const offset = this.spriteCanvas.width / 2;
            ctx.drawImage(this.spriteCanvas, -offset, -offset);
        }
        ctx.restore();
    }

    /**
     * Splits this molecule in half, creating two smaller molecules or releasing electrons
     * @param {{molecules: Array<Molecule>, electrons: Array<Electron>, registerDiscovery: Function}} context 
     */
    split(context) {
        if (this.markedForRemoval) return;
        this.markedForRemoval = true;
        
        const { molecules, electrons, registerDiscovery } = context;

        // Smallest size decays fully to raw energy (Electrons)
        if (this.size === 2) {
            for (let i = 0; i < 2; i++) {
                electrons.push(new Electron(this.x, this.y, electrons.length));
            }
            return;
        }

        const newSize = this.size / 2;
        if (newSize >= 2) {
            const ejectionAngle = Math.random() * Math.PI * 2;
            const ejectionSpeed = 2.0;
            const ballsForChild1 = this.balls.slice(0, newSize);
            const ballsForChild2 = this.balls.slice(newSize);

            for (let i = 0; i < 2; i++) {
                const angle = ejectionAngle + i * Math.PI;
                const newX = this.x + Math.cos(angle) * this.radius * 0.5;
                const newY = this.y + Math.sin(angle) * this.radius * 0.5;
                const inheritedBalls = (i === 0) ? ballsForChild1 : ballsForChild2;
                
                const child = new Molecule(newX, newY, newSize, inheritedBalls);
                child.vx = this.vx + Math.cos(angle) * ejectionSpeed;
                child.vy = this.vy + Math.sin(angle) * ejectionSpeed;
                child.invulnerabilityTimer = CONSTANTS.INVULNERABILITY_DURATION;
                
                molecules.push(child);
                
                // Track unique molecular formulas
                const combinationString = child.balls.map(ball => ball.color).sort().join('');
                registerDiscovery(combinationString, child);
            }
        }

        // Spawn escaping free electrons during splitting
        const maxElectrons = Math.max(1, Math.floor(this.size / 4));
        const electronCount = 1 + Math.floor(Math.random() * maxElectrons);
        for (let i = 0; i < electronCount; i++) {
            electrons.push(new Electron(this.x, this.y, electrons.length));
        }
    }
}

// Global cached resources
let glowSpriteCanvas = null;

function getGlowSprite() {
    if (glowSpriteCanvas) return glowSpriteCanvas;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    
    glowSpriteCanvas = canvas;
    return glowSpriteCanvas;
}
