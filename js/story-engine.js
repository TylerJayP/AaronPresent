// Story Engine for Whiskers Presenter App - Updated with minigame integration
class StoryEngine {
    constructor(app) {
        this.app = app;
        this.currentChapter = null;
        this.currentChoices = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('📖 Initializing Story Engine...');

            // Verify story data is available
            if (typeof STORY_DATA === 'undefined') {
                throw new Error('Story data not loaded');
            }

            // Validate story structure
            this.validateStoryData();

            this.initialized = true;
            console.log('✅ Story Engine initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Story Engine:', error);
            throw error;
        }
    }

    validateStoryData() {
        // Check that required chapters exist
        const requiredChapters = ['start'];
        for (const chapterId of requiredChapters) {
            if (!STORY_DATA[chapterId]) {
                throw new Error(`Required chapter missing: ${chapterId}`);
            }
        }

        // Validate chapter structure
        for (const [chapterId, chapter] of Object.entries(STORY_DATA)) {
            if (!chapter.id || !chapter.title || !chapter.text) {
                throw new Error(`Invalid chapter structure: ${chapterId}`);
            }
        }

        console.log('📖 Story data validation passed');
    }

    async loadChapter(chapterId) {
        try {
            console.log(`📖 Loading chapter: ${chapterId}`);

            // Get chapter data
            const chapter = STORY_DATA[chapterId];
            if (!chapter) {
                throw new Error(`Chapter not found: ${chapterId}`);
            }

            // Set current chapter
            this.currentChapter = chapter;
            this.currentChoices = chapter.choices || [];

            // Chapter loaded successfully

            // Update app state
            this.app.gameState.currentChapter = chapterId;
            this.app.gameState.storyProgress.chaptersCompleted.push({
                id: chapterId,
                timestamp: new Date().toISOString()
            });

            // Apply any chapter effects
            if (chapter.effects) {
                this.app.applyEffects(chapter.effects);
            }

            // Display chapter through UI
            this.app.modules.ui.displayChapter(chapter);

            // Handle special chapter types
            await this.handleSpecialChapter(chapter);

            // Send chapter change notification
            this.app.sendMQTTMessage({
                type: 'chapter_changed',
                timestamp: new Date().toISOString(),
                currentChapter: chapterId,
                chapterTitle: chapter.title,
                chapterType: chapter.type || 'story',
                hasChoices: (chapter.choices && chapter.choices.length > 0),
                playerState: this.app.gameState.playerStats
            });

            console.log(`✅ Chapter loaded: ${chapterId}`);
        } catch (error) {
            console.error(`❌ Failed to load chapter: ${chapterId}`, error);
            this.app.handleError('chapter_load', error);
        }
    }

    async handleSpecialChapter(chapter) {
        switch (chapter.type) {
            case 'ending':
                await this.handleEnding(chapter);
                break;

            case 'minigame':
                await this.handleMinigame(chapter);
                break;

            case 'audio_focus':
                await this.handleAudioFocus(chapter);
                break;

            default:
                // Regular story chapter
                await this.handleStoryChapter(chapter);
        }
    }

    async handleStoryChapter(chapter) {
        // Trigger audio playback if enabled
        if (CONFIG.AUDIO_ENABLED && this.app.modules.audio) {
            await this.app.modules.audio.playChapterAudio(chapter.id);
        }

        // Set appropriate input state based on choice type
        if (this.hasRealChoices()) {
            // Multiple real choices - wait for choice selection
            this.app.gameState.gameStatus.isWaitingForInput = true;

            this.app.sendMQTTMessage({
                type: 'ready_for_input',
                timestamp: new Date().toISOString(),
                context: 'choices',
                awaitingInputType: 'choice',
                availableChoices: chapter.choices.length
            });
        } else {
            // No choices or single continue action - wait for proceed
            this.app.gameState.gameStatus.isWaitingForInput = true;

            this.app.sendMQTTMessage({
                type: 'ready_for_input',
                timestamp: new Date().toISOString(),
                context: 'story',
                awaitingInputType: 'proceed'
            });
        }
    }

    async handleEnding(chapter) {
        console.log(`📖 Handling ending: ${chapter.endingType}`);

        // Mark game as ended
        this.app.gameState.gameStatus.gameEnded = true;

        // Play ending audio if available
        if (CONFIG.AUDIO_ENABLED && this.app.modules.audio) {
            await this.app.modules.audio.playChapterAudio(chapter.id);
        }

        // Send ending notification
        this.app.sendMQTTMessage({
            type: 'game_ended',
            timestamp: new Date().toISOString(),
            endingType: chapter.endingType,
            endingTitle: chapter.title,
            playerStats: this.app.gameState.playerStats,
            choicesMade: this.app.gameState.storyProgress.choicesMade.length
        });
    }

    async handleMinigame(chapter) {
        console.log(`📖 Handling minigame chapter: ${chapter.id}`);

        if (CONFIG.MINIGAMES_ENABLED && this.app.modules.minigame) {
            const minigameId = chapter.minigameId || `${chapter.id}_minigame`;
            await this.app.modules.minigame.loadMinigame(minigameId);
        } else {
            console.log('📖 Minigames disabled, skipping to next chapter');
            // Auto-proceed if minigames are disabled
            if (chapter.choices && chapter.choices.length > 0) {
                await this.makeChoice(0); // Take first choice
            }
        }
    }

    async handleAudioFocus(chapter) {
        console.log(`📖 Handling audio focus chapter: ${chapter.id}`);

        if (CONFIG.AUDIO_ENABLED && this.app.modules.audio) {
            await this.app.modules.audio.playChapterAudio(chapter.id);
            // Wait for audio to complete before proceeding
            // Implementation depends on audio manager
        }
    }

    async makeChoice(choiceIndex) {
        try {
            if (!this.currentChapter || !this.currentChoices) {
                throw new Error('No current chapter or choices available');
            }

            if (choiceIndex < 0 || choiceIndex >= this.currentChoices.length) {
                throw new Error(`Invalid choice index: ${choiceIndex}`);
            }

            const choice = this.currentChoices[choiceIndex];
            console.log(`📖 Making choice ${choiceIndex}: ${choice.text}`);

            // Apply choice effects if any
            if (choice.effects) {
                this.app.applyEffects(choice.effects);
            }

            // Update game state
            this.app.gameState.gameStatus.isWaitingForInput = false;

            // Check if this is a restart from an ending
            if (choice.nextChapter &&
                choice.nextChapter === 'start' &&
                this.currentChapter &&
                this.currentChapter.type === 'ending') {

                console.log('📖 Restarting adventure from ending - resetting game state');

                // Reset the game state completely like the Reset button does
                this.app.resetGameState();

                // Stop any playing audio
                if (this.app.modules.audio) {
                    this.app.modules.audio.stopCurrentAudio();
                }

                // Clean up any active minigames
                if (this.app.modules.minigame) {
                    this.app.modules.minigame.unloadCurrentMinigame();
                }

                // Update UI to reflect the reset state
                if (this.app.modules.ui) {
                    this.app.modules.ui.updateStatus();
                }

                // Send restart notification via MQTT
                this.app.sendMQTTMessage({
                    type: 'adventure_restarted',
                    timestamp: new Date().toISOString(),
                    previousEnding: this.currentChapter.endingType
                });
            }

            // Load next chapter
            if (choice.nextChapter) {
                await this.loadChapter(choice.nextChapter);
            } else {
                console.warn('📖 Choice has no next chapter specified');
            }

            return choice;
        } catch (error) {
            console.error('❌ Failed to make choice:', error);
            this.app.handleError('choice_making', error);
            return null;
        }
    }

    async proceedToNext() {
        try {
            // Check if we have real choices vs just a continue option
            const hasRealChoices = this.hasRealChoices();

            if (hasRealChoices) {
                console.log('📖 Cannot proceed - multiple choices available, must make selection');
                return;
            }

            // Handle single "continue" option or no choices
            if (this.currentChoices && this.currentChoices.length === 1) {
                // Single choice - treat as continue action
                console.log('📖 Single continue option available, proceeding automatically');
                await this.makeChoice(0);
            } else if (this.currentChapter && this.currentChapter.nextChapter) {
                // No choices, direct progression
                await this.loadChapter(this.currentChapter.nextChapter);
            } else {
                console.log('📖 No next chapter available for auto-progression');
            }
        } catch (error) {
            console.error('❌ Failed to proceed to next:', error);
            this.app.handleError('chapter_progression', error);
        }
    }

    // Story Navigation Utilities
    getChapterById(chapterId) {
        return STORY_DATA[chapterId] || null;
    }

    getCurrentChapter() {
        return this.currentChapter;
    }

    getCurrentChoices() {
        return this.currentChoices;
    }

    hasChoices() {
        return this.currentChoices && this.currentChoices.length > 0;
    }

    hasRealChoices() {
        // Real choices means multiple options that lead to different paths
        return this.currentChoices && this.currentChoices.length > 1;
    }

    isContinueAction() {
        // Single choice is considered a continue action, not a real choice
        return this.currentChoices && this.currentChoices.length === 1;
    }

    isEnding() {
        return this.currentChapter && this.currentChapter.type === 'ending';
    }

    // Chapter Analysis
    getAvailableChapters() {
        return Object.keys(STORY_DATA);
    }

    getChapterTypes() {
        const types = new Set();
        for (const chapter of Object.values(STORY_DATA)) {
            types.add(chapter.type || 'story');
        }
        return Array.from(types);
    }

    // Development/Testing Methods
    async jumpToChapter(chapterId) {
        if (!CONFIG.DEVELOPMENT_MODE) {
            console.warn('📖 Chapter jumping only available in development mode');
            return;
        }

        console.log(`📖 [DEV] Jumping to chapter: ${chapterId}`);
        await this.loadChapter(chapterId);
    }

    getStoryProgress() {
        return {
            currentChapter: this.app.gameState.currentChapter,
            chaptersCompleted: this.app.gameState.storyProgress.chaptersCompleted,
            choicesMade: this.app.gameState.storyProgress.choicesMade,
            gameEnded: this.app.gameState.gameStatus.gameEnded
        };
    }

    // Validation and Error Checking
    validateChapterLink(fromChapter, toChapter) {
        const from = STORY_DATA[fromChapter];
        const to = STORY_DATA[toChapter];

        if (!from || !to) {
            return false;
        }

        // Check if there's a valid path from fromChapter to toChapter
        if (from.choices) {
            return from.choices.some(choice => choice.nextChapter === toChapter);
        }

        return from.nextChapter === toChapter;
    }

    // Getters
    isInitialized() {
        return this.initialized;
    }

    // Minigame Integration Methods
    async continueAfterMinigame(result) {
        console.log(`📖 Continuing story after minigame completion:`, result);

        // Store minigame result in game state
        if (!this.app.gameState.minigameResults) {
            this.app.gameState.minigameResults = [];
        }
        this.app.gameState.minigameResults.push({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });

        // Continue with the first choice (assuming minigame chapters have a single continuation choice)
        if (this.currentChapter && this.currentChapter.choices && this.currentChapter.choices.length > 0) {
            await this.makeChoice(0);
        } else {
            console.warn('📖 No choices available after minigame completion');
        }
    }

    async handleMinigameFailure(result) {
        console.log(`📖 Handling minigame failure:`, result);

        // Store minigame result in game state
        if (!this.app.gameState.minigameResults) {
            this.app.gameState.minigameResults = [];
        }
        this.app.gameState.minigameResults.push({
            success: false,
            ...result,
            timestamp: new Date().toISOString()
        });

        // For now, treat failure the same as success - continue the story
        // In a more complex implementation, you might want different paths for failure
        if (this.currentChapter && this.currentChapter.choices && this.currentChapter.choices.length > 0) {
            await this.makeChoice(0);
        } else {
            console.warn('📖 No choices available after minigame failure');
        }
    }
} 