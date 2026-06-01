const db = require('./db');

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

  async getHistoryByRegion(region, limit = 20) {
    const query = `
      SELECT id, region, pm25, pm10, co2, temperature, humidity, source, measured_at
      FROM environment_logs
      WHERE region = $1
      ORDER BY measured_at DESC
      LIMIT $2;
    `;
    const { rows } = await db.query(query, [region, limit]);
    return rows;
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

  async deleteAlert(alertId, userId) {
    const query = `
      DELETE FROM alert_settings
      WHERE id = $1 AND user_id = $2;
    `;
    await db.query(query, [alertId, userId]);
  },
};

module.exports = weatherRepository;