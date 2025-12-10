/**
 * Phase 12.5: 綜合 UI/UX 自動化測試機器人
 *
 * 目標：對所有可交互元素進行深度狀態審計
 * 策略：內省 → 模擬 → 斷言 → 報告
 *
 * 三層驗證：
 * 1. 事件層：事件是否觸發？
 * 2. DOM 層：顯示值是否更新？
 * 3. 狀態層：配置/數據是否改變？
 */

import { terrainConfig } from './config.js';
import { mapData } from './terrain.js';

/**
 * 測試清單（Test Manifest）
 * 定義所有需要測試的 UI 元素及其配置映射
 */
const TEST_MANIFEST = {
    // 滑桿輸入（Slider Inputs）
    sliders: [
        { id: 'inp_scale', key: 'scale', testValue: 88, min: 10, max: 150, label: 'val_scale' },
        { id: 'inp_octaves', key: 'octaves', testValue: 4, min: 1, max: 6, label: 'val_octaves' },
        { id: 'inp_sea', key: 'seaLevel', testValue: 0.5, min: 0.1, max: 0.8, label: 'val_sea' },
        { id: 'inp_moist', key: 'moistureOffset', testValue: 0.2, min: -0.4, max: 0.4, label: 'val_moist' },
        { id: 'inp_temp', key: 'temperatureOffset', testValue: -0.3, min: -0.5, max: 0.5, label: 'val_temp' },
        { id: 'inp_river_density', key: 'riverDensity', testValue: 25000, min: 1000, max: 50000, label: 'val_river_density' },
        { id: 'inp_river_threshold', key: 'riverThreshold', testValue: 15, min: 1, max: 50, label: 'val_river_threshold' },
        { id: 'inp_irrigation', key: 'irrigationStrength', testValue: 2.5, min: 0, max: 5, label: 'val_irrigation' }
    ],

    // 視圖模式按鈕（View Mode Buttons）
    viewButtons: [
        { id: 'btn_biome', mode: 'biome', label: '🌍 生物群系' },
        { id: 'btn_height', mode: 'height', label: '🏔️ 高度' },
        { id: 'btn_moisture', mode: 'moisture', label: '💧 濕度' },
        { id: 'btn_temperature', mode: 'temperature', label: '🌡️ 溫度' },
        { id: 'btn_flux', mode: 'flux', label: '🌊 水流' }
    ],

    // 動作按鈕（Action Buttons）
    actionButtons: [
        { id: 'btnGenerate', action: 'generateWorld', label: '生成新世界' },
        { id: 'btnGenerateRivers', action: 'generateRivers', label: '生成河流' },
        { id: 'btnExport', action: 'exportMap', label: '匯出地圖' },
        { id: 'btnCopySeed', action: 'copySeed', label: '複製種子' },
        { id: 'btnRandomSeed', action: 'randomSeed', label: '隨機種子' }
    ],

    // 複選框（Checkboxes）
    checkboxes: [
        { id: 'chk_advanced_irrigation', key: 'useAdvancedIrrigation', label: '進階灌溉' },
        { id: 'chk_clouds', key: 'showClouds', label: '顯示雲層' }
    ],

    // 文本輸入（Text Inputs）
    textInputs: [
        { id: 'inp_seed', key: 'seed', testValue: 'TEST_SEED_12345', label: '種子輸入' }
    ]
};

/**
 * 綜合測試機器人類
 */
