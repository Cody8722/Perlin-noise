/**
 * ========================================
 * Phase 18.99 Part 5: The "Inquisitor" (Automated QA System)
 * ========================================
 * 自動化驗證套件，用於證明 FSM 和物理修復的有效性
 *
 * 功能：
 * - Module A: FSM 壓力測試（並發點擊模擬）
 * - Module B: 水文審計器（死湖檢測）
 * - Module C: 資料完整性檢查（NaN/Infinity 檢測）
 *
 * 使用方式：
 * 1. 在瀏覽器 Console 執行：await QA.runFullSuite()
 * 2. 查看測試結果表格
 *
 * @module qa_system
 */

import { generateRivers, mapData } from './terrain.js';
import { MAP_CONFIG, terrainConfig } from './config.js';

/**
 * TestBot 類別 - 自動化測試機器人
 */
class TestBot {
    constructor() {
        this.results = [];
        console.log('🤖 TestBot 已初始化');
        console.log('   執行 QA.runFullSuite() 開始完整測試');
    }

    /**
     * ========================================
     * Module A: FSM 壓力測試（The "Click Spammer"）
     * ========================================
     * 模擬使用者快速連續點擊「生成」按鈕
     *
     * 測試目標：驗證 FSM 是否正確處理並發請求
     * 通過條件：
     * - 第一個請求成功執行
     * - 後續請求被正確拒絕（不崩潰）
     * - 不會建立多個 Worker
     */
    async testConcurrency() {
        console.log('\n🔥 Module A: FSM 壓力測試（並發點擊模擬）');
        console.log('   目標：同時發送 5 次 generateRivers() 請求');

        const promises = [];
        const results = {
            success: 0,
            rejected: 0,
            errors: []
        };

        // 同時發送 5 個請求（模擬快速點擊）
        for (let i = 0; i < 5; i++) {
            const promise = generateRivers(1000)  // 使用較少水滴加快測試
                .then(() => {
                    results.success++;
                    console.log(`   ✅ 請求 ${i + 1}: 成功`);
                })
                .catch((error) => {
                    results.rejected++;
                    results.errors.push(error.message);
                    console.log(`   ⏸️  請求 ${i + 1}: 被拒絕 - ${error.message}`);
                });

            promises.push(promise);
        }

        // 等待所有請求完成
        await Promise.allSettled(promises);

        // 評估結果
        const passed = results.success === 1 && results.rejected === 4;
        const status = passed ? '✅ PASS' : '❌ FAIL';

        console.log(`\n   ${status} - 結果摘要:`);
        console.log(`   - 成功執行: ${results.success} (預期: 1)`);
        console.log(`   - 被拒絕: ${results.rejected} (預期: 4)`);

        if (results.errors.length > 0) {
            const errorCounts = {};
            results.errors.forEach(msg => {
                errorCounts[msg] = (errorCounts[msg] || 0) + 1;
            });
            console.log(`   - 錯誤訊息分布:`);
            for (const [msg, count] of Object.entries(errorCounts)) {
                console.log(`     "${msg}": ${count} 次`);
            }
        }

        this.results.push({
            module: 'A: FSM 壓力測試',
            status: status,
            details: `成功: ${results.success}, 拒絕: ${results.rejected}`,
            passed: passed
        });

        return passed;
    }

