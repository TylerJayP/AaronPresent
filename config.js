// Configuration for Presenter App
const CONFIG = {
    // Core application settings
    DEVELOPMENT_MODE: true,        // Enable testing controls and manual interaction
    MQTT_ENABLED: true,           // Enable MQTT connection
    AUDIO_ENABLED: false,         // Enable when audio files are available  
    MINIGAMES_ENABLED: true,     // Enable when minigame files are available

    // MQTT Connection Settings
    MQTT: {
        BROKER: 'broker.emqx.io',
        PORT: 8083,                 // WebSocket port (browsers need WebSocket, not TCP)
        SECURE_PORT: 8084,          // Secure WebSocket port
        USE_SSL: false,             // Set true for wss:// (secure WebSocket)
        CLIENT_ID_PREFIX: 'CatStory_Presenter',

        // Connection options - improved for better reliability
        RECONNECT_PERIOD: 3000,     // Reconnection delay in ms
        CONNECT_TIMEOUT: 15000,     // Connection timeout in ms (reduced from 30s)
        KEEP_ALIVE: 30,             // Keep alive interval in seconds (reduced from 60s)
        CLEAN_SESSION: true
    },

    // MQTT Topics
    TOPICS: {
        SUBSCRIBE: 'catstory/orchestrator/to/presenter',
        PUBLISH: 'catstory/presenter/to/orchestrator'
    },

    // UI Settings
    UI: {
        AUTO_SCROLL_DELAY: 100,     // Delay before auto-scrolling to new content
        CHOICE_HIGHLIGHT_CLASS: 'choice-selected',
        TYPING_EFFECT_SPEED: 30,    // Characters per second for typing effect
        STORY_DISPLAY_DELAY: 500    // Delay before showing story content
    },

    // Audio Settings (placeholders)
    AUDIO: {
        BASE_PATH: './audio/',
        DEFAULT_VOLUME: 0.7,
        FADE_DURATION: 1000,        // Fade in/out duration in ms
        AUTO_PLAY_DELAY: 1500,      // Delay before auto-playing narration
        FILE_EXTENSION: '.mp3'
    },

    // Minigame Settings (placeholders)
    MINIGAMES: {
        BASE_PATH: './minigames/',
        LOADING_TIMEOUT: 30000,     // Timeout for minigame loading
        DEFAULT_SIZE: {
            width: '100%',
            height: '400px'
        }
    },

    // Development Settings
    DEV: {
        SHOW_MQTT_LOGS: true,       // Show MQTT messages in console
        SHOW_STATE_CHANGES: true,   // Log game state changes
        ENABLE_MANUAL_CONTROLS: true, // Show manual progression buttons
        MOCK_AUDIO_DELAY: 25000     // Simulated narration duration for testing
    }
};

// Validate configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
} 