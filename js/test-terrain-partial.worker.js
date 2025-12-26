// Test terrain.worker.js with only handleInit function
import noise from './noise.js';

// Worker local state
let workerConfig = null;
let mapData = null;

// Simplified message handler
self.onmessage = function(e) {
    const { cmd } = e.data;

    try {
        if (cmd === 'test') {
            self.postMessage({
                type: 'test-success',
                message: 'Partial terrain worker loaded!',
                hasInit: typeof handleInit === 'function'
            });
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message,
            stack: error.stack
        });
    }
};

/**
 * handleInit function (from terrain.worker.js)
 */
function handleInit(config, data) {
    workerConfig = config;
    mapData = {
        height: new Float32Array(data.height),
        moisture: new Float32Array(data.moisture),
        temperature: new Float32Array(data.temperature),
        flux: new Float32Array(data.flux),
        lakes: new Uint8Array(data.lakes),
        width: config.world.map.width,
        height: config.world.map.height,
    };

    // Send confirmation
    self.postMessage({
        type: 'initialized',
        message: 'Worker initialized successfully',
    });

    console.log('✅ Worker initialized');
}

// Send ready signal
self.postMessage({
    type: 'ready',
    message: 'Partial terrain worker ready'
});
