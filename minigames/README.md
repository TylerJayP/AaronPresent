# Minigames Directory

This directory will contain the HTML iframe minigames for the Whiskers adventure.

## File Structure

Each minigame should be a self-contained HTML file:
```
[minigameId].html
```

### Required Minigame Files:
- `post_chapter_6.html` - Power development minigame at end of Chapter 6
- `chapter_8_battle.html` - Battle minigame during Chapter 8 combat
- `ending_minigame.html` - Final challenge at end of Chapter 12 (before new adventure)

## Minigame Integration

### Communication Protocol

Minigames communicate with the Presenter app via `postMessage`. Each minigame should:

#### 1. Listen for initialization:
```javascript
window.addEventListener('message', (event) => {
    if (event.data.type === 'initialize') {
        // Initialize your game with event.data.gameData
        startGame(event.data.gameData);
    }
});
```

#### 2. Handle input commands:
```javascript
window.addEventListener('message', (event) => {
    if (event.data.type === 'game_input') {
        // Handle WASD + spacebar input
        handleInput(event.data.input); // 'w', 'a', 's', 'd', or 'space'
    }
});
```

#### 3. Send status updates:
```javascript
// Game started
parent.postMessage({
    type: 'game_event',
    event: 'started',
    data: { message: 'Game initialized' }
}, '*');

// Progress updates
parent.postMessage({
    type: 'game_progress',
    data: { score: 150, progress: 0.3 }
}, '*');

// Game completed successfully
parent.postMessage({
    type: 'game_completed',
    data: { 
        success: true, 
        score: 500, 
        completionTime: 15000 
    }
}, '*');

// Game failed
parent.postMessage({
    type: 'game_failed',
    data: { 
        success: false, 
        reason: 'ran_out_of_time' 
    }
}, '*');
```

## Minigame Specifications

### Technical Requirements:
- **Format**: HTML5 with CSS and JavaScript
- **Styling**: Should match 80s retro terminal theme
- **Controls**: WASD keys + Spacebar only
- **Responsive**: Should work in 400px height iframe
- **Loading**: Include loading states and error handling

### Visual Style:
- **Colors**: Black background (#000), green text (#00ff00), yellow accents (#ffff00)
- **Font**: Courier New monospace
- **Theme**: 80s computer terminal aesthetic
- **Effects**: Glowing text, simple geometric shapes

### Game Design:
- **Duration**: 10-30 seconds typical gameplay
- **Difficulty**: Accessible but engaging
- **Story Integration**: Should feel connected to the narrative
- **Win/Lose**: Clear success and failure conditions

## Example Minigame Template

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Post Chapter 6 Challenge</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .game-area {
            width: 100%;
            height: 100%;
            position: relative;
            border: 2px solid #00ff00;
        }
    </style>
</head>
<body>
    <div class="game-area" id="gameArea">
        <div id="instructions">Use WASD to move, SPACE to activate powers</div>
        <div id="gameContent">
            <!-- Game content here -->
        </div>
    </div>

    <script>
        class PostChapter6Game {
            constructor() {
                this.gameState = 'waiting';
                this.score = 0;
                this.setupEventListeners();
            }

            setupEventListeners() {
                window.addEventListener('message', (event) => {
                    switch (event.data.type) {
                        case 'initialize':
                            this.initializeGame(event.data.gameData);
                            break;
                        case 'game_input':
                            this.handleInput(event.data.input);
                            break;
                    }
                });
            }

            initializeGame(gameData) {
                this.gameState = 'playing';
                parent.postMessage({
                    type: 'game_event',
                    event: 'started',
                    data: { message: 'Post Chapter 6 challenge started' }
                }, '*');
                // Start your game logic here
            }

            handleInput(input) {
                if (this.gameState !== 'playing') return;
                
                switch (input) {
                    case 'w': this.moveUp(); break;
                    case 'a': this.moveLeft(); break;
                    case 's': this.moveDown(); break;
                    case 'd': this.moveRight(); break;
                    case 'space': this.activatePower(); break;
                }
            }

            completeGame(success = true) {
                this.gameState = 'completed';
                parent.postMessage({
                    type: success ? 'game_completed' : 'game_failed',
                    data: { 
                        success: success,
                        score: this.score,
                        completionTime: Date.now() - this.startTime
                    }
                }, '*');
            }
        }

        // Initialize game when loaded
        window.addEventListener('load', () => {
            new PostChapter6Game();
        });
    </script>
</body>
</html>
```

## Integration Points

### Story Integration:
1. **Post Chapter 6**: `post_chapter_6.html` - Power development challenge after story progression
2. **Chapter 8 Battle**: `chapter_8_battle.html` - Epic confrontation requiring all skills  
3. **Final Challenge**: `ending_minigame.html` - Ultimate test before new adventures begin

### Placeholder System:
- Minigames are currently disabled (`MINIGAMES_ENABLED: false` in config.js)
- When disabled, the system shows placeholder content with simulated gameplay
- Enable real minigames by setting `MINIGAMES_ENABLED: true` and adding HTML files

## Development Notes

- Use the development tools to test minigame loading
- Monitor minigame events in the debug panel event log
- All minigames should handle being unloaded gracefully
- Include error handling for edge cases
- Test input forwarding with MQTT simulator

## Testing

Use the development tools to:
- Test minigame loading: Click "Test Minigame" in dev panel
- Simulate inputs: Use MQTT simulator with minigame_input messages
- Monitor events: Check event log for minigame status updates
- Debug integration: Use console logging and postMessage monitoring 