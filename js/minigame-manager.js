// Minigame Manager for Whiskers Presenter App - Updated with error handling
class MinigameManager {
    constructor(app) {
        this.app = app;
        this.currentMinigame = null;
        this.minigameFrame = null;
        this.initialized = false;
        this.minigameHistory = [];
        this.loadingTimeout = null;
        this.isMinigameActive = false;
        this.currentGameData = null;
    }

    async initialize() {
        try {
            console.log('🎮 Initializing Minigame Manager...');

            // Find or create minigame container
            this.minigameContainer = document.getElementById('minigame-container');
            if (!this.minigameContainer) {
                console.error('🎮 Minigame container not found in DOM');
                throw new Error('Minigame container element not found');
            }

            // Set up message listener for iframe communication
            window.addEventListener('message', (event) => {
                this.handleMinigameMessage(event);
            });

            this.initialized = true;
            console.log('✅ Minigame Manager initialized');

            // Check if minigames are enabled in config
            if (!CONFIG.MINIGAMES_ENABLED) {
                console.log('🎮 Minigames disabled in config - using placeholder mode');
            }

        } catch (error) {
            console.error('❌ Failed to initialize Minigame Manager:', error);
            this.app.handleError('minigame_init', error);
        }
    }

    // Main method to load and start a minigame
    async loadMinigame(minigameId, gameData = {}) {
        try {
            console.log(`🎮 Loading minigame: ${minigameId}`);

            // Stop any current minigame
            this.unloadCurrentMinigame();

            if (!CONFIG.MINIGAMES_ENABLED) {
                // Placeholder mode - simulate minigame
                this.simulateMinigame(minigameId, gameData);
                return;
            }

            // Attempt to load real minigame
            await this.loadRealMinigame(minigameId, gameData);

        } catch (error) {
            console.error(`🎮 Failed to load minigame ${minigameId}:`, error);
            this.handleMinigameError(error, minigameId);
        }
    }

    async loadRealMinigame(minigameId, gameData) {
        const minigameUrl = `./minigames/${minigameId}.html`;

        console.log(`🎮 Loading real minigame from: ${minigameUrl}`);

        // Show loading state
        this.showLoadingState(minigameId);

        // Create iframe
        this.minigameFrame = document.createElement('iframe');
        
// ✅ Force move minigame container to <body> to avoid hidden parents
if (this.minigameContainer && this.minigameContainer.parentNode !== document.body) {
    document.body.appendChild(this.minigameContainer);
    console.log("✅ Minigame container moved to <body>");
}

// ✅ Force container and iframe styles
this.minigameContainer.style.cssText = `
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 99999 !important;
  background: rgba(0, 0, 0, 0.9) !important;
  display: block !important;
`;

this.minigameFrame.style.cssText = `
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  z-index: 100000 !important;
`;
this.minigameContainer.style.display = 'block';
        this.minigameFrame.style.display = 'block';
        this.minigameFrame.style.width = '100%';
        this.minigameFrame.style.height = '100%';
        this.minigameFrame.style.border = 'none';
        this.minigameFrame.style.zIndex = '1000';
        console.log("DEBUG: Applied visibility styles to minigame iframe");
    
        console.log("DEBUG: Created iframe for minigame");
    
        this.minigameFrame.src = minigameUrl;
        this.minigameFrame.style.width = '100vw';
        this.minigameFrame.style.height = '100vh';
        this.minigameFrame.style.border = 'none';
        this.minigameFrame.style.backgroundColor = '#000';
        this.minigameFrame.allow = 'fullscreen';

        // Set up iframe event listeners
        this.minigameFrame.onload = () => {
            console.log(`🎮 Minigame iframe loaded: ${minigameId}`);
            this.onMinigameLoaded(minigameId, gameData);
        };

        this.minigameFrame.onerror = (error) => {
            console.error(`🎮 Failed to load minigame iframe: ${minigameId}`, error);
            this.handleMinigameError(error, minigameId);
        };

        // Set loading timeout
        this.loadingTimeout = setTimeout(() => {
            console.error(`🎮 Minigame loading timeout: ${minigameId}`);
            this.handleMinigameError(new Error('Loading timeout'), minigameId);
        }, CONFIG.MINIGAME_LOADING_TIMEOUT || 30000);

        // Add iframe to container
        this.minigameContainer.appendChild(this.minigameFrame);
        this.showMinigameContainer();
    }