    /**
     * ========================================
     * Module B: 水文審計器（The "Dead Lake Hunter"）
     * ========================================
     * 掃描地圖中的湖泊，驗證每個湖泊都有出水口
     *
     * 測試目標：驗證 Fill and Spill 機制是否有效
     * 通過條件：
     * - 從湖泊出發的水流能到達海洋或地圖邊界
     * - 沒有無限循環
     * - 沒有內陸死湖（Dead Lake）
     */
    verifyPhysics() {
        console.log('\n🔍 Module B: 水文審計器（死湖檢測）');
        console.log('   目標：驗證湖泊都有出水口（無死湖）');

        const { width, height } = MAP_CONFIG;
        const seaLevel = terrainConfig.seaLevel;

        // 收集所有湖泊位置
        const lakePixels = [];
        for (let i = 0; i < mapData.lakes.length; i++) {
            if (mapData.lakes[i] === 1) {
                const x = i % width;
                const y = Math.floor(i / width);
                lakePixels.push({ x, y, index: i });
            }
        }

        if (lakePixels.length === 0) {
            console.log('   ⚠️  地圖中沒有湖泊，跳過測試');
            this.results.push({
                module: 'B: 水文審計器',
                status: '⏭️  SKIP',
                details: '無湖泊',
                passed: true
            });
            return true;
        }

        console.log(`   找到 ${lakePixels.length} 個湖泊像素`);

        // 隨機選擇最多 20 個湖泊進行測試（避免測試時間過長）
        const samplesToTest = Math.min(20, lakePixels.length);
        const sampledLakes = [];

        // 隨機抽樣（不重複）
        const shuffled = [...lakePixels].sort(() => Math.random() - 0.5);
        for (let i = 0; i < samplesToTest; i++) {
            sampledLakes.push(shuffled[i]);
        }

        console.log(`   隨機抽樣 ${samplesToTest} 個湖泊進行審計...`);

        let deadLakes = 0;
        let reachedOcean = 0;
        let reachedEdge = 0;
        const deadLakePositions = [];

        // 對每個湖泊進行流向追蹤
        for (const lake of sampledLakes) {
            const result = this.traceLakeOutflow(lake.x, lake.y, seaLevel, width, height);

            if (result.type === 'ocean') {
                reachedOcean++;
            } else if (result.type === 'edge') {
                reachedEdge++;
            } else if (result.type === 'stuck') {
                deadLakes++;
                deadLakePositions.push({ x: lake.x, y: lake.y, reason: result.reason });
            }
        }

        // 評估結果
        const passed = deadLakes === 0;
        const status = passed ? '✅ PASS' : '❌ FAIL';

        console.log(`\n   ${status} - 結果摘要:`);
        console.log(`   - 到達海洋: ${reachedOcean}`);
        console.log(`   - 到達邊界: ${reachedEdge}`);
        console.log(`   - 死湖（無出口）: ${deadLakes}`);

        if (deadLakes > 0) {
            console.log(`\n   ⚠️  發現 ${deadLakes} 個死湖：`);
            deadLakePositions.forEach((pos, idx) => {
                console.log(`   ${idx + 1}. 位置 (${pos.x}, ${pos.y}) - 原因: ${pos.reason}`);
            });
        }

        this.results.push({
            module: 'B: 水文審計器',
            status: status,
            details: `海洋: ${reachedOcean}, 邊界: ${reachedEdge}, 死湖: ${deadLakes}`,
            passed: passed
        });

        return passed;
    }

