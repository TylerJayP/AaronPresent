// Complete Presenter App.js - All fixes including enhanced reset functionality
class WhiskersPresenterApp {
    constructor() {
        this.modules = {};
        
        // Initialize gameState with expected structure FIRST
        this.gameState = {
            // UI Manager expects these properties
            connected: false,
            currentChapter: 'start',
            playerState: {
                health: 100,
                courage: 'Normal', 
                location: 'Home'
            },
            currentChoices: [],
            currentSelection: 0,
            awaitingInputType: 'proceed',
            minigameActive: false,
            
            // Original structure for compatibility
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
                isWaitingForInput: true,  // IMPORTANT: Set to true so choices work
                minigameActive: false,
                audioPlaying: true,
                gameEnded: false,
                currentChoiceIndex: 0,
                currentChoices: []
            },
            mqttStatus: {
                connected: false,
                lastMessage: null,
                developmentMode: CONFIG.DEVELOPMENT_MODE || true
            }
        };
        
        this.messageQueue = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🎮 Initializing Whiskers Presenter App...');

            // Initialize all modules in order
            await this.initializeModules();

            // Set up event listeners
            this.setupEventListeners();

            // Start the story
            await this.startStory();

            this.initialized = true;
            console.log('✅ Whiskers Presenter App initialized successfully');

            // Make app available globally for page visibility handlers
            window.whiskersApp = this;
            window.app = this; // For compatibility with index.html

            // Send app ready message
            this.sendMQTTMessage({
                type: 'app_ready',
                developmentMode: CONFIG.DEVELOPMENT_MODE || true,
                featuresEnabled: {
                    audio: CONFIG.AUDIO_ENABLED || false,
                    minigames: CONFIG.MINIGAMES_ENABLED || true,
                    storyEngine: true
                }
            });

