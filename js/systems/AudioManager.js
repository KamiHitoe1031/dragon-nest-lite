// Dragon Nest Lite - Audio Manager
// Uses Web Audio API for sound effects and background music
import { CONFIG } from '../config.js';

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.bgmElement = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.voiceGain = null;
        this.sfxCache = new Map();
        this.currentBGM = '';
        this.ambientElement = null;
        this.currentAmbient = '';
        this.initialized = false;
        this.voiceEnabled = true; // Voice ON/OFF toggle
    }

    async init() {
        // AudioContext must be created after user interaction
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.bgmGain = this.audioContext.createGain();
            this.bgmGain.gain.value = CONFIG.BGM_VOLUME;
            this.bgmGain.connect(this.audioContext.destination);

            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = CONFIG.SFX_VOLUME;
            this.sfxGain.connect(this.audioContext.destination);

            this.voiceGain = this.audioContext.createGain();
            this.voiceGain.gain.value = CONFIG.VOICE_VOLUME;
            this.voiceGain.connect(this.audioContext.destination);

            this.initialized = true;
        } catch (e) {
            console.warn('AudioContext not available:', e);
        }
    }

    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    async playBGM(name) {
        if (this.currentBGM === name) return;
        this.currentBGM = name;

        // Stop current BGM
        if (this.bgmElement) {
            this.bgmElement.pause();
            this.bgmElement.currentTime = 0;
        }

        try {
            this.bgmElement = new Audio(`assets/audio/bgm/${name}.mp3`);
            this.bgmElement.loop = true;
            this.bgmElement.volume = CONFIG.BGM_VOLUME;
            await this.bgmElement.play().catch(() => {
                // Autoplay blocked - will play after user interaction
            });
        } catch (e) {
            // BGM file not found - expected during development
        }
    }

    stopBGM() {
        if (this.bgmElement) {
            this.bgmElement.pause();
            this.bgmElement.currentTime = 0;
        }
        this.currentBGM = '';
    }

    async playAmbient(name) {
        if (this.currentAmbient === name) return;
        this.stopAmbient();
        this.currentAmbient = name;

        try {
            this.ambientElement = new Audio(`assets/audio/sfx/${name}.mp3`);
            this.ambientElement.loop = true;
            this.ambientElement.volume = CONFIG.SFX_VOLUME * 0.3; // Quieter than SFX
            await this.ambientElement.play().catch(() => {});
        } catch (e) {
            // Ambient file not found
        }
    }

    stopAmbient() {
        if (this.ambientElement) {
            this.ambientElement.pause();
            this.ambientElement.currentTime = 0;
        }
        this.currentAmbient = '';
    }

    // Character voice SFX names that are affected by the voice toggle
    static VOICE_SFX = ['sfx_player_hurt', 'sfx_player_death'];

    playSFX(name) {
        if (!this.initialized) return;

        // Skip character voice SFX if voice is disabled
        if (!this.voiceEnabled && AudioManager.VOICE_SFX.includes(name)) return;

        try {
            const audio = new Audio(`assets/audio/sfx/${name}.mp3`);
            audio.volume = CONFIG.SFX_VOLUME;

            // Random pitch variance
            let rate = 1 + (Math.random() - 0.5) * CONFIG.SFX_PITCH_VARIANCE * 2;

            // Pitch up character voice SFX for feminine sound
            if (AudioManager.VOICE_SFX.includes(name)) {
                rate *= 1.35;
            }

            audio.playbackRate = rate;
            audio.play().catch(() => {});
        } catch (e) {
            // SFX file not found - expected during development
        }
    }

    playVoice(name) {
        if (!this.voiceEnabled) return;
        try {
            const audio = new Audio(`assets/audio/voice/${name}.mp3`);
            audio.volume = CONFIG.VOICE_VOLUME;
            audio.play().catch(() => {});
        } catch (e) {
            // Voice file not found
        }
    }

    toggleVoice() {
        this.voiceEnabled = !this.voiceEnabled;
        return this.voiceEnabled;
    }

    setBGMVolume(volume) {
        CONFIG.BGM_VOLUME = volume;
        if (this.bgmElement) this.bgmElement.volume = volume;
    }

    setSFXVolume(volume) {
        CONFIG.SFX_VOLUME = volume;
    }
}
