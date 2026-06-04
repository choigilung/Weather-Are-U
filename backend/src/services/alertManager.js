const weatherRepository = require('../repositories/weatherRepository');
const notificationFactory = require('./notifications/notificationFactory');

const METRIC_LABELS = {
  pm25: { label: 'PM2.5', unit: 'ug/m3' },
  pm10: { label: 'PM10', unit: 'ug/m3' },
  co2: { label: 'CO2', unit: 'ppm' },
  temperature: { label: '온도', unit: 'C' },
  humidity: { label: '습도', unit: '%' },
};

class AlertManager {
  async checkThresholds(environmentData) {
    const settings = await weatherRepository.getAlertSettingsByRegion(environmentData.region);
    const createdRecords = [];

    for (const setting of settings) {
      const actualValue = Number(environmentData[setting.metric]);
      const thresholdValue = Number(setting.threshold);

      if (!Number.isFinite(actualValue) || !Number.isFinite(thresholdValue)) continue;
      if (!this.isTriggered(actualValue, thresholdValue, setting.condition)) continue;

      const isDuplicate = await weatherRepository.hasRecentAlertRecord({
        userId: setting.user_id,
        region: setting.region,
        metric: setting.metric,
        minutes: 30,
      });

      if (isDuplicate) continue;

      const record = await this.triggerAlert({
        userId: setting.user_id,
        region: setting.region,
        metric: setting.metric,
        actualValue,
        thresholdValue,
        condition: setting.condition,
      });
      createdRecords.push(record);
    }

    return createdRecords;
  }

  async triggerAlert({ userId, region, metric, actualValue, thresholdValue, condition }) {
    const message = this.formatMessage({ region, metric, actualValue, thresholdValue, condition });
    const channel = 'push';
    const record = await weatherRepository.createAlertRecord({
      userId,
      metric,
      thresholdValue,
      actualValue,
      message,
      channel,
      region,
    });

    const notification = notificationFactory.create(channel);
    await notification.send({ userId, message, record });

    return record;
  }

  isTriggered(actualValue, thresholdValue, condition = 'gt') {
    return condition === 'lt' ? actualValue < thresholdValue : actualValue > thresholdValue;
  }

  formatMessage({ region, metric, actualValue, thresholdValue, condition }) {
    const meta = METRIC_LABELS[metric] || { label: metric, unit: '' };
    const operatorText = condition === 'lt' ? '미만입니다' : '초과했습니다';
    const unit = meta.unit ? ` ${meta.unit}` : '';
    return `${region} ${meta.label} 수치가 ${actualValue}${unit}로 설정 임계값 ${thresholdValue}${unit}을 ${operatorText}.`;
  }
}

module.exports = new AlertManager();
