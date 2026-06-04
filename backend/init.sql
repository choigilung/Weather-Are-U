CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS environment_logs (
  id           SERIAL PRIMARY KEY,
  region       VARCHAR(50) NOT NULL,
  pm25         NUMERIC(6,2),
  pm10         NUMERIC(6,2),
  co2          NUMERIC(8,2),
  temperature  NUMERIC(5,2),
  humidity     NUMERIC(5,2),
  source       VARCHAR(30) DEFAULT 'simulation',
  measured_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_env_region_time
  ON environment_logs (region, measured_at DESC);

CREATE TABLE IF NOT EXISTS alert_settings (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  region     VARCHAR(50) NOT NULL,
  metric     VARCHAR(20) NOT NULL,
  threshold  NUMERIC(8,2) NOT NULL,
  condition  VARCHAR(5)  NOT NULL DEFAULT 'gt',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_records (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric          VARCHAR(20) NOT NULL,
  threshold_value NUMERIC(8,2) NOT NULL,
  actual_value    NUMERIC(8,2) NOT NULL,
  message         TEXT NOT NULL,
  channel         VARCHAR(20) NOT NULL DEFAULT 'dashboard',
  region          VARCHAR(50) NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_records_dedupe
  ON alert_records (user_id, region, metric, created_at DESC);
