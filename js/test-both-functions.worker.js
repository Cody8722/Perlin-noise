// Test: handleInit + simplified handleGenerateRivers
import noise from './noise.js';

let workerConfig = null;
let mapData = null;

self.onmessage = function(e) {
    const { cmd } = e.data;
    try {
        switch (cmd) {
            case 'init':
                handleInit(e.data.config, e.data.data);
                break;
            case 'test':
                self.postMessage({ type: 'test-ok', message: 'Both functions defined!' });
                break;
            default:
                throw new Error(`Unknown command: ${cmd}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

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

    if (typeof noise !== 'undefined' && typeof noise.seed === 'function') {
        noise.seed(config.runtime.seed);
    }

    self.postMessage({
        type: 'initialized',
        message: 'Worker initialized successfully',
    });

    console.log('✅ Worker initialized');
}

// Simplified handleGenerateRivers - just the first few lines
function handleGenerateRivers(numDroplets) {
    if (!workerConfig || !mapData) {
        throw new Error('Worker not initialized. Call "init" first.');
    }

    const config = workerConfig;
    const { width, height } = mapData;

    console.log('handleGenerateRivers called');
}

// Send ready signal
self.postMessage({ type: 'ready', message: 'Init + simplified GenerateRivers loaded!' });
