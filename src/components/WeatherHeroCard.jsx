import { getPm25Grade, fmt } from '../utils/grade';

const SKY_DAY   = { 1: '☀️', 3: '⛅', 4: '☁️' };
const SKY_NIGHT = { 1: '🌙', 3: '🌛', 4: '☁️' };
const PTY_EMOJI = { 1: '🌧️', 2: '🌨️', 3: '❄️', 5: '🌦️', 6: '🌨️', 7: '🌨️' };

function isNight(timeStr) {
  const h = timeStr ? parseInt(timeStr.split(':')[0], 10) : new Date().getHours();
  return h >= 20 || h < 6;
}

function weatherEmoji(sky, pty, timeStr) {
  if (pty > 0) return PTY_EMOJI[pty] || '🌧️';
  const table = isNight(timeStr) ? SKY_NIGHT : SKY_DAY;
  return table[sky] || (isNight(timeStr) ? '🌙' : '🌤️');
}

function StatChip({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 12px', borderRadius: 10, background: '#f8f9fa', minWidth: 60 }}>
      <span style={{ color: '#9aa0a6', fontSize: 11, fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#202124', fontSize: 13, fontWeight: 700 }}>{value ?? '-'}</span>
    </div>
  );
}

function HourlyItem({ item, isNow }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      padding: '10px 14px',
      borderRadius: 12,
      background: isNow ? '#e0f2fe' : 'transparent',
      border: isNow ? '1.5px solid #0ea5e9' : '1.5px solid transparent',
      minWidth: 56,
      flexShrink: 0,
    }}>
      <span style={{ color: isNow ? '#0369a1' : '#70757a', fontSize: 11, fontWeight: isNow ? 700 : 500 }}>
        {isNow ? '지금' : item.time}
      </span>
      <span style={{ fontSize: 20 }}>{weatherEmoji(item.sky ?? 1, item.pty ?? 0, item.time)}</span>
      <span style={{ color: '#202124', fontSize: 13, fontWeight: 700 }}>
        {item.temp != null ? `${item.temp}°` : '-'}
      </span>
      {item.pop > 0 && (
        <span style={{ color: '#0ea5e9', fontSize: 11, fontWeight: 600 }}>{item.pop}%</span>
      )}
    </div>
  );
}

export default function WeatherHeroCard({ forecast, liveData, loading }) {
  const pm25Grade = getPm25Grade(liveData?.pm25);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  if (loading || !forecast) {
    return (
      <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#9aa0a6', fontSize: 14 }}>날씨 정보를 불러오는 중...</span>
      </div>
    );
  }

  const { current, today, tomorrow, hourly } = forecast;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* 상단: 오늘 / 내일 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
        {/* 오늘 */}
        <div style={{ padding: '24px 28px 20px' }}>
          <p style={{ color: '#70757a', fontSize: 12, fontWeight: 500, margin: '0 0 10px' }}>
            {forecast.region} · {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 현재
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 52 }}>{weatherEmoji(current.sky, current.pty, null)}</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: '#202124', lineHeight: 1, fontFamily: "'Roboto Mono', monospace" }}>
                  {current.temperature != null ? `${current.temperature}` : '--'}
                </span>
                <span style={{ fontSize: 28, color: '#70757a', fontWeight: 500 }}>°</span>
              </div>
              <p style={{ color: '#5f6368', fontSize: 15, fontWeight: 500, margin: '4px 0 0' }}>{current.condition}</p>
            </div>
          </div>
          <p style={{ color: '#9aa0a6', fontSize: 13, margin: '6px 0 0' }}>
            최저 <strong style={{ color: '#202124' }}>{today.minTemp != null ? `${today.minTemp}°` : '-'}</strong>
            {' · '}
            최고 <strong style={{ color: '#202124' }}>{today.maxTemp != null ? `${today.maxTemp}°` : '-'}</strong>
          </p>
        </div>

        {/* 내일 */}
        <div style={{ padding: '24px 24px 20px', borderLeft: '1px solid #f1f3f4', minWidth: 160 }}>
          <p style={{ color: '#70757a', fontSize: 12, fontWeight: 500, margin: '0 0 10px' }}>
            내일 {tomorrowDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
            <span style={{ color: '#0369a1', fontSize: 14, fontWeight: 500 }}>최저</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#202124', fontFamily: "'Roboto Mono', monospace" }}>
              {tomorrow.minTemp != null ? `${tomorrow.minTemp}°` : '-'}
            </span>
            <span style={{ color: '#9aa0a6', fontSize: 18 }}>/</span>
            <span style={{ color: '#dc2626', fontSize: 14, fontWeight: 500 }}>최고</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#202124', fontFamily: "'Roboto Mono', monospace" }}>
              {tomorrow.maxTemp != null ? `${tomorrow.maxTemp}°` : '-'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#70757a', fontSize: 12 }}>오전</span>
              <span style={{ fontSize: 14 }}>{weatherEmoji(tomorrow.morningSky ?? 1, 0, '09:00')}</span>
              {tomorrow.morningPop > 0 && (
                <span style={{ color: '#0ea5e9', fontSize: 12, fontWeight: 600 }}>{tomorrow.morningPop}%</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#70757a', fontSize: 12 }}>오후</span>
              <span style={{ fontSize: 14 }}>{weatherEmoji(tomorrow.afternoonSky ?? 1, 0, '15:00')}</span>
              {tomorrow.afternoonPop > 0 && (
                <span style={{ color: '#0ea5e9', fontSize: 12, fontWeight: 600 }}>{tomorrow.afternoonPop}%</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 통계 칩 행 */}
      <div style={{ borderTop: '1px solid #f1f3f4', padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <StatChip label="체감" value={current.feelsLike != null ? `${current.feelsLike}°` : null} />
        <StatChip label="바람" value={current.windDirection && current.windSpeed != null ? `${current.windDirection} ${current.windSpeed}m/s` : null} />
        <StatChip label="습도" value={current.humidity != null ? `${current.humidity}%` : null} />
        <StatChip label="PM2.5" value={
          <span style={{ color: pm25Grade.color }}>{fmt(liveData?.pm25)} <span style={{ fontSize: 10 }}>{pm25Grade.label}</span></span>
        } />
        <StatChip label="PM10" value={fmt(liveData?.pm10)} />
        {today.sunrise && <StatChip label="일출" value={today.sunrise} />}
        {today.sunset && <StatChip label="일몰" value={today.sunset} />}
      </div>

      {/* 시간별 예보 스크롤 */}
      {hourly.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f3f4', padding: '12px 20px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {hourly.map((item, idx) => (
              <HourlyItem key={item.time} item={item} isNow={idx === 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
