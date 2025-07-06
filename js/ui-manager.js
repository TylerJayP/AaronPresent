// UI Manager for Whiskers Presenter App
class UIManager {
    constructor(app) {
        this.app = app;
        this.elements = {};
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🎨 Initializing UI Manager...');

            // Get DOM elements
            this.cacheElements();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize UI state
            this.initializeDisplay();

            this.initialized = true;
            console.log('✅ UI Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    cacheElements() {
        // Main container elements
        this.elements.container = document.querySelector('.app-container');
        this.elements.gameArea = document.querySelector('.game-area');

        // Story display elements
        this.elements.storyText = document.getElementById('story-text');
        this.elements.chapterTitle = document.getElementById('chapter-indicator');
        this.elements.audioIndicator = document.getElementById('audio-indicator');

        // Choice elements  
        this.elements.choicesContainer = document.getElementById('choices-container');
        this.elements.choicesSection = document.getElementById('choices-section');

        // Minigame elements
        this.elements.minigameContainer = document.getElementById('minigame-container');
        this.elements.minigameSection = document.getElementById('minigame-section');

        // Status bar elements
        this.elements.statusBar = document.querySelector('.status-bar');
        this.elements.gameStatus = document.getElementById('game-status');
        this.elements.connectionIndicator = document.getElementById('mqtt-status');

        // Player stats elements
        this.elements.healthValue = document.getElementById('health-value');
        this.elements.courageValue = document.getElementById('courage-value');
        this.elements.locationValue = document.getElementById('location-value');

        // Control buttons
        this.elements.restartBtn = document.getElementById('reset-btn');

        console.log('🎨 UI elements cached:', Object.keys(this.elements).length, 'elements found');
    }

    setupEventListeners() {
        // Restart button
        if (this.elements.restartBtn) {
            this.elements.restartBtn.addEventListener('click', () => {
                this.app.resetGame();
            });
        }

        // Choice click handlers are added individually to each button in displayChoices()
        // No global event delegation needed to avoid duplicate calls

        // Keyboard navigation for development
        if (CONFIG.DEVELOPMENT_MODE) {
            document.addEventListener('keydown', (event) => {
                if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                    return; // Don't interfere with form inputs
                }

                switch (event.key) {
                    case 'ArrowUp':
                        event.preventDefault();
                        this.app.navigateChoice('up');
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        this.app.navigateChoice('down');
                        break;
                    case 'Enter':
                        event.preventDefault();
                        const currentIndex = this.app.gameState.gameStatus.currentChoiceIndex;
                        this.app.processChoice(currentIndex);
                        break;
                    case ' ':
                        event.preventDefault();
                        this.app.proceedChapter();
                        break;
                }
            });
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    initializeDisplay() {
        // Set initial UI state
        this.updateConnectionStatus(false);
        this.updateStatus();
        this.hideMinigame();
        this.hideAudioIndicator();

        // Clear any existing content
        this.clearStoryText();
        this.clearChoices();

        console.log('🎨 UI display initialized');
    }

    // Story Display Methods
    displayChapter(chapter) {
        try {
            // Update chapter title (move above story text)
            if (this.elements.chapterTitle) {
                this.elements.chapterTitle.textContent = chapter.title || `Chapter ${chapter.id}`;
                // Move the chapter title above the story text
                if (this.elements.storyText && this.elements.chapterTitle.parentNode !== this.elements.storyText.parentNode) {
                    this.elements.storyText.parentNode.insertBefore(this.elements.chapterTitle, this.elements.storyText);
                }
            }

            // Display story text with typing effect
            this.displayStoryText(chapter.text);

            // Display choices if available
            if (chapter.choices && chapter.choices.length > 0) {
                this.displayChoices(chapter.choices);
                this.app.gameState.gameStatus.isWaitingForInput = true;
            } else {
                this.clearChoices();
                this.app.gameState.gameStatus.isWaitingForInput = false;
            }

            // Update game state
            this.app.gameState.currentChapter = chapter.id;
            this.updateStatus();

            // Ensure initial position is at top (no automatic scrolling)
            this.scrollToTop();

            console.log(`🎨 Displayed chapter: ${chapter.id}`);
        } catch (error) {
            console.error('❌ Failed to display chapter:', error);
            this.showError('display_chapter', error.message);
        }
    }

    displayStoryText(text) {
        if (!this.elements.storyText) return;

        // Simple display for now (can add typing effect later)
        this.elements.storyText.textContent = text;

        // Ensure scroll position is at top for new content
        this.elements.storyText.scrollTop = 0;

        // Add some visual flair
        this.elements.storyText.style.opacity = '0';
        setTimeout(() => {
            this.elements.storyText.style.transition = 'opacity 0.5s ease';
            this.elements.storyText.style.opacity = '1';

            // Ensure scroll position remains at top after animation
            this.elements.storyText.scrollTop = 0;
        }, 100);
    }

    displayChoices(choices) {
        if (!this.elements.choicesContainer) {
            console.error('🎨 Choices container not found');
            return;
        }

        this.clearChoices();

        // Create a wrapper for vertical stacking
        let choicesWrapper = this.elements.choicesContainer.querySelector('.choices');
        if (!choicesWrapper) {
            choicesWrapper = document.createElement('div');
            choicesWrapper.className = 'choices';
            this.elements.choicesContainer.appendChild(choicesWrapper);
        } else {
            choicesWrapper.innerHTML = '';
        }

        // Show choices section
        if (this.elements.choicesSection) {
            this.elements.choicesSection.style.display = 'block';
        }

        // Create choice buttons
        choices.forEach((choice, index) => {
            const choiceButton = document.createElement('button');
            choiceButton.className = 'choice';
            choiceButton.dataset.index = index;
            choiceButton.textContent = `${index + 1}. ${choice.text}`;

            // Add click handler for development mode
            if (CONFIG.DEVELOPMENT_MODE) {
                choiceButton.addEventListener('click', () => {
                    this.app.processChoice(index);
                });
            }

            choicesWrapper.appendChild(choiceButton);
        });

        // Set initial selection
        this.app.gameState.gameStatus.currentChoiceIndex = 0;
        this.updateChoiceSelection(0);

        // Send choices available notification
        this.app.sendMQTTMessage({
            type: 'choices_available',
            timestamp: new Date().toISOString(),
            chapter: this.app.gameState.currentChapter,
            choices: choices.map((choice, index) => ({
                index: index,
                text: choice.text
            })),
            currentSelection: 0
        });

        console.log('🎨 Choices displayed successfully');
    }

    updateChoiceSelection(selectedIndex) {
        if (!this.elements.choicesContainer) return;

        const choiceButtons = this.elements.choicesContainer.querySelectorAll('.choice');

        choiceButtons.forEach((button, index) => {
            if (index === selectedIndex) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }
        });
    }

    clearChoices() {
        if (this.elements.choicesContainer) {
            this.elements.choicesContainer.innerHTML = '';
        }

        if (this.elements.choicesSection) {
            this.elements.choicesSection.style.display = 'none';
        }
    }

    clearStoryText() {
        if (this.elements.storyText) {
            this.elements.storyText.textContent = '';
        }
    }

    // Audio Indicator Methods
    showAudioIndicator() {
        if (this.elements.audioIndicator) {
            this.elements.audioIndicator.classList.add('playing');
            this.elements.audioIndicator.textContent = '🔊';
        }
    }

    hideAudioIndicator() {
        if (this.elements.audioIndicator) {
            this.elements.audioIndicator.classList.remove('playing');
            this.elements.audioIndicator.textContent = '';
        }
    }

    updateAudioIndicator(isPlaying) {
        if (isPlaying) {
            this.showAudioIndicator();
        } else {
            this.hideAudioIndicator();
        }
    }

    showAutoplayWarning() {
        const autoplayWarning = document.getElementById('autoplay-warning');
        if (autoplayWarning) {
            autoplayWarning.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => {
                autoplayWarning.style.display = 'none';
            }, 5000);

            // Also hide on click
            autoplayWarning.addEventListener('click', () => {
                autoplayWarning.style.display = 'none';
            });
        }
    }

