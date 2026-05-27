const db = require('../repositories/db');

class WeatherEngine {
  constructor() { this.pollingInterval = 5; }

  // FR-003: 가상 측정값 생성 시뮬레이션
  generateSimulationData(region) {
    return {
      region,
      pm25: Math.floor(Math.random() * 80) + 5,       
      pm10: Math.floor(Math.random() * 120) + 10,     
      co2: Math.floor(Math.random() * 300) + 350,      
      temperature: parseFloat((Math.random() * 15 + 15).toFixed(1)), 
      humidity: Math.floor(Math.random() * 40) + 40,   
      measured_at: new Date(),
      source: 'simulation'
    };
  }

  async fetchAirKoreaData(region) { return this.generateSimulationData(region); }

  // 3-Tier 규칙을 준수하여 Persistence 레이어에 저장 위임
  async saveEnvironmentLog(data) {
    const queryText = `
      INSERT INTO environment_logs (region, pm25, pm10, co2, temperature, humidity, measured_at, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
    `;
    const values = [data.region, data.pm25, data.pm10, data.co2, data.temperature, data.humidity, data.measured_at, data.source];
    const res = await db.query(queryText, values);
    console.log(`[WeatherEngine] ${data.region} 데이터 수집 및 DB 저장 완료! (Log ID: ${res.rows[0].id})`);
    return res.rows[0].id;
  }
}
module.exports = new WeatherEngine();