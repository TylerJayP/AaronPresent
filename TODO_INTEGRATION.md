# TODO: Audio and Minigame Integration

**Project:** Whiskers and the Bubbles of Justice - Presenter App  
**Status:** Ready for team integration

---

## 🔊 **Audio Integration**

### **Current State:**
- Audio system is fully implemented with placeholder mode
- `CONFIG.AUDIO_ENABLED` is set to `false` in `config.js`
- Audio Manager automatically handles missing files gracefully

### **What the Audio Team Needs to Do:**

#### **1. Create Story Narration Files**
**Location:** Place all audio files in the `/audio/` directory
**Purpose:** These are story narration clips that read the chapter text aloud

**File Naming Convention:**
```
chapter_[chapterId]_main.mp3
```

#### **2. Required Narration Files:**
Create narration audio for these main story chapters:
- `chapter_start_main.mp3`
- `chapter_investigate_main.mp3`
- `chapter_hide_main.mp3`
- `chapter_panic_main.mp3`
- `chapter_meetMentor_main.mp3`
- `chapter_acceptPower_main.mp3`
- `chapter_exploreWithDusty_main.mp3` (Community Builder ending)
- `chapter_newAdventure_main.mp3` (Solitary Protector ending)
- `chapter_teamInvestigation_main.mp3` (Wise Guardian ending)
- *(Plus any other key chapter IDs you want narrated)*

**Note:** You do NOT need to create sound effects, background music, or any audio other than story narration.

#### **3. Audio Specifications:**
- **Format:** MP3
- **Quality:** 128-192 kbps
- **Duration:** 15-60 seconds per file (full narration of chapter text)
- **Volume:** Normalized to consistent levels
- **Style:** Clear storytelling voice with 80s retro computer game feel

#### **4. Technical Notes:**
- **Duration:** The app can handle audio files of any length - no technical limitations
- **Missing Files:** App will NOT crash if some audio files are missing - it handles this gracefully
- **Only Narration:** The app only expects chapter narration files, no other audio types

#### **5. Activation:**
Once audio files are ready, change in `config.js`:
```javascript
AUDIO_ENABLED: true,  // Change from false to true
```

---

## 🎮 **Minigame Integration**

### **Current State:**
- Minigame system is fully implemented with placeholder mode
- `CONFIG.MINIGAMES_ENABLED` is set to `false` in `config.js`
- Minigame Manager handles iframe communication and missing files

### **What the Minigame Team Needs to Do:**

#### **1. Create Minigame HTML Files**
**Location:** Place all minigame files in the `/minigames/` directory

**Required Minigame Files:**
- `post_chapter_6.html` - Power development minigame at end of Chapter 6
- `chapter_8_battle.html` - Battle minigame during Chapter 8 combat
- `ending_minigame.html` - Final challenge at end of Chapter 12 (before new adventure)

#### **2. Minigame HTML Template:**
Each minigame must be a self-contained HTML file following this structure:

*See `/minigames/README.md` for complete template with example code*

#### **3. Communication Protocol**
Minigames communicate with the Presenter app via `postMessage`. Each minigame should:

**Listen for initialization:**
```javascript
window.addEventListener('message', (event) => {
    if (event.data.type === 'initialize') {
        startGame(event.data.gameData);
    }
    if (event.data.type === 'game_input') {
        handleInput(event.data.input); // 'w', 'a', 's', 'd', or 'space'
    }
});
```

**Send status updates:**
```javascript
// Game started
parent.postMessage({
    type: 'game_event',
    event: 'started',
    data: { message: 'Game initialized' }
}, '*');

// Game completed successfully
parent.postMessage({
    type: 'game_completed',
    data: { success: true, score: 500, completionTime: 15000 }
}, '*');
```

#### **4. Design Requirements:**
- **Controls:** WASD keys + Spacebar ONLY
- **Visual Style:** 80s terminal theme (black background, green text, yellow accents)
- **Font:** Courier New monospace
- **Size:** Must work in 400px height iframe
- **Duration:** 10-30 seconds typical gameplay

#### **5. Activation:**
Once minigame files are ready, change in `config.js`:
```javascript
MINIGAMES_ENABLED: true,  // Change from false to true
```

---

## ⚠️ **Story Integration Required**

**Important:** Currently, no chapters in the story data are marked as minigame chapters. To enable the 3 minigames, you will need to modify the story data to mark specific chapters as `type: 'minigame'` and add `minigameId` properties:

1. **End of Chapter 6:** Choose one of the chapter 6 paths (`alliancePath`, `powerPath`, or `aggressivePath`) and mark it as minigame type with `minigameId: 'post_chapter_6'`

2. **Chapter 8 Battle:** Choose one of the battle chapters (`chapter8a`, `chapter8b`, or `chapter8c`) and mark it as minigame type with `minigameId: 'chapter_8_battle'`

3. **End of Chapter 12:** Choose one of the ending chapters (`chapter12a`, `chapter12b1`, `chapter12b2`, or `chapter12c`) and mark it as minigame type with `minigameId: 'ending_minigame'`

**Example of how to mark a chapter as a minigame:**
```javascript
chapterName: {
    id: 'chapterName',
    title: 'Chapter Title',
    text: 'Chapter content...',
    type: 'minigame',  // Change from 'story' to 'minigame'
    minigameId: 'post_chapter_6',  // Add this property
    choices: [
        { text: "Continue after minigame", nextChapter: 'nextChapter' }
    ]
}
```

**Current Status:** App is safe and won't crash - minigames simply won't trigger until chapters are marked as minigame type.

---

## 🔧 **Technical Integration Steps (Project Lead)**

### **For Production Deployment:**
1. **When Audio Files Are Ready:**
   ```javascript
   // config.js
   AUDIO_ENABLED: true,  // Change from false to true
   ```

2. **When Minigame Files Are Ready:**
   ```javascript
   // config.js  
   MINIGAMES_ENABLED: true,  // Change from false to true
   ```

3. **Final Production Settings:**
   ```javascript
   // config.js - Final production settings
   const CONFIG = {
       DEVELOPMENT_MODE: false,  // Disable for production
       AUDIO_ENABLED: true,
       MINIGAMES_ENABLED: true,
       // ... rest of config
   }
   ```

### **Testing:**
- **Audio**: Use development tools (`Ctrl+4`) → "Test Audio" button
- **Minigames**: Use development tools (`Ctrl+4`) → "Test Minigame" button
- Both systems include comprehensive error handling for missing files

---

## 📋 **Summary for Teams**

**Audio Team:** Create story narration MP3 files (15-60 seconds each) with specific naming convention and place in `/audio/` folder. No code changes needed.

**Minigame Team:** Create self-contained HTML files that follow the communication protocol and place in `/minigames/` folder. Must handle postMessage communication.

**Project Lead:** Simply flip the boolean flags in `config.js` when each team delivers their files.

The app is already fully prepared for both integrations and will work seamlessly once the files are provided and the config flags are enabled! 🎯 