    simulateMinigame(minigameId, gameData) {
        console.log(`🎮 [PLACEHOLDER] Loading minigame: ${minigameId}`);
        console.log(`🎮 [PLACEHOLDER] Game data:`, gameData);

        // Show placeholder content
        this.showPlaceholderMinigame(minigameId);

        // Update state
        this.currentMinigame = minigameId;
        this.currentGameData = gameData;
        this.isMinigameActive = true;

        // Notify about start
        this.notifyMinigameStatus('started', minigameId);

        // Simulate some gameplay time
        const gameplayDuration = 10000 + Math.random() * 20000; // 10-30 seconds

        setTimeout(() => {
            console.log(`🎮 [PLACEHOLDER] Minigame completed: ${minigameId}`);
            this.handleMinigameCompletion(minigameId, {
                success: Math.random() > 0.3, // 70% success rate
                score: Math.floor(Math.random() * 1000),
                completionTime: gameplayDuration
            });
        }, gameplayDuration);
    }

    showPlaceholderMinigame(minigameId) {
        this.minigameContainer.innerHTML = `
            <div class="minigame-placeholder">
                <div class="placeholder-header">🎮 MINIGAME PLACEHOLDER</div>
                <div class="placeholder-title">${this.getMinigameTitle(minigameId)}</div>
                <div class="placeholder-description">${this.getMinigameDescription(minigameId)}</div>
                <div class="placeholder-controls">
                    <div>Controls: WASD + Spacebar</div>
                    <div>Simulated gameplay in progress...</div>
                </div>
                <div class="placeholder-animation">
                    <div class="spinner"></div>
                </div>
            </div>
        `;

        this.showMinigameContainer();
    }

    getMinigameTitle(minigameId) {
        const titles = {
            'post_chapter_6': 'Power Development Challenge',
            'chapter_8_battle': 'Epic Dust Battle',
            'ending_minigame': 'Final Challenge'
        };
        return titles[minigameId] || `Minigame: ${minigameId}`;
    }

    getMinigameDescription(minigameId) {
        const descriptions = {
            'post_chapter_6': 'Test your growing abilities in challenging scenarios',
            'chapter_8_battle': 'The ultimate confrontation requires all your skills',
            'ending_minigame': 'Complete this final challenge to unlock new adventures'
        };
        return descriptions[minigameId] || 'An interactive challenge awaits!';
    }

    onMinigameLoaded(minigameId, gameData) {
        // Clear loading timeout
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }

        // Hide loading state
        this.hideLoadingState();

        // Update state
        this.currentMinigame = minigameId;
        this.currentGameData = gameData;
        this.isMinigameActive = true;

        // Send initialization data to minigame
        this.sendMessageToMinigame({
            type: 'initialize',
            gameData: gameData,
            timestamp: new Date().toISOString()
        });

        // Notify about successful load
        this.notifyMinigameStatus('started', minigameId);

