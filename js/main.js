/**
 * 主程式入口
 * RPG 世界生成器初始化流程
 */

import { initRenderer, renderAll } from './renderer.js';
import { generateTerrain } from './terrain.js';
import { initUI } from './ui.js';

/**
 * 應用程式初始化
 */
function init() {
    console.log('🎮 RPG 世界生成器啟動中...');

    // 1. 初始化渲染器
    initRenderer();

    // 2. 生成初始地形
    generateTerrain();

    // 3. 渲染場景
    renderAll();

    // 4. 初始化 UI 控制
    initUI();

    console.log('✅ 初始化完成！');
}

// 等待 DOM 載入完成後執行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
