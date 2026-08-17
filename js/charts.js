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
            label: I18n.t('dashboard.requests'),
            data: data.requests,
            borderColor: colors.accent,
            backgroundColor: colors.accent + '30',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: I18n.t('dashboard.workers'),
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
                return `${context.dataset.label}: ${(context.parsed.y >= 1e8 ? CF_API.formatBytes(context.parsed.y) : CF_API.formatNumber(context.parsed.y))}`;
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
            title: { display: true, text: I18n.t('dashboard.requests'), color: colors.text }
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: colors.text,
              callback: (v) => CF_API.formatNumber(v)
            },
            title: { display: true, text: I18n.t('dashboard.workers'), color: colors.text }
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

    // 带宽原始单位是字节，量级远大于请求数/浏览量，统一换算为 MB（÷1024²）
    // 使环形图各扇区处于相近量级，占比更有意义；tooltip 再还原为字节展示
    const MB = 1024 * 1024;

    const config = {
      type: 'doughnut',
      data: {
        labels: [I18n.t('dashboard.requests'), I18n.t('dashboard.workers'), I18n.t('dashboard.bandwidthLabel'), I18n.t('dashboard.pageViews')],
        datasets: [{
          data: [totalRequests, totalWorkers, totalBandwidth / MB, totalPV],
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
                if (label === I18n.t('dashboard.bandwidthLabel')) {
                  return `${label}: ${CF_API.formatBytes(value * MB)}`;
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
      requests: I18n.t('comparison.metric.requests'),
      workers: I18n.t('comparison.metric.workers'),
      bandwidth: I18n.t('comparison.metric.bandwidth')
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
                const v = context.parsed.y;
                return `${context.dataset.label}: ${(metric === 'bandwidth' ? CF_API.formatBytes(v) : CF_API.formatNumber(v))}`;
              }
            }
          },
          title: {
            display: true,
            text: `${I18n.t('comparison.title')} ${I18n.t(metricLabels[metric] || 'comparison.metric.requests')}`,
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

      // 若当前在对比页，也一并重绘对比图
      const comparePage = document.getElementById('page-comparison');
      if (comparePage && !comparePage.classList.contains('hidden')) {
        const metric = document.getElementById('compareMetric')?.value || 'requests';
        const range = document.getElementById('compareRange')?.value || 'month';
        await this.renderComparisonChart(metric, range);
      }
    }
  }
};