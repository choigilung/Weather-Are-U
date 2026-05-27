const pool = require('./db');

const weatherRepository = {
  // 1. 실시간 대기질 데이터를 데이터베이스(DB)에 안전하게 저장하는 함수
  async saveWeatherData({ region, pm25, pm10, co2, temperature, humidity, source }) {
    const query = `
      INSERT INTO environment_logs (region, pm25, pm10, co2, temperature, humidity, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [region, pm25, pm10, co2, temperature, humidity, source];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // 2. 프론트엔드 대시보드 화면에 그려줄 각 지역별 '가장 최신 대기질 로그'만 쏙쏙 골라 뽑아오는 함수
  async getLatestLiveEntries() {
    const query = `
      SELECT DISTINCT ON (region) id, region, pm25, pm10, co2, temperature, humidity, source, measured_at
      FROM environment_logs
      ORDER BY region, measured_at DESC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }
};

module.exports = weatherRepository;