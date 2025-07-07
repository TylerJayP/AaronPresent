// Audio Manager for Whiskers Presenter App - FINAL FIX with audio element tracking
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
        this.isStoppingAll = false; // Prevent overlapping stop operations
        this.placeholderTimeouts = new Set(); // Track placeholder timeouts
        this.allAudioElements = new Set(); // ✅ Track ALL audio elements we create
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

    // Main method to play chapter audio - waits for stopAllAudio to complete
    async playChapterAudio(chapterId, section = 'main') {
        try {
            // ✅ CRITICAL FIX: Wait for stopAllAudio to fully complete
            await this.stopAllAudio();
            
            // Additional safety check - don't start if we're still stopping
            if (this.isStoppingAll) {
                console.log('🔊 Still stopping audio, skipping new playback');
                return;
            }

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

    // ✅ UPDATED: Track audio elements when we create them
    async loadAndPlayAudio(filepath, filename) {
        try {
            // Check cache first and validate the cached audio
            if (this.audioCache.has(filepath)) {
                console.log(`🔊 Checking cached audio: ${filename}`);
                const audio = this.audioCache.get(filepath);
                
                if (audio.error || !audio.src || audio.networkState === audio.NETWORK_NO_SOURCE) {
                    console.log(`🔊 Cached audio is corrupted, recreating: ${filename}`);
                    this.audioCache.delete(filepath);
                    this.allAudioElements.delete(audio); // ✅ Remove from tracking
                } else {
                    console.log(`🔊 Using valid cached audio: ${filename}`);
                    if (audio.src !== filepath && !audio.src.endsWith(filepath)) {
                        console.log(`🔊 Restoring audio src: ${filename}`);
                        audio.src = filepath;
                    }
                    
                    audio.pause();
                    audio.currentTime = 0;
                    this.setupAudioEventListeners(audio, filename);
                    await this.playAudioElement(audio, filename);
                    return;
                }
            }

            // Create new audio element
            console.log(`🔊 Creating new audio element: ${filename}`);
            const audio = new Audio();
            audio.volume = this.muted ? 0 : this.volume;
            audio.preload = 'auto';

            // ✅ NEW: Track this audio element
            this.allAudioElements.add(audio);

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
            this.audioCache.delete(filepath);
            this.simulateAudioPlayback(filename);
        }
    }

    // Method to properly handle audio element playing
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

    // Enhanced: Track placeholder timeouts so we can clear them
    simulateAudioPlayback(filename) {
        console.log(`🔊 [PLACEHOLDER] Playing: ${filename}`);

        this.isPlaying = true;
        this.currentFile = filename;
        this.notifyAudioStatus('started', filename);
        this.app.modules.ui.updateAudioIndicator(true);

        // Simulate realistic narration duration (15-45 seconds)
        const duration = 15000 + Math.random() * 30000;

        const timeoutId = setTimeout(() => {
            console.log(`🔊 [PLACEHOLDER] Finished: ${filename}`);
            this.isPlaying = false;
            this.currentFile = null;
            this.notifyAudioStatus('finished', filename);
            this.app.modules.ui.updateAudioIndicator(false);
            this.addToHistory(filename);
            
            // Remove this timeout from our tracking
            this.placeholderTimeouts.delete(timeoutId);
        }, duration);
        
        // Track this timeout so we can clear it if needed
        this.placeholderTimeouts.add(timeoutId);
    }

    // Don't corrupt cached audio elements when stopping
    stopCurrentAudio() {
        if (this.currentAudio) {
            console.log('🔊 Stopping current audio immediately');
            
            // Stop the audio immediately but DON'T clear the src for cached elements
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            
            // Remove all event listeners to prevent callbacks
            this.currentAudio.onended = null;
            this.currentAudio.onpause = null;
            this.currentAudio.onplay = null;
            this.currentAudio.onerror = null;
            
            // Don't clear src if this audio is in cache - just stop it
            const audioSrc = this.currentAudio.src;
            const isInCache = Array.from(this.audioCache.values()).includes(this.currentAudio);
            
            if (!isInCache) {
                // Only clear src for non-cached audio elements
                this.currentAudio.src = '';
                this.currentAudio.load();
            }
            // For cached elements, just leave them paused with their src intact
            
            // Reset state variables
            this.isPlaying = false;
            this.currentFile = null;
            
            // Update UI immediately
            if (this.app.modules.ui) {
                this.app.modules.ui.updateAudioIndicator(false);
            }
            
            // Send status notification if needed
            if (audioSrc) {
                this.notifyAudioStatus('stopped', this.currentFile);
            }
            
            // Clear the reference
            this.currentAudio = null;
            
            console.log('🔊 Current audio stopped successfully');
        }
    }

    // ✅ FIXED: Stop ALL tracked audio elements (not DOM elements)
    stopAllAudio() {
        return new Promise((resolve) => {
            if (this.isStoppingAll) {
                resolve();
                return;
            }
            
            this.isStoppingAll = true;
            console.log('🔊 AGGRESSIVELY stopping ALL audio - BLOCKING');
            
            // 1. Stop our tracked current audio
            this.stopCurrentAudio();
            
            // 2. Stop all cached audio elements
            for (const [filepath, audio] of this.audioCache) {
                if (audio && !audio.paused) {
                    console.log(`🔊 Stopping cached audio: ${filepath}`);
                    audio.pause();
                    audio.currentTime = 0;
                }
            }
            
            // 3. ✅ FIXED: Stop ALL tracked audio elements (not DOM query)
            console.log(`🔊 Found ${this.allAudioElements.size} tracked audio elements`);
            
            this.allAudioElements.forEach((audio) => {
                if (audio && !audio.paused) {
                    console.log(`🔊 Stopping tracked audio element:`, audio.src);
                    audio.pause();
                    audio.currentTime = 0;
                }
            });
            
            // 4. Clear any placeholder audio timeouts
            if (this.placeholderTimeouts && this.placeholderTimeouts.size > 0) {
                this.placeholderTimeouts.forEach(timeoutId => {
                    clearTimeout(timeoutId);
                    console.log('🔊 Cleared placeholder timeout');
                });
                this.placeholderTimeouts.clear();
            }
            
            // 5. Reset all state immediately
            this.isPlaying = false;
            this.currentFile = null;
            this.currentAudio = null;
            
            // Update UI immediately
            if (this.app.modules.ui) {
                this.app.modules.ui.updateAudioIndicator(false);
            }
            
            // Wait longer to ensure audio is fully stopped
            setTimeout(() => {
                this.isStoppingAll = false;
                console.log('🔊 ALL audio aggressively stopped - UNBLOCKED');
                resolve();
            }, 300);
        });
    }

    // Method to check if audio is properly stopped
    isAudioFullyStopped() {
        if (this.currentAudio && !this.currentAudio.paused) {
            return false;
        }
        
        // Check all cached audio
        for (const [filepath, audio] of this.audioCache) {
            if (audio && !audio.paused) {
                return false;
            }
        }
        
        // Check all tracked audio elements
        for (const audio of this.allAudioElements) {
            if (audio && !audio.paused) {
                return false;
            }
        }
        
        return true;
    }

    // ✅ UPDATED: Better debug method using tracked elements
    findAllPlayingAudio() {
        const playingAudio = [];
        
        console.log(`🔍 Checking ${this.allAudioElements.size} tracked audio elements...`);
        
        let index = 0;
        this.allAudioElements.forEach((audio) => {
            const isPlaying = !audio.paused;
            const isInCache = Array.from(this.audioCache.values()).includes(audio);
            const isCurrent = audio === this.currentAudio;
            
            console.log(`Audio ${index}: playing=${isPlaying}, cached=${isInCache}, current=${isCurrent}, src=${audio.src}`);
            
            if (isPlaying) {
                playingAudio.push({
                    element: audio,
                    index,
                    src: audio.src,
                    isInCache,
                    isCurrent
                });
            }
            index++;
        });
        
        console.log(`🔍 Found ${playingAudio.length} playing audio elements:`, playingAudio);
        return playingAudio;
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

    // ✅ UPDATED: Track preloaded audio too
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

            // ✅ NEW: Track preloaded audio too
            this.allAudioElements.add(audio);

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
        this.allAudioElements.clear(); // ✅ Clear tracking too
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
            trackedAudioElements: this.allAudioElements.size, // ✅ NEW stat
            historyCount: this.playbackHistory.length,
            audioEnabled: CONFIG.AUDIO_ENABLED
        };
    }
}