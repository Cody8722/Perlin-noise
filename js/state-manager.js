/**
 * ========================================
 * Phase 17: 狀態管理系統
 * ========================================
 * 處理 LocalStorage 持久化、JSON 匯入/匯出、重置功能
 * 解決「刷新即丟失」和「無法儲存配置」的問題
 */

import { terrainConfig, updateConfig, setSeed, PERFORMANCE_LIMITS } from './config.js';
import { generateTerrain } from './terrain.js';
import { renderTerrain } from './renderer.js';

// LocalStorage 鍵名
const STORAGE_KEY = 'rpg_world_config';

/**
 * 獲取預設配置（用於重置）
 * 根據設備類型返回智能預設值
 *
 * @returns {Object} 預設配置物件
 */
export function getDefaultConfig() {
    const width = window.innerWidth || 1024;
    const isMobile = width < 768;
    const defaultRiverDensity = isMobile
        ? PERFORMANCE_LIMITS.RECOMMENDED_MOBILE
        : PERFORMANCE_LIMITS.RECOMMENDED_DESKTOP;

    return {
        seed: Math.floor(Math.random() * 5000),
        scale: 60,
        octaves: 5,
        seaLevel: 0.35,
        moistureOffset: 0,
        temperatureOffset: 0,
        riverDensity: defaultRiverDensity,
        riverThreshold: 5,
        irrigationStrength: 1.0,
        useAdvancedIrrigation: true,
        showClouds: true
    };
}

/**
 * 保存當前配置到 LocalStorage
 * 自動序列化為 JSON
 *
 * @returns {boolean} 保存是否成功
 */
export function saveState() {
    try {
        const configSnapshot = {
            seed: terrainConfig.seed,
            scale: terrainConfig.scale,
            octaves: terrainConfig.octaves,
            seaLevel: terrainConfig.seaLevel,
            moistureOffset: terrainConfig.moistureOffset,
            temperatureOffset: terrainConfig.temperatureOffset,
            riverDensity: terrainConfig.riverDensity,
            riverThreshold: terrainConfig.riverThreshold,
            irrigationStrength: terrainConfig.irrigationStrength,
            useAdvancedIrrigation: terrainConfig.useAdvancedIrrigation,
            showClouds: terrainConfig.showClouds,
            savedAt: new Date().toISOString()  // 時間戳記
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(configSnapshot));
        console.log('💾 配置已自動保存到 LocalStorage');
        return true;
    } catch (error) {
        console.error('❌ LocalStorage 保存失敗:', error);
        return false;
    }
}

/**
 * 從 LocalStorage 載入配置
 * 如果不存在或解析失敗，返回 null
 *
 * @returns {Object|null} 載入的配置物件，失敗則返回 null
 */
export function loadState() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            console.log('ℹ️ 未找到已保存的配置，使用預設值');
            return null;
        }

        const config = JSON.parse(savedData);
        console.log(`📂 已載入保存的配置 (保存時間: ${config.savedAt || '未知'})`);
        return config;
    } catch (error) {
        console.error('❌ LocalStorage 載入失敗:', error);
        return null;
    }
}

/**
 * 應用配置到 terrainConfig 和 UI
 *
 * @param {Object} config - 要應用的配置物件
 * @param {boolean} regenerate - 是否重新生成地形（預設 true）
 */
export function applyConfig(config, regenerate = true) {
    if (!config) return;

    try {
        // 更新 terrainConfig
        Object.keys(config).forEach(key => {
            if (key in terrainConfig && key !== 'savedAt') {
                updateConfig(key, config[key]);
            }
        });

        // 更新 UI 滑桿和顯示值
        updateUIFromConfig();

        // 重新生成地形（可選）
        if (regenerate) {
            generateTerrain();
            renderTerrain();
        }

        console.log('✅ 配置已成功應用');
    } catch (error) {
        console.error('❌ 配置應用失敗:', error);
    }
}

/**
 * 更新 UI 元素以反映當前配置
 * 同步所有滑桿和顯示值
 */
