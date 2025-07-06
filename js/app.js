// Main Application Controller for Whiskers Presenter App - Cache refresh
class WhiskersPresenterApp {
    constructor() {
        this.gameState = {
            currentChapter: 'start',
            currentSection: 'main',
            playerStats: {
                health: 100,
                courage: 'Normal',
                location: 'Home',
                hasBubblePowers: false,
                hasAlly: false
            },
            storyProgress: {
                choicesMade: [],
                pathTaken: 'start',
                chaptersCompleted: []
            },
            gameStatus: {
                isWaitingForInput: false,
                minigameActive: false,
                audioPlaying: false,
                gameEnded: false,
                currentChoiceIndex: 0
            },
            mqttStatus: {
                connected: false,
                lastMessage: null,
                developmentMode: CONFIG.DEVELOPMENT_MODE
            }
        };

        this.modules = {};
        this.initialized = false;
        this.startTime = Date.now();
    }

    async initialize() {
        try {
            console.log('🎮 Initializing Whiskers Presenter App...');

            // Apply development mode styling
            if (CONFIG.DEVELOPMENT_MODE) {
                document.body.classList.add('development-mode');
            }

            // Initialize UI Manager first (needed by other modules)
            this.updateLoadingStatus('Initializing UI...');
            this.modules.ui = new UIManager(this);
            await this.modules.ui.initialize();

            // Initialize Story Engine
            this.updateLoadingStatus('Loading story content...');
            this.modules.story = new StoryEngine(this);
            await this.modules.story.initialize();

            // Initialize Audio Manager (with placeholders)
            this.updateLoadingStatus('Setting up audio system...');
            this.modules.audio = new AudioManager(this);
            await this.modules.audio.initialize();

            // Initialize Minigame Manager (with placeholders)
            this.updateLoadingStatus('Preparing minigames...');
            this.modules.minigame = new MinigameManager(this);
            await this.modules.minigame.initialize();

            // Initialize MQTT Client
            if (CONFIG.MQTT_ENABLED) {
                this.updateLoadingStatus('Connecting to MQTT...');
                this.modules.mqtt = new MQTTClient(this);
                await this.modules.mqtt.initialize();
            }

            // Initialize Development Tools
            if (CONFIG.DEVELOPMENT_MODE) {
                this.updateLoadingStatus('Setting up development tools...');
                this.modules.development = new DevelopmentTools(this);
                await this.modules.development.initialize();
            }

            // Set up global error handling
            this.updateLoadingStatus('Finalizing setup...');
            this.setupErrorHandling();

            // Load initial story
            this.updateLoadingStatus('Starting adventure...');
            await this.startStory();

            this.initialized = true;
            this.logDebug('system', 'Application initialized successfully');

            // Hide loading screen
            this.modules.ui.hideLoading();

            // Send ready status via MQTT
            this.sendMQTTMessage({
                type: 'app_ready',
                timestamp: new Date().toISOString(),
                developmentMode: CONFIG.DEVELOPMENT_MODE,
                featuresEnabled: {
                    mqtt: CONFIG.MQTT_ENABLED,
                    audio: CONFIG.AUDIO_ENABLED,
                    minigames: CONFIG.MINIGAMES_ENABLED
                }
            });

        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            this.handleError('initialization', error);
        }
    }

    async startStory() {
        try {
            // Reset game state to beginning
            this.resetGameState();

            // Load the starting chapter
            await this.modules.story.loadChapter('start');

            this.logDebug('story', 'Story started from beginning');
        } catch (error) {
            console.error('❌ Failed to start story:', error);
            this.handleError('story_start', error);
        }
    }

    async processChoice(choiceIndex) {
        try {
            if (!this.gameState.gameStatus.isWaitingForInput) {
                this.logDebug('story', 'Ignoring choice - not waiting for input');
                return;
            }

            const choice = await this.modules.story.makeChoice(choiceIndex);
            if (choice) {
                // Update game state
                this.gameState.storyProgress.choicesMade.push({
                    chapter: this.gameState.currentChapter,
                    choiceIndex: choiceIndex,
                    choiceText: choice.text,
                    timestamp: new Date().toISOString()
                });

                // Apply any effects from the choice
                if (choice.effects) {
                    this.applyEffects(choice.effects);
                }

                // Send choice notification via MQTT
                this.sendMQTTMessage({
                    type: 'choice_made',
                    timestamp: new Date().toISOString(),
                    chapter: this.gameState.currentChapter,
                    choiceIndex: choiceIndex,
                    choiceText: choice.text,
                    nextChapter: choice.nextChapter
                });

                this.logDebug('story', `Choice made: ${choice.text}`);
            }
        } catch (error) {
            console.error('❌ Failed to process choice:', error);
            this.handleError('choice_processing', error);
        }
    }

