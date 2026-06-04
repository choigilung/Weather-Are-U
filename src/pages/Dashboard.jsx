import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import AlertPanel from '../components/AlertPanel';
import ExportPanel from '../components/ExportPanel';
import ForecastPanel from '../components/ForecastPanel';
import MapPanel from '../components/MapPanel';
import PdfReportButton from '../components/PdfReportButton';
import Pm25LineChart from '../components/Pm25LineChart';
import RegionCard from '../components/RegionCard';
import TrendChart, { TrendMessage } from '../components/TrendChart';
import { fmt, getPm25Grade } from '../utils/grade';

const REGIONS = ['서울', '부산', '인천', '대구', '창원'];
const CHART_METRICS = [
  { key: 'pm25', label: 'PM2.5', unit: 'ug/m3', color: '#38bdf8', minMax: 20, padding: 8, step: 10 },
  { key: 'pm10', label: 'PM10', unit: 'ug/m3', color: '#0ea5e9', minMax: 30, padding: 10, step: 10 },
  { key: 'temperature', label: '온도', unit: 'C', color: '#f97316', minMax: 30, padding: 5, step: 5 },
  { key: 'humidity', label: '습도', unit: '%', color: '#22d3ee', minMax: 100, padding: 5, step: 10 },
  { key: 'co2', label: 'CO2', unit: 'ppm', color: '#22c55e', minMax: 500, padding: 50, step: 100 },
];