    // Minigame Methods
    showMinigame(minigameId) {
        if (this.elements.minigameContainer) {
            this.elements.minigameContainer.classList.add('active');

            if (this.elements.minigameHeader) {
                this.elements.minigameHeader.textContent = `Minigame: ${minigameId}`;
            }
        }
    }

    hideMinigame() {
        if (this.elements.minigameContainer) {
            this.elements.minigameContainer.classList.remove('active');
        }
    }

    updateMinigameStatus(isActive) {
        // Update UI based on minigame active state
        if (isActive) {
            // Minigame is active - show minigame section
            if (this.elements.minigameSection) {
                this.elements.minigameSection.style.display = 'block';
            }
        } else {
            // Minigame is not active - hide minigame section
            if (this.elements.minigameSection) {
                this.elements.minigameSection.style.display = 'none';
            }
            // Also ensure minigame container is hidden
            this.hideMinigame();
        }
    }

    // Status Update Methods
    updateStatus() {
        const stats = this.app.gameState.playerStats;

        // Update individual stat displays
        if (this.elements.healthValue) {
            this.elements.healthValue.textContent = stats.health.toString();
        }

        if (this.elements.courageValue) {
            let courageText = stats.courage;
            // Ensure first letter is capitalized
            if (courageText) {
                courageText = courageText.charAt(0).toUpperCase() + courageText.slice(1).toLowerCase();
            }
            if (stats.hasAlly) {
                courageText += ' + Ally';
            }
            this.elements.courageValue.textContent = courageText;
        }

        if (this.elements.locationValue) {
            this.elements.locationValue.textContent = stats.location;
        }
    }

