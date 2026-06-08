import { CONSTANTS, SETTINGS } from '../Config.js';
import Entity from './Entity.js';

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
        
        this.initialLifespan = baseLifespan * lifespanFactor;
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
     * Draws a glowing yellow electron to the canvas
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        ctx.strokeStyle = CONSTANTS.WHITE_COLOR; // Golden outer stroke
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 1.5; 
        ctx.stroke();

        const fadeInProgress = 1 - Math.max(0, this.fadeInTimer / this.initialFadeInTime);
        const fadeOutProgress = Math.max(0, this.lifespan / CONSTANTS.FADE_OUT_DURATION);
        const totalAlpha = Math.min(fadeInProgress, fadeOutProgress);

        ctx.fillStyle = `rgba(251, 191, 36, ${totalAlpha})`;
        ctx.shadowColor = '#FBBF24';
        ctx.shadowBlur = 10 * totalAlpha; 
        ctx.fill();
        ctx.restore();
    }
}
