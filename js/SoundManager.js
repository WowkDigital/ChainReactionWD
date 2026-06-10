import { SETTINGS } from './Config.js';

class SoundManager {
    constructor() {
        this.ctx = null;
        this.musicAudio = null;
        this.proceduralInterval = null;
        this.activeProceduralNodes = [];
        this.musicGain = null;
        
        // Sound settings defaults matching the initial UI states
        this.audioEnabled = true;
        this.sfxVolume = 0.5;
        this.musicVolume = 0.3;

        // Ambient chords for procedural music fallback (Pentatonic/Warm Minor chords)
        this.chords = [
            [130.81, 196.00, 261.63, 329.63], // C3, G3, C4, E4 (C major)
            [110.00, 164.81, 220.00, 261.63], // A2, E3, A3, C4 (A minor)
            [174.61, 261.63, 349.23, 392.00], // F3, C4, F4, G4 (F sus2)
            [146.83, 220.00, 293.66, 349.23]  // D3, A3, D4, F4 (D minor)
        ];
        this.currentChordIndex = 0;
        
        // Bind click once to resume AudioContext after first user interaction (browser security policy)
        const unlockAudio = () => {
            this.init();
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
    }

    /**
     * Initializes the Web Audio API context
     */
    init() {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }
        
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.updateMusic();
        } catch (e) {
            console.error('Web Audio API is not supported in this browser.', e);
        }
    }

    /**
     * Synthesizes a molecule split (decay) sound
     * Im mniejsza cząsteczka przed rozpadem, tym wyższy ton.
     * @param {number} size Size of the molecule before decaying
     */
    playDecay(size) {
        if (!this.audioEnabled || this.sfxVolume <= 0) return;
        this.init();
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Calculate pitch: smaller size -> higher pitch
        // size ranges from 2 up to 64
        const baseFreq = 2200 / Math.pow(size, 0.65); 
        // Larger sizes have a slightly longer, deeper decay
        const duration = 0.12 + (size / 64) * 0.15;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * 1.4, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + duration);

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(4, now);
        filter.frequency.setValueAtTime(baseFreq * 3.0, now);
        filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + duration);

        gain.gain.setValueAtTime(this.sfxVolume * 0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * Synthesizes a pleasant pluck/chime when adding a molecule manually
     */
    playAddParticle() {
        if (!this.audioEnabled || this.sfxVolume <= 0) return;
        this.init();
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        // Fast sweep up for an optimistic spawning sound
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(820, now + 0.12);

        gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Updates playback state and volume of the music element or synthesizer
     */
    updateMusic() {
        if (!this.audioEnabled || this.musicVolume <= 0) {
            this.stopMusic();
            return;
        }

        // Lazy-load music audio
        if (!this.musicAudio) {
            this.musicAudio = new Audio('bg.mp3');
            this.musicAudio.loop = true;
            this.musicAudio.volume = this.musicVolume;
            
            this.musicAudio.addEventListener('error', () => {
                console.warn('bg.mp3 not found or failed to load. Initiating procedural synthesizer.');
                this.musicAudio = null;
                this.startProceduralMusic();
            });
        }

        if (this.musicAudio) {
            this.musicAudio.volume = this.musicVolume;
            this.stopProceduralMusic();
            this.musicAudio.play().catch(() => {
                // Autoplay blocked fallback to procedural once context runs
                this.startProceduralMusic();
            });
        } else {
            this.startProceduralMusic();
        }
    }

    /**
     * Suspends background music streaming or synthesize timers
     */
    stopMusic() {
        if (this.musicAudio) {
            this.musicAudio.pause();
        }
        this.stopProceduralMusic();
    }

    /**
     * Procedural synthesizer that acts as background music
     */
    startProceduralMusic() {
        if (this.proceduralInterval || !this.ctx) return;

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume * 0.15, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);

        const playNextChord = () => {
            if (!this.audioEnabled || this.musicVolume <= 0 || !this.ctx) return;
            const now = this.ctx.currentTime;
            const chord = this.chords[this.currentChordIndex];
            this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

            const noteDuration = 7.5;

            chord.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const noteGain = this.ctx.createGain();
                const lp = this.ctx.createBiquadFilter();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(280 + Math.sin(now * 0.15) * 60, now);

                const attack = 2.5 + Math.random() * 0.5;
                const release = 3.5 + Math.random() * 0.5;

                noteGain.gain.setValueAtTime(0.001, now);
                noteGain.gain.linearRampToValueAtTime(0.04 + (1 / (idx + 1)) * 0.03, now + attack);
                noteGain.gain.setValueAtTime(0.04 + (1 / (idx + 1)) * 0.03, now + noteDuration - release);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration);

                osc.connect(lp);
                lp.connect(noteGain);
                noteGain.connect(this.musicGain);

                osc.start(now);
                osc.stop(now + noteDuration);

                const nodeRef = { osc, noteGain, lp };
                this.activeProceduralNodes.push(nodeRef);
                setTimeout(() => {
                    this.activeProceduralNodes = this.activeProceduralNodes.filter(n => n !== nodeRef);
                }, noteDuration * 1000 + 500);
            });
        };

        playNextChord();
        this.proceduralInterval = setInterval(playNextChord, 6000);
    }

    /**
     * Stop procedural synthesizer nodes
     */
    stopProceduralMusic() {
        if (this.proceduralInterval) {
            clearInterval(this.proceduralInterval);
            this.proceduralInterval = null;
        }
        this.activeProceduralNodes.forEach(node => {
            try {
                node.osc.stop();
            } catch (e) {}
        });
        this.activeProceduralNodes = [];
        if (this.musicGain) {
            try {
                this.musicGain.disconnect();
            } catch (e) {}
            this.musicGain = null;
        }
    }

    /**
     * Sets toggle state for all audio output
     */
    setAudioEnabled(enabled) {
        this.audioEnabled = enabled;
        SETTINGS.soundEnabled = enabled;
        if (enabled) {
            this.init();
            this.updateMusic();
        } else {
            this.stopMusic();
        }
    }

    /**
     * Adjusts sound effects volume slider
     */
    setSFXVolume(volume) {
        this.sfxVolume = volume;
        SETTINGS.sfxVolume = volume;
    }

    /**
     * Adjusts background music volume slider
     */
    setMusicVolume(volume) {
        this.musicVolume = volume;
        SETTINGS.musicVolume = volume;
        if (this.musicAudio) {
            this.musicAudio.volume = volume;
        }
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime);
        }
        if (volume > 0 && this.audioEnabled) {
            this.updateMusic();
        } else if (volume <= 0) {
            this.stopMusic();
        }
    }
}

export const soundManager = new SoundManager();
