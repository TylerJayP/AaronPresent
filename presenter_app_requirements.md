# Presenter App Requirements Document (Final)

## 1. Project Overview

### 1.1 Purpose
The Presenter app is a text-based adventure game that presents "Whiskers and the Bubbles of Justice" as an interactive choose-your-own-adventure experience. It communicates with an Orchestrator app via MQTT to synchronize story progression and handle all user interactions.

### 1.2 Core Functionality
- Display story chapters with choices
- Handle choice selection via MQTT commands
- Integrate iframe minigames at specific story points
- Forward minigame controls (WASD + spacebar) from MQTT to minigames
- Play narration audio automatically with story text (non-blocking)
- Reset functionality via MQTT or manual testing
- Communicate game state back to Orchestrator app

## 2. Technical Requirements

### 2.1 Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Communication**: MQTT.js client library over WebSocket
- **Audio**: HTML5 Audio API
- **Styling**: Custom CSS (80s retro terminal aesthetic)
- **Build**: No framework - standalone web application

### 2.2 MQTT Configuration
- **Broker**: `broker.emqx.io`
- **Port**: 8083 (WebSocket) or 8084 (Secure WebSocket)
- **Protocol**: `ws://broker.emqx.io:8083` or `wss://broker.emqx.io:8084`
- **Client ID**: `CatStory_Presenter_${timestamp}` (unique per session)
- **Topics**:
  - Subscribe: `catstory/orchestrator/to/presenter`
  - Publish: `catstory/presenter/to/orchestrator`

### 2.3 Development vs Deployment Modes
- **Deployment Mode**: All interactions via MQTT only
- **Development Mode**: Manual testing controls available alongside MQTT
- **Mode Detection**: Configuration flag in `config.js`

## 3. User Interface Requirements