        console.log(`🎮 Minigame ready: ${minigameId}`);
    }

    // Forward MQTT input to minigame
    forwardInputToMinigame(input) {
        if (!this.isMinigameActive) {
            console.warn('🎮 No active minigame to receive input');
            return;
        }

        console.log(`🎮 Forwarding input to minigame: ${input}`);

        if (CONFIG.MINIGAMES_ENABLED && this.minigameFrame) {
            // Send to real minigame iframe
            this.sendMessageToMinigame({
                type: 'game_input',
                input: input,
                timestamp: new Date().toISOString()
            });
        } else {
            // Simulate input handling in placeholder mode
            this.simulateInputHandling(input);
        }
    }

    sendMessageToMinigame(message) {
        if (this.minigameFrame && this.minigameFrame.contentWindow) {
            this.minigameFrame.contentWindow.postMessage(message, '*');
        }
    }

    simulateInputHandling(input) {
        console.log(`🎮 [PLACEHOLDER] Handling input: ${input}`);

        // Could show visual feedback here
        this.showInputFeedback(input);
    }

    showInputFeedback(input) {
        const feedbackElement = this.minigameContainer.querySelector('.input-feedback');
        if (feedbackElement) {
            feedbackElement.textContent = `Input: ${input.toUpperCase()}`;
            feedbackElement.style.opacity = '1';

            setTimeout(() => {
                feedbackElement.style.opacity = '0.5';
            }, 200);
        }
    }

    handleMinigameMessage(event) {
        // Validate message origin if needed
        if (!this.isMinigameActive) return;

        try {
            const message = event.data;

            if (message && message.type) {
                console.log('🎮 Received message from minigame:', message);

                switch (message.type) {
                    case 'game_event':
                        this.handleMinigameEvent(message);
                        break;
                    case 'game_completed':
                        this.handleMinigameCompletion(this.currentMinigame, message.data);
                        break;
                    case 'game_failed':
                        this.handleMinigameFailure(this.currentMinigame, message.data);
                        break;
                    case 'game_progress':
                        this.handleMinigameProgress(message.data);
                        break;
                    default:
                        console.log('🎮 Unknown minigame message type:', message.type);
                }
            }
        } catch (error) {
            console.error('🎮 Error handling minigame message:', error);
        }
    }

    handleMinigameEvent(message) {
        // Forward event to story engine and MQTT
        this.notifyMinigameStatus('progress', this.currentMinigame, message.data);
    }

    handleMinigameCompletion(minigameId, result) {
        console.log(`🎮 Minigame completed: ${minigameId}`, result);

        // Add to history
        this.addToHistory(minigameId, 'completed', result);

        // Notify completion
        this.notifyMinigameStatus('completed', minigameId, result);

        // Clean up after a delay
        setTimeout(() => {
            this.unloadCurrentMinigame();
            // Let story engine know to continue
            try {
                if (this.app.modules.story && typeof this.app.modules.story.continueAfterMinigame === 'function') {
                    this.app.modules.story.continueAfterMinigame(result);
                } else {
                    console.error('🎮 Story engine continueAfterMinigame method not available');
                }
            } catch (error) {
                console.error('🎮 Error continuing story after minigame:', error);
                this.app.handleError('minigame_completion', error);
            }
        }, 2000);
    }

    handleMinigameFailure(minigameId, result) {
        console.log(`🎮 Minigame failed: ${minigameId}`, result);

        // Add to history
        this.addToHistory(minigameId, 'failed', result);

        // Notify failure
        this.notifyMinigameStatus('failed', minigameId, result);

        // Clean up after a delay
        setTimeout(() => {
            this.unloadCurrentMinigame();
            // Let story engine handle failure
            try {
                if (this.app.modules.story && typeof this.app.modules.story.handleMinigameFailure === 'function') {
                    this.app.modules.story.handleMinigameFailure(result);
                } else {
                    console.error('🎮 Story engine handleMinigameFailure method not available');
                }
            } catch (error) {
                console.error('🎮 Error handling minigame failure:', error);
                this.app.handleError('minigame_failure', error);
            }
        }, 2000);
    }

    handleMinigameProgress(progressData) {
        console.log('🎮 Minigame progress:', progressData);
        // Could update UI with progress indicators
    }

    unloadCurrentMinigame() {
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }

        if (this.minigameFrame) {
            this.minigameFrame.remove();
            this.minigameFrame = null;
        }

        this.minigameContainer.innerHTML = '';
        this.hideMinigameContainer();

        this.currentMinigame = null;
        this.currentGameData = null;
        this.isMinigameActive = false;

        console.log('🎮 Minigame unloaded');
    }

    showMinigameContainer() {
        // Enable fullscreen mode
        this.minigameContainer.style.display = 'flex';
        this.minigameContainer.classList.add('fullscreen');

        // Hide story content by adding class to body
        document.body.classList.add('minigame-active');

        // Update UI manager
        this.app.modules.ui.updateMinigameStatus(true);

        console.log('🎮 Minigame fullscreen mode activated');
    }

    hideMinigameContainer() {
        // Disable fullscreen mode
        this.minigameContainer.style.display = 'none';
        this.minigameContainer.classList.remove('fullscreen');

        // Show story content by removing class from body
        document.body.classList.remove('minigame-active');

        // Update UI manager
        this.app.modules.ui.updateMinigameStatus(false);

        console.log('🎮 Minigame fullscreen mode deactivated');
    }

    showLoadingState(minigameId) {
        this.minigameContainer.innerHTML = `
            <div class="minigame-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading ${this.getMinigameTitle(minigameId)}...</div>
            </div>
        `;
        this.showMinigameContainer();
    }

    hideLoadingState() {
        // Will be replaced by actual minigame content
    }

    handleMinigameError(error, minigameId) {
        console.error(`🎮 Minigame error for ${minigameId}:`, error);

        // Clean up
        this.unloadCurrentMinigame();

        // Fall back to placeholder
        this.simulateMinigame(minigameId, this.currentGameData || {});

        // Notify about error
        this.notifyMinigameStatus('error', minigameId, { error: error.message });

        // Add to error log
        this.app.handleError('minigame_loading', error);
    }

    notifyMinigameStatus(status, minigameId, data = null) {
        try {
            // Update game state
            this.app.gameState.gameStatus.minigameActive = (status === 'started' || status === 'progress');

            // Send MQTT notification
            if (this.app.modules.mqtt && typeof this.app.modules.mqtt.isConnected === 'function' && this.app.modules.mqtt.isConnected()) {
                this.app.modules.mqtt.publish({
                    type: 'minigame_status',
                    status: status,
                    minigameId: minigameId,
                    result: data
                });
            }

            // Notify development tools
            if (CONFIG.DEVELOPMENT_MODE && this.app.modules.development && typeof this.app.modules.development.logEvent === 'function') {
                this.app.modules.development.logEvent('minigame_status', {
                    status,
                    minigameId,
                    data,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('🎮 Error notifying minigame status:', error);
            // Don't re-throw - this is a notification, not critical for gameplay
        }
    }

    addToHistory(minigameId, status, result) {
        this.minigameHistory.unshift({
            minigameId,
            status,
            result,
            timestamp: new Date().toISOString()
        });

        // Keep only last 10 entries
        if (this.minigameHistory.length > 10) {
            this.minigameHistory = this.minigameHistory.slice(0, 10);
        }
    }

    // Development/Testing Methods
    testMinigame(minigameId = 'test_game') {
        if (!CONFIG.DEVELOPMENT_MODE) {
            console.warn('🎮 Minigame testing only available in development mode');
            return;
        }

        console.log(`🎮 [DEV] Testing minigame: ${minigameId}`);
        this.loadMinigame(minigameId, { testMode: true });
    }

    simulateInput(input) {
        if (!CONFIG.DEVELOPMENT_MODE) {
            console.warn('🎮 Input simulation only available in development mode');
            return;
        }

        console.log(`🎮 [DEV] Simulating input: ${input}`);
        this.forwardInputToMinigame(input);
    }

    // Getters
    isActive() {
        return this.isMinigameActive;
    }

    getCurrentMinigame() {
        return this.currentMinigame;
    }

    getHistory() {
        return [...this.minigameHistory];
    }

    getMinigameStats() {
        return {
            initialized: this.initialized,
            active: this.isMinigameActive,
            currentMinigame: this.currentMinigame,
            historyCount: this.minigameHistory.length,
            minigamesEnabled: CONFIG.MINIGAMES_ENABLED
        };
    }
} 