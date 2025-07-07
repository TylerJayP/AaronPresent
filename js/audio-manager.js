// Audio Manager for Whiskers Presenter App - UPDATED to fix audio overlap
class AudioManager {
    constructor(app) {
        this.app = app;
        this.currentAudio = null;
        this.audioContext = null;
        this.initialized = false;
        this.audioCache = new Map();
        this.isPlaying = false;
        this.currentFile = null;
        this.playbackHistory = [];
        this.volume = 0.7;
        this.muted = false;
    }

    async initialize() {
        try {
            console.log('🔊 Initializing Audio Manager...');

            // Initialize Web Audio API if available
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('🔊 Web Audio API initialized');
            }

            this.initialized = true;
            console.log('✅ Audio Manager initialized');

            // Check if audio is enabled in config
            if (!CONFIG.AUDIO_ENABLED) {
                console.log('🔊 Audio disabled in config - using placeholder mode');
            }

        } catch (error) {
            console.error('❌ Failed to initialize Audio Manager:', error);
            this.app.handleError('audio_init', error);
        }
    }

    // Main method to play chapter audio - UPDATED to stop current audio first
    async playChapterAudio(chapterId, section = 'main') {
        try {
            // ✅ FIXED: Stop any currently playing audio first
            this.stopAllAudio();

            const filename = `chapter_${chapterId}_${section}.mp3`;
            const filepath = `./audio/${filename}`;

            console.log(`🔊 Playing audio: ${filename}`);

            if (!CONFIG.AUDIO_ENABLED) {
                // Placeholder mode - simulate audio playback
                this.simulateAudioPlayback(filename);
                return;
            }

            // Attempt to load and play real audio
            await this.loadAndPlayAudio(filepath, filename);

        } catch (error) {
            console.error(`🔊 Failed to play audio for chapter ${chapterId}:`, error);
            this.handleAudioError(error, chapterId, section);
        }
    }

    // UPDATED to properly handle currentAudio tracking
    async loadAndPlayAudio(filepath, filename) {
        try {
            // Check cache first
            if (this.audioCache.has(filepath)) {
                console.log(`🔊 Using cached audio: ${filename}`);
                const audio = this.audioCache.get(filepath);
                // Reset cached audio before playing
                audio.pause();
                audio.currentTime = 0;
                await this.playAudioElement(audio, filename);
                return;
            }

            // Create new audio element
            const audio = new Audio();
            audio.volume = this.muted ? 0 : this.volume;
            audio.preload = 'auto';

            // Set up event listeners
            this.setupAudioEventListeners(audio, filename);

            // Start loading
            audio.src = filepath;

            // Cache the audio element
            this.audioCache.set(filepath, audio);

            // Wait for load and play
            await this.playAudioElement(audio, filename);

        } catch (error) {
            console.error(`🔊 Failed to load audio file: ${filepath}`, error);
            // Fall back to placeholder
            this.simulateAudioPlayback(filename);
        }
    }

    // NEW method to properly handle audio element playing
    async playAudioElement(audio, filename) {
        return new Promise((resolve, reject) => {
            // Set this as the current audio BEFORE playing
            this.currentAudio = audio;
            this.currentFile = filename;

            const playHandler = () => {
                audio.removeEventListener('canplay', playHandler);
                audio.removeEventListener('error', errorHandler);
                resolve();
            };

            const errorHandler = (error) => {
                audio.removeEventListener('canplay', playHandler);
                audio.removeEventListener('error', errorHandler);
                reject(error);
            };

            audio.addEventListener('canplay', playHandler);
            audio.addEventListener('error', errorHandler);

            // Start playing
            audio.play().catch(error => {
                if (error.name === 'NotAllowedError') {
                    console.log(`🔊 Autoplay blocked for ${filename} - user interaction required`);
                    // Still resolve as this is expected behavior
                    resolve();
                } else {
                    errorHandler(error);
                }
            });
        });
    }

    setupAudioEventListeners(audio, filename) {
        audio.addEventListener('loadstart', () => {
            console.log(`🔊 Loading started: ${filename}`);
            this.notifyAudioStatus('loading', filename);
        });

        audio.addEventListener('canplay', () => {
            console.log(`🔊 Audio ready: ${filename}`);
        });

        audio.addEventListener('play', () => {
            console.log(`🔊 Playback started: ${filename}`);
            this.isPlaying = true;
            this.currentFile = filename;
            this.notifyAudioStatus('started', filename);
            this.app.modules.ui.updateAudioIndicator(true);
        });

        audio.addEventListener('pause', () => {
            console.log(`🔊 Playback paused: ${filename}`);
            this.isPlaying = false;
            this.notifyAudioStatus('paused', filename);
            this.app.modules.ui.updateAudioIndicator(false);
        });

        audio.addEventListener('ended', () => {
            console.log(`🔊 Playback finished: ${filename}`);
            this.isPlaying = false;
            this.currentFile = null;
            this.notifyAudioStatus('finished', filename);
            this.app.modules.ui.updateAudioIndicator(false);
            this.addToHistory(filename);
        });

        audio.addEventListener('error', (error) => {
            console.error(`🔊 Audio error for ${filename}:`, error);
            this.isPlaying = false;
            this.notifyAudioStatus('error', filename);
            this.app.modules.ui.updateAudioIndicator(false);
        });
    }

    simulateAudioPlayback(filename) {
        console.log(`🔊 [PLACEHOLDER] Playing: ${filename}`);

        this.isPlaying = true;
        this.currentFile = filename;
        this.notifyAudioStatus('started', filename);
        this.app.modules.ui.updateAudioIndicator(true);

        // Simulate realistic narration duration (15-45 seconds)
        const duration = 15000 + Math.random() * 30000;

        setTimeout(() => {
            console.log(`🔊 [PLACEHOLDER] Finished: ${filename}`);
            this.isPlaying = false;
            this.currentFile = null;
            this.notifyAudioStatus('finished', filename);
            this.app.modules.ui.updateAudioIndicator(false);
            this.addToHistory(filename);
        }, duration);
    }

    // ✅ FIXED: Completely stop current audio to prevent overlap
    stopCurrentAudio() {
        if (this.currentAudio) {
            console.log('🔊 Stopping current audio');
            
            // Stop the audio immediately
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            
            // Clear the source to completely stop it
            this.currentAudio.src = '';
            
            // Reset state variables
            this.isPlaying = false;
            this.currentFile = null;
            
            // Update UI
            if (this.app.modules.ui) {
                this.app.modules.ui.updateAudioIndicator(false);
            }
            
            // Send status notification
            this.notifyAudioStatus('stopped', this.currentFile);
            
            // Clear the reference
            this.currentAudio = null;
            
            console.log('🔊 Audio stopped successfully');
        } else {
            console.log('🔊 No audio currently playing to stop');
        }
    }

    // ✅ NEW: Stop ALL audio including cached elements
    stopAllAudio() {
        console.log('🔊 Stopping all audio');
        
        // Stop current audio
        this.stopCurrentAudio();
        
        // Stop all cached audio elements (but keep their sources for reuse)
        for (const [filepath, audio] of this.audioCache) {
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
                // ✅ FIXED: Don't clear src for cached audio - we want to reuse them
                // audio.src = ''; // ← Remove this line
            }
        }
        
        // Reset all state
        this.isPlaying = false;
        this.currentFile = null;
        this.currentAudio = null;
        
        console.log('🔊 All audio stopped');
    }

    pauseCurrentAudio() {
        if (this.currentAudio && this.isPlaying) {
            console.log('🔊 Pausing current audio');
            this.currentAudio.pause();
        }
    }

    resumeCurrentAudio() {
        if (this.currentAudio && !this.isPlaying) {
            console.log('🔊 Resuming current audio');
            this.currentAudio.play();
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));

        if (this.currentAudio) {
            this.currentAudio.volume = this.muted ? 0 : this.volume;
        }

        console.log(`🔊 Volume set to: ${Math.round(this.volume * 100)}%`);
    }

    toggleMute() {
        this.muted = !this.muted;

        if (this.currentAudio) {
            this.currentAudio.volume = this.muted ? 0 : this.volume;
        }

        console.log(`🔊 Audio ${this.muted ? 'muted' : 'unmuted'}`);
        return this.muted;
    }

    // Notify other components of audio status changes
    notifyAudioStatus(status, audioFile) {
        // Update game state
        this.app.gameState.gameStatus.audioPlaying = (status === 'started' || status === 'playing');

        // Send MQTT notification
        if (this.app.modules.mqtt && this.app.modules.mqtt.isConnected()) {
            this.app.modules.mqtt.publish({
                type: 'audio_status',
                status: status,
                audioFile: audioFile
            });
        }

        // Notify development tools
        if (CONFIG.DEVELOPMENT_MODE && this.app.modules.development) {
            this.app.modules.development.logEvent('audio_status', {
                status,
                audioFile,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleAudioError(error, chapterId, section) {
        console.error('🔊 Audio error:', error);

        // Use placeholder as fallback
        const filename = typeof chapterId === 'string' ? 
            chapterId : `chapter_${chapterId}_${section || 'main'}.mp3`;
        this.simulateAudioPlayback(filename);

        // Notify about the error
        this.notifyAudioStatus('error', filename);

        // Add to error log
        this.app.handleError('audio_playback', error);
    }

    addToHistory(filename) {
        this.playbackHistory.unshift({
            filename,
            timestamp: new Date().toISOString()
        });

        // Keep only last 20 entries
        if (this.playbackHistory.length > 20) {
            this.playbackHistory = this.playbackHistory.slice(0, 20);
        }
    }

    // Development/Testing Methods
    preloadChapterAudio(chapterId, section = 'main') {
        if (!CONFIG.AUDIO_ENABLED) {
            console.log(`🔊 [PLACEHOLDER] Preloading: chapter_${chapterId}_${section}.mp3`);
            return;
        }

        const filename = `chapter_${chapterId}_${section}.mp3`;
        const filepath = `./audio/${filename}`;

        if (!this.audioCache.has(filepath)) {
            console.log(`🔊 Preloading: ${filename}`);

            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = filepath;

            this.setupAudioEventListeners(audio, filename);
            this.audioCache.set(filepath, audio);
        }
    }

    testAudio() {
        if (!CONFIG.DEVELOPMENT_MODE) {
            console.warn('🔊 Audio testing only available in development mode');
            return;
        }

        console.log('🔊 [DEV] Testing audio system...');
        this.simulateAudioPlayback('test_audio.mp3');
    }

    clearCache() {
        console.log('🔊 Clearing audio cache');

        // Stop current audio
        this.stopAllAudio();

        // Clear cache
        this.audioCache.clear();
        this.currentAudio = null;
        this.currentFile = null;
        this.isPlaying = false;
    }

    // Getters
    getPlaybackHistory() {
        return [...this.playbackHistory];
    }

    getCurrentlyPlaying() {
        return this.currentFile;
    }

    isAudioPlaying() {
        return this.isPlaying;
    }

    getVolume() {
        return this.volume;
    }

    isMuted() {
        return this.muted;
    }

    getCacheSize() {
        return this.audioCache.size;
    }

    getAudioStats() {
        return {
            initialized: this.initialized,
            playing: this.isPlaying,
            currentFile: this.currentFile,
            volume: this.volume,
            muted: this.muted,
            cacheSize: this.audioCache.size,
            historyCount: this.playbackHistory.length,
            audioEnabled: CONFIG.AUDIO_ENABLED
        };
    }
}