const weatherRepository = require('../repositories/weatherRepository');

const METRICS = new Set(['pm25', 'pm10', 'temperature', 'humidity', 'co2']);
const PERIODS = { '7d': 7, '30d': 30 };

class TrendAnalyzer {
  async getTrendAnalysis({ region, metric = 'pm25', period = '7d' }) {
    const points = await this.loadDailyAveragePoints({ region, metric, period });

    if (points.length < 2) {
      return this.insufficientResult({ region, metric, period, data: [] });
    }

    const windowSize = period === '7d' ? 3 : 7;
    const movingAverage = this.calculateMovingAverage(points, windowSize);
    const trendLine = this.calculateTrendLine(points);

    return {
      success: true,
      insufficient: false,
      region,
      metric,
      period,
      windowSize,
      data: points.map((point, index) => ({
        ...point,
        movingAverage: movingAverage[index],
        trend: trendLine[index],
      })),
    };
  }

  async getForecast({ region, metric = 'pm25', period = '7d', days = 3 }) {
    const points = await this.loadDailyAveragePoints({ region, metric, period });

    if (points.length < 2) {
      return this.insufficientResult({ region, metric, period, forecast: [] });
    }

    const trendLine = this.calculateTrendLine(points);
    const rawSlope = trendLine.length >= 2 ? trendLine[trendLine.length - 1] - trendLine[trendLine.length - 2] : 0;
    const lastDate = new Date(points[points.length - 1].date);
    const lastValue = points[points.length - 1].average;
    // slope가 너무 가파르면 days 안에 0 밑으로 내려가므로 최솟값 캡핑
    const slope = rawSlope < 0 ? Math.max(rawSlope, -lastValue / (days + 1)) : rawSlope;
    const forecast = Array.from({ length: days }, (_, index) => {
      const date = new Date(lastDate);
      date.setDate(lastDate.getDate() + index + 1);
      return {
        date: date.toISOString().slice(0, 10),
        metric,
        predicted: Number(Math.max(0, lastValue + slope * (index + 1)).toFixed(2)),
      };
    });

    return {
      success: true,
      insufficient: false,
      region,
      metric,
      period,
      method: '최근 일자별 평균 기반 단순 선형 추세 예측',
      notice: '과거 데이터 기반 단순 예측이며 실제 수치와 다를 수 있습니다.',
      history: points,
      forecast,
    };
  }

  async loadDailyAveragePoints({ region, metric, period }) {
    if (!region) throw new Error('region query parameter가 필요합니다.');
    if (!METRICS.has(metric)) throw new Error('지원하지 않는 지표입니다.');
    if (!PERIODS[period]) throw new Error('period는 7d 또는 30d여야 합니다.');

    const rows = await weatherRepository.getDailyAveragesByRegion({ region, metric, days: PERIODS[period] });
    return rows.map((row) => ({
      date: row.date,
      region: row.region,
      metric,
      average: Number(row.average),
    }));
  }

  insufficientResult(extra) {
    return {
      success: true,
      insufficient: true,
      message: '분석에 필요한 데이터가 충분하지 않습니다.',
      ...extra,
    };
  }

  calculateMovingAverage(points, windowSize) {
    return points.map((_, index) => {
      const start = Math.max(0, index - windowSize + 1);
      const slice = points.slice(start, index + 1);
      const sum = slice.reduce((total, point) => total + point.average, 0);
      return Number((sum / slice.length).toFixed(2));
    });
  }

  calculateTrendLine(points) {
    const n = points.length;
    const sumX = points.reduce((sum, _, index) => sum + index, 0);
    const sumY = points.reduce((sum, point) => sum + point.average, 0);
    const sumXY = points.reduce((sum, point, index) => sum + index * point.average, 0);
    const sumXX = points.reduce((sum, _, index) => sum + index * index, 0);
    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return points.map((_, index) => Number((intercept + slope * index).toFixed(2)));
  }
}

module.exports = new TrendAnalyzer();