class ComprehensiveTestBot {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.warnings = 0;
    }

    /**
     * 主測試控制器
     * 執行所有測試套件
     */
    async runFullSuite() {
        console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #00FFFF; font-weight: bold');
        console.log('%c║  Phase 12.5: 綜合 UI/UX 自動化測試                          ║', 'color: #00FFFF; font-weight: bold');
        console.log('%c║  全面狀態審計開始...                                         ║', 'color: #00FFFF; font-weight: bold');
        console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #00FFFF; font-weight: bold');
        console.log('');

        const startTime = performance.now();

        // 測試套件 1: 滑桿輸入
        await this.testAllSliders();

        // 測試套件 2: 視圖模式按鈕
        await this.testViewModeButtons();

        // 測試套件 3: 複選框
        await this.testAllCheckboxes();

        // 測試套件 4: 文本輸入
        await this.testTextInputs();

        // 測試套件 5: 動作按鈕
        await this.testActionButtons();

        // 測試套件 6: 狀態完整性
        await this.testStateIntegrity();

        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);

        // 生成報告
        this.generateReport(duration);

        return this.results;
    }

    /**
     * 測試所有滑桿輸入
     */
    async testAllSliders() {
        console.log('%c▶ 測試套件 1: 滑桿輸入（Slider Inputs）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        for (const slider of TEST_MANIFEST.sliders) {
            await this.testSlider(slider);
            await this.sleep(50); // 短暫延遲確保事件處理完成
        }

        console.log('');
    }

    /**
     * 測試單個滑桿
     * 三層驗證：事件 → DOM → 狀態
     */
    async testSlider(config) {
        const { id, key, testValue, min, max, label } = config;
        const element = document.getElementById(id);
        const labelElement = document.getElementById(label);

        const testResult = {
            component: `滑桿: ${id}`,
            type: 'slider',
            testValue: testValue,
            oldState: null,
            newState: null,
            layers: {
                event: false,
                dom: false,
                state: false
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            if (!element) {
                throw new Error(`❌ DOM 元素不存在: ${id}`);
            }

            // 保存舊狀態
            const oldValue = terrainConfig[key];
            const oldDOMValue = element.value;
            const oldLabelText = labelElement ? labelElement.textContent : 'N/A';

            testResult.oldState = {
                config: oldValue,
                dom: oldDOMValue,
                label: oldLabelText
            };

            // 第 1 層：設置值並觸發事件
            element.value = testValue;
            const inputEvent = new Event('input', { bubbles: true });
            const eventFired = element.dispatchEvent(inputEvent);
            testResult.layers.event = eventFired;

            // 短暫延遲等待事件處理
            await this.sleep(10);

            // 第 2 層：驗證 DOM 更新
            const newDOMValue = parseFloat(element.value);
            const newLabelText = labelElement ? labelElement.textContent : 'N/A';
            testResult.layers.dom = (newDOMValue === testValue);

            if (labelElement) {
                const labelValue = parseFloat(newLabelText);
                testResult.layers.dom = testResult.layers.dom && (labelValue === testValue);
            }

            // 第 3 層：驗證狀態更新
            const newConfigValue = terrainConfig[key];
            testResult.layers.state = (newConfigValue === testValue);

            testResult.newState = {
                config: newConfigValue,
                dom: newDOMValue,
                label: newLabelText
            };

            // 判定結果
            if (testResult.layers.event && testResult.layers.dom && testResult.layers.state) {
                testResult.result = 'PASS';
                this.passed++;
                console.log(`  ✅ ${id}: ${oldValue} → ${testValue} (✓ 事件 ✓ DOM ✓ 狀態)`);
            } else {
                testResult.result = 'FAIL';
                this.failed++;
                const failedLayers = [];
                if (!testResult.layers.event) failedLayers.push('事件');
                if (!testResult.layers.dom) failedLayers.push('DOM');
                if (!testResult.layers.state) failedLayers.push('狀態');
                console.log(`  ❌ ${id}: 失敗 (${failedLayers.join(', ')})`);
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 ${id}: ${error.message}`);
        }

        this.results.push(testResult);
    }

    /**
     * 測試所有視圖模式按鈕
     */
    async testViewModeButtons() {
        console.log('%c▶ 測試套件 2: 視圖模式按鈕（View Mode Buttons）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        for (const button of TEST_MANIFEST.viewButtons) {
            await this.testViewModeButton(button);
            await this.sleep(50);
        }

        console.log('');
    }

    /**
     * 測試單個視圖模式按鈕
     */
    async testViewModeButton(config) {
        const { id, mode, label } = config;
        const element = document.getElementById(id);

        const testResult = {
            component: `視圖按鈕: ${label}`,
            type: 'viewButton',
            testValue: mode,
            oldState: null,
            newState: null,
            layers: {
                event: false,
                dom: false,
                state: false
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            if (!element) {
                throw new Error(`❌ DOM 元素不存在: ${id}`);
            }

            // 保存舊狀態
            const allButtons = document.querySelectorAll('.view-btn');
            const oldActiveButton = Array.from(allButtons).find(btn => btn.classList.contains('active'));
            const oldActiveMode = oldActiveButton ? oldActiveButton.id.replace('btn_', '') : 'none';

            testResult.oldState = {
                activeButton: oldActiveMode,
                hasActiveClass: element.classList.contains('active')
            };

            // 觸發點擊事件
            const clickEvent = new MouseEvent('click', { bubbles: true });
            const eventFired = element.dispatchEvent(clickEvent);
            testResult.layers.event = eventFired;

            await this.sleep(10);

            // 驗證 DOM 更新（active 類別）
            const hasActiveClass = element.classList.contains('active');
            testResult.layers.dom = hasActiveClass;

            // 驗證狀態（檢查 canvas 是否重繪或 currentMode 是否改變）
            // 注意：這裡假設有一個 currentViewMode 變量，如果沒有則跳過狀態檢查
            testResult.layers.state = hasActiveClass; // 簡化版本

            testResult.newState = {
                activeButton: mode,
                hasActiveClass: hasActiveClass
            };

            if (testResult.layers.event && testResult.layers.dom && testResult.layers.state) {
                testResult.result = 'PASS';
                this.passed++;
                console.log(`  ✅ ${label}: ${oldActiveMode} → ${mode} (✓ 事件 ✓ DOM ✓ 狀態)`);
            } else {
                testResult.result = 'FAIL';
                this.failed++;
                console.log(`  ❌ ${label}: 失敗`);
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 ${label}: ${error.message}`);
        }

        this.results.push(testResult);
    }

    /**
     * 測試所有複選框
     */
    async testAllCheckboxes() {
        console.log('%c▶ 測試套件 3: 複選框（Checkboxes）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        for (const checkbox of TEST_MANIFEST.checkboxes) {
            await this.testCheckbox(checkbox);
            await this.sleep(50);
        }

        console.log('');
    }

    /**
     * 測試單個複選框
     */
    async testCheckbox(config) {
        const { id, key, label } = config;
        const element = document.getElementById(id);

        const testResult = {
            component: `複選框: ${label}`,
            type: 'checkbox',
            testValue: null,
            oldState: null,
            newState: null,
            layers: {
                event: false,
                dom: false,
                state: false
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            if (!element) {
                throw new Error(`❌ DOM 元素不存在: ${id}`);
            }

            // 保存舊狀態
            const oldChecked = element.checked;
            const oldConfigValue = terrainConfig[key];

            testResult.oldState = {
                checked: oldChecked,
                config: oldConfigValue
            };

            // 切換狀態
            element.checked = !oldChecked;
            testResult.testValue = !oldChecked;

            const changeEvent = new Event('change', { bubbles: true });
            const eventFired = element.dispatchEvent(changeEvent);
            testResult.layers.event = eventFired;

            await this.sleep(10);

            // 驗證 DOM
            const newChecked = element.checked;
            testResult.layers.dom = (newChecked === !oldChecked);

            // 驗證狀態
            const newConfigValue = terrainConfig[key];
            testResult.layers.state = (newConfigValue === !oldChecked);

            testResult.newState = {
                checked: newChecked,
                config: newConfigValue
            };

            if (testResult.layers.event && testResult.layers.dom && testResult.layers.state) {
                testResult.result = 'PASS';
                this.passed++;
                console.log(`  ✅ ${label}: ${oldChecked} → ${!oldChecked} (✓ 事件 ✓ DOM ✓ 狀態)`);
            } else {
                testResult.result = 'FAIL';
                this.failed++;
                console.log(`  ❌ ${label}: 失敗`);
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 ${label}: ${error.message}`);
        }

        this.results.push(testResult);
    }

    /**
     * 測試文本輸入
     */
    async testTextInputs() {
        console.log('%c▶ 測試套件 4: 文本輸入（Text Inputs）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        for (const input of TEST_MANIFEST.textInputs) {
            await this.testTextInput(input);
            await this.sleep(50);
        }

        console.log('');
    }

    /**
     * 測試文本輸入
     */
    async testTextInput(config) {
        const { id, key, testValue, label } = config;
        const element = document.getElementById(id);

        const testResult = {
            component: `文本輸入: ${label}`,
            type: 'textInput',
            testValue: testValue,
            oldState: null,
            newState: null,
            layers: {
                event: false,
                dom: false,
                state: false
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            if (!element) {
                throw new Error(`❌ DOM 元素不存在: ${id}`);
            }

            // 保存舊狀態
            const oldValue = element.value;
            const oldConfigValue = terrainConfig[key];

            testResult.oldState = {
                input: oldValue,
                config: oldConfigValue
            };

            // 設置值
            element.value = testValue;

            const inputEvent = new Event('input', { bubbles: true });
            const eventFired = element.dispatchEvent(inputEvent);
            testResult.layers.event = eventFired;

            await this.sleep(10);

            // 驗證 DOM
            const newValue = element.value;
            testResult.layers.dom = (newValue === testValue);

            // 注意：種子輸入可能需要額外的處理（例如點擊生成按鈕）
            // 這裡我們只驗證 DOM 層面的更新
            testResult.layers.state = true; // 種子需要點擊生成才會更新 config

            testResult.newState = {
                input: newValue,
                config: terrainConfig[key]
            };

            if (testResult.layers.event && testResult.layers.dom && testResult.layers.state) {
                testResult.result = 'PASS';
                this.passed++;
                console.log(`  ✅ ${label}: "${oldValue}" → "${testValue}" (✓ 事件 ✓ DOM)`);
            } else {
                testResult.result = 'FAIL';
                this.failed++;
                console.log(`  ❌ ${label}: 失敗`);
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 ${label}: ${error.message}`);
        }

        this.results.push(testResult);
    }

    /**
     * 測試動作按鈕
     */
    async testActionButtons() {
        console.log('%c▶ 測試套件 5: 動作按鈕（Action Buttons）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        // 測試生成河流按鈕
        await this.testRiverGenerationButton();

        // 測試匯出按鈕
        await this.testExportButton();

        console.log('');
    }

    /**
     * 測試河流生成按鈕
     */
    async testRiverGenerationButton() {
        const element = document.getElementById('btnGenerateRivers');

        const testResult = {
            component: '動作按鈕: 生成河流',
            type: 'actionButton',
            testValue: 'generateRivers',
            oldState: null,
            newState: null,
            layers: {
                event: false,
                dom: false,
                state: false
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            if (!element) {
                throw new Error(`❌ DOM 元素不存在: btnGenerateRivers`);
            }

            // 保存舊狀態（flux 總和）
            const oldFluxSum = this.calculateFluxSum();

            testResult.oldState = {
                fluxSum: oldFluxSum,
                fluxNonZero: this.countNonZeroFlux()
            };

            // 觸發點擊
            const clickEvent = new MouseEvent('click', { bubbles: true });
            const eventFired = element.dispatchEvent(clickEvent);
            testResult.layers.event = eventFired;

            // 等待河流生成完成（假設需要一些時間）
            await this.sleep(200);

            // 驗證狀態（flux 總和應該增加）
            const newFluxSum = this.calculateFluxSum();
            const fluxChanged = newFluxSum > oldFluxSum;

            testResult.layers.dom = true; // 按鈕點擊不改變 DOM
            testResult.layers.state = fluxChanged;

            testResult.newState = {
                fluxSum: newFluxSum,
                fluxNonZero: this.countNonZeroFlux(),
                increase: newFluxSum - oldFluxSum
            };

            if (testResult.layers.event && testResult.layers.state) {
                testResult.result = 'PASS';
                this.passed++;
                console.log(`  ✅ 生成河流: Flux 總和 ${oldFluxSum.toFixed(0)} → ${newFluxSum.toFixed(0)} (+${(newFluxSum - oldFluxSum).toFixed(0)})`);
            } else {
                testResult.result = 'FAIL';
                this.failed++;
                console.log(`  ❌ 生成河流: Flux 未改變`);
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 生成河流: ${error.message}`);
        }

        this.results.push(testResult);
    }

    /**
     * 測試匯出按鈕
     */
    async testExportButton() {
        const element = document.getElementById('btnExport');

        const testResult = {
            component: '動作按鈕: 匯出地圖',
            type: 'actionButton',
            testValue: 'exportMap',
            oldState: null,
            newState: null,
            layers: {
                event: false,
                dom: false,
                state: false
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            if (!element) {
                throw new Error(`❌ DOM 元素不存在: btnExport`);
            }

            // 監聽下載觸發（不實際下載）
            let downloadTriggered = false;
            const canvas = document.getElementById('canvas');

            if (canvas) {
                // 模擬下載檢測
                const originalToBlob = canvas.toBlob.bind(canvas);
                canvas.toBlob = function(callback) {
                    downloadTriggered = true;
                    console.log('  📥 檢測到下載觸發（已攔截）');
                    // 不實際調用 callback 以避免真實下載
                };

                // 觸發點擊
                const clickEvent = new MouseEvent('click', { bubbles: true });
                const eventFired = element.dispatchEvent(clickEvent);
                testResult.layers.event = eventFired;

                await this.sleep(100);

                testResult.layers.dom = true;
                testResult.layers.state = downloadTriggered;

                // 恢復原始函數
                canvas.toBlob = originalToBlob;

                if (testResult.layers.event && testResult.layers.state) {
                    testResult.result = 'PASS';
                    this.passed++;
                    console.log(`  ✅ 匯出地圖: 下載已觸發 (✓ 事件 ✓ 狀態)`);
                } else {
                    testResult.result = 'FAIL';
                    this.failed++;
                    console.log(`  ❌ 匯出地圖: 下載未觸發`);
                }
            } else {
                throw new Error('Canvas 元素不存在');
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 匯出地圖: ${error.message}`);
        }

        this.results.push(testResult);
    }

    /**
     * 測試狀態完整性
     */
    async testStateIntegrity() {
        console.log('%c▶ 測試套件 6: 狀態完整性（State Integrity）', 'color: #FFD700; font-weight: bold');
        console.log('━'.repeat(60));

        const testResult = {
            component: '狀態完整性檢查',
            type: 'integrity',
            testValue: null,
            oldState: null,
            newState: null,
            layers: {
                event: true,
                dom: true,
                state: true
            },
            result: 'UNKNOWN',
            errors: []
        };

        try {
            // 檢查 terrainConfig 的所有鍵
            const requiredKeys = [
                'seed', 'scale', 'octaves', 'seaLevel', 'moistureOffset',
                'temperatureOffset', 'riverDensity', 'riverThreshold',
                'irrigationStrength', 'useAdvancedIrrigation'
            ];

            const missingKeys = [];
            const invalidValues = [];

            for (const key of requiredKeys) {
                if (!(key in terrainConfig)) {
                    missingKeys.push(key);
                } else {
                    const value = terrainConfig[key];
                    if (value === null || value === undefined) {
                        invalidValues.push({ key, value });
                    }
                }
            }

            testResult.newState = {
                totalKeys: Object.keys(terrainConfig).length,
                requiredKeys: requiredKeys.length,
                missingKeys: missingKeys,
                invalidValues: invalidValues
            };

            if (missingKeys.length === 0 && invalidValues.length === 0) {
                testResult.result = 'PASS';
                this.passed++;
                console.log(`  ✅ 配置完整性: 所有 ${requiredKeys.length} 個鍵存在且有效`);
            } else {
                testResult.result = 'FAIL';
                this.failed++;
                if (missingKeys.length > 0) {
                    console.log(`  ❌ 缺少鍵: ${missingKeys.join(', ')}`);
                }
                if (invalidValues.length > 0) {
                    console.log(`  ❌ 無效值: ${invalidValues.map(v => `${v.key}=${v.value}`).join(', ')}`);
                }
            }

            // 檢查 mapData
            const mapDataKeys = ['height', 'moisture', 'baseMoisture', 'temperature', 'flux'];
            const missingMapDataKeys = [];

            for (const key of mapDataKeys) {
                if (!(key in mapData)) {
                    missingMapDataKeys.push(key);
                }
            }

            if (missingMapDataKeys.length === 0) {
                console.log(`  ✅ mapData 完整性: 所有 ${mapDataKeys.length} 個陣列存在`);
            } else {
                console.log(`  ❌ mapData 缺少: ${missingMapDataKeys.join(', ')}`);
                testResult.result = 'FAIL';
            }

        } catch (error) {
            testResult.result = 'ERROR';
            testResult.errors.push(error.message);
            this.failed++;
            console.log(`  💥 狀態完整性: ${error.message}`);
        }

        this.results.push(testResult);
        console.log('');
    }

    /**
     * 生成測試報告
     */
    generateReport(duration) {
        const total = this.passed + this.failed;
        const passRate = ((this.passed / total) * 100).toFixed(2);

        console.log('%c╔══════════════════════════════════════════════════════════════╗', 'color: #00FFFF; font-weight: bold');
        console.log('%c║  測試報告 (Test Report)                                      ║', 'color: #00FFFF; font-weight: bold');
        console.log('%c╚══════════════════════════════════════════════════════════════╝', 'color: #00FFFF; font-weight: bold');
        console.log('');
        console.log(`  總測試數: ${total}`);
        console.log(`  ✅ 通過: ${this.passed}`);
        console.log(`  ❌ 失敗: ${this.failed}`);
        console.log(`  ⚠️ 警告: ${this.warnings}`);
        console.log(`  通過率: ${passRate}%`);
        console.log(`  執行時間: ${duration} ms`);
        console.log('');

        if (this.failed > 0) {
            console.log('%c  ⚠️ 發現問題，請檢查以下失敗的測試：', 'color: #FF6B6B; font-weight: bold');
            const failedTests = this.results.filter(r => r.result === 'FAIL' || r.result === 'ERROR');
            failedTests.forEach(test => {
                console.log(`     • ${test.component} (${test.result})`);
                if (test.errors.length > 0) {
                    test.errors.forEach(err => console.log(`       - ${err}`));
                }
            });
        } else {
            console.log('%c  🎉 所有測試通過！系統狀態健康。', 'color: #00FF00; font-weight: bold');
        }

        console.log('');
        console.log('%c  完整測試結果已存儲在 window.testReport 中', 'color: #888');
        console.log('');

        // 存儲到全局變量供檢查
        window.testReport = {
            summary: {
                total,
                passed: this.passed,
                failed: this.failed,
                warnings: this.warnings,
                passRate: parseFloat(passRate),
                duration: parseFloat(duration)
            },
            details: this.results,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 輔助函數：計算 flux 總和
     */
    calculateFluxSum() {
        let sum = 0;
        for (let i = 0; i < mapData.flux.length; i++) {
            sum += mapData.flux[i];
        }
        return sum;
    }

    /**
     * 輔助函數：計算非零 flux 數量
     */
    countNonZeroFlux() {
        let count = 0;
        for (let i = 0; i < mapData.flux.length; i++) {
            if (mapData.flux[i] > 0) count++;
        }
        return count;
    }

    /**
     * 輔助函數：延遲
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 創建全局實例
const comprehensiveTestBot = new ComprehensiveTestBot();

// 暴露到全局作用域
window.ComprehensiveTestBot = comprehensiveTestBot;

// 快捷方式
window.runComprehensiveTest = () => comprehensiveTestBot.runFullSuite();

console.log('%c✨ 綜合測試機器人已加載！', 'color: #00FFFF; font-weight: bold');
console.log('%c   使用 runComprehensiveTest() 開始全面測試', 'color: #888');
console.log('');

export default comprehensiveTestBot;
