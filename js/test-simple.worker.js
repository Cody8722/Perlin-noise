// 最簡單的 Worker - 不使用任何 import
console.log('Simple Worker loaded!');
self.postMessage({ type: 'ready', message: 'Simple worker is alive!' });
