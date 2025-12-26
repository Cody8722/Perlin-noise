// Test importing noise.js specifically
import noise from './noise.js';

console.log('Noise Worker loaded!');
console.log('Noise object:', noise);

self.postMessage({
    type: 'ready',
    message: 'Noise import successful!',
    hasNoise: !!noise,
    noiseType: typeof noise
});
