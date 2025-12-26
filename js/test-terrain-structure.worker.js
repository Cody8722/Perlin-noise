// Test terrain.worker.js exact structure (simplified)
import noise from './noise.js';

// Worker local state (same as terrain.worker.js)
let workerConfig = null;
let mapData = null;

// Main message handler (same structure as terrain.worker.js)
self.onmessage = function(e) {
    const { cmd } = e.data;

    try {
        switch (cmd) {
            case 'test':
                self.postMessage({
                    type: 'test-success',
                    message: 'Structure test passed!',
                    hasNoise: !!noise
                });
                break;

            default:
                throw new Error(`Unknown command: ${cmd}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message,
            stack: error.stack
        });
    }
};

// Send ready signal (not in original, but helps testing)
self.postMessage({
    type: 'ready',
    message: 'Structure worker loaded and waiting for commands'
});
