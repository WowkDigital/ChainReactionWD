import { CONSTANTS, SETTINGS } from './Config.js';

export default class ChartManager {
    /**
     * @param {string} canvasId DOM element ID for the chart canvas
     */
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.chartInstance = null;
        this.discoveryTimestamps = [];
    }

    /**
     * Initializes the bar chart using global Chart.js
     */
    init() {
        const canvasEl = document.getElementById(this.canvasId);
        if (!canvasEl) return;
        
        const chartCtx = canvasEl.getContext('2d');
        
        if (typeof window.Chart === 'undefined') {
            console.warn('Chart.js was not found in window scope. Deferred initialization...');
            return;
        }

        this.chartInstance = new window.Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Discoveries / min',
                    data: [],
                    backgroundColor: 'rgba(59, 130, 246, 0.4)',
                    borderColor: 'rgba(59, 130, 246, 0.85)',
                    borderWidth: 1,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            color: '#8b949e', 
                            font: { family: "'Roboto Mono', monospace", size: 9 } 
                        },
                        grid: { color: 'rgba(48, 54, 61, 0.3)' }
                    },
                    x: {
                        ticks: { display: false },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#8b949e',
                            font: { family: "'Inter', sans-serif", size: 9 },
                            boxWidth: 10,
                            padding: 5
                        }
                    }
                }
            }
        });
    }

    /**
     * Logs a new discovery occurrence
     * @param {number} timestamp 
     */
    addDiscoveryTimestamp(timestamp) {
        this.discoveryTimestamps.push(timestamp);
    }

    /**
     * Resets the graph datasets and discovery lists
     */
    reset() {
        this.discoveryTimestamps = [];
        if (this.chartInstance) {
            this.chartInstance.data.labels = [];
            this.chartInstance.data.datasets[0].data = [];
            this.chartInstance.update();
        }
    }

    /**
     * Computes the rolling rate and adds a new point to the chart
     */
    update() {
        if (!this.chartInstance) {
            // Retry initialization if Chart.js loaded late
            if (typeof window.Chart !== 'undefined') {
                this.init();
            }
            return;
        }

        const now = performance.now();
        const timeWindow = SETTINGS.chartTimeWindow;
        
        // Remove timestamps older than the active chart window
        this.discoveryTimestamps = this.discoveryTimestamps.filter(ts => now - ts <= timeWindow);
        
        let currentRate = 0;
        if (this.discoveryTimestamps.length > 0) {
            // Extrapolate discoveries in window to a 60-second rate
            currentRate = (this.discoveryTimestamps.length / (timeWindow / 1000)) * 60;
        }
        
        const data = this.chartInstance.data.datasets[0].data;
        const labels = this.chartInstance.data.labels;
        
        data.push(currentRate);
        labels.push('');

        // Shift old data to keep window width fixed
        if (data.length > CONSTANTS.CHART_DATA_POINTS) {
            data.shift();
            labels.shift();
        }

        this.chartInstance.update('none'); // Update without animation for raw performance
    }
}