            this.logDebug('system', 'Application initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Presenter App:', error);
            this.handleError('app_init', error);
        }
    }

    async initializeModules() {
        // Initialize UI Manager first (needs gameState)
        this.modules.ui = new UIManager(this);
        await this.modules.ui.initialize();

        // Initialize Story Engine (use 'story' not 'storyEngine' to match your existing code)
        this.modules.story = new StoryEngine(this);
        await this.modules.story.initialize();

        // Initialize Audio Manager
        this.modules.audio = new AudioManager(this);
        await this.modules.audio.initialize();

        // Initialize Minigame Manager
        this.modules.minigame = new MinigameManager(this);
        await this.modules.minigame.initialize();

        // Initialize MQTT Client last
        this.modules.mqtt = new MQTTClient(this);
        await this.modules.mqtt.initialize();

        // Initialize Development Tools
        if (CONFIG.DEVELOPMENT_MODE) {
            this.modules.devTools = new DevelopmentTools(this);
            await this.modules.devTools.initialize();
        }
    }

    async startStory() {
        if (this.modules.story) {
            await this.modules.story.loadChapter('start');
            this.logDebug('story', 'Story started from beginning');
        }
    }

    setupEventListeners() {
        // Error handling
        window.addEventListener('error', (event) => {
            this.handleError('javascript_error', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('promise_rejection', event.reason);
        });
    }

    // MQTT Message Handling - INCLUDES STATUS_REQUEST HANDLER
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

                // Handle status requests from Orchestrator
                case 'status_request':
                    this.handleStatusRequest(message);
                    break;

                default:
                    this.logDebug('mqtt', `Unknown message type: ${message.type}`, message);
            }
        } catch (error) {
            console.error('❌ Failed to handle MQTT message:', error);
            this.handleError('mqtt_message', error);
        }
    }

    // Handle status requests from Orchestrator
    handleStatusRequest(message) {
        this.logDebug('mqtt', 'Received status request - sending current state', message);
        
        // Send current chapter information - FIXED to extract string values
        if (this.modules.story && this.modules.story.currentChapter) {
            const chapter = this.modules.story.currentChapter;
            
            // Extract string value from chapter (handle both string and object cases)
            const chapterString = typeof chapter === 'string' ? chapter : 
                                 chapter.id || chapter.name || 'start';
            
            const chapterData = this.modules.story.getChapterData ? 
                this.modules.story.getChapterData(chapterString) : null;
            
            // Extract title properly
            const chapterTitle = chapterData?.title || 
                                chapterData?.name || 
                                'Chapter 1: The Ordinary World';
            
            this.sendMQTTMessage({
                type: 'chapter_changed',
                currentChapter: chapterString,  // Send string, not object
                chapterTitle: chapterTitle,
                chapterType: chapterData?.type || 'story',
                playerState: this.gameState.playerStats || this.gameState.playerState
            });
        }
        
        // Send current choices if available
        const choices = this.gameState.gameStatus?.currentChoices || this.gameState.currentChoices || [];
        if (choices.length > 0) {
            this.sendMQTTMessage({
                type: 'choices_available',
                chapter: this.gameState.currentChapter,
                choices: choices,
                currentSelection: this.gameState.gameStatus?.currentChoiceIndex || this.gameState.currentSelection || 0
            });
        }
        
        // Send ready for input status
        this.sendMQTTMessage({
            type: 'ready_for_input',
            context: this.gameState.gameStatus?.minigameActive || this.gameState.minigameActive ? 'minigame' : 'story',
            awaitingInputType: choices.length > 0 ? 'choice' : 'proceed'
        });
        
        this.logDebug('mqtt', 'Status response sent to Orchestrator');
    }

    // Page visibility handlers - FIXED AUDIO CALLS
    handlePageHidden() {
        try {
            // Check if audio manager has the method before calling
            if (this.modules?.audio && typeof this.modules.audio.pauseAll === 'function') {
                this.modules.audio.pauseAll();
            } else if (this.modules?.audio && typeof this.modules.audio.pause === 'function') {
                this.modules.audio.pause();
            }
            this.logDebug('system', 'Page hidden - audio paused');
        } catch (error) {
            this.logDebug('system', 'Page hidden - audio pause failed', error);
        }
    }

    handlePageVisible() {
        try {
            // Check if audio manager has the method before calling
            if (this.modules?.audio && typeof this.modules.audio.resumeAll === 'function') {
                this.modules.audio.resumeAll();
            } else if (this.modules?.audio && typeof this.modules.audio.resume === 'function') {
                this.modules.audio.resume();
            }
            this.logDebug('system', 'Page visible - audio resumed');
        } catch (error) {
            this.logDebug('system', 'Page visible - audio resume failed', error);
        }
    }

    // Story progression methods - FIXED TO USE CORRECT MODULE NAMES
    async proceedChapter() {
        try {
            if (this.modules.story && typeof this.modules.story.proceedToNext === 'function') {
                await this.modules.story.proceedToNext();
            } else if (this.modules.story && typeof this.modules.story.proceed === 'function') {
                await this.modules.story.proceed();
            } else {
                this.logDebug('story', 'Story engine proceed method not available');
            }
        } catch (error) {
            this.handleError('story_proceed', error);
        }
    }

    // FIXED: Use the exact same logic as your original code
    async processChoice(choiceIndex) {
        try {
            this.logDebug('story', `Processing choice ${choiceIndex}`, { choiceIndex });
            
            // IMPORTANT: Use the same check as your original code
            if (!this.gameState.gameStatus.isWaitingForInput) {
                this.logDebug('story', 'Ignoring choice - not waiting for input');
                return;
            }

            // Use the exact same pattern as your original code
            const choice = await this.modules.story.makeChoice(choiceIndex);
            if (choice) {
                // Update game state exactly like your original
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

                // Send choice notification via MQTT (same as original)
                this.sendMQTTMessage({
                    type: 'choice_made',
                    timestamp: new Date().toISOString(),
                    chapter: this.gameState.currentChapter,
                    choiceIndex: choiceIndex,
                    choiceText: choice.text,
                    nextChapter: choice.nextChapter
                });

                this.logDebug('story', `Choice made: ${choice.text}`);
            } else {
                this.logDebug('story', 'No choice returned from story engine');
            }
            
        } catch (error) {
            console.error('❌ Failed to process choice:', error);
            this.handleError('choice_processing', error);
        }
    }

    // Add the applyEffects method that your original code expects
    applyEffects(effects) {
        try {
            for (const [key, value] of Object.entries(effects)) {
                if (key in this.gameState.playerStats) {
                    this.gameState.playerStats[key] = value;
                }
            }
            
            // Update UI to reflect changes
            if (this.modules.ui) {
                this.modules.ui.updateStatus();
            }
            
            this.logDebug('story', 'Applied choice effects', effects);
        } catch (error) {
            this.handleError('effects_application', error);
        }
    }

    async navigateChoice(direction) {
        const choices = this.gameState.gameStatus?.currentChoices || this.gameState.currentChoices || [];
        if (!choices.length) return;

        let currentSelection = this.gameState.gameStatus?.currentChoiceIndex || this.gameState.currentSelection || 0;
        let newSelection = currentSelection;
        
        if (direction === 'up') {
            newSelection = Math.max(0, currentSelection - 1);
        } else if (direction === 'down') {
            newSelection = Math.min(choices.length - 1, currentSelection + 1);
        }

        if (newSelection !== currentSelection) {
            // Update both gameState structures for compatibility
            this.gameState.currentSelection = newSelection;
            if (this.gameState.gameStatus) {
                this.gameState.gameStatus.currentChoiceIndex = newSelection;
            }
            
            if (this.modules.ui) {
                this.modules.ui.updateChoiceSelection(newSelection);
            }
            
            this.sendMQTTMessage({
                type: 'choice_selected',
                choiceIndex: newSelection,
                choiceText: choices[newSelection]?.text || ''
            });
        }
    }

    async scrollStoryUp() {
        if (this.modules.ui && typeof this.modules.ui.scrollStoryContent === 'function') {
            const result = this.modules.ui.scrollStoryContent('up');
            this.sendMQTTMessage({
                type: 'scroll_status',
                direction: 'up',
                atTop: result?.atTop || false,
                atBottom: result?.atBottom || false
            });
        }
    }

    async scrollStoryDown() {
        if (this.modules.ui && typeof this.modules.ui.scrollStoryContent === 'function') {
            const result = this.modules.ui.scrollStoryContent('down');
            this.sendMQTTMessage({
                type: 'scroll_status',
                direction: 'down',
                atTop: result?.atTop || false,
                atBottom: result?.atBottom || false
            });
        }
    }

    // ENHANCED RESET METHOD - Complete state reset
    async resetGame() {
        try {
            this.logDebug('system', 'Resetting game to beginning');
            
            // 1. Stop any active audio
            if (this.modules.audio) {
                try {
                    if (typeof this.modules.audio.stopAll === 'function') {
                        this.modules.audio.stopAll();
                    } else if (typeof this.modules.audio.stop === 'function') {
                        this.modules.audio.stop();
                    }
                } catch (error) {
                    this.logDebug('audio', 'Audio stop failed', error);
                }
            }

            // 2. Close any active minigames
            if (this.modules.minigame) {
                try {
                    if (typeof this.modules.minigame.unloadCurrentMinigame === 'function') {
                        this.modules.minigame.unloadCurrentMinigame();
                    }
                } catch (error) {
                    this.logDebug('minigame', 'Minigame cleanup failed', error);
                }
            }

            // 3. Reset ALL game state to initial values
            this.gameState = {
                // UI Manager expects these properties
                connected: this.gameState.connected, // Keep connection status
                currentChapter: 'start',
                playerState: {
                    health: 100,
                    courage: 'Normal', 
                    location: 'Home'
                },
                currentChoices: [],
                currentSelection: 0,
                awaitingInputType: 'proceed',
                minigameActive: false,
                
                // Original structure for compatibility
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
                    isWaitingForInput: true,
                    minigameActive: false,
                    audioPlaying: false,
                    gameEnded: false,
                    currentChoiceIndex: 0,
                    currentChoices: []
                },
                mqttStatus: {
                    connected: this.gameState.mqttStatus?.connected || false,
                    lastMessage: null,
                    developmentMode: CONFIG.DEVELOPMENT_MODE || true
                }
            };

            // 4. Reset the story engine
            if (this.modules.story) {
                try {
                    // Try different reset methods the story engine might have
                    if (typeof this.modules.story.reset === 'function') {
                        await this.modules.story.reset();
                        this.logDebug('story', 'Story engine reset called');
                    } else if (typeof this.modules.story.initialize === 'function') {
                        await this.modules.story.initialize();
                        this.logDebug('story', 'Story engine re-initialized');
                    }
                    
                    // Load the starting chapter
                    if (typeof this.modules.story.loadChapter === 'function') {
                        await this.modules.story.loadChapter('start');
                        this.logDebug('story', 'Loaded starting chapter');
                    } else {
                        this.logDebug('story', 'Story engine loadChapter method not available');
                    }
                } catch (error) {
                    this.logDebug('story', 'Story engine reset failed, trying manual reset', error);
                    
                    // Manual fallback: try to restart the story system
                    try {
                        this.modules.story = new StoryEngine(this);
                        await this.modules.story.initialize();
                        await this.modules.story.loadChapter('start');
                        this.logDebug('story', 'Story engine manually recreated');
                    } catch (fallbackError) {
                        this.logDebug('story', 'Manual story reset also failed', fallbackError);
                    }
                }
            }

            // 5. Reset UI to initial state
            if (this.modules.ui) {
                try {
                    // Clear choices display
                    if (typeof this.modules.ui.updateChoices === 'function') {
                        this.modules.ui.updateChoices([]);
                    }
                    
                    // Reset input state
                    if (typeof this.modules.ui.updateInputState === 'function') {
                        this.modules.ui.updateInputState('story', 'proceed');
                    }
                    
                    // Update status display
                    if (typeof this.modules.ui.updateStatus === 'function') {
                        this.modules.ui.updateStatus();
                    }

                    this.logDebug('ui', 'UI reset completed');
                } catch (error) {
                    this.logDebug('ui', 'UI reset failed', error);
                }
            }

            // 6. Send reset confirmation and initial state to Orchestrator
            this.sendMQTTMessage({
                type: 'game_reset',
                success: true,
                timestamp: new Date().toISOString()
            });

            // 7. Send the fresh starting state
            setTimeout(() => {
                // Send current chapter state
                this.sendMQTTMessage({
                    type: 'chapter_changed',
                    currentChapter: 'start',
                    chapterTitle: 'Chapter 1: The Ordinary World',
                    chapterType: 'story',
                    playerState: this.gameState.playerStats || this.gameState.playerState
                });

                // Send ready for input
                this.sendMQTTMessage({
                    type: 'ready_for_input',
                    context: 'story',
                    awaitingInputType: 'proceed'
                });

                // If there are initial choices, send them
                if (this.gameState.currentChoices && this.gameState.currentChoices.length > 0) {
                    this.sendMQTTMessage({
                        type: 'choices_available',
                        chapter: 'start',
                        choices: this.gameState.currentChoices,
                        currentSelection: 0
                    });
                }
            }, 100); // Small delay to ensure state is stable

            this.logDebug('system', 'Game reset completed successfully');

        } catch (error) {
            console.error('❌ Failed to reset game:', error);
            this.handleError('game_reset', error);
            
            // Send failure notification
            this.sendMQTTMessage({
                type: 'game_reset',
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // MQTT Communication methods
    sendMQTTMessage(message) {
        if (this.modules.mqtt && this.modules.mqtt.isConnected && this.modules.mqtt.isConnected()) {
            this.modules.mqtt.publish(message);
        } else {
            // Queue message if MQTT not connected
            this.messageQueue.push(message);
            console.log('📤 MQTT (disconnected):', message);
        }
    }

    // Event Broadcasting
    broadcastEvent(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
    }

    // Logging with multiple signatures for compatibility
    log(message, category = 'info') {
        this.logDebug(category, message);
    }

    logDebug(category, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            category,
            message,
            data
        };

        console.log(`🔧 [${category.toUpperCase()}] ${message}`, data || '');

        // Send to development tools if available
        if (this.modules.devTools && typeof this.modules.devTools.logEvent === 'function') {
            this.modules.devTools.logEvent(category.toUpperCase(), {
                message,
                data,
                timestamp
            });
        }

        // Broadcast log event
        this.broadcastEvent('app-log', logEntry);
    }

    // Error handling
    handleError(context, error) {
        console.error(`❌ Error in ${context}:`, error);
        
        const errorInfo = {
            context,
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            timestamp: new Date().toISOString()
        };

        this.logDebug('error', `Error in ${context}: ${errorInfo.message}`, errorInfo);
        this.broadcastEvent('app-error', errorInfo);
    }

    // Utility methods for compatibility
    getCurrentState() {
        return {
            currentChapter: this.gameState.currentChapter,
            playerState: this.gameState.playerState,
            currentChoices: this.gameState.currentChoices,
            currentSelection: this.gameState.currentSelection,
            minigameActive: this.gameState.minigameActive,
            connected: this.gameState.connected
        };
    }

    // Public API for other modules
    updateGameState(updates) {
        Object.assign(this.gameState, updates);
        this.broadcastEvent('game-state-updated', this.gameState);
    }

    // Chapter change handling (called by StoryEngine)
    onChapterChanged(chapterData) {
        this.gameState.currentChapter = chapterData.id;
        
        this.sendMQTTMessage({
            type: 'chapter_changed',
            currentChapter: chapterData.id,
            chapterTitle: chapterData.title,
            chapterType: chapterData.type,
            playerState: this.gameState.playerStats || this.gameState.playerState
        });
    }

    // Choices available handling (called by StoryEngine)
    onChoicesAvailable(choices) {
        this.gameState.currentChoices = choices;
        this.gameState.currentSelection = 0;
        
        if (this.gameState.gameStatus) {
            this.gameState.gameStatus.currentChoices = choices;
            this.gameState.gameStatus.currentChoiceIndex = 0;
            this.gameState.gameStatus.isWaitingForInput = true; // IMPORTANT: Enable choice processing
        }
        
        this.sendMQTTMessage({
            type: 'choices_available',
            chapter: this.gameState.currentChapter,
            choices: choices,
            currentSelection: 0
        });
    }

    // Ready for input handling (called by StoryEngine)
    onReadyForInput(context, inputType) {
        this.gameState.awaitingInputType = inputType;
        this.gameState.gameStatus.isWaitingForInput = true; // IMPORTANT: Enable input processing
        
        this.sendMQTTMessage({
            type: 'ready_for_input',
            context: context,
            awaitingInputType: inputType
        });
    }
}

// Auto-start when DOM is ready (moved outside to avoid duplication)
if (typeof startApp === 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const app = new WhiskersPresenterApp();
            await app.initialize();
            
            // Make globally available
            window.whiskersApp = app;
            window.app = app;
            
        } catch (error) {
            console.error('❌ Failed to start Whiskers Presenter App:', error);
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhiskersPresenterApp;
}