    async navigateChoice(direction) {
        try {
            // Smart navigation: First try to scroll story text, then navigate choices
            if (direction === 'up') {
                // Try to scroll up in story text first
                if (!this.modules.ui.isScrollAtTop()) {
                    this.modules.ui.scrollUp();
                    this.logDebug('story', 'Scrolled story text up');
                    return;
                }
            } else if (direction === 'down') {
                // Try to scroll down in story text first
                if (!this.modules.ui.isScrollAtBottom()) {
                    this.modules.ui.scrollDown();
                    this.logDebug('story', 'Scrolled story text down');
                    return;
                }
            }

            // If we reach here, scrolling is at limit - navigate choices
            const currentChoices = this.modules.story.getCurrentChoices();
            if (!currentChoices || currentChoices.length === 0) {
                this.logDebug('story', 'No choices available for navigation');
                return;
            }

            let newIndex = this.gameState.gameStatus.currentChoiceIndex;

            if (direction === 'up') {
                newIndex = Math.max(0, newIndex - 1);
            } else if (direction === 'down') {
                newIndex = Math.min(currentChoices.length - 1, newIndex + 1);
            }

            if (newIndex !== this.gameState.gameStatus.currentChoiceIndex) {
                this.gameState.gameStatus.currentChoiceIndex = newIndex;
                this.modules.ui.updateChoiceSelection(newIndex);

                this.logDebug('story', `Choice selection changed to: ${newIndex}`);
            }
        } catch (error) {
            console.error('❌ Failed to navigate choices:', error);
            this.handleError('choice_navigation', error);
        }
    }

    async scrollStoryUp() {
        try {
            if (this.modules.ui) {
                const wasAtTop = this.modules.ui.scrollUp();
                this.logDebug('story', `Scrolled story up${wasAtTop ? ' (already at top)' : ''}`);

                // Send scroll status notification
                this.sendMQTTMessage({
                    type: 'scroll_status',
                    timestamp: new Date().toISOString(),
                    direction: 'up',
                    atTop: this.modules.ui.isScrollAtTop(),
                    atBottom: this.modules.ui.isScrollAtBottom()
                });
            }
        } catch (error) {
            console.error('❌ Failed to scroll story up:', error);
            this.handleError('story_scroll', error);
        }
    }

    async scrollStoryDown() {
        try {
            if (this.modules.ui) {
                const wasAtBottom = this.modules.ui.scrollDown();
                this.logDebug('story', `Scrolled story down${wasAtBottom ? ' (already at bottom)' : ''}`);

                // Send scroll status notification
                this.sendMQTTMessage({
                    type: 'scroll_status',
                    timestamp: new Date().toISOString(),
                    direction: 'down',
                    atTop: this.modules.ui.isScrollAtTop(),
                    atBottom: this.modules.ui.isScrollAtBottom()
                });
            }
        } catch (error) {
            console.error('❌ Failed to scroll story down:', error);
            this.handleError('story_scroll', error);
        }
    }

    async proceedChapter() {
        try {
            await this.modules.story.proceedToNext();
            this.logDebug('story', 'Proceeded to next chapter section');
        } catch (error) {
            console.error('❌ Failed to proceed chapter:', error);
            this.handleError('chapter_progression', error);
        }
    }