### 3.1 Visual Design
- **Theme**: 80s retro computer terminal
- **Colors**: 
  - Background: Black (#000)
  - Primary text: Bright green (#00ff00)
  - Accent text: Yellow (#ffff00)
  - Special text: Cyan (#00ffff)
  - Warning text: Orange (#ffaa00)
  - Error text: Red (#ff0000)
- **Typography**: Courier New monospace font
- **Layout**: Single-column, terminal-style interface

### 3.2 UI Components
1. **Title Area**: Game title and subtitle
2. **Story Display Area**: 
   - Scrollable text content
   - Minimum height for readability
   - Auto-scroll to new content
   - Audio indicator (🔊 when playing)
3. **Choice Display**:
   - Highlighted current choice (selected via MQTT)
   - Choice numbering for reference
   - No clickable buttons in deployment mode
4. **Status Bar**:
   - Game state indicators
   - MQTT connection status (🔗 connected / ❌ disconnected)
   - Current chapter indicator
   - Audio status
5. **Minigame Container**:
   - Full-width iframe
   - Loading states and error handling
6. **Development Controls** (testing mode only):
   - Manual progression buttons
   - Manual choice selection
   - Reset button
   - MQTT message simulator

## 4. Story Structure Requirements

### 4.1 Chapter System
- **Total Chapters**: 12 main chapters with multiple sub-paths
- **Branching Structure**: Complex decision tree with 5 possible endings
- **Chapter Types**:
  - Story chapters (text + audio + choices)
  - Action chapters (text + audio + minigame + choices)
  - Ending chapters (text + audio + restart option)

### 4.2 Choice System
- **Choice Types**:
  - Standard story choices (2-3 options)
  - Character development choices
  - Strategic/tactical choices
- **Choice Selection**: Via MQTT commands only (deployment) / Click + MQTT (development)
- **Choice Display**: Numbered list with current selection highlighted

### 4.3 Minigame Integration Points
1. **After Chapter 6**: Post-power development minigame
2. **Mid Chapter 8**: Battle sequence minigame  
3. **Ending Sequence**: Cooperation minigame with Dusty

### 4.4 Audio Integration
- **Trigger**: Automatically when new story text appears (< 2 second delay)
- **Behavior**: Non-blocking, stops when user progresses
- **Content**: Narration of story text (files to be added later)
- **Format**: MP3 files
- **Naming Convention**: `chapter_[id]_[section].mp3`
- **Fallback**: Silent operation if audio files not available

## 5. Game State Management

### 5.1 Player State Tracking
```javascript
gameState = {
  currentChapter: string,
  currentSection: string,
  playerStats: {
    health: number,
    courage: string,
    location: string,
    hasBubblePowers: boolean,
    bubbleEnergy: number,
    hasAlly: boolean
  },
  storyProgress: {
    choicesMade: array,
    pathTaken: string,
    chaptersCompleted: array
  },
  gameStatus: {
    isWaitingForInput: boolean,
    minigameActive: boolean,
    audioPlaying: boolean,
    gameEnded: boolean,
    currentChoiceIndex: number
  },
  mqttStatus: {
    connected: boolean,
    lastMessage: timestamp,
    developmentMode: boolean
  }
}
```

### 5.2 State Persistence
- Session storage for current game state (development testing only)
- No permanent save system
- Fresh start each session in deployment
- State recovery after browser refresh (development mode)

## 6. MQTT Communication Requirements

### 6.1 Message Format - Received from Orchestrator

```javascript
// Chapter progression (when no choices available)
{
  type: "proceed_chapter",
  timestamp: "2024-01-01T12:00:00Z",
  action: "next"
}

// Choice selection (when choices are available)
{
  type: "make_choice", 
  timestamp: "2024-01-01T12:00:00Z",
  choiceIndex: 0  // 0-based index of choice
}

// Minigame controls (forward to minigame iframe)
{
  type: "minigame_input",
  timestamp: "2024-01-01T12:00:00Z", 
  input: "w" | "a" | "s" | "d" | "space"
}

// Reset game to beginning
{
  type: "reset_game",
  timestamp: "2024-01-01T12:00:00Z"
}

// Navigate through choices (highlight different option)
{
  type: "navigate_choice",
  timestamp: "2024-01-01T12:00:00Z",
  direction: "up" | "down"
}
```

### 6.2 Message Format - Sent to Orchestrator

```javascript
// Chapter change notification
{
  type: "chapter_changed",
  timestamp: "2024-01-01T12:00:00Z",
  previousChapter: "chapter_2a", 
  currentChapter: "chapter_3a",
  choiceMade: "investigate",
  playerState: gameState.playerStats
}

// Choices available notification
{
  type: "choices_available",
  timestamp: "2024-01-01T12:00:00Z",
  chapter: "chapter_2",
  choices: [
    { index: 0, text: "Hide behind the couch..." },
    { index: 1, text: "Run upstairs to get a better view..." }, 
    { index: 2, text: "Hiss and arch your back..." }
  ],
  currentSelection: 0
}

// Minigame status updates
{
  type: "minigame_status",
  timestamp: "2024-01-01T12:00:00Z",
  status: "started" | "active" | "completed" | "failed",
  minigameId: "post_chapter_6",
  result: null | "success" | "failure" | score
}

// Audio status updates
{
  type: "audio_status", 
  timestamp: "2024-01-01T12:00:00Z",
  status: "started" | "playing" | "finished" | "error",
  audioFile: "chapter_1_intro.mp3"
}

// Ready for next input
{
  type: "ready_for_input",
  timestamp: "2024-01-01T12:00:00Z",
  context: "story" | "choices" | "minigame",
  awaitingInputType: "proceed" | "choice" | "gameInput"
}
```

## 7. Audio System Requirements

### 7.1 Audio Implementation
- **Trigger**: Automatic playback when story text appears (< 2 seconds)
- **Behavior**: Non-blocking, interrupted by user progression
- **File Location**: `./audio/` directory
- **File Naming**: `chapter_[chapterId]_[section].mp3`
- **Fallback**: Silent operation if audio files not found
- **Status**: Report playback status via MQTT

### 7.2 Audio State Management
- Track current audio file and playback state
- Stop previous audio when new content appears
- Handle loading errors gracefully
- Browser autoplay policy compliance

### 7.3 Placeholder Implementation
```javascript
// TODO: Implement when audio files are available
// Expected audio files:
// - ./audio/chapter_start_main.mp3
// - ./audio/chapter_2a_main.mp3
// - ./audio/chapter_2b_main.mp3
// etc.

function playChapterAudio(chapterId, section = 'main') {
  console.log(`AUDIO PLACEHOLDER: chapter_${chapterId}_${section}.mp3 would play here`);
  // Implementation will be added when audio files are created
}
```

## 8. Minigame Integration Requirements

### 8.1 Minigame Container
- **Implementation**: iframe with postMessage communication
- **Sizing**: Responsive, full-width container
- **Loading**: Spinner, error states, 30-second timeout
- **Controls**: Forward MQTT inputs via postMessage

### 8.2 Minigame Communication
```javascript
// Forward MQTT input to minigame iframe
window.minigameFrame.contentWindow.postMessage({
  type: "game_input",
  input: "w" | "a" | "s" | "d" | "space",
  timestamp: "2024-01-01T12:00:00Z"
}, "*");

// Expected response from minigame
{
  type: "game_event", 
  event: "started" | "progress" | "completed" | "failed",
  data: { score: number, progress: number, result: string }
}
```

### 8.3 Placeholder Implementation
```javascript
// TODO: Implement when minigame files are available
// Expected minigame integration points:
// 1. After Chapter 6 completion -> ./minigames/post_chapter_6.html
// 2. During Chapter 8 battle -> ./minigames/chapter_8_battle.html  
// 3. Final challenge -> ./minigames/ending_minigame.html

function loadMinigame(minigameId) {
  console.log(`MINIGAME PLACEHOLDER: Loading ${minigameId}`);
  console.log(`Expected file: ./minigames/${minigameId}.html`);
  console.log(`Controls will be forwarded via postMessage`);
  // Implementation will be added when minigames are created
}
```

## 9. Error Handling Requirements

### 9.1 MQTT Connection Issues
- Automatic reconnection with exponential backoff
- Connection status display in UI
- Offline mode with manual controls (development only)
- Message queuing during disconnection

### 9.2 Audio Issues
- Missing file handling (silent fallback)
- Playback error recovery
- Browser autoplay policy handling
- Graceful degradation

### 9.3 Minigame Issues
- File not found handling
- iframe loading timeout
- PostMessage communication errors
- Fallback to story progression

## 10. Development and Testing Requirements

### 10.1 Configuration
```javascript
// config.js
const CONFIG = {
  DEVELOPMENT_MODE: true,        // Enable testing controls
  MQTT_ENABLED: true,           // Enable MQTT connection
  AUDIO_ENABLED: false,         // Enable when audio files available  
  MINIGAMES_ENABLED: false,     // Enable when minigame files available
  
  MQTT: {
    BROKER: 'broker.emqx.io',
    PORT: 8083,                 // WebSocket port
    USE_SSL: false,             // Set true for wss://
    CLIENT_ID_PREFIX: 'CatStory_Presenter'
  },
  
  TOPICS: {
    SUBSCRIBE: 'catstory/orchestrator/to/presenter',
    PUBLISH: 'catstory/presenter/to/orchestrator'
  }
};
```

### 10.2 Development Mode Features
- Manual progression buttons
- Choice selection via clicks
- MQTT message simulator
- Reset functionality
- Debug console for MQTT messages
- Audio test controls

## 11. File Structure

```
presenter-app/
├── index.html                 // Main application file
├── config.js                 // Configuration settings
├── css/
│   ├── main.css              // 80s terminal styling  
│   └── development.css       // Testing controls styling
├── js/
│   ├── app.js                // Main application controller
│   ├── mqtt-client.js        // MQTT communication handler
│   ├── story-engine.js       // Story logic and navigation
│   ├── ui-manager.js         // DOM manipulation and display
│   ├── audio-manager.js      // Audio playback (with placeholders)
│   ├── minigame-manager.js   // Minigame integration (with placeholders)  
│   └── development-tools.js  // Testing and debug utilities
├── data/
│   └── story-content.js      // Story chapters from markdown file
├── audio/                    // Audio files (to be added later)
│   ├── .gitkeep
│   └── README.md            // Audio file naming conventions
├── minigames/                // Minigame HTML files (to be added later)
│   ├── .gitkeep  
│   └── README.md            // Minigame integration guide
└── README.md                 // Setup and usage instructions
```

## 12. Performance and Quality Requirements

### 12.1 Response Times
- MQTT message processing: < 100ms
- Chapter transitions: < 500ms  
- Audio loading: < 2 seconds
- Minigame loading: < 5 seconds
- UI updates: < 50ms

### 12.2 Browser Compatibility
- Modern browsers with ES6+ support
- WebSocket support for MQTT
- HTML5 Audio API support
- iframe postMessage support

---

*This requirements document serves as the complete specification for the Presenter app implementation.*