    /**
     * 追蹤從湖泊出發的水流路徑
     * @param {number} startX - 起始 X 座標
     * @param {number} startY - 起始 Y 座標
     * @param {number} seaLevel - 海平面高度
     * @param {number} width - 地圖寬度
     * @param {number} height - 地圖高度
     * @returns {object} 追蹤結果 { type: 'ocean'|'edge'|'stuck', reason?: string }
     */
    traceLakeOutflow(startX, startY, seaLevel, width, height) {
        let x = startX;
        let y = startY;
        const visited = new Set();
        const maxIterations = 10000;  // 防止無限循環

        const neighbors = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1]
        ];

        for (let iter = 0; iter < maxIterations; iter++) {
            // 檢查是否到達海洋
            const currentIndex = y * width + x;
            const currentHeight = mapData.height[currentIndex];

            if (currentHeight <= seaLevel) {
                return { type: 'ocean' };
            }

            // 檢查是否到達地圖邊界
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                return { type: 'edge' };
            }

            // 檢查是否進入循環
            const key = `${x},${y}`;
            if (visited.has(key)) {
                return { type: 'stuck', reason: '循環' };
            }
            visited.add(key);

            // 尋找最低的鄰居
            let lowestHeight = currentHeight;
            let nextX = x;
            let nextY = y;

            for (const [dx, dy] of neighbors) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

                const neighborIndex = ny * width + nx;
                const neighborHeight = mapData.height[neighborIndex];

                if (neighborHeight < lowestHeight) {
                    lowestHeight = neighborHeight;
                    nextX = nx;
                    nextY = ny;
                }
            }

            // 檢查是否卡住（無下坡路徑）
            if (nextX === x && nextY === y) {
                return { type: 'stuck', reason: '局部窪地' };
            }

            // 移動到下一個位置
            x = nextX;
            y = nextY;
        }

        // 超過最大迭代次數
        return { type: 'stuck', reason: '超過最大追蹤距離' };
    }

    /**
     * ========================================
     * Module C: 資料完整性檢查
     * ========================================
     * 檢查地圖資料中是否有 NaN、Infinity 或 undefined
     *
     * 測試目標：驗證資料完整性修復是否有效
     * 通過條件：所有數值都是有效的有限數字
     */
    checkSanity() {
        console.log('\n🔬 Module C: 資料完整性檢查（NaN/Infinity 檢測）');
        console.log('   目標：掃描 height 和 flux 陣列中的無效值');

        const issues = {
            height: { nan: 0, infinity: 0, undefined: 0 },
            flux: { nan: 0, infinity: 0, undefined: 0 }
        };

        // 檢查 height 陣列
        for (let i = 0; i < mapData.height.length; i++) {
            const value = mapData.height[i];
            if (value === undefined) issues.height.undefined++;
            else if (Number.isNaN(value)) issues.height.nan++;
            else if (!Number.isFinite(value)) issues.height.infinity++;
        }

        // 檢查 flux 陣列
        for (let i = 0; i < mapData.flux.length; i++) {
            const value = mapData.flux[i];
            if (value === undefined) issues.flux.undefined++;
            else if (Number.isNaN(value)) issues.flux.nan++;
            else if (!Number.isFinite(value)) issues.flux.infinity++;
        }

        // 計算總問題數
        const totalIssues =
            issues.height.nan + issues.height.infinity + issues.height.undefined +
            issues.flux.nan + issues.flux.infinity + issues.flux.undefined;

        const passed = totalIssues === 0;
        const status = passed ? '✅ PASS' : '❌ FAIL';

        console.log(`\n   ${status} - 結果摘要:`);
        console.log(`   Height 陣列:`);
        console.log(`     - NaN: ${issues.height.nan}`);
        console.log(`     - Infinity: ${issues.height.infinity}`);
        console.log(`     - undefined: ${issues.height.undefined}`);
        console.log(`   Flux 陣列:`);
        console.log(`     - NaN: ${issues.flux.nan}`);
        console.log(`     - Infinity: ${issues.flux.infinity}`);
        console.log(`     - undefined: ${issues.flux.undefined}`);
        console.log(`   總問題數: ${totalIssues}`);

        this.results.push({
            module: 'C: 資料完整性',
            status: status,
            details: `總問題: ${totalIssues}`,
            passed: passed
        });

        return passed;
    }

    /**
     * ========================================
     * 執行完整測試套件
     * ========================================
     */
    async runFullSuite() {
        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║  🤖 The Inquisitor - 自動化 QA 系統                    ║');
        console.log('║  Phase 18.99 Part 5: 驗證 FSM 和物理修復               ║');
        console.log('╚════════════════════════════════════════════════════════╝');

        this.results = [];  // 重置結果
        const startTime = performance.now();

        try {
            // Module A: FSM 壓力測試
            await this.testConcurrency();

            // Module B: 水文審計器
            this.verifyPhysics();

            // Module C: 資料完整性檢查
            this.checkSanity();

            // 顯示結果摘要
            this.displayResults();

            const endTime = performance.now();
            const duration = (endTime - startTime).toFixed(2);
            console.log(`\n⏱️  總測試時間: ${duration} ms`);

            // 計算通過率
            const totalTests = this.results.length;
            const passedTests = this.results.filter(r => r.passed).length;
            const passRate = (passedTests / totalTests * 100).toFixed(1);

            console.log(`\n📊 測試通過率: ${passedTests}/${totalTests} (${passRate}%)`);

            if (passedTests === totalTests) {
                console.log('\n🎉 恭喜！所有測試通過！');
                console.log('   FSM 和物理修復運作正常。');
            } else {
                console.log('\n⚠️  部分測試失敗，請檢查上方詳細報告。');
            }

        } catch (error) {
            console.error('\n❌ 測試套件執行錯誤:', error);
            console.error(error.stack);
        }
    }

    /**
     * 顯示測試結果表格
     */
    displayResults() {
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  📋 測試結果摘要                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');

        // 使用 console.table 顯示結果
        console.table(this.results.map(r => ({
            '模組': r.module,
            '狀態': r.status,
            '詳細資訊': r.details
        })));
    }

    /**
     * 個別測試的快速執行方法（方便除錯）
     */
    async testA() { return await this.testConcurrency(); }
    testB() { return this.verifyPhysics(); }
    testC() { return this.checkSanity(); }
}

// 建立全域 QA 實例
const qaBot = new TestBot();

// 暴露到 window 物件（瀏覽器環境）
if (typeof window !== 'undefined') {
    window.QA = qaBot;
    console.log('✅ QA 系統已載入！使用 QA.runFullSuite() 開始測試');
}

// 也支援 ES6 模組匯出
export default qaBot;