    async resetGame() {
        try {
            this.logDebug('system', 'Resetting game to beginning');

            // Stop any active audio
            if (this.modules.audio) {
                this.modules.audio.stopCurrentAudio();
            }

            // Close any active minigames
            if (this.modules.minigame) {
                this.modules.minigame.unloadCurrentMinigame();
            }

            // Reset and restart story
            await this.startStory();

            // Send reset notification via MQTT
            this.sendMQTTMessage({
                type: 'game_reset',
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Failed to reset game:', error);
            this.handleError('game_reset', error);
        }
    }

    resetGameState() {
        this.gameState = {
            currentChapter: 'start',
            currentSection: 'main',
            playerStats: {
                health: 100,
                courage: 'Normal',
                location: 'Home',
                hasBubblePowers: false,
                hasAlly: false
            },
            storyProgress: {
                choicesMade: [],
                pathTaken: 'start',
                chaptersCompleted: []
            },
            gameStatus: {
                isWaitingForInput: false,
                minigameActive: false,
                audioPlaying: false,
                gameEnded: false,
                currentChoiceIndex: 0
            },
            mqttStatus: {
                connected: this.gameState.mqttStatus.connected,
                lastMessage: null,
                developmentMode: CONFIG.DEVELOPMENT_MODE
            }
        };
    }

    applyEffects(effects) {
        for (const [key, value] of Object.entries(effects)) {
            if (key in this.gameState.playerStats) {
                this.gameState.playerStats[key] = value;
            }
        }

        // Update UI to reflect changes
        if (this.modules.ui) {
            this.modules.ui.updateStatus();
        }
    }

    // MQTT Message Handling
    async handleMQTTMessage(message) {
        try {
            this.gameState.mqttStatus.lastMessage = Date.now();
            this.logDebug('mqtt', `Received: ${message.type}`, message);

            switch (message.type) {
                case 'proceed_chapter':
                    await this.proceedChapter();
                    break;

                case 'make_choice':
                    if (typeof message.choiceIndex === 'number') {
                        await this.processChoice(message.choiceIndex);
                    }
                    break;

                case 'navigate_choice':
                    if (message.direction) {
                        await this.navigateChoice(message.direction);
                    }
                    break;

                case 'scroll_up':
                    await this.scrollStoryUp();
                    break;

                case 'scroll_down':
                    await this.scrollStoryDown();
                    break;

                case 'minigame_input':
                    if (this.modules.minigame && message.input) {
                        this.modules.minigame.forwardInputToMinigame(message.input);
                    }
                    break;

                case 'reset_game':
                    await this.resetGame();
                    break;

                default:
                    this.logDebug('mqtt', `Unknown message type: ${message.type}`, message);
            }
        } catch (error) {
            console.error('❌ Failed to handle MQTT message:', error);
            this.handleError('mqtt_message', error);
        }
    }

    sendMQTTMessage(message) {
        if (this.modules.mqtt && this.modules.mqtt.isConnected()) {
            this.modules.mqtt.publish(message);
        } else if (CONFIG.DEV.SHOW_MQTT_LOGS) {
            console.log('📤 MQTT (disconnected):', message);
        }
    }

    // Event Broadcasting
    broadcastEvent(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }

    // Error Handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this.handleError('javascript_error', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('promise_rejection', event.reason);
        });
    }

    handleError(type, error) {
        const errorData = {
            type: type,
            message: error.message || error,
            timestamp: new Date().toISOString(),
            gameState: {
                chapter: this.gameState.currentChapter,
                waiting: this.gameState.gameStatus.isWaitingForInput
            }
        };

        console.error(`🚨 Application Error [${type}]:`, error);
        this.logDebug('error', `Error: ${type}`, errorData);

        // Send error notification via MQTT
        this.sendMQTTMessage({
            type: 'app_error',
            ...errorData
        });

        // Update UI to show error state if needed
        if (this.modules.ui) {
            this.modules.ui.showError(type, error.message || error);
        }
    }

    // Debug Logging
    logDebug(category, message, data = null) {
        if (CONFIG.DEV.SHOW_STATE_CHANGES || category === 'mqtt' && CONFIG.DEV.SHOW_MQTT_LOGS) {
            const timestamp = new Date().toISOString();
            console.log(`🔧 [${category.toUpperCase()}] ${message}`, data || '');

            // Send to development console if available
            if (this.modules.development && this.modules.development.logEvent) {
                this.modules.development.logEvent(category, { message, data, timestamp });
            }
        }
    }

    // Getters
    getCurrentChapter() {
        return this.gameState.currentChapter;
    }

    getGameState() {
        return { ...this.gameState }; // Return copy to prevent external modification
    }

    isInitialized() {
        return this.initialized;
    }

    // Utility method to update loading status
    updateLoadingStatus(message) {
        const loadingDetails = document.getElementById('loading-details');
        if (loadingDetails) {
            loadingDetails.textContent = message;
        }
    }

    // Page visibility handlers
    handlePageHidden() {
        this.logDebug('system', 'Page hidden - pausing activities');

        // Pause audio if playing
        if (this.modules.audio) {
            this.modules.audio.pauseCurrentAudio();
        }

        // Notify via MQTT if connected
        this.sendMQTTMessage({
            type: 'app_paused',
            timestamp: new Date().toISOString()
        });
    }

    handlePageVisible() {
        this.logDebug('system', 'Page visible - resuming activities');

        // Resume audio if it was playing
        if (this.modules.audio) {
            this.modules.audio.resumeCurrentAudio();
        }

        // Notify via MQTT if connected
        this.sendMQTTMessage({
            type: 'app_resumed',
            timestamp: new Date().toISOString()
        });
    }

    // Browser navigation handlers
    handlePopState(event) {
        this.logDebug('system', 'Browser navigation detected', event.state);
        // Handle browser back/forward navigation if needed
        // For now, just log it
    }

    // Cleanup method for app shutdown
    cleanup() {
        this.logDebug('system', 'Cleaning up application');

        // Stop all audio
        if (this.modules.audio) {
            this.modules.audio.stopCurrentAudio();
        }

        // Close any active minigames
        if (this.modules.minigame) {
            this.modules.minigame.unloadCurrentMinigame();
        }

        // Disconnect MQTT
        if (this.modules.mqtt) {
            this.modules.mqtt.disconnect();
        }

        // Clean up development tools
        if (this.modules.development) {
            this.modules.development.cleanup();
        }
    }
}