// Development Tools for Whiskers Presenter App
class DevelopmentTools {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.eventLog = [];
        this.mqttSimulator = null;
        this.debugPanel = null;
        this.keyboardHandler = null;
        this.logMaxEntries = 100;
        this.panelVisible = false; // Track panel state manually
    }

    async initialize() {
        if (!CONFIG.DEVELOPMENT_MODE) {
            console.log('🛠️ Development mode disabled - skipping development tools');
            return;
        }

        if (this.initialized) {
            console.log('🛠️ Development tools already initialized - skipping');
            return;
        }

        try {
            console.log('🛠️ Initializing Development Tools...');

            // Create debug panel
            this.createDebugPanel();

            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Initialize MQTT simulator
            this.setupMQTTSimulator();

            // Set up event logging
            this.setupEventLogging();

            // Add test buttons
            this.createTestButtons();

            this.initialized = true;
            console.log('✅ Development Tools initialized');

            // Start periodic updates
            this.updateMQTTStatus();
            this.logEvent('Development Tools initialized', {
                developmentMode: CONFIG.DEVELOPMENT_MODE,
                features: ['MQTT Simulator', 'Event Logging', 'Test Controls']
            });

        } catch (error) {
            console.error('❌ Failed to initialize Development Tools:', error);
            this.app.handleError('development_init', error);
        }
    }

    createDebugPanel() {
        // Check if panel already exists
        this.debugPanel = document.getElementById('dev-panel');
        if (!this.debugPanel) {
            console.error('🛠️ Development panel not found in DOM');
            return;
        }

        // Set up panel visibility toggles
        const hideToggle = document.getElementById('dev-toggle');
        const showToggle = document.getElementById('dev-show-toggle');

        if (hideToggle) {
            console.log('🛠️ Setting up hide toggle button');
            hideToggle.addEventListener('click', (event) => {
                event.preventDefault();
                console.log('🛠️ Hide button clicked');
                // Only hide if currently visible
                if (this.panelVisible) {
                    this.debugPanel.style.display = 'none';
                    this.panelVisible = false;
                    const showButton = document.getElementById('dev-show-toggle');
                    if (showButton) {
                        showButton.style.display = 'block';
                    }
                    console.log('🛠️ Debug panel HIDDEN via hide button');
                    this.logEvent('debug_panel_toggle', { action: 'hidden' });
                }
            });
        } else {
            console.warn('🛠️ Hide toggle button not found');
        }

        if (showToggle) {
            console.log('🛠️ Setting up show toggle button');
            showToggle.addEventListener('click', (event) => {
                event.preventDefault();
                console.log('🛠️ Show button clicked');
                // Only show if currently hidden
                if (!this.panelVisible) {
                    this.debugPanel.style.display = 'block';
                    this.panelVisible = true;
                    showToggle.style.display = 'none';
                    console.log('🛠️ Debug panel SHOWN via show button');
                    this.logEvent('debug_panel_toggle', { action: 'shown' });
                }
            });
            // Show the toggle button if in development mode
            showToggle.style.display = CONFIG.DEVELOPMENT_MODE ? 'block' : 'none';
        } else {
            console.warn('🛠️ Show toggle button not found');
        }

        // Start with debug panel hidden, even in development mode
        this.debugPanel.style.display = 'none';
        this.panelVisible = false; // Set initial state
        if (showToggle) {
            showToggle.style.display = CONFIG.DEVELOPMENT_MODE ? 'block' : 'none';
        }
        console.log('🛠️ Debug panel initialized as hidden');

        // Set up collapsible sections
        this.setupCollapsibleSections();

        console.log('🛠️ Debug panel created and configured');
    }

    setupCollapsibleSections() {
        const collapsibleHeaders = this.debugPanel.querySelectorAll('.dev-section-header');

        collapsibleHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isOpen = content.style.display !== 'none';

                content.style.display = isOpen ? 'none' : 'block';
                header.textContent = header.textContent.replace(
                    isOpen ? '▼' : '▶',
                    isOpen ? '▶' : '▼'
                );
            });
        });
    }

    setupKeyboardShortcuts() {
        this.keyboardHandler = (event) => {
            // Only handle shortcuts when not in text input
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (event.key) {
                case '1':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.simulateMQTTMessage('proceed_chapter');
                    }
                    break;

                case '2':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.simulateMQTTMessage('make_choice', { choiceIndex: 0 });
                    }
                    break;

                case '3':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        this.simulateMQTTMessage('reset_game');
                    }
                    break;

                case '4':
                    if (event.ctrlKey) {
                        event.preventDefault();
                        console.log('🛠️ Ctrl+4 pressed, toggling debug panel');
                        this.toggleDebugPanel();
                    }
                    break;

                case 'r':
                    if (event.ctrlKey && event.shiftKey) {
                        event.preventDefault();
                        this.resetGame();
                    }
                    break;

                case 'd':
                    if (event.ctrlKey && event.shiftKey) {
                        event.preventDefault();
                        this.dumpGameState();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
        console.log('🛠️ Keyboard shortcuts enabled (Ctrl+4 toggles dev panel)');
    }

    setupMQTTSimulator() {
        const mqttSimulator = document.getElementById('mqtt-simulator');

        mqttSimulator.innerHTML = `
            <div class="dev-subsection">
                <h4>Connection Status</h4>
                <div id="mqtt-connection-status" class="connection-status">
                    Status: <span id="mqtt-status-text">Checking...</span>
                </div>
                <div class="dev-buttons">
                    <button id="test-mqtt-connection" class="dev-btn">Test Connection</button>
                    <button id="force-mqtt-reconnect" class="dev-btn">Force Reconnect</button>
                    <button id="disconnect-mqtt" class="dev-btn">Disconnect</button>
                </div>
            </div>
            
            <div class="dev-subsection">
                <h4>Send Test Messages</h4>
                <div class="dev-buttons">
                    <button class="dev-btn" data-message-type="proceed_chapter">Proceed Chapter</button>
                    <button class="dev-btn" data-message-type="make_choice">Make Choice #1</button>
                    <button class="dev-btn" data-message-type="navigate_choice">Navigate Up</button>
                    <button class="dev-btn" data-message-type="reset_game">Reset Game</button>
                </div>
            </div>

            <div class="dev-subsection">
                <h4>Custom Message</h4>
                <textarea id="custom-mqtt-message" placeholder='{"type": "proceed_chapter", "timestamp": "..."}'></textarea>
                <button id="send-custom-message" class="dev-btn">Send Custom</button>
            </div>

            <div class="dev-subsection">
                <h4>Broker Information</h4>
                <div class="broker-info">
                    <div>Broker: ${CONFIG.MQTT.BROKER}</div>
                    <div>WebSocket Port: ${CONFIG.MQTT.PORT}</div>
                    <div>URL: ws://${CONFIG.MQTT.BROKER}:${CONFIG.MQTT.PORT}/mqtt</div>
                    <div>Subscribe Topic: ${CONFIG.TOPICS.SUBSCRIBE}</div>
                    <div>Publish Topic: ${CONFIG.TOPICS.PUBLISH}</div>
                </div>
            </div>
        `;

        // Update connection status
        this.updateMQTTStatus();

        // Set up event listeners
        this.setupMQTTEventListeners();
    }

    updateMQTTStatus() {
        const statusElement = document.getElementById('mqtt-status-text');
        if (!statusElement) return;

        if (this.app.modules.mqtt && this.app.modules.mqtt.isConnected()) {
            statusElement.textContent = '✅ Connected';
            statusElement.style.color = '#00ff00';
        } else if (this.app.modules.mqtt && this.app.modules.mqtt.isInitialized()) {
            statusElement.textContent = '⏳ Connecting...';
            statusElement.style.color = '#ffff44';
        } else {
            statusElement.textContent = '❌ Disconnected';
            statusElement.style.color = '#ff4444';
        }

        // Schedule next update
        if (this.initialized) {
            setTimeout(() => this.updateMQTTStatus(), 2000); // Update every 2 seconds
        }
    }

    setupMQTTEventListeners() {
        // Connection test button
        const testBtn = document.getElementById('test-mqtt-connection');
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                this.logEvent('Testing MQTT connection...');
                try {
                    if (this.app.modules.mqtt) {
                        const stats = this.app.modules.mqtt.getConnectionStats();
                        this.logEvent('MQTT Stats', stats);

                        if (!this.app.modules.mqtt.isConnected()) {
                            this.logEvent('Attempting to reconnect...');
                            await this.app.modules.mqtt.connect();
                        }
                    } else {
                        this.logEvent('MQTT module not initialized');
                    }
                } catch (error) {
                    this.logEvent('MQTT test failed', error);
                }
                this.updateMQTTStatus();
            });
        }

        // Force reconnect button
        const reconnectBtn = document.getElementById('force-mqtt-reconnect');
        if (reconnectBtn) {
            reconnectBtn.addEventListener('click', async () => {
                this.logEvent('Force reconnecting MQTT...');
                try {
                    if (this.app.modules.mqtt) {
                        this.app.modules.mqtt.disconnect();
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                        await this.app.modules.mqtt.connect();
                    }
                } catch (error) {
                    this.logEvent('Force reconnect failed', error);
                }
                this.updateMQTTStatus();
            });
        }

        // Disconnect button
        const disconnectBtn = document.getElementById('disconnect-mqtt');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.logEvent('Disconnecting MQTT...');
                if (this.app.modules.mqtt) {
                    this.app.modules.mqtt.disconnect();
                }
                this.updateMQTTStatus();
            });
        }

        // Message type buttons
        const mqttSimulator = document.getElementById('mqtt-simulator');
        if (mqttSimulator) {
            const messageButtons = mqttSimulator.querySelectorAll('[data-message-type]');
            messageButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const messageType = button.getAttribute('data-message-type');
                    this.simulateMessage(messageType);
                });
            });
        }

        // Custom message button
        const customBtn = document.getElementById('send-custom-message');
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                const textarea = document.getElementById('custom-mqtt-message');
                if (textarea && textarea.value.trim()) {
                    try {
                        const message = JSON.parse(textarea.value.trim());
                        this.simulateCustomMessage(message);
                    } catch (error) {
                        this.logEvent('Invalid JSON in custom message', error);
                    }
                }
            });
        }
    }

    setupEventLogging() {
        const logContainer = document.getElementById('event-log');
        if (!logContainer) return;

        // Clear any existing content to prevent duplicates
        logContainer.innerHTML = '';

        // Clear log button
        const clearButton = document.createElement('button');
        clearButton.className = 'dev-btn dev-btn-small';
        clearButton.textContent = 'Clear Log';
        clearButton.addEventListener('click', () => {
            this.clearEventLog();
        });
        logContainer.appendChild(clearButton);

        // Log display area
        const logDisplay = document.createElement('div');
        logDisplay.id = 'log-display';
        logDisplay.className = 'dev-log-display';
        logContainer.appendChild(logDisplay);

        console.log('🛠️ Event logging set up');
    }

    createTestButtons() {
        const testContainer = document.getElementById('test-controls');
        if (!testContainer) return;

        // Clear any existing content to prevent duplicates
        testContainer.innerHTML = '';

        const testButtons = [
            {
                label: 'Test Audio',
                action: () => this.app.modules.audio.testAudio()
            },
            {
                label: 'Test Minigame',
                action: () => this.app.modules.minigame.testMinigame('test_game')
            },
            {
                label: 'Jump to Chapter',
                action: () => this.promptChapterJump()
            },
            {
                label: 'Connection Stats',
                action: () => this.showConnectionStats()
            },
            {
                label: 'Game State',
                action: () => this.showGameState()
            },
            {
                label: 'Performance Stats',
                action: () => this.showPerformanceStats()
            }
        ];

        testButtons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = 'dev-btn';
            btn.textContent = button.label;
            btn.addEventListener('click', button.action);
            testContainer.appendChild(btn);
        });

        console.log('🛠️ Test buttons created');
    }

    simulateMessage(messageType) {
        const messageTemplates = {
            proceed_chapter: {
                type: 'proceed_chapter',
                action: 'next'
            },
            make_choice: {
                type: 'make_choice',
                choiceIndex: 0
            },
            navigate_choice: {
                type: 'navigate_choice',
                direction: 'up'
            },
            reset_game: {
                type: 'reset_game'
            }
        };

        const message = messageTemplates[messageType];
        if (message) {
            this.simulateMQTTMessage(messageType, message);
        }
    }

    simulateCustomMessage(message) {
        this.logEvent('Sending custom MQTT message', message);

        if (this.app.modules.mqtt && this.app.modules.mqtt.isConnected()) {
            // Try to send via real MQTT if connected
            this.app.modules.mqtt.publish(message);
        } else {
            // Simulate locally if not connected
            this.app.handleMQTTMessage(message);
        }
    }

    simulateMQTTMessage(messageType, messageData) {
        const fullMessage = {
            timestamp: new Date().toISOString(),
            ...messageData
        };

        this.logEvent('Simulating MQTT message', { type: messageType, message: fullMessage });

        // If MQTT is connected, send real message, otherwise simulate locally
        if (this.app.modules.mqtt && this.app.modules.mqtt.isConnected()) {
            this.app.modules.mqtt.publish(fullMessage);
            this.logEvent('Sent via real MQTT connection');
        } else {
            // Simulate the message locally
            this.app.handleMQTTMessage(fullMessage);
            this.logEvent('Simulated locally (no MQTT connection)');
        }
    }

    promptChapterJump() {
        const chapterId = prompt('Enter chapter ID to jump to:');
        if (chapterId && this.app.modules.story) {
            try {
                this.app.modules.story.jumpToChapter(chapterId);
                this.logEvent('chapter_jump', { chapterId });
            } catch (error) {
                this.logEvent('error', { message: 'Chapter jump failed', error: error.message });
                alert('Failed to jump to chapter: ' + error.message);
            }
        }
    }

    resetGame() {
        if (confirm('Reset the entire game? This will clear all progress.')) {
            this.app.resetGame();
            this.logEvent('game_reset', { timestamp: new Date().toISOString() });
        }
    }

    dumpGameState() {
        const gameState = JSON.stringify(this.app.gameState, null, 2);
        console.log('🛠️ Current Game State:', gameState);

        // Also copy to clipboard if available
        if (navigator.clipboard) {
            navigator.clipboard.writeText(gameState).then(() => {
                this.logEvent('game_state_copied', { message: 'Game state copied to clipboard' });
            });
        }

        this.logEvent('game_state_dump', { gameState: this.app.gameState });
    }

    showConnectionStats() {
        const stats = {
            mqtt: this.app.modules.mqtt ? this.app.modules.mqtt.getConnectionStats() : null,
            audio: this.app.modules.audio ? this.app.modules.audio.getAudioStats() : null,
            minigame: this.app.modules.minigame ? this.app.modules.minigame.getMinigameStats() : null
        };

        console.table(stats);
        this.logEvent('connection_stats', stats);

        // Show in popup
        alert('Connection stats logged to console and development log');
    }

    showGameState() {
        const gameState = this.app.gameState;
        console.table(gameState);
        this.logEvent('game_state_view', gameState);

        // Update state inspector if it exists
        const inspector = document.getElementById('state-inspector');
        if (inspector) {
            inspector.textContent = JSON.stringify(gameState, null, 2);
        }
    }

    showPerformanceStats() {
        const stats = {
            modules: {
                ui: this.app.modules.ui ? 'loaded' : 'not loaded',
                story: this.app.modules.story ? 'loaded' : 'not loaded',
                audio: this.app.modules.audio ? 'loaded' : 'not loaded',
                minigame: this.app.modules.minigame ? 'loaded' : 'not loaded',
                mqtt: this.app.modules.mqtt ? 'loaded' : 'not loaded',
                development: this.app.modules.development ? 'loaded' : 'not loaded'
            },
            memory: {
                eventLogEntries: this.eventLog.length,
                usedJSHeapSize: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
                totalJSHeapSize: performance.memory ? performance.memory.totalJSHeapSize : 'N/A'
            },
            timing: {
                loadComplete: performance.now(),
                navigation: performance.getEntriesByType('navigation')[0]
            }
        };

        console.table(stats);
        this.logEvent('performance_stats', stats);
    }

    logEvent(eventType, eventData) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: eventType,
            data: eventData
        };

        this.eventLog.unshift(logEntry);

        // Limit log size
        if (this.eventLog.length > this.logMaxEntries) {
            this.eventLog = this.eventLog.slice(0, this.logMaxEntries);
        }

        // Update log display
        this.updateLogDisplay();

        // Also log to console for debugging
        console.log(`🛠️ [${eventType.toUpperCase()}]`, eventData);
    }

    updateLogDisplay() {
        const logDisplay = document.getElementById('event-log');
        if (!logDisplay) return;

        // Clear and rebuild log display
        logDisplay.innerHTML = '';

        // Show latest 20 entries
        const recentEntries = this.eventLog.slice(0, 20);

        recentEntries.forEach(entry => {
            const logItem = document.createElement('div');
            logItem.className = 'dev-log-item';

            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const summary = this.getLogEntrySummary(entry);

            logItem.innerHTML = `
                <span class="log-time">${timestamp}</span>
                <span class="log-type">${entry.type}</span>
                <span class="log-data">${summary}</span>
            `;

            logDisplay.appendChild(logItem);
        });

        // Auto-scroll to top
        logDisplay.scrollTop = 0;
    }

    getLogEntrySummary(entry) {
        switch (entry.type) {
            case 'mqtt_simulation':
                return `${entry.data.messageType} simulated`;
            case 'chapter_jump':
                return `Jumped to ${entry.data.chapterId}`;
            case 'game_reset':
                return 'Game reset';
            case 'error':
                return entry.data.message || 'Error occurred';
            case 'audio_status':
                return `Audio: ${entry.data.status} - ${entry.data.audioFile}`;
            case 'minigame_status':
                return `Minigame: ${entry.data.status} - ${entry.data.minigameId}`;
            default:
                return JSON.stringify(entry.data).substring(0, 50) + '...';
        }
    }

    clearEventLog() {
        this.eventLog = [];
        this.updateLogDisplay();
        console.log('🛠️ Event log cleared');
    }

    toggleDebugPanel() {
        if (!this.debugPanel) {
            console.error('🛠️ Debug panel not found');
            return;
        }

        console.log(`🛠️ Current panel state: ${this.panelVisible ? 'visible' : 'hidden'}`);

        const showButton = document.getElementById('dev-show-toggle');

        if (this.panelVisible) {
            // Hide the panel
            this.debugPanel.style.display = 'none';
            this.panelVisible = false;
            if (showButton) {
                showButton.style.display = 'block';
            }
            console.log('🛠️ Debug panel HIDDEN');
            this.logEvent('debug_panel_toggle', { action: 'hidden' });
        } else {
            // Show the panel
            this.debugPanel.style.display = 'block';
            this.panelVisible = true;
            if (showButton) {
                showButton.style.display = 'none';
            }
            console.log('🛠️ Debug panel SHOWN');
            this.logEvent('debug_panel_toggle', { action: 'shown' });
        }

        console.log(`🛠️ New panel state: ${this.panelVisible ? 'visible' : 'hidden'}`);
    }

    // Utility methods for other modules to use
    getEventLog() {
        return [...this.eventLog];
    }

    isEnabled() {
        return CONFIG.DEVELOPMENT_MODE && this.initialized;
    }

    // Called when app shuts down
    cleanup() {
        if (this.keyboardHandler) {
            document.removeEventListener('keydown', this.keyboardHandler);
            this.keyboardHandler = null;
        }

        console.log('🛠️ Development tools cleaned up');
    }

    // Helper method to get development stats
    getDevelopmentStats() {
        return {
            initialized: this.initialized,
            developmentMode: CONFIG.DEVELOPMENT_MODE,
            eventLogSize: this.eventLog.length,
            debugPanelVisible: this.debugPanel ? this.debugPanel.style.display !== 'none' : false
        };
    }
}