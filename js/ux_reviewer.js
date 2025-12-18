/**
 * ========================================
 * Phase 20.1: UX Sentinel - 實時性能監控 HUD
 * ========================================
 * 自動化 UX/UI 審查器，實時顯示性能指標
 *
 * 核心功能：
 * - FPS 監控（色碼：綠 >55、黃 >30、紅 <30）
 * - 狀態追蹤（IDLE / DRAGGING / GENERATING）
 * - 渲染時間（Worker 操作耗時）
 * - 座標顯示（當前偏移量）
 *
 * @module ux_reviewer
 */

/**
 * UXReviewer 類別：性能監控和診斷
 */
export class UXReviewer {
    constructor() {
        // 性能指標
        this.fps = 0;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = performance.now();

        // 狀態追蹤
        this.currentState = 'IDLE';  // IDLE / DRAGGING / GENERATING
        this.renderTime = 0;         // 最後一次渲染耗時（毫秒）
        this.offsetX = 0;            // 當前偏移量 X
        this.offsetY = 0;            // 當前偏移量 Y

        // UI 元素
        this.hudElement = null;
        this.isRunning = false;

        // 初始化
        this.injectCSS();
        this.injectHTML();

        console.log('🎯 UX Sentinel 已初始化');
    }

    /**
     * 注入 CSS 樣式
     */
    injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            #ux-reviewer-hud {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.75);
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                padding: 12px 16px;
                border-radius: 8px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                z-index: 10000;
                min-width: 240px;
                backdrop-filter: blur(4px);
                user-select: none;
            }

            #ux-reviewer-hud .hud-title {
                font-weight: bold;
                margin-bottom: 8px;
                color: #00d4ff;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                padding-bottom: 4px;
                font-size: 14px;
            }

            #ux-reviewer-hud .hud-row {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
                line-height: 1.5;
            }

            #ux-reviewer-hud .hud-label {
                color: #aaa;
                margin-right: 8px;
            }

            #ux-reviewer-hud .hud-value {
                font-weight: bold;
                text-align: right;
            }

            #ux-reviewer-hud .fps-green {
                color: #00ff88;
            }

            #ux-reviewer-hud .fps-yellow {
                color: #ffd700;
            }

            #ux-reviewer-hud .fps-red {
                color: #ff4444;
            }

            #ux-reviewer-hud .state-idle {
                color: #888;
            }

            #ux-reviewer-hud .state-dragging {
                color: #00d4ff;
            }

            #ux-reviewer-hud .state-generating {
                color: #ff9900;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 注入 HTML 結構
     */
    injectHTML() {
        const hud = document.createElement('div');
        hud.id = 'ux-reviewer-hud';
        hud.innerHTML = `
            <div class="hud-title">⚡ UX SENTINEL</div>
            <div class="hud-row">
                <span class="hud-label">FPS:</span>
                <span class="hud-value" id="hud-fps">--</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">State:</span>
                <span class="hud-value" id="hud-state">IDLE</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Render:</span>
                <span class="hud-value" id="hud-render">-- ms</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Offset:</span>
                <span class="hud-value" id="hud-offset">(0, 0)</span>
            </div>
        `;
        document.body.appendChild(hud);
        this.hudElement = hud;
    }

    /**
     * 啟動監控循環
     */
    start() {
        if (this.isRunning) {
            console.warn('⚠️  UX Sentinel 已經在運行中');
            return;
        }

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = performance.now();
        this.frameCount = 0;

        console.log('🚀 UX Sentinel 開始監控');
        this.monitorLoop();
    }

    /**
     * 停止監控循環
     */
    stop() {
        this.isRunning = false;
        console.log('⏸️  UX Sentinel 已停止');
    }

    /**
     * 監控循環（使用 requestAnimationFrame）
     */
    monitorLoop() {
        if (!this.isRunning) return;

        const now = performance.now();
        this.frameCount++;

        // 每秒更新一次 FPS
        const elapsed = now - this.lastFpsUpdate;
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            this.updateFPSDisplay();
        }

        this.lastFrameTime = now;
        requestAnimationFrame(() => this.monitorLoop());
    }

    /**
     * 更新 FPS 顯示（帶色碼）
     */
    updateFPSDisplay() {
        const fpsElement = document.getElementById('hud-fps');
        if (!fpsElement) return;

        fpsElement.textContent = `${this.fps}`;

        // 色碼規則
        fpsElement.className = 'hud-value';
        if (this.fps > 55) {
            fpsElement.classList.add('fps-green');
        } else if (this.fps > 30) {
            fpsElement.classList.add('fps-yellow');
        } else {
            fpsElement.classList.add('fps-red');
        }
    }

    /**
     * 報告活動狀態
     * @param {string} activityName - 活動名稱（IDLE / DRAGGING / GENERATING）
     */
    reportActivity(activityName) {
        const validStates = ['IDLE', 'DRAGGING', 'GENERATING'];
        if (!validStates.includes(activityName)) {
            console.warn(`⚠️  無效狀態: ${activityName}`);
            return;
        }

        this.currentState = activityName;

        const stateElement = document.getElementById('hud-state');
        if (!stateElement) return;

        stateElement.textContent = activityName;

        // 狀態色碼
        stateElement.className = 'hud-value';
        if (activityName === 'IDLE') {
            stateElement.classList.add('state-idle');
        } else if (activityName === 'DRAGGING') {
            stateElement.classList.add('state-dragging');
        } else if (activityName === 'GENERATING') {
            stateElement.classList.add('state-generating');
        }

        console.log(`🎯 UX Sentinel: 狀態變更 → ${activityName}`);
    }

    /**
     * 報告渲染時間
     * @param {number} ms - 渲染耗時（毫秒）
     */
    reportRenderTime(ms) {
        this.renderTime = ms;

        const renderElement = document.getElementById('hud-render');
        if (!renderElement) return;

        renderElement.textContent = `${ms.toFixed(1)} ms`;

        // 如果渲染時間過長，警告
        if (ms > 100) {
            console.warn(`⚠️  UX Sentinel: 渲染時間過長 (${ms.toFixed(1)} ms)`);
        }
    }

    /**
     * 更新偏移量座標
     * @param {number} x - 偏移量 X
     * @param {number} y - 偏移量 Y
     */
    updateOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;

        const offsetElement = document.getElementById('hud-offset');
        if (!offsetElement) return;

        offsetElement.textContent = `(${Math.round(x)}, ${Math.round(y)})`;
    }

    /**
     * 獲取當前統計信息
     */
    getStats() {
        return {
            fps: this.fps,
            state: this.currentState,
            renderTime: this.renderTime,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        };
    }
}

// ========================================
// 全域單例
// ========================================
let uxReviewerInstance = null;

/**
 * 獲取 UXReviewer 單例
 */
export function getUXReviewer() {
    if (!uxReviewerInstance) {
        uxReviewerInstance = new UXReviewer();
    }
    return uxReviewerInstance;
}
