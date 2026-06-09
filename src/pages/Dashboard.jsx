import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import AlertPanel from '../components/AlertPanel';
import WeatherHeroCard from '../components/WeatherHeroCard';
import ExportPanel from '../components/ExportPanel';
import ForecastPanel from '../components/ForecastPanel';
import MapPanel from '../components/NaverMapPanel';
import PdfReportButton from '../components/PdfReportButton';
import Pm25LineChart from '../components/Pm25LineChart';
import TrendChart, { TrendMessage } from '../components/TrendChart';
import { DEFAULT_REGION_META, fetchRegions } from '../services/regions';
import { fmt, getPm25Grade } from '../utils/grade';

const CHART_METRICS = [
  { key: 'pm25', label: 'PM2.5', unit: 'ug/m3', color: '#1589F0', minMax: 20, padding: 8, step: 10 },
  { key: 'pm10', label: 'PM10', unit: 'ug/m3', color: '#1589F0', minMax: 30, padding: 10, step: 10 },
  { key: 'temperature', label: '온도', unit: '°C', color: '#f97316', minMax: 30, padding: 5, step: 5 },
  { key: 'humidity', label: '습도', unit: '%', color: '#0ea5e9', minMax: 100, padding: 5, step: 10 },
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
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertRecords, setAlertRecords] = useState([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [weatherForecast, setWeatherForecast] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [regionMeta, setRegionMeta] = useState(DEFAULT_REGION_META);

  const loadLive = useCallback(async () => {
    try {
      setError('');
      const data = await api.get('/api/environment/live');
      setLiveData(data.data || []);
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
      const data = await api.get(`/api/environment/history/${encodeURIComponent(region)}?limit=15`);
      setHistory(data.data || []);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

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

  const loadWeatherForecast = useCallback(async (region) => {
    setWeatherLoading(true);
    try {
      const data = await api.get(`/api/weather/forecast?region=${encodeURIComponent(region)}`);
      setWeatherForecast(data.data || null);
    } catch {
      setWeatherForecast(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const loadAlertRecords = useCallback(async () => {
    try {
      const data = await api.get('/api/alerts/history');
      setAlertRecords((data.data || []).slice(0, 3));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadLive();
    const timer = setInterval(loadLive, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [loadLive]);

  useEffect(() => {
    fetchRegions().then(setRegionMeta);
  }, []);

  useEffect(() => { loadAlertRecords(); }, [loadAlertRecords]);

  useEffect(() => {
    loadWeatherForecast(selectedRegion);
  }, [selectedRegion, loadWeatherForecast]);

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
  const lifestyleCards = getLifestyleCards(selectedData);
  const chartData = useMemo(
    () => [...history].sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at)),
    [history],
  );
  const chartMetric = CHART_METRICS.find((m) => m.key === chartMetricKey) || CHART_METRICS[0];
  const trendMetric = CHART_METRICS.find((m) => m.key === trendMetricKey) || CHART_METRICS[0];
  const regionList = useMemo(() => {
    const liveByRegion = new Map(liveData.map((item) => [item.region, item]));
    const knownNames = new Set(regionMeta.map((region) => region.name));
    const ordered = regionMeta.map((region) => liveByRegion.get(region.name) || { region: region.name });
    const extras = liveData.filter((item) => !knownNames.has(item.region));
    return [...ordered, ...extras];
  }, [liveData, regionMeta]);

  useEffect(() => {
    if (!alertModalOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setAlertModalOpen(false);
        setExportModalOpen(false);
        loadAlertRecords();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [alertModalOpen, exportModalOpen, loadAlertRecords]);

  const NAV = [
    { id: 'dashboard', label: '홈' },
    { id: 'map', label: '지도' },
    { id: 'trends', label: '트렌드 분석' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f9ff 0%, #f7f8fa 40%)', fontFamily: "'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif", fontSize: 14, color: '#202124' }}>
      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e0f2fe',
        padding: '0 28px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(14,165,233,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <img src="/favicon.svg" alt="logo" style={{ width: 26, height: 29 }} />
          <span style={{
            fontWeight: 800,
            fontSize: 25,
            letterSpacing: '-0.1px',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>WA</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'stretch', height: 60, flex: 1, justifyContent: 'center' }}>
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
              style={{
                padding: '0 18px',
                border: 'none',
                borderBottom: tab === item.id ? '2.5px solid #0ea5e9' : '2.5px solid transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: tab === item.id ? 700 : 500,
                background: 'transparent',
                color: tab === item.id ? '#0ea5e9' : '#5f6368',
                transition: 'color 120ms, border-color 120ms',
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ flexShrink: 0 }}>
          <PdfReportButton targetRef={reportRef} disabled={loading || historyLoading} compact onGeneratingChange={setIsGeneratingPdf} />
        </div>
      </header>

      <main ref={reportRef} style={{ padding: '20px 28px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', padding: '10px 16px', marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {tab === 'dashboard' && (
          <div>
            {isGeneratingPdf && (
              <div style={{ background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '16px 20px', marginBottom: 14 }}>
                <h2 style={{ color: '#202124', fontSize: 17, margin: '0 0 4px' }}>환경 모니터링 대시보드 보고서</h2>
                <p style={{ color: '#70757a', fontSize: 12, margin: 0 }}>
                  생성일시: {new Date().toLocaleString('ko-KR')} / 선택 지역: {selectedRegion}
                </p>
              </div>
            )}

            {/* 지역 선택 칩 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {regionList.map((item) => {
                const g = getPm25Grade(item.pm25);
                const active = selectedRegion === item.region;
                return (
                  <button
                    key={item.region}
                    onClick={() => setSelectedRegion(item.region)}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 16px',
                      borderRadius: 20,
                      border: active ? 'none' : '1.5px solid #e8eaed',
                      background: active ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#ffffff',
                      color: active ? '#ffffff' : '#5f6368',
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 120ms',
                      boxShadow: active ? '0 2px 8px rgba(14,165,233,0.35)' : 'none',
                    }}
                  >
                    {item.pm25 != null && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : g.color, flexShrink: 0 }} />
                    )}
                    {item.region}
                  </button>
                );
              })}
            </div>

            {/* 2컬럼 레이아웃 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 14, alignItems: 'start' }}>
              {/* 왼쪽 메인 */}
              <div>
                {/* 날씨 히어로 카드 */}
                <WeatherHeroCard
                  forecast={weatherForecast}
                  liveData={selectedData}
                  loading={weatherLoading}
                />

                {/* 24시간 추이 차트 */}
                <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '20px 24px', marginTop: 12, boxShadow: '0 2px 8px rgba(14,165,233,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                    <h3 style={{ color: '#202124', fontSize: 14, fontWeight: 700, margin: 0, paddingLeft: 10, borderLeft: '3px solid #0ea5e9' }}>{selectedRegion} 지난 24시간 추이</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {CHART_METRICS.map((metric) => (
                        <button
                          key={metric.key}
                          type="button"
                          onClick={() => setChartMetricKey(metric.key)}
                          style={{
                            border: `1px solid ${chartMetricKey === metric.key ? metric.color : '#e8eaed'}`,
                            background: chartMetricKey === metric.key ? `${metric.color}15` : '#f8f9fa',
                            color: chartMetricKey === metric.key ? metric.color : '#70757a',
                            borderRadius: 20,
                            padding: '4px 12px',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            transition: 'all 120ms',
                          }}
                        >
                          {metric.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Pm25LineChart data={chartData} loading={historyLoading} error={historyError} metric={chartMetric} />
                </div>

                {/* 생활 지수 */}
                <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '20px 24px', marginTop: 12, boxShadow: '0 2px 8px rgba(14,165,233,0.06)' }}>
                  <h3 style={{ color: '#202124', fontSize: 14, fontWeight: 700, margin: '0 0 16px', paddingLeft: 10, borderLeft: '3px solid #f97316' }}>오늘의 생활 지수</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {lifestyleCards.map((card) => (
                      <div key={card.title} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '16px 8px 12px',
                        borderRadius: 12,
                        background: `linear-gradient(145deg, ${card.color}10 0%, #f8f9fa 100%)`,
                        border: `1px solid ${card.color}20`,
                        gap: 8,
                      }}>
                        <EmojiGauge color={card.color} grade={card.grade} score={card.score} size={68} />
                        <p style={{ color: '#202124', fontSize: 13, fontWeight: 600, margin: 0 }}>{card.title}</p>
                        <p style={{ color: card.color, fontSize: 12, fontWeight: 700, margin: 0 }}>{card.grade}</p>
                        {card.value && (
                          <p style={{
                            color: '#5f6368',
                            fontSize: 11,
                            fontWeight: 500,
                            lineHeight: 1.35,
                            margin: 0,
                            textAlign: 'center',
                            wordBreak: 'keep-all',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {card.value}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 측정 이력 테이블 */}
                <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '20px 24px', marginTop: 12, boxShadow: '0 2px 8px rgba(14,165,233,0.06)' }}>
                  <h3 style={{ color: '#202124', fontSize: 14, fontWeight: 700, margin: '0 0 14px', paddingLeft: 10, borderLeft: '3px solid #22c55e' }}>{selectedRegion} 최근 측정 이력</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          {['측정 시각', 'PM2.5', 'PM10', 'CO2', '온도', '습도'].map((header) => (
                            <th key={header} style={{
                              color: '#70757a',
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '8px 10px',
                              textAlign: 'left',
                              borderBottom: '1px solid #f1f3f4',
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
                            <td colSpan={6} style={{ color: '#9aa0a6', padding: '24px 10px', textAlign: 'center' }}>
                              이력을 불러오는 중입니다...
                            </td>
                          </tr>
                        ) : history.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ color: '#9aa0a6', padding: '24px 10px', textAlign: 'center' }}>
                              데이터가 없습니다.
                            </td>
                          </tr>
                        ) : history.slice(0, 15).map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f8f9fa' }}>
                            <td style={{ color: '#70757a', padding: '9px 10px', whiteSpace: 'nowrap' }}>
                              {new Date(row.measured_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            {['pm25', 'pm10', 'co2', 'temperature', 'humidity'].map((key) => (
                              <td key={key} style={{ color: '#202124', padding: '9px 10px', fontFamily: "'Roboto Mono', monospace" }}>
                                {fmt(row[key])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 오른쪽 사이드바 */}
              <aside style={{ position: 'sticky', top: 76, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 전국 현황 */}
                <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(14,165,233,0.06)' }}>
                  <div style={{ padding: '14px 16px 10px', background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)', borderBottom: '1px solid #e0f2fe' }}>
                    <h3 style={{ color: '#0369a1', fontSize: 14, fontWeight: 700, margin: 0 }}>🗺 전국 현황</h3>
                  </div>
                  {loading ? (
                    <p style={{ color: '#9aa0a6', fontSize: 13, padding: '20px 16px', textAlign: 'center', margin: 0 }}>불러오는 중...</p>
                  ) : (
                    <div style={{ padding: '6px 0 10px' }}>
                      {regionList.map((item) => {
                        const g = getPm25Grade(item.pm25);
                        const isSelected = selectedRegion === item.region;
                        return (
                          <button
                            key={item.region}
                            onClick={() => setSelectedRegion(item.region)}
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              borderLeft: `3px solid ${isSelected ? '#0ea5e9' : 'transparent'}`,
                              background: isSelected ? '#f0f9ff' : 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              gap: 8,
                              transition: 'background 120ms',
                            }}
                          >
                            <span style={{ flex: 1, color: '#202124', fontSize: 14, fontWeight: isSelected ? 700 : 500 }}>
                              {item.region}
                            </span>
                            {item.pm25 != null ? (
                              <>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                                <span style={{ color: g.color, fontSize: 12, fontWeight: 700, minWidth: 40 }}>{g.label}</span>
                                <span style={{ color: '#202124', fontSize: 13, fontWeight: 700, fontFamily: "'Roboto Mono', monospace", minWidth: 30, textAlign: 'right' }}>
                                  {Number(item.pm25).toFixed(1)}
                                </span>
                              </>
                            ) : (
                              <span style={{ color: '#9aa0a6', fontSize: 12 }}>-</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 알림 설정 카드 */}
                <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(14,165,233,0.06)' }}>
                  <h3 style={{ color: '#202124', fontSize: 14, fontWeight: 700, margin: '0 0 8px', paddingLeft: 10, borderLeft: '3px solid #0ea5e9' }}>알림 설정</h3>
                  <p style={{ color: '#70757a', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                    PM2.5, PM10, 온도, 습도 기준 알림을 설정할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAlertModalOpen(true)}
                    style={{
                      width: '100%',
                      border: '1px solid #0ea5e9',
                      background: '#0ea5e9',
                      color: '#ffffff',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    알림 설정 열기
                  </button>

                  {alertRecords.length > 0 && (
                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ color: '#9aa0a6', fontSize: 11, fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>최근 알림</p>
                      {alertRecords.map((record) => (
                        <div key={record.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{
                            marginTop: 4,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: record.is_read ? '#e8eaed' : '#e50ee9',
                            flexShrink: 0,
                          }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{
                              color: '#202124',
                              fontSize: 12,
                              lineHeight: 1.4,
                              margin: '0 0 2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {record.message}
                            </p>
                            <p style={{ color: '#9aa0a6', fontSize: 11, margin: 0 }}>
                              {new Date(record.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* CSV 내보내기 카드 */}
                <div style={{ background: '#ffffff', border: '1px solid #e8eaed', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(14,165,233,0.06)' }}>
                  <h3 style={{ color: '#202124', fontSize: 14, fontWeight: 700, margin: '0 0 8px', paddingLeft: 10, borderLeft: '3px solid #22c55e' }}>CSV 내보내기</h3>
                  <p style={{ color: '#70757a', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                    측정 데이터를 날짜·지역·항목별로 CSV로 다운로드할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setExportModalOpen(true)}
                    style={{
                      width: '100%',
                      border: '1px solid #0ea5e9',
                      background: '#0ea5e9',
                      color: '#ffffff',
                      borderRadius: 10,
                      padding: '9px 12px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    CSV 내보내기 열기
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}

        {tab === 'map' && (
          <MapPanel liveData={liveData} selectedRegion={selectedRegion} onSelectRegion={setSelectedRegion} regions={regionMeta} />
        )}

        {tab === 'trends' && (
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <section style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 4px 16px rgba(14,165,233,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
                <div>
                  <h2 style={{ color: '#202124', fontSize: 20, fontWeight: 900, margin: '0 0 4px', paddingLeft: 12, borderLeft: '4px solid #0ea5e9' }}>
                    {selectedRegion} 트렌드 분석
                  </h2>
                  <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
                    최근 환경 데이터의 일자별 평균, 이동 평균, 추세를 확인합니다.
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                  {['7d', '30d'].map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setTrendPeriod(period)}
                      style={chipBtn(trendPeriod === period)}
                    >
                      {period === '7d' ? '최근 7일' : '최근 30일'}
                    </button>
                  ))}
                  {CHART_METRICS.filter((m) => m.key !== 'co2').map((metric) => (
                    <button
                      key={metric.key}
                      type="button"
                      onClick={() => setTrendMetricKey(metric.key)}
                      style={chipBtn(trendMetricKey === metric.key, metric.color)}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>
              {trendLoading ? (
                <TrendMessage>트렌드 분석 데이터를 불러오는 중입니다...</TrendMessage>
              ) : trendMessage ? (
                <TrendMessage>{trendMessage}</TrendMessage>
              ) : (
                <TrendChart data={trendData} metric={trendMetric} />
              )}
              <ForecastPanel data={forecastData} loading={forecastLoading} message={forecastMessage} metric={trendMetric} />
            </section>
          </div>
        )}

      </main>

      {/* CSV 내보내기 모달 */}
      {exportModalOpen && (
        <div
          onClick={() => setExportModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: 540,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#202124', fontSize: 16, fontWeight: 800, margin: 0 }}>CSV 내보내기</h2>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #e8eaed',
                  borderRadius: 8,
                  color: '#5f6368',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: '4px 10px',
                }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <ExportPanel selectedRegion={selectedRegion} />
          </div>
        </div>
      )}

      {/* 알림 설정 모달 */}
      {alertModalOpen && (
        <div
          onClick={() => { setAlertModalOpen(false); loadAlertRecords(); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '28px 28px 24px',
              width: '100%',
              maxWidth: 540,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#202124', fontSize: 16, fontWeight: 800, margin: 0 }}>알림 설정</h2>
              <button
                type="button"
                onClick={() => { setAlertModalOpen(false); loadAlertRecords(); }}
                style={{
                  background: '#f8f9fa',
                  border: '1px solid #e8eaed',
                  borderRadius: 8,
                  color: '#5f6368',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: '4px 10px',
                }}
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <AlertPanel />
          </div>
        </div>
      )}
    </div>
  );
}

function chipBtn(active, color = '#0ea5e9') {
  return {
    border: `1px solid ${active ? color : '#e8eaed'}`,
    background: active ? `${color}15` : '#f8f9fa',
    color: active ? color : '#70757a',
    borderRadius: 20,
    padding: '5px 14px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    transition: 'all 120ms',
  };
}

function EmojiGauge({ color, grade, score, size = 68 }) {
  const isGood = grade === '좋음';
  const isBad = grade === '나쁨' || grade === '매우 나쁨';
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = `${(score / 100) * circ} ${circ}`;

  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true">
      <circle cx="30" cy="30" r={r} fill="none" stroke="#f1f3f4" strokeWidth="4" />
      <circle
        cx="30" cy="30" r={r}
        fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={dash}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
      />
      <circle cx="30" cy="30" r="14" fill={`${color}18`} />
      <circle cx="24" cy="27" r="2.2" fill={color} />
      <circle cx="36" cy="27" r="2.2" fill={color} />
      {isGood && (
        <path d="M 22 34 Q 30 41 38 34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      )}
      {isBad && (
        <path d="M 22 38 Q 30 31 38 38" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      )}
      {!isGood && !isBad && (
        <line x1="22" y1="36" x2="38" y2="36" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

function getLifestyleCards(data) {
  if (!data) {
    return [
      { title: '세탁지수', grade: '보통', value: '지역 데이터를 확인 중이에요.', score: 55, color: '#eab308' },
      { title: '운동지수', grade: '보통', value: '운동하기 좋은지 확인 중이에요.', score: 55, color: '#eab308' },
      { title: '코디추천', grade: '보통', value: '오늘의 옷차림을 확인 중이에요.', score: 55, color: '#eab308' },
      { title: '외출지수', grade: '보통', value: '외출 준비물을 확인 중이에요.', score: 55, color: '#eab308' },
    ];
  }

  const pm25 = Number(data.pm25 ?? 0);
  const pm10 = Number(data.pm10 ?? 0);
  const temp = Number(data.temperature ?? 20);
  const humidity = Number(data.humidity ?? 50);

  const laundryBad = humidity >= 70 || pm25 > 35;
  const exerciseBad = pm25 > 75;
  const exerciseCare = pm25 > 35;
  const outingBad = pm25 > 75;
  const outingCare = pm25 > 35;
  const umbrellaCare = humidity >= 75;
  const maskCare = pm25 > 35 || pm10 > 80;

  const outfit = getOutfitRecommendation({ temp, umbrellaCare });
  const outingComment = getOutingComment({ outingBad, outingCare, maskCare, umbrellaCare });

  return [
    {
      title: '세탁지수',
      grade: laundryBad ? '나쁨' : '좋음',
      value: laundryBad ? '오늘은 실내건조 추천!' : '오늘은 야외건조하기 좋은 날씨에요!',
      score: laundryBad ? 35 : 85,
      color: laundryBad ? '#f97316' : '#22c55e',
    },
    {
      title: '운동지수',
      grade: exerciseBad ? '나쁨' : exerciseCare ? '보통' : '좋음',
      value: exerciseBad ? '오늘은 실내운동을 추천해요.' : exerciseCare ? '가벼운 산책 정도가 좋아요.' : '러닝하기 딱 좋은 날씨!',
      score: exerciseBad ? 30 : exerciseCare ? 60 : 88,
      color: exerciseBad ? '#f97316' : exerciseCare ? '#eab308' : '#22c55e',
    },
    {
      title: '코디추천',
      value: outfit.text,
      grade: outfit.grade,
      score: outfit.score,
      color: outfit.color,
    },
    {
      title: '외출지수',
      grade: outingBad ? '나쁨' : outingCare ? '보통' : '좋음',
      value: outingComment,
      score: outingBad ? 30 : outingCare ? 58 : 86,
      color: outingBad ? '#f97316' : outingCare ? '#eab308' : '#22c55e',
    },
  ];
}

function getOutfitRecommendation({ temp, umbrellaCare }) {
  let base;
  let grade = '좋음';
  let score = 82;
  let color = '#22c55e';

  if (temp <= 4) {
    base = '패딩·목도리';
    grade = '보통';
    score = 58;
    color = '#eab308';
  } else if (temp <= 8) {
    base = '코트·니트';
    grade = '보통';
    score = 62;
    color = '#eab308';
  } else if (temp <= 12) {
    base = '자켓·가디건';
    grade = '보통';
    score = 66;
    color = '#eab308';
  } else if (temp <= 17) {
    base = '얇은 겉옷';
  } else if (temp <= 22) {
    base = '긴팔·셔츠';
  } else if (temp <= 27) {
    base = '반팔·얇은 옷';
  } else {
    base = '통풍 잘되는 옷';
    grade = '보통';
    score = 64;
    color = '#eab308';
  }

  const items = [];
  if (umbrellaCare) items.push('우산 확인');

  if (items.length && grade === '좋음') {
    grade = '보통';
    score = 68;
    color = '#eab308';
  }

  return {
    text: items.length ? `${base} + ${items.join('·')}` : base,
    grade,
    score,
    color,
  };
}

function getOutingComment({ outingBad, outingCare, maskCare, umbrellaCare }) {
  const items = [];
  if (maskCare) items.push('마스크 챙기기');
  if (umbrellaCare) items.push('우산 확인');

  if (outingBad) {
    return items.length ? `외출은 짧게, ${items.join('·')}!` : '오래 외출은 피하는 게 좋아요.';
  }
  if (outingCare) {
    return items.length ? `나갈 땐 ${items.join('·')}!` : '민감하면 외출 시간을 줄여요.';
  }
  return items.length ? `외출하기 좋아요. ${items.join('·')}!` : '가볍게 외출하기 좋은 날이에요!';
}
