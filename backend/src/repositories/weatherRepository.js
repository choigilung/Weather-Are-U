const db = require('./db');

const TREND_METRICS = new Set(['pm25', 'pm10', 'temperature', 'humidity', 'co2']);
const EXPORT_METRICS = new Set(['pm25', 'pm10', 'temperature', 'humidity', 'co2']);

const weatherRepository = {
  async getLatestLiveEntries() {
    const query = `
      SELECT DISTINCT ON (region)
        id, region, pm25, pm10, co2, temperature, humidity, source, measured_at
      FROM environment_logs
      ORDER BY region, measured_at DESC;
    `;
    const { rows } = await db.query(query);
    return rows;
  },

  async getHistoryByRegion(region, options = 20) {
    const limit = typeof options === 'number' ? options : options.limit || 20;
    const hours = typeof options === 'object' ? options.hours : null;
    const params = [region];
    let timeFilter = '';

    if (hours) {
      params.push(hours);
      timeFilter = `AND measured_at >= NOW() - ($${params.length} * INTERVAL '1 hour')`;
    }

    params.push(limit);
    const query = `
      SELECT id, region, pm25, pm10, co2, temperature, humidity, source, measured_at
      FROM environment_logs
      WHERE region = $1
      ${timeFilter}
      ORDER BY measured_at DESC
      LIMIT $${params.length};
    `;
    const { rows } = await db.query(query, params);
    return rows;
  },

  async getDailyAveragesByRegion({ region, metric, days }) {
    if (!TREND_METRICS.has(metric)) throw new Error('Unsupported metric.');

    const query = `
      SELECT
        region,
        DATE(measured_at) AS date,
        AVG(${metric})::float AS average
      FROM environment_logs
      WHERE region = $1
        AND measured_at >= NOW() - ($2 * INTERVAL '1 day')
        AND ${metric} IS NOT NULL
      GROUP BY region, DATE(measured_at)
      ORDER BY DATE(measured_at) ASC;
    `;
    const { rows } = await db.query(query, [region, days]);
    return rows;
  },

  async getEnvironmentLogsForExport({ region, startDate, endDate, metrics }) {
    const safeMetrics = metrics.filter((metric) => EXPORT_METRICS.has(metric));
    const selectedMetrics = safeMetrics.length ? safeMetrics : ['pm25', 'pm10', 'temperature', 'humidity', 'co2'];
    const columns = ['measured_at', 'region', ...selectedMetrics, 'source'];
    const query = `
      SELECT ${columns.join(', ')}
      FROM environment_logs
      WHERE region = $1
        AND measured_at >= $2::timestamp
        AND measured_at < ($3::date + INTERVAL '1 day')
      ORDER BY measured_at ASC;
    `;
    const { rows } = await db.query(query, [region, startDate, endDate]);
    return { columns, rows };
  },

  async saveAlertSetting({ userId, region, metric, threshold, condition }) {
    const query = `
      INSERT INTO alert_settings (user_id, region, metric, threshold, condition)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [userId, region, metric, threshold, condition || 'gt']);
    return rows[0];
  },

  async getAlertsByUser(userId) {
    const query = `
      SELECT * FROM alert_settings
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  async getAlertSettingsByRegion(region) {
    const query = `
      SELECT *
      FROM alert_settings
      WHERE region = $1;
    `;
    const { rows } = await db.query(query, [region]);
    return rows;
  },

  async hasRecentAlertRecord({ userId, region, metric, minutes = 30 }) {
    const query = `
      SELECT id
      FROM alert_records
      WHERE user_id = $1
        AND region = $2
        AND metric = $3
        AND created_at >= NOW() - ($4 * INTERVAL '1 minute')
      LIMIT 1;
    `;
    const { rows } = await db.query(query, [userId, region, metric, minutes]);
    return rows.length > 0;
  },

  async createAlertRecord({ userId, metric, thresholdValue, actualValue, message, channel = 'dashboard', region }) {
    const query = `
      INSERT INTO alert_records
        (user_id, metric, threshold_value, actual_value, message, channel, region)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [userId, metric, thresholdValue, actualValue, message, channel, region]);
    return rows[0];
  },

  async getAlertRecordsByUser(userId) {
    const query = `
      SELECT id, user_id, metric, threshold_value, actual_value, message, channel, region, is_read, read_at, created_at
      FROM alert_records
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await db.query(query, [userId]);
    return rows;
  },

  async markAlertRecordAsRead(recordId, userId) {
    const query = `
      UPDATE alert_records
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND user_id = $2;
    `;
    await db.query(query, [recordId, userId]);
  },

  async cleanupOldAlertRecords(userId, keep = 5) {
    const query = `
      DELETE FROM alert_records
      WHERE user_id = $1
        AND id NOT IN (
          SELECT id FROM alert_records
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        );
    `;
    await db.query(query, [userId, keep]);
  },

  async deleteAlert(alertId, userId) {
    const query = `
      DELETE FROM alert_settings
      WHERE id = $1 AND user_id = $2;
    `;
    await db.query(query, [alertId, userId]);
  },
};

module.exports = weatherRepository;
