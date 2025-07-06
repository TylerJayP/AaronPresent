# Whiskers and the Bubbles of Justice - Presenter App

An interactive text-based adventure game that presents "Whiskers and the Bubbles of Justice" as a choose-your-own-adventure experience. This app communicates with an Orchestrator app via MQTT to synchronize story progression and handle all user interactions.

## 🚀 Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in a modern web browser
3. The app will start in **development mode** by default
4. Use the **development tools** (press `` ` `` key) to test functionality

## 📡 MQTT Communication

### Connection Settings
- **Broker**: `broker.emqx.io`
- **Port**: 8083 (WebSocket) / 8084 (Secure WebSocket) 
- **Protocol**: `ws://broker.emqx.io:8083`
- **Client ID**: `CatStory_Presenter_${timestamp}`

### Topics
- **Subscribe**: `catstory/orchestrator/to/presenter`
- **Publish**: `catstory/presenter/to/orchestrator`

### Message Format

#### Navigation Behavior
The app implements **smart navigation** for the Up/Down arrow keys via `navigate_choice` messages:
1. **First Priority**: Scroll story text up/down if content is scrollable
2. **Second Priority**: Navigate between choice options when text is fully scrolled
3. **Direct Control**: Use `scroll_up`/`scroll_down` for explicit text scrolling

This ensures users can read long story content before making choices, while maintaining intuitive navigation.

#### Received from Orchestrator:
```json
// Progress to next chapter
{ "type": "proceed_chapter", "timestamp": "2024-01-01T12:00:00Z", "action": "next" }

// Make a choice
{ "type": "make_choice", "timestamp": "2024-01-01T12:00:00Z", "choiceIndex": 0 }

// Navigate choice selection (smart navigation: scrolls text first, then navigates choices)
{ "type": "navigate_choice", "timestamp": "2024-01-01T12:00:00Z", "direction": "up" }

// Scroll story text up (direct scroll control)
{ "type": "scroll_up", "timestamp": "2024-01-01T12:00:00Z" }

// Scroll story text down (direct scroll control)
{ "type": "scroll_down", "timestamp": "2024-01-01T12:00:00Z" }

// Minigame input
{ "type": "minigame_input", "timestamp": "2024-01-01T12:00:00Z", "input": "w" }

// Reset game
{ "type": "reset_game", "timestamp": "2024-01-01T12:00:00Z" }
```

#### Sent to Orchestrator:
```json
// Chapter changed
{
  "type": "chapter_changed",
  "timestamp": "2024-01-01T12:00:00Z",
  "previousChapter": "start",
  "currentChapter": "2a", 
  "choiceMade": "investigate",
  "playerState": { "health": 100, "courage": "brave" }
}

// Choices available
{
  "type": "choices_available",
  "timestamp": "2024-01-01T12:00:00Z",
  "chapter": "2a",
  "choices": [
    { "index": 0, "text": "Hide behind the couch..." },
    { "index": 1, "text": "Run upstairs..." }
  ],
  "currentSelection": 0
}

// Ready for input
{
  "type": "ready_for_input",
  "timestamp": "2024-01-01T12:00:00Z",
  "context": "story",
  "awaitingInputType": "proceed"
}

// Scroll status update
{
  "type": "scroll_status",
  "timestamp": "2024-01-01T12:00:00Z",
  "direction": "up",
  "atTop": true,
  "atBottom": false
}
```

## 🎮 Features

### ✅ Implemented
- **Complete story system** with branching narrative (4 different endings)
- **MQTT communication** with auto-reconnection and message queuing
- **80s retro terminal styling** with glowing effects and animations
- **Development mode** with comprehensive testing tools
- **Audio system** with placeholder implementation
- **Minigame system** with iframe integration and placeholder mode
- **Responsive design** that works on desktop and mobile
- **Error handling** with graceful fallbacks
- **State management** with progress tracking

### 🚧 Placeholder Systems
- **Audio files**: Ready for MP3 narration files (see `audio/README.md`)
- **Minigame files**: Ready for HTML iframe games (see `minigames/README.md`)

## 🛠️ Development Mode

### Activation
Development mode is **enabled by default** in `config.js`:
```javascript
DEVELOPMENT_MODE: true
```

### Features
- **Debug Panel**: Press `` ` `` to toggle development tools
- **MQTT Simulator**: Test messages without external Orchestrator
- **Keyboard Shortcuts**:
  - `Ctrl+4` - Toggle debug panel
  - `Ctrl+1` - Proceed chapter
  - `Ctrl+2` - Make choice
  - `Ctrl+3` - Reset game
  - `Ctrl+Shift+R` - Force reset
  - `Ctrl+Shift+D` - Dump game state
- **Event Logging**: Monitor all system events
- **State Inspector**: View current game state in real-time
- **Test Controls**: Audio testing, minigame testing, chapter jumping

### Testing Without MQTT
The app includes comprehensive simulation capabilities:
1. Open the debug panel (`Ctrl+4` key)
2. Use the MQTT Simulator section
3. Click pre-defined message buttons or send custom JSON
4. Monitor results in the Event Log

## 📁 Project Structure

```
presenter_prototype/
├── index.html              # Main application entry point
├── config.js               # Configuration settings
├── README.md              # This file
├── css/
│   ├── main.css           # 80s terminal styling
│   └── development.css    # Development tools styling
├── js/
│   ├── app.js             # Main application controller
│   ├── ui-manager.js      # DOM manipulation and display
│   ├── story-engine.js    # Story logic and navigation
│   ├── audio-manager.js   # Audio playback system
│   ├── minigame-manager.js # Minigame integration
│   ├── mqtt-client.js     # MQTT communication
│   └── development-tools.js # Testing and debug utilities
├── data/
│   └── story-content.js   # Complete story structure
├── audio/                 # Audio narration files (placeholder)
│   └── README.md         # Audio integration guide
└── minigames/            # HTML iframe minigames (placeholder)
    └── README.md         # Minigame development guide
```

## 🎯 Story Structure

The adventure includes **12 main chapters** with **multiple branching paths** leading to **4 different endings**:

### Main Paths:
1. **Community Builder** - Focus on building alliances and cooperation
2. **Solitary Protector** - Develop individual power and self-reliance  
3. **Wise Guardian** - Balance power with understanding
4. **Redeemed Warrior** - Learn from mistakes and grow

### Chapter Flow:
```
Start → Investigation Choice → Mentor Meeting → Power Development 
→ Strategy Choice → Battle/Resolution → Multiple Endings
```

## ⚙️ Configuration

### Main Settings (`config.js`):
```javascript
const CONFIG = {
  DEVELOPMENT_MODE: true,    // Enable testing controls
  MQTT_ENABLED: true,       // Enable MQTT connection
  AUDIO_ENABLED: false,     // Enable when audio files available
  MINIGAMES_ENABLED: false, // Enable when minigame files available
  
  MQTT: {
    BROKER: 'broker.emqx.io',
    PORT: 8083,
    USE_SSL: false,
    CLIENT_ID_PREFIX: 'CatStory_Presenter'
  },
  
  TOPICS: {
    SUBSCRIBE: 'catstory/orchestrator/to/presenter',
    PUBLISH: 'catstory/presenter/to/orchestrator'
  }
};
```

### For Production Deployment:
1. Set `DEVELOPMENT_MODE: false`
2. Verify MQTT broker settings
3. Enable audio/minigames when files are ready
4. Test all MQTT message types

## 🎨 Styling & Theme

The app uses an **authentic 80s computer terminal aesthetic**:

- **Colors**: Black background, bright green text, yellow accents
- **Typography**: Courier New monospace font
- **Effects**: Glowing text, scanlines, terminal borders
- **Animations**: Smooth transitions, typing effects
- **Responsive**: Works on desktop and mobile devices

## 🔧 Browser Compatibility

### Requirements:
- **ES6+ Support**: Arrow functions, async/await, classes
- **WebSocket Support**: For MQTT communication
- **HTML5 Audio API**: For narration playback
- **PostMessage API**: For minigame communication

### Tested Browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📱 Mobile Support

The app includes mobile-responsive design:
- Touch-friendly interface
- Responsive layouts
- Mobile-optimized text sizes
- Gesture support for development tools

## 🚨 Error Handling

### Comprehensive Error Management:
- **MQTT Connection**: Auto-reconnection with exponential backoff
- **Audio Playback**: Graceful fallback to silent operation
- **Minigame Loading**: Placeholder mode for missing files
- **Story Navigation**: Validation and recovery mechanisms
- **Global Errors**: User-friendly error messages

### Development Debugging:
- All errors logged to console and development event log
- Error modal with retry/continue options
- State inspection tools for debugging
- Performance monitoring capabilities

## 🔄 State Management

### Game State Structure:
```javascript
gameState = {
  currentChapter: "start",
  playerStats: {
    health: 100,
    courage: "normal",
    location: "Home",
    hasBubblePowers: false,
    bubbleEnergy: 0
  },
  storyProgress: {
    choicesMade: [],
    pathTaken: "main",
    chaptersCompleted: []
  },
  gameStatus: {
    isWaitingForInput: true,
    minigameActive: false,
    audioPlaying: false,
    currentChoiceIndex: 0
  },
  mqttStatus: {
    connected: false,
    lastMessage: null,
    developmentMode: true
  }
}
```

## 📚 API Reference

### Main App Methods:
- `app.resetGame()` - Reset to beginning
- `app.handleMQTTMessage(message)` - Process MQTT commands
- `app.handleError(type, error)` - Error handling

### Module Access:
- `app.modules.ui` - UI management
- `app.modules.story` - Story engine
- `app.modules.audio` - Audio system
- `app.modules.minigame` - Minigame integration
- `app.modules.mqtt` - MQTT client
- `app.modules.development` - Development tools

## 🤝 Contributing

### Adding Audio Files:
1. Record MP3 files following naming convention in `audio/README.md`
2. Set `AUDIO_ENABLED: true` in config.js
3. Test with development tools

### Adding Minigames:
1. Create HTML files following template in `minigames/README.md`
2. Set `MINIGAMES_ENABLED: true` in config.js
3. Test integration with postMessage communication

### Modifying Story:
1. Edit `data/story-content.js`
2. Follow existing chapter structure
3. Test all branching paths

## 📄 License

This project is part of a school assignment for CS3660 Web Programming II.

## 🐛 Known Issues

- MQTT.js library loaded from CDN (could be bundled locally)
- Audio autoplay policies vary by browser
- Some mobile browsers may have WebSocket limitations

## 📞 Support

For development questions or issues:
1. Check the browser console for detailed error messages
2. Use the development tools event log
3. Verify MQTT broker connectivity
4. Test with MQTT simulator in development mode

---

## Additional Reference for Orchestrator App Button Handler

MQTT URL for Orchestrator Connection:
```javascript
const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt', options);
```

Button Handler for Simple Key Presses (Enter to Progress Chapter, 1/2/3 for Choices):
```javascript
// Simple button handler
function handleKeyPress(key) {
  let message;
  
  switch(key) {
    case 'Enter':
      message = {
        "type": "proceed_chapter",
        "timestamp": new Date().toISOString()
      };
      break;
      
    case '1':
      message = {
        "type": "make_choice",
        "choiceIndex": 0,
        "timestamp": new Date().toISOString()
      };
      break;
      
    case '2': 
      message = {
        "type": "make_choice",
        "choiceIndex": 1,
        "timestamp": new Date().toISOString()
      };
      break;
      
    case '3':
      message = {
        "type": "make_choice", 
        "choiceIndex": 2,
        "timestamp": new Date().toISOString()
      };
      break;
  }
  
  if (message) {
    mqttClient.publish('catstory/orchestrator/to/presenter', JSON.stringify(message));
  }
}
```

More Complex Context-Aware Button Handler for Choice Navigation and Selection (Up/Down/Enter):
```javascript
// Track the current highlighted choice
let currentChoiceIndex = 0;
let hasChoices = false; // Track from MQTT messages received

function handleKeyPress(key) {
    switch(key) {
        case 'ArrowUp':
            // Smart navigation: scrolls text first, then navigates choices
            mqttClient.publish('catstory/orchestrator/to/presenter', 
                JSON.stringify({
                    "type": "navigate_choice",
                    "direction": "up",
                    "timestamp": new Date().toISOString()
                })
            );
            break;
            
        case 'ArrowDown':
            // Smart navigation: scrolls text first, then navigates choices
            mqttClient.publish('catstory/orchestrator/to/presenter',
                JSON.stringify({
                    "type": "navigate_choice", 
                    "direction": "down",
                    "timestamp": new Date().toISOString()
                })
            );
            break;

        case 'PageUp':
            // Direct scroll control for faster text navigation
            mqttClient.publish('catstory/orchestrator/to/presenter',
                JSON.stringify({
                    "type": "scroll_up",
                    "timestamp": new Date().toISOString()
                })
            );
            break;

        case 'PageDown':
            // Direct scroll control for faster text navigation
            mqttClient.publish('catstory/orchestrator/to/presenter',
                JSON.stringify({
                    "type": "scroll_down",
                    "timestamp": new Date().toISOString()
                })
            );
            break;
            
        case 'Enter':
            if (hasChoices) {
                // Select the currently highlighted choice
                mqttClient.publish('catstory/orchestrator/to/presenter',
                    JSON.stringify({
                        "type": "make_choice",
                        "choiceIndex": currentChoiceIndex,
                        "timestamp": new Date().toISOString()
                    })
                );
            } else {
                // Progress the story when no choices
                mqttClient.publish('catstory/orchestrator/to/presenter',
                    JSON.stringify({
                        "type": "proceed_chapter", 
                        "timestamp": new Date().toISOString()
                    })
                );
            }
            break;
    }
}

// Listen for status updates from Presenter
mqttClient.on('message', (topic, message) => {
    const data = JSON.parse(message.toString());
    
    if (data.type === 'ready_for_input') {
        hasChoices = (data.context === 'choices');
        if (hasChoices) {
            currentChoiceIndex = 0; // Reset to first choice
        }
    }
    
    // Handle scroll status updates
    if (data.type === 'scroll_status') {
        console.log(`Scroll: ${data.direction}, At top: ${data.atTop}, At bottom: ${data.atBottom}`);
        // Use this info to provide user feedback about scroll position
    }
});
```

**Happy adventuring with Whiskers! 🐱✨** 