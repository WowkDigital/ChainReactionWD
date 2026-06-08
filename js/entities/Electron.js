import { CONSTANTS, SETTINGS } from '../Config.js';
import Entity from './Entity.js';

let electronSpriteCanvas = null;

/**
 * Creates and caches a high-quality offscreen canvas sprite of the glowing electron
 * @returns {HTMLCanvasElement}
 */
function getElectronSprite() {
    if (electronSpriteCanvas) return electronSpriteCanvas;

    const size = 32; // Accommodate electron radius (3) + shadow blur (10) + safety margins
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const center = size / 2;

    // Draw glow shadow first
    ctx.save();
    ctx.shadowColor = '#FBBF24';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#FBBF24';
    ctx.fill();
    ctx.restore();

    // Draw sharp golden outer border (without shadow blur)
    ctx.beginPath();
    ctx.arc(center, center, 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    electronSpriteCanvas = canvas;
    return electronSpriteCanvas;
}

export default class Electron extends Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} currentElectronCount Helper to scale electron lifespans to prevent overflow
     */
    constructor(x, y, currentElectronCount = 0) {
        super(x, y, 3);
        
        const speed = 2 + Math.random() * 2;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        const baseLifespan = 150 + Math.random() * 100;
        const lifespanFactor = Math.max(0.2, 1 - currentElectronCount / 200);
        
        this.initialLifespan = baseLifespan * lifespanFactor * SETTINGS.electronLifespanMultiplier;
        this.lifespan = this.initialLifespan;
        this.fadeInTimer = CONSTANTS.ELECTRON_FADE_IN_DURATION;
        this.initialFadeInTime = CONSTANTS.ELECTRON_FADE_IN_DURATION;
    }

    /**
     * Updates electron lifespan and physics
     */
    update() {
        super.update();
        const dt = SETTINGS.effectiveTimeScale;
        
        this.lifespan -= 1 * dt;
        this.fadeInTimer -= 1 * dt;
        
        if (this.lifespan <= 0) {
            this.markedForRemoval = true;
        }
    }

    /**
     * Draws a glowing yellow electron to the canvas (optimized with offscreen sprite blitting)
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const sprite = getElectronSprite();
        
        const fadeInProgress = 1 - Math.max(0, this.fadeInTimer / this.initialFadeInTime);
        const fadeOutProgress = Math.max(0, this.lifespan / CONSTANTS.FADE_OUT_DURATION);
        const totalAlpha = Math.min(fadeInProgress, fadeOutProgress);

        ctx.save();
        ctx.globalAlpha = totalAlpha;
        // The sprite center is at offset 16 (half of width/height 32)
        ctx.drawImage(sprite, this.x - 16, this.y - 16);
        ctx.restore();
    }
}