function updateUIFromConfig() {
    // 種子顯示
    const seedDisplay = document.getElementById('current_seed');
    if (seedDisplay) {
        seedDisplay.textContent = terrainConfig.seed;
    }

    // 核心參數
    syncSlider('inp_scale', 'val_scale', terrainConfig.scale);
    syncSlider('inp_octaves', 'val_octaves', terrainConfig.octaves);

    // 環境設定
    syncSlider('inp_sea', 'val_sea', terrainConfig.seaLevel);
    syncSlider('inp_moist', 'val_moist', terrainConfig.moistureOffset);
    syncSlider('inp_temp', 'val_temp', terrainConfig.temperatureOffset);

    // 河流系統
    syncSlider('inp_river_density', 'val_river_density', terrainConfig.riverDensity);
    syncSlider('inp_river_threshold', 'val_river_threshold', terrainConfig.riverThreshold);
    syncSlider('inp_irrigation', 'val_irrigation', terrainConfig.irrigationStrength, 1);

    // Checkbox
    const advIrrigationCheckbox = document.getElementById('chk_advanced_irrigation');
    if (advIrrigationCheckbox) {
        advIrrigationCheckbox.checked = terrainConfig.useAdvancedIrrigation;
    }

    const cloudCheckbox = document.getElementById('chk_clouds');
    if (cloudCheckbox) {
        cloudCheckbox.checked = terrainConfig.showClouds;
    }
}

/**
 * 同步單個滑桿和顯示值
 *
 * @param {string} sliderId - 滑桿元素 ID
 * @param {string} valueId - 顯示值元素 ID
 * @param {number} value - 要設定的值
 * @param {number} decimals - 小數位數（預設 0）
 */
function syncSlider(sliderId, valueId, value, decimals = 0) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(valueId);

    if (slider) {
        slider.value = value;
    }

    if (display) {
        display.textContent = decimals > 0 ? value.toFixed(decimals) : value;
    }
}

/**
 * 匯出配置為 JSON 檔案
 * 下載檔名包含時間戳記
 */
export function exportConfigToJSON() {
    try {
        const configSnapshot = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            config: {
                seed: terrainConfig.seed,
                scale: terrainConfig.scale,
                octaves: terrainConfig.octaves,
                seaLevel: terrainConfig.seaLevel,
                moistureOffset: terrainConfig.moistureOffset,
                temperatureOffset: terrainConfig.temperatureOffset,
                riverDensity: terrainConfig.riverDensity,
                riverThreshold: terrainConfig.riverThreshold,
                irrigationStrength: terrainConfig.irrigationStrength,
                useAdvancedIrrigation: terrainConfig.useAdvancedIrrigation,
                showClouds: terrainConfig.showClouds
            }
        };

        const json = JSON.stringify(configSnapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 生成檔名
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `rpg-config-seed-${terrainConfig.seed}-${timestamp}.json`;

        // 觸發下載
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        // 清理 URL
        setTimeout(() => URL.revokeObjectURL(url), 100);

        console.log(`💾 配置已匯出: ${filename}`);
        return true;
    } catch (error) {
        console.error('❌ 配置匯出失敗:', error);
        return false;
    }
}

/**
 * 從 JSON 檔案匯入配置
 *
 * @param {File} file - JSON 檔案物件
 * @returns {Promise<boolean>} 匯入是否成功
 */
export async function importConfigFromJSON(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // 驗證檔案格式
        if (!data.config) {
            throw new Error('無效的配置檔案格式（缺少 config 欄位）');
        }

        // 應用配置
        applyConfig(data.config, true);

        // 自動保存到 LocalStorage
        saveState();

        console.log('📂 配置已成功匯入並應用');
        return true;
    } catch (error) {
        console.error('❌ 配置匯入失敗:', error);
        alert(`配置匯入失敗: ${error.message}`);
        return false;
    }
}

/**
 * 重置到預設配置
 * 清除 LocalStorage 並恢復預設值
 *
 * @returns {boolean} 重置是否成功
 */
export function resetToDefaults() {
    try {
        // 清除 LocalStorage
        localStorage.removeItem(STORAGE_KEY);

        // 獲取預設配置
        const defaults = getDefaultConfig();

        // 應用預設值
        applyConfig(defaults, true);

        // 保存新的預設值到 LocalStorage（可選）
        saveState();

        console.log('↺ 已重置到預設配置');
        return true;
    } catch (error) {
        console.error('❌ 重置失敗:', error);
        return false;
    }
}

/**
 * 初始化狀態管理器
 * 在頁面載入時自動恢復保存的配置
 */
export function initStateManager() {
    const savedConfig = loadState();

    if (savedConfig) {
        applyConfig(savedConfig, false);  // 載入但不立即生成（由 main.js 控制）
    }

    console.log('🔧 狀態管理器已初始化');
}
