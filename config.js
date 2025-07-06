// Configuration for Presenter App - Updated to match Orchestrator
const CONFIG = {
    // MQTT Settings - Must match Orchestrator app exactly
    MQTT: {
        PRIMARY_BROKER: 'broker.emqx.io',     // Same as Orchestrator
        FALLBACK_BROKER: 'broker.emqx.io',   // Fallback if primary fails
        PORT: 8083,
        SECURE_PORT: 8084,
        USE_SSL: false,
        CLIENT_ID_PREFIX: 'CatStory_Presenter',  // Different prefix from Orchestrator
        KEEP_ALIVE: 30,
        RECONNECT_PERIOD: 3000,
        CONNECT_TIMEOUT: 15000,
        CLEAN_SESSION: true
    },

    // MQTT Topics - Must match Orchestrator app exactly (but reversed)
    TOPICS: {
        SUBSCRIBE: 'catstory/orchestrator/to/presenter',  // Listen to Orchestrator
        PUBLISH: 'catstory/presenter/to/orchestrator'     // Send to Orchestrator
    },

    // Story Settings
    STORY: {
        AUTO_SCROLL_SPEED: 50,
        CHOICE_HIGHLIGHT_DURATION: 2000,
        CHAPTER_TRANSITION_DELAY: 500,
        DEFAULT_CHAPTER: 'start'
    },

    // Audio Settings
    AUDIO_ENABLED: false,  // Set to true to enable audio
    AUDIO: {
        MASTER_VOLUME: 0.7,
        MUSIC_VOLUME: 0.5,
        SFX_VOLUME: 0.8,
        VOICE_VOLUME: 0.9,
        FADE_DURATION: 1000
    },

    // Minigame Settings
    MINIGAMES_ENABLED: true,
    MINIGAMES: {
        TIMEOUT_DURATION: 60000,  // 60 seconds default timeout
        AUTO_RETURN_TO_STORY: true,
        SHOW_INSTRUCTIONS: true,
        ALLOW_SKIP: true
    },

    // UI Settings
    UI: {
        THEME: 'retro_terminal',
        AUTO_SCROLL: true,
        SHOW_TYPING_EFFECT: false,
        TYPING_SPEED: 50,
        HIGHLIGHT_CHOICES: true,
        SHOW_PROGRESS: true
    },

    // Development Settings
    DEVELOPMENT_MODE: true,  // Set to false for production
    DEV: {
        SHOW_DEBUG_PANEL: true,
        SHOW_MQTT_LOGS: true,
        ENABLE_DEV_SHORTCUTS: true,
        LOG_ALL_EVENTS: true,
        SHOW_PERFORMANCE_METRICS: false
    },

    // Error Handling
    ERROR_HANDLING: {
        AUTO_RETRY_FAILED_ACTIONS: true,
        MAX_RETRY_ATTEMPTS: 3,
        SHOW_ERROR_DETAILS: true,
        LOG_ERRORS_TO_CONSOLE: true
    },

    // Performance Settings
    PERFORMANCE: {
        DEBOUNCE_INPUT: 100,  // ms
        THROTTLE_SCROLL: 16,  // ~60fps
        CACHE_STORY_CONTENT: true,
        PRELOAD_NEXT_CHAPTER: false
    }
};

// Validate configuration
function validateConfig() {
    const required = [
        'MQTT.PRIMARY_BROKER',
        'MQTT.PORT',
        'TOPICS.SUBSCRIBE',
        'TOPICS.PUBLISH'
    ];

    for (const path of required) {
        const parts = path.split('.');
        let current = CONFIG;
        
        for (const part of parts) {
            if (!(part in current)) {
                console.error(`❌ Missing required config: ${path}`);
                return false;
            }
            current = current[part];
        }
    }

    console.log('✅ Configuration validation passed');
    return true;
}

// Auto-validate on load
document.addEventListener('DOMContentLoaded', () => {
    validateConfig();
    
    if (CONFIG.DEVELOPMENT_MODE) {
        console.log('🛠️ Development mode enabled');
        console.log('📋 Current configuration:', CONFIG);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}