    updateConnectionStatus(connected) {
        this.app.gameState.mqttStatus.connected = connected;

        if (this.elements.connectionIndicator) {
            if (connected) {
                this.elements.connectionIndicator.textContent = '🔗 MQTT: Connected';
                this.elements.connectionIndicator.className = 'connected';
                this.elements.connectionIndicator.title = 'MQTT Connected';
            } else {
                this.elements.connectionIndicator.textContent = '❌ MQTT: Disconnected';
                this.elements.connectionIndicator.className = 'disconnected';
                this.elements.connectionIndicator.title = 'MQTT Disconnected';
            }
        }
    }

    // Error Display
    showError(type, message) {
        console.log(`🎨 Displaying error: ${type} - ${message}`);

        // Create error notification (simple implementation)
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #440000;
            color: #ff6666;
            border: 1px solid #ff0000;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            max-width: 300px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        `;
        errorDiv.textContent = `Error: ${message}`;

        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Utility Methods
    scrollToTop() {
        // Scroll story text container to top
        if (this.elements.storyText) {
            this.elements.storyText.scrollTop = 0;
        }

        // Also scroll the main game area to top if needed
        if (this.elements.gameArea) {
            this.elements.gameArea.scrollTop = 0;
        }

        // Scroll the main app container to top as well
        if (this.elements.container) {
            this.elements.container.scrollTop = 0;
        }

        // Also scroll the window itself to ensure visibility
        window.scrollTo(0, 0);

        console.log('🎨 Scrolled to top of chapter content');
    }

    // Method removed - no automatic scrolling to bottom allowed
    // Only scrollToTop() should be used for new chapters

    // Manual scroll control methods
    scrollUp(amount = 50) {
        if (this.elements.storyText) {
            const currentScroll = this.elements.storyText.scrollTop;
            const newScroll = Math.max(0, currentScroll - amount);
            this.elements.storyText.scrollTop = newScroll;

            console.log(`🎨 Scrolled up: ${currentScroll} → ${newScroll}`);
            return newScroll === 0; // Return true if at top
        }
        return true;
    }

    scrollDown(amount = 50) {
        if (this.elements.storyText) {
            const currentScroll = this.elements.storyText.scrollTop;
            const maxScroll = this.elements.storyText.scrollHeight - this.elements.storyText.clientHeight;
            const newScroll = Math.min(maxScroll, currentScroll + amount);
            this.elements.storyText.scrollTop = newScroll;

            console.log(`🎨 Scrolled down: ${currentScroll} → ${newScroll} (max: ${maxScroll})`);
            return newScroll >= maxScroll; // Return true if at bottom
        }
        return true;
    }

    isScrollAtTop() {
        if (this.elements.storyText) {
            return this.elements.storyText.scrollTop === 0;
        }
        return true;
    }

    isScrollAtBottom() {
        if (this.elements.storyText) {
            const maxScroll = this.elements.storyText.scrollHeight - this.elements.storyText.clientHeight;
            return this.elements.storyText.scrollTop >= maxScroll;
        }
        return true;
    }

    handleResize() {
        // Handle responsive adjustments if needed
        console.log('🎨 Handling window resize');
    }

    // Loading states
    showLoading(message = 'Loading...') {
        const loadingDetails = document.getElementById('loading-details');
        if (loadingDetails) {
            loadingDetails.textContent = message;
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    // Getters
    isInitialized() {
        return this.initialized;
    }
} 