export default function Dashboard() {
  const reportRef = useRef(null);
  const [liveData, setLiveData] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [chartMetricKey, setChartMetricKey] = useState('pm25');
  const [trendPeriod, setTrendPeriod] = useState('7d');
  const [trendMetricKey, setTrendMetricKey] = useState('pm25');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendMessage, setTrendMessage] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastMessage, setForecastMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadLive = useCallback(async () => {
    try {
      setError('');
      const data = await api.get('/api/environment/live');
      setLiveData(data.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (region) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const data = await api.get(`/api/environment/history/${encodeURIComponent(region)}?hours=24&limit=288`);
      setHistory(data.data || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(() => {
    loadLive();
    loadHistory(selectedRegion);
  }, [loadLive, loadHistory, selectedRegion]);

  const loadTrend = useCallback(async ({ region, metric, period }) => {
    setTrendLoading(true);
    setTrendMessage('');
    try {
      const result = await api.get(`/api/analysis/trends?region=${encodeURIComponent(region)}&metric=${metric}&period=${period}`);
      setTrendData(result.data || []);
      if (result.insufficient) setTrendMessage(result.message);
    } catch (err) {
      setTrendData([]);
      setTrendMessage(err.message);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  const loadForecast = useCallback(async ({ region, metric, period }) => {
    setForecastLoading(true);
    setForecastMessage('');
    try {
      const result = await api.get(`/api/analysis/forecast?region=${encodeURIComponent(region)}&metric=${metric}&period=${period}&days=3`);
      setForecastData(result);
      if (result.insufficient) setForecastMessage(result.message);
    } catch (err) {
      setForecastData(null);
      setForecastMessage(err.message);
    } finally {
      setForecastLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLive();
    const timer = setInterval(loadLive, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadLive]);

  useEffect(() => {
    loadHistory(selectedRegion);
    const timer = setInterval(() => loadHistory(selectedRegion), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [selectedRegion, loadHistory]);

  useEffect(() => {
    loadTrend({ region: selectedRegion, metric: trendMetricKey, period: trendPeriod });
    loadForecast({ region: selectedRegion, metric: trendMetricKey, period: trendPeriod });
  }, [selectedRegion, trendMetricKey, trendPeriod, loadTrend, loadForecast]);

  const selectedData = useMemo(
    () => liveData.find((item) => item.region === selectedRegion),
    [liveData, selectedRegion],
  );
  const grade = getPm25Grade(selectedData?.pm25);
  const lifestyleCards = getLifestyleCards(selectedData);
  const chartData = useMemo(
    () => [...history].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at)),
    [history],
  );
  const chartMetric = CHART_METRICS.find((metric) => metric.key === chartMetricKey) || CHART_METRICS[0];
  const trendMetric = CHART_METRICS.find((metric) => metric.key === trendMetricKey) || CHART_METRICS[0];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif", color: '#f1f5f9' }}>
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '0 24px',
        minHeight: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#22c55e', fontWeight: 800, fontSize: 18 }}>WA</span>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>환경 모니터링</span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'dashboard', label: '대시보드' },
            { id: 'map', label: '위치 보기' },
            { id: 'trends', label: '트렌드 분석' },
            { id: 'export', label: 'CSV 내보내기' },
            { id: 'alerts', label: '알림 설정' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                background: tab === item.id ? 'rgba(34,197,94,0.15)' : 'transparent',
                color: tab === item.id ? '#22c55e' : '#94a3b8',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PdfReportButton targetRef={reportRef} disabled={loading || historyLoading} compact onGeneratingChange={setIsGeneratingPdf} />
          <span style={{ color: '#94a3b8', fontSize: 13 }}>공개 대시보드</span>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {error && (
          <div style={{ background: '#451a1a', border: '1px solid #7f1d1d', borderRadius: 8, color: '#fecaca', padding: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {tab === 'dashboard' && (
          <>
            <div ref={reportRef} style={{ background: '#0f172a', padding: 1 }}>
              {isGeneratingPdf && (
                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 18, marginBottom: 16 }}>
                  <h2 style={{ color: '#f1f5f9', fontSize: 20, margin: '0 0 8px' }}>환경 모니터링 대시보드 보고서</h2>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                    생성일시: {new Date().toLocaleString('ko-KR')} / 선택 지역: {selectedRegion}
                  </p>
                  <p style={{ color: '#facc15', fontSize: 12, margin: '8px 0 0' }}>
                    법적 효력이 없는 개인 보관용 스냅샷입니다.
                  </p>
                </div>
              )}
              <div style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              padding: '18px 24px',
              marginBottom: 24,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 16,
              alignItems: 'center',
            }}>
              <SummaryBlock label="선택 지역" value={selectedRegion} />
              <div>
                <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 6px' }}>공기질 등급</p>
                <span style={{
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 14,
                  fontWeight: 700,
                  background: grade.bg,
                  color: grade.color,
                  border: `1px solid ${grade.color}40`,
                }}>
                  {grade.label}
                </span>
              </div>
              <SummaryBlock label="PM2.5" value={fmt(selectedData?.pm25, ' ug/m3')} mono />
              <div>
                <p style={{ color: '#475569', fontSize: 11, margin: '0 0 4px' }}>마지막 갱신</p>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                  {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                </p>
                <button
                  onClick={refreshDashboard}
                  type="button"
                  style={{
                    marginTop: 6,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #334155',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  새로고침
                </button>
              </div>
              </div>

              <h2 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>전국 현황</h2>
            {loading ? (
              <div style={{ color: '#94a3b8', padding: '32px 0' }}>데이터를 불러오는 중입니다...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
                {(liveData.length ? liveData : REGIONS.map((region) => ({ region }))).map((item) => (
                  <RegionCard
                    key={item.region}
                    data={item}
                    selected={selectedRegion === item.region}
                    onClick={() => setSelectedRegion(item.region)}
                  />
                ))}
              </div>
            )}

              <h2 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              생활 밀착형 지수
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 28,
            }}>
              {lifestyleCards.map((card) => (
                <div key={card.title} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 18 }}>
                  <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 8px' }}>{card.title}</p>
                  <p style={{ color: card.color, fontSize: 17, fontWeight: 800, margin: '0 0 8px' }}>{card.value}</p>
                  <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.45, margin: 0 }}>{card.message}</p>
                </div>
              ))}
            </div>

              <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
                {selectedRegion} 지난 24시간 {chartMetric.label} 추이
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {CHART_METRICS.map((metric) => (
                  <button
                    key={metric.key}
                    type="button"
                    onClick={() => setChartMetricKey(metric.key)}
                    style={{
                      border: `1px solid ${chartMetricKey === metric.key ? metric.color : '#334155'}`,
                      background: chartMetricKey === metric.key ? `${metric.color}22` : '#0f172a',
                      color: chartMetricKey === metric.key ? metric.color : '#94a3b8',
                      borderRadius: 8,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
              <Pm25LineChart data={chartData} loading={historyLoading} error={historyError} metric={chartMetric} />
            </div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24, marginTop: 24 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>
                {selectedRegion} 최근 측정 이력
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['측정 시각', 'PM2.5', 'PM10', 'CO2', '온도', '습도'].map((header) => (
                        <th key={header} style={{
                          color: '#64748b',
                          fontWeight: 600,
                          padding: '8px 12px',
                          textAlign: 'left',
                          borderBottom: '1px solid #334155',
                          whiteSpace: 'nowrap',
                        }}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyLoading ? (
                      <tr>
                        <td colSpan={6} style={{ color: '#94a3b8', padding: '20px 12px', textAlign: 'center' }}>
                          이력을 불러오는 중입니다...
                        </td>
                      </tr>
                    ) : history.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ color: '#475569', padding: '20px 12px', textAlign: 'center' }}>
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : history.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ color: '#64748b', padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {new Date(row.measured_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        {['pm25', 'pm10', 'co2', 'temperature', 'humidity'].map((key) => (
                          <td key={key} style={{ color: '#cbd5e1', padding: '10px 12px', fontFamily: 'monospace' }}>
                            {fmt(row[key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'alerts' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <AlertPanel />
          </div>
        )}

        {tab === 'map' && (
          <MapPanel liveData={liveData} selectedRegion={selectedRegion} />
        )}

        {tab === 'trends' && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 24 }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, margin: '0 0 16px' }}>
              {selectedRegion} 트렌드 분석
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['7d', '30d'].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTrendPeriod(period)}
                  style={controlButtonStyle(trendPeriod === period)}
                >
                  {period === '7d' ? '최근 7일' : '최근 30일'}
                </button>
              ))}
              {CHART_METRICS.filter((metric) => metric.key !== 'co2').map((metric) => (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setTrendMetricKey(metric.key)}
                  style={controlButtonStyle(trendMetricKey === metric.key, metric.color)}
                >
                  {metric.label}
                </button>
              ))}
            </div>
            {trendLoading ? (
              <TrendMessage>트렌드 분석 데이터를 불러오는 중입니다...</TrendMessage>
            ) : trendMessage ? (
              <TrendMessage>{trendMessage}</TrendMessage>
            ) : (
              <TrendChart data={trendData} metric={trendMetric} />
            )}
            <ForecastPanel data={forecastData} loading={forecastLoading} message={forecastMessage} metric={trendMetric} />
          </div>
        )}

        {tab === 'export' && (
          <ExportPanel selectedRegion={selectedRegion} />
        )}
      </main>
    </div>
  );
}

function controlButtonStyle(active, color = '#22c55e') {
  return {
    border: `1px solid ${active ? color : '#334155'}`,
    background: active ? `${color}22` : '#0f172a',
    color: active ? color : '#94a3b8',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
  };
}

function SummaryBlock({ label, value, mono = false }) {
  return (
    <div>
      <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: 0, fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value}
      </p>
    </div>
  );
}

function getLifestyleCards(data) {
  if (!data) {
    return [
      { title: '세탁지수', value: '대기 중', message: '지역 데이터를 불러오면 추천을 표시합니다.', color: '#94a3b8' },
      { title: '운동지수', value: '대기 중', message: '지역 데이터를 불러오면 추천을 표시합니다.', color: '#94a3b8' },
      { title: '코디추천', value: '대기 중', message: '지역 데이터를 불러오면 추천을 표시합니다.', color: '#94a3b8' },
      { title: '외출지수', value: '대기 중', message: '지역 데이터를 불러오면 추천을 표시합니다.', color: '#94a3b8' },
    ];
  }

  const pm25 = Number(data.pm25 ?? 0);
  const temp = Number(data.temperature ?? 20);
  const humidity = Number(data.humidity ?? 50);

  const laundryBad = humidity >= 70 || pm25 > 35;
  const exerciseBad = pm25 > 75;
  const exerciseCare = pm25 > 35;
  const outingBad = pm25 > 75;
  const outingCare = pm25 > 35;

  let outfit = '가벼운 옷차림';
  if (temp <= 5) outfit = '두꺼운 외투';
  else if (temp <= 12) outfit = '외투 챙기기';
  else if (temp <= 17) outfit = '얇은 겉옷';
  else if (temp >= 24) outfit = '반팔 추천';

  return [
    {
      title: '세탁지수',
      value: laundryBad ? '실내 건조 권장' : '세탁하기 좋음',
      message: laundryBad ? '습도나 미세먼지가 높아 빨래 건조에 불리합니다.' : '습도와 공기질이 비교적 안정적입니다.',
      color: laundryBad ? '#f97316' : '#22c55e',
    },
    {
      title: '운동지수',
      value: exerciseBad ? '실내 운동 권장' : exerciseCare ? '마스크 권장' : '야외 운동 좋음',
      message: exerciseBad ? '초미세먼지가 높아 야외 운동은 피하는 편이 좋습니다.' : exerciseCare ? '야외 활동 시 마스크를 챙기세요.' : '가벼운 산책이나 운동에 무리가 적습니다.',
      color: exerciseBad ? '#ef4444' : exerciseCare ? '#f97316' : '#22c55e',
    },
    {
      title: '코디추천',
      value: outfit,
      message: pm25 > 35 ? '미세먼지가 있어 마스크도 함께 챙기세요.' : '현재 기온 기준으로 옷차림을 준비하세요.',
      color: '#38bdf8',
    },
    {
      title: '외출지수',
      value: outingBad ? '외출 자제' : outingCare ? '주의 필요' : '외출 무난',
      message: outingBad ? '공기질이 좋지 않아 장시간 외출은 줄이세요.' : outingCare ? '민감군은 외출 시간을 조절하세요.' : '현재 공기질 기준으로 외출하기 무난합니다.',
      color: outingBad ? '#ef4444' : outingCare ? '#f97316' : '#22c55e',
    },
  ];
}
