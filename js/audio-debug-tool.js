// Audio Debug Tool - Add this to your js/ directory or console for testing
// File: js/audio-debug-tool.js

/**
 * Audio Debug Helper for AaronPresent Repository
 * This tool helps debug and test the audio overlap fix
 */

// Test function to help debug audio overlap issues
function debugAudioState() {
    if (!window.app?.modules?.audio) {
        console.log('❌ Audio manager not available');
        return;
    }
    
    const audioManager = window.app.modules.audio;
    
    console.log('🔊 AUDIO DEBUG STATE:');
    console.log('- Current Audio:', audioManager.currentAudio);
    console.log('- Is Playing:', audioManager.isPlaying);
    console.log('- Current File:', audioManager.currentFile);
    console.log('- Is Stopping All:', audioManager.isStoppingAll);
    console.log('- Cache Size:', audioManager.audioCache.size);
    console.log('- Audio Fully Stopped:', audioManager.isAudioFullyStopped());
    
    // Check each cached audio element
    if (audioManager.audioCache.size > 0) {
        console.log('🔊 CACHED AUDIO STATUS:');
        for (const [path, audio] of audioManager.audioCache) {
            console.log(`  - ${path}: paused=${audio.paused}, currentTime=${audio.currentTime}, src=${!!audio.src}`);
        }
    }
    
    return {
        isPlaying: audioManager.isPlaying,
        currentFile: audioManager.currentFile,
        isStoppingAll: audioManager.isStoppingAll,
        cacheSize: audioManager.audioCache.size,
        audioFullyStopped: audioManager.isAudioFullyStopped()
    };
}

// Test function to manually trigger the audio overlap issue scenario
async function testAudioOverlap() {
    if (!window.app?.modules?.audio) {
        console.log('❌ Audio manager not available');
        return;
    }
    
    console.log('🧪 Testing audio overlap scenario...');
    
    const audioManager = window.app.modules.audio;
    
    // Simulate quick chapter changes that could cause overlap
    console.log('1. Playing first audio...');
    await audioManager.playChapterAudio('start');
    
    // Check initial state
    console.log('State after first audio:');
    debugAudioState();
    
    // Wait a short time then switch (this should trigger the fix)
    setTimeout(async () => {
        console.log('2. Switching to second audio (this should stop the first)...');
        await audioManager.playChapterAudio('investigate');
        
        // Check if we have overlap
        setTimeout(() => {
            console.log('3. Final state check:');
            const finalState = debugAudioState();
            
            if (finalState.cacheSize > 1) {
                console.log('✅ Multiple audio files cached (expected)');
            }
            
            if (finalState.isPlaying && finalState.currentFile) {
                console.log(`✅ Only one audio playing: ${finalState.currentFile}`);
            } else {
                console.log('❓ No audio currently playing');
            }
            
            console.log('🧪 Test complete - check debug state above');
        }, 500);
    }, 1000);
}

// Add monitoring to track all audio operations
function startAudioMonitoring() {
    if (!window.app?.modules?.audio) {
        console.log('❌ Audio manager not available');
        return;
    }
    
    const audioManager = window.app.modules.audio;
    
    // Store original methods
    const originalPlay = audioManager.playChapterAudio;
    const originalStop = audioManager.stopAllAudio;
    const originalStopCurrent = audioManager.stopCurrentAudio;
    
    // Override playChapterAudio
    audioManager.playChapterAudio = async function(...args) {
        console.log('🎵 PLAY AUDIO CALLED:', args);
        const stateBefore = debugAudioState();
        const result = await originalPlay.apply(this, args);
        setTimeout(() => {
            console.log('🎵 PLAY AUDIO COMPLETED');
            debugAudioState();
        }, 100);
        return result;
    };
    
    // Override stopAllAudio
    audioManager.stopAllAudio = async function(...args) {
        console.log('🛑 STOP ALL AUDIO CALLED');
        debugAudioState();
        const result = await originalStop.apply(this, args);
        console.log('🛑 STOP ALL AUDIO COMPLETED');
        debugAudioState();
        return result;
    };
    
    // Override stopCurrentAudio
    audioManager.stopCurrentAudio = function(...args) {
        console.log('⏹️ STOP CURRENT AUDIO CALLED');
        debugAudioState();
        const result = originalStopCurrent.apply(this, args);
        console.log('⏹️ STOP CURRENT AUDIO COMPLETED');
        debugAudioState();
        return result;
    };
    
    console.log('🔊 Audio monitoring started - all audio operations will be logged');
    
    // Return function to stop monitoring
    return function stopMonitoring() {
        audioManager.playChapterAudio = originalPlay;
        audioManager.stopAllAudio = originalStop;
        audioManager.stopCurrentAudio = originalStopCurrent;
        console.log('🔊 Audio monitoring stopped');
    };
}

