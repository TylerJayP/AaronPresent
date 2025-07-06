# Audio Files Directory

This directory will contain the audio narration files for the Whiskers adventure.

## File Naming Convention

Audio files should follow this naming pattern:
```
chapter_[chapterId]_[section].mp3
```

### Examples:
- `chapter_start_main.mp3` - Main narration for the starting chapter
- `chapter_2a_main.mp3` - Main narration for chapter 2a (brave investigation path)
- `chapter_2b_main.mp3` - Main narration for chapter 2b (cautious observation path)
- `chapter_acceptPower_main.mp3` - Main narration for accepting power from Bubblina
- `chapter_exploreWithDusty_main.mp3` - Main narration for the community builder ending

## Required Audio Files

Based on the story structure, the following audio files will be needed:

### Main Story Chapters:
- `chapter_start_main.mp3`
- `chapter_2a_main.mp3` (brave path)
- `chapter_2b_main.mp3` (cautious path)  
- `chapter_2c_main.mp3` (panic path)
- `chapter_3a_main.mp3` (confrontation)
- `chapter_3b_main.mp3` (stealth)
- `chapter_3c_main.mp3` (chaos)
- `chapter_acceptPower_main.mp3`
- `chapter_defensiveStrategy_main.mp3`
- `chapter_communicate_main.mp3`
- `chapter_offerFriendship_main.mp3`

### Ending Chapters:
- `chapter_exploreWithDusty_main.mp3` (Community Builder ending)
- `chapter_newAdventure_main.mp3` (Solitary Protector ending)
- `chapter_teamInvestigation_main.mp3` (Wise Guardian ending)

## Audio Specifications

- **Format**: MP3
- **Quality**: 128-192 kbps recommended
- **Duration**: 3-8 seconds per file (brief narration snippets)
- **Volume**: Normalized to consistent levels
- **Style**: Should match the 80s retro theme

## Integration

The AudioManager will automatically:
1. Load audio files based on chapter progression
2. Cache frequently used files
3. Fall back to placeholder mode if files are missing
4. Handle browser autoplay policies gracefully

## Development Notes

- Audio is currently disabled in config.js (`AUDIO_ENABLED: false`)
- When audio files are available, set `AUDIO_ENABLED: true` in config.js
- The system includes comprehensive error handling for missing files
- All audio playback is non-blocking and can be interrupted by story progression

## Testing

Use the development tools to:
- Test audio playback: Click "Test Audio" in the dev panel
- Monitor audio status: Check the event log for audio events
- Simulate different scenarios: Use MQTT simulator to trigger audio 