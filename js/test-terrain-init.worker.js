// Test terrain.worker.js initialization by sending init command
import noise from './noise.js';

console.log('Terrain Init Test Worker loaded!');

// Immediately send a success message
self.postMessage({
    type: 'test-ready',
    message: 'Terrain worker imports successful!',
    hasNoise: !!noise
});

// Also test if we can receive messages
self.onmessage = function(e) {
    console.log('Received message:', e.data);
    self.postMessage({
        type: 'echo',
        received: e.data
    });
};
