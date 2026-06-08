import { CONSTANTS, SETTINGS } from '../Config.js';

export default class Entity {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} radius 
     */
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        
        // Random starting velocity
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
        this.markedForRemoval = false;
        
        // Random drift characteristics
        this.driftStrength = 0;
        this.driftTargetStrength = (Math.random() * 2 - 1) * CONSTANTS.MAX_DRIFT_STRENGTH;
    }

    /**
     * Updates physics: velocity drift, position, boundaries
     */
    update() {
        const dt = SETTINGS.effectiveTimeScale;
        
        // Apply random drift force perpendicular to direction of movement
        this.driftStrength += (this.driftTargetStrength - this.driftStrength) * CONSTANTS.DRIFT_CHANGE_RATE * dt;
        
        if (Math.abs(this.driftStrength - this.driftTargetStrength) < 0.0001) {
            this.driftTargetStrength = (Math.random() * 2 - 1) * CONSTANTS.MAX_DRIFT_STRENGTH;
        }
        
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > 0.01) {
            const perpX = -this.vy / speed;
            const perpY = this.vx / speed;
            
            this.vx += perpX * this.driftStrength * SETTINGS.driftStrengthMultiplier * dt;
            this.vy += perpY * this.driftStrength * SETTINGS.driftStrengthMultiplier * dt;
        }

        // Apply translation
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Boundary Handling
        const width = SETTINGS.width || window.innerWidth;
        const topBoundary = SETTINGS.topBoundary || 0;
        const bottomBoundary = SETTINGS.bottomBoundary || window.innerHeight;

        if (SETTINGS.noBoundingBox) {
            // Screen Wrapping
            if (this.x + this.radius < 0) this.x = width + this.radius;
            if (this.x - this.radius > width) this.x = -this.radius;
            if (this.y + this.radius < topBoundary) this.y = bottomBoundary + this.radius;
            if (this.y - this.radius > bottomBoundary) this.y = topBoundary - this.radius;
        } else {
            // Screen Bouncing
            if (this.x - this.radius < 0) {
                this.vx *= -1;
                this.x = this.radius;
            } else if (this.x + this.radius > width) {
                this.vx *= -1;
                this.x = width - this.radius;
            }
            
            if (this.y - this.radius < topBoundary) {
                this.vy *= -1;
                this.y = topBoundary + this.radius;
            } else if (this.y + this.radius > bottomBoundary) {
                this.vy *= -1;
                this.y = bottomBoundary - this.radius;
            }
        }
    }
}
