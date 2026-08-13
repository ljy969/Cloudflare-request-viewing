// ===== 数据可视化模块 =====
// 基于 Chart.js 实现各种图表渲染

const Charts = {
  trendChart: null,
  resourceChart: null,
  comparisonChart: null,

  // 获取当前主题配色
  getThemeColors() {
    const isDark = ThemeManager.getEffective() === 'dark';
    return {
      text: isDark ? '#cbd5e1' : '#475569',
      grid: isDark ? '#334155' : '#e2e8f0',
      accent: '#f38020',
      success: '#10b981',
      info: '#3b82f6'
    };
  },

  // 创建/更新趋势图
  async renderTrendChart(accountId, days = 30) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const colors = this.getThemeColors();
    const data = await UsageTracker.getTrendData(accountId, days);

    const config = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: '请求数',
            data: data.requests,
            borderColor: colors.accent,
            backgroundColor: colors.accent + '30',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'Worker 调用',
            data: data.workers,
            borderColor: colors.info,
            backgroundColor: colors.info + '30',
            tension: 0.3,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: colors.text, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${CF_API.formatNumber(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text, maxTicksLimit: 10 }
          },
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              callback: (v) => CF_API.formatNumber(v)
            },
            title: { display: true, text: '请求数', color: colors.text }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: colors.text,
              callback: (v) => CF_API.formatNumber(v)
            },
            title: { display: true, text: 'Worker', color: colors.text }
          }
        }
      }
    };

    if (this.trendChart) {
      this.trendChart.data = config.data;
      this.trendChart.options = config.options;
      this.trendChart.update();
    } else {
      this.trendChart = new Chart(ctx, config);
    }
  },

  // 创建资源分布图
  async renderResourceChart(accountId) {
    const ctx = document.getElementById('resourceChart');
    if (!ctx) return;

    const colors = this.getThemeColors();
    const data = await UsageTracker.getTrendData(accountId, 30);
    
    // 计算总计
    const totalRequests = data.requests.reduce((a, b) => a + b, 0);
    const totalWorkers = data.workers.reduce((a, b) => a + b, 0);
    const totalBandwidth = data.bandwidth.reduce((a, b) => a + b, 0);
    const totalPV = data.pageViews.reduce((a, b) => a + b, 0);

    const config = {
      type: 'doughnut',
      data: {
        labels: ['请求数', 'Worker 调用', '带宽消耗', '页面浏览'],
        datasets: [{
          data: [totalRequests, totalWorkers, totalBandwidth / 1024, totalPV],
          backgroundColor: [
            colors.accent + 'CC',
            colors.info + 'CC',
            colors.success + 'CC',
            '#8b5cf6CC'
          ],
          borderColor: colors.grid,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.text, usePointStyle: true, padding: 15 }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            callbacks: {
              label: (context) => {
                const label = context.label;
                const value = context.parsed;
                if (label === '带宽消耗') {
                  return `${label}: ${CF_API.formatBytes(value * 1024)}`;
                }
                return `${label}: ${CF_API.formatNumber(value)}`;
              }
            }
          }
        },
        cutout: '60%'
      }
    };

    if (this.resourceChart) {
      this.resourceChart.data = config.data;
      this.resourceChart.update();
    } else {
      this.resourceChart = new Chart(ctx, config);
    }
  },

  // 创建多账户对比图
  async renderComparisonChart(metric = 'requests', range = 'month') {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    const colors = this.getThemeColors();
    const data = await UsageTracker.getComparisonData(metric, range);

    const metricLabels = {
      requests: '请求数',
      workers: 'Worker 调用',
      bandwidth: '带宽使用'
    };

    const config = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.datasets.map(ds => ({
          ...ds,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: colors.text, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${CF_API.formatNumber(context.parsed.y)}`;
              }
            }
          },
          title: {
            display: true,
            text: `多账户${metricLabels[metric] || '请求数'}对比`,
            color: colors.text,
            font: { size: 14 }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: { color: colors.text, maxTicksLimit: 10 }
          },
          y: {
            grid: { color: colors.grid, drawBorder: false },
            ticks: {
              color: colors.text,
              callback: (v) => metric === 'bandwidth' ? CF_API.formatBytes(v) : CF_API.formatNumber(v)
            }
          }
        }
      }
    };

    if (this.comparisonChart) {
      this.comparisonChart.data = config.data;
      this.comparisonChart.options = config.options;
      this.comparisonChart.update();
    } else {
      this.comparisonChart = new Chart(ctx, config);
    }
  },

  // 销毁所有图表
  destroyAll() {
    if (this.trendChart) { this.trendChart.destroy(); this.trendChart = null; }
    if (this.resourceChart) { this.resourceChart.destroy(); this.resourceChart = null; }
    if (this.comparisonChart) { this.comparisonChart.destroy(); this.comparisonChart = null; }
  },

  // 主题变化时重绘
  async refreshCharts(accountId) {
    this.destroyAll();
    if (accountId) {
      await this.renderTrendChart(accountId, parseInt(document.getElementById('trendRange')?.value || '30'));
      await this.renderResourceChart(accountId);
    }
  }
};