// Test rapid chapter switching (main cause of audio overlap)
async function testRapidChapterSwitching() {
    if (!window.app?.modules?.story) {
        console.log('❌ Story engine not available');
        return;
    }
    
    console.log('🧪 Testing rapid chapter switching...');
    
    const chapters = ['start', 'investigate', 'hide', 'panic', 'meetMentor'];
    let switchCount = 0;
    
    for (const chapterId of chapters) {
        if (switchCount > 0) {
            console.log(`⚡ Rapid switch ${switchCount}: Loading ${chapterId}`);
        } else {
            console.log(`📖 Initial load: ${chapterId}`);
        }
        
        try {
            await window.app.modules.story.loadChapter(chapterId);
            
            // Very short delay to simulate rapid user input
            if (switchCount < chapters.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) {
            console.error(`❌ Failed to load ${chapterId}:`, error);
        }
        
        switchCount++;
    }
    
    setTimeout(() => {
        console.log('🧪 Rapid switching test complete');
        debugAudioState();
    }, 1000);
}

// Performance test to measure audio stop times
async function testAudioStopPerformance() {
    if (!window.app?.modules?.audio) {
        console.log('❌ Audio manager not available');
        return;
    }
    
    console.log('⏱️ Testing audio stop performance...');
    
    const audioManager = window.app.modules.audio;
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
        // Start audio
        await audioManager.playChapterAudio(`test_${i}`);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Time the stop operation
        const startTime = performance.now();
        await audioManager.stopAllAudio();
        const endTime = performance.now();
        
        const stopTime = endTime - startTime;
        times.push(stopTime);
        
        console.log(`⏱️ Stop operation ${i + 1}: ${stopTime.toFixed(2)}ms`);
        
        // Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`⏱️ Average stop time: ${averageTime.toFixed(2)}ms`);
    console.log(`⏱️ Min: ${Math.min(...times).toFixed(2)}ms, Max: ${Math.max(...times).toFixed(2)}ms`);
}

// Main initialization
function initAudioDebugTool() {
    console.log('🔧 Audio Debug Tool Loaded');
    console.log('Available commands:');
    console.log('- debugAudioState() - Check current audio state');
    console.log('- testAudioOverlap() - Test the overlap fix');
    console.log('- startAudioMonitoring() - Monitor all audio operations');
    console.log('- testRapidChapterSwitching() - Test rapid chapter changes');
    console.log('- testAudioStopPerformance() - Measure stop operation performance');

    // Auto-start monitoring if in development mode
    if (typeof CONFIG !== 'undefined' && CONFIG.DEVELOPMENT_MODE) {
        console.log('🔧 Auto-starting audio monitoring (development mode)');
        setTimeout(() => {
            if (window.app?.modules?.audio) {
                startAudioMonitoring();
            }
        }, 2000);
    }
}

// Expose functions globally for console access
window.debugAudioState = debugAudioState;
window.testAudioOverlap = testAudioOverlap;
window.startAudioMonitoring = startAudioMonitoring;
window.testRapidChapterSwitching = testRapidChapterSwitching;
window.testAudioStopPerformance = testAudioStopPerformance;

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioDebugTool);
} else {
    initAudioDebugTool();
}