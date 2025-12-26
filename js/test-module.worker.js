// Worker with module import
import { MAP_CONFIG } from './config.js';

console.log('Module Worker loaded!');
self.postMessage({ type: 'ready', message: 'Module worker is alive!', hasConfig: !!MAP_CONFIG });
