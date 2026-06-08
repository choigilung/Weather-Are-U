import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { DEFAULT_REGION_META, fetchRegions, regionsToCoords } from '../services/regions';

const NAVER_MAPS_KEY_ID = import.meta.env.VITE_NAVER_MAPS_KEY_ID;

const SKY_DAY = { 1: '☀️', 3: '⛅', 4: '☁️' };
const SKY_NIGHT = { 1: '🌙', 3: '🌛', 4: '☁️' };
const PTY_EMOJI = { 1: '🌧️', 2: '🌨️', 3: '❄️', 5: '🌦️', 6: '🌨️', 7: '🌨️' };

let naverMapsPromise = null;

function loadNaverMaps() {
  if (!NAVER_MAPS_KEY_ID) return Promise.reject(new Error('네이버 지도 API 키가 설정되어 있지 않습니다.'));
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (naverMapsPromise) return naverMapsPromise;

  naverMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAPS_KEY_ID)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else reject(new Error('네이버 지도 SDK를 초기화하지 못했습니다.'));
    };
    script.onerror = () => reject(new Error('네이버 지도를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  return naverMapsPromise;
}

function weatherEmoji(sky, pty, timeStr) {
  if (pty > 0) return PTY_EMOJI[pty] || '🌧️';
  const h = timeStr ? parseInt(timeStr.split(':')[0], 10) : new Date().getHours();
  const night = h >= 20 || h < 6;
  return (night ? SKY_NIGHT : SKY_DAY)[sky] || (night ? '🌙' : '☀️');
}

function pm25ToColor(pm25) {
  if (pm25 == null) return '#94a3b8';
  if (pm25 <= 15) return '#22c55e';
  if (pm25 <= 35) return '#f59e0b';
  if (pm25 <= 75) return '#ef4444';
  return '#7c3aed';
}

function fmtValue(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}${suffix}`;
}

function makeMarkerHtml({ active, region, temp, emoji, humidity }) {
  if (active) {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-10px);">
        <div style="background:#fff;color:#202124;padding:10px 14px;border-radius:12px;
          font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 8px 22px rgba(15,23,42,.22);
          border:1px solid rgba(226,232,240,.95);min-width:96px;text-align:center;">
          <div style="font-size:14px;font-weight:900;margin-bottom:4px;">${region}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:3px;">
            <span style="font-size:18px">${emoji}</span>
            <span style="font-size:28px;font-weight:900;line-height:1;">${temp}</span>
          </div>
          <div style="color:#70757a;font-size:11px;font-weight:700;">습도 ${fmtValue(humidity, '%')}</div>
        </div>
        <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid #fff;"></div>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-6px);">
      <div style="background:rgba(31,41,55,.78);color:white;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:800;
        font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 9px rgba(0,0,0,.22);
        border:1px solid rgba(255,255,255,.16);display:flex;align-items:center;gap:5px;">
        <span style="font-size:13px">${emoji}</span>
        <span>${region}</span>
        <span style="color:#bfdbfe;font-size:13px">${temp}</span>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid rgba(31,41,55,.78);"></div>
    </div>
  `;
}

export default function NaverMapPanel({ liveData, selectedRegion, onSelectRegion, regions: initialRegions }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const tempCirclesRef = useRef([]);
  const windMarkersRef = useRef([]);
  const pm25CirclesRef = useRef([]);

  const [status, setStatus] = useState('loading');
  const [mapError, setMapError] = useState('');
  const [activeRegion, setActiveRegion] = useState(selectedRegion || '서울');
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [regions, setRegions] = useState(initialRegions?.length ? initialRegions : DEFAULT_REGION_META);
  const [layers, setLayers] = useState({ temp: false, wind: true, air: false });

  const regionCoords = useMemo(() => regionsToCoords(regions), [regions]);
  const regionNames = useMemo(() => regions.map((region) => region.name), [regions]);

  const loadForecast = useCallback(async (region) => {
    setForecastLoading(true);
    try {
      const data = await api.get(`/api/weather/forecast?region=${encodeURIComponent(region)}`);
      setForecast(data.data || null);
    } catch {
      setForecast(null);
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const handleRegionClick = useCallback((region) => {
    setActiveRegion(region);
    if (onSelectRegion) onSelectRegion(region);
    loadForecast(region);
  }, [loadForecast, onSelectRegion]);

  useEffect(() => {
    if (initialRegions?.length) setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    fetchRegions().then(setRegions);
  }, []);

  useEffect(() => {
    if (!selectedRegion || selectedRegion === activeRegion) return;
    setActiveRegion(selectedRegion);
    loadForecast(selectedRegion);
  }, [activeRegion, loadForecast, selectedRegion]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const maps = await loadNaverMaps();
        if (cancelled || !mapEl.current) return;

        mapRef.current = new maps.Map(mapEl.current, {
          center: new maps.LatLng(36.5, 127.8),
          zoom: 7,
          minZoom: 5,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: true,
          mapDataControl: true,
          zoomControl: true,
          zoomControlOptions: { position: maps.Position.LEFT_BOTTOM },
        });

        setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          setMapError(error.message);
          setStatus('error');
        }
      }
    }

    init();
    loadForecast(selectedRegion || '서울');
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const maps = window.naver.maps;
    regionNames.forEach((region) => {
      const pos = regionCoords[region];
      if (!pos) return;
      const item = liveData.find((data) => data.region === region) || {};
      const active = region === activeRegion;
      const temp = item.temperature != null ? `${Math.round(Number(item.temperature))}°` : '-';
      const html = makeMarkerHtml({
        active,
        region,
        temp,
        humidity: item.humidity,
        emoji: weatherEmoji(forecast?.current?.sky ?? 1, forecast?.current?.pty ?? 0, null),
      });

      const marker = new maps.Marker({
        position: new maps.LatLng(pos.lat, pos.lng),
        map: mapRef.current,
        zIndex: active ? 20 : 1,
        icon: {
          content: html,
          anchor: new maps.Point(0, 0),
        },
      });

      maps.Event.addListener(marker, 'click', () => handleRegionClick(region));
      markersRef.current.push(marker);
    });
  }, [activeRegion, forecast, handleRegionClick, liveData, regionCoords, regionNames, status]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    tempCirclesRef.current.forEach((circle) => circle.setMap(null));
    tempCirclesRef.current = [];
    if (!layers.temp) return;

    const maps = window.naver.maps;
    regionNames.forEach((region) => {
      const pos = regionCoords[region];
      const item = liveData.find((data) => data.region === region);
      if (!pos || item?.temperature == null) return;
      const temp = Number(item.temperature);
      const color = temp >= 28 ? '#ef4444' : temp >= 23 ? '#f97316' : temp >= 18 ? '#eab308' : '#38bdf8';
      tempCirclesRef.current.push(new maps.Circle({
        map: mapRef.current,
        center: new maps.LatLng(pos.lat, pos.lng),
        radius: 90000,
        fillColor: color,
        fillOpacity: 0.28,
        strokeColor: color,
        strokeOpacity: 0.7,
        strokeWeight: 1.5,
      }));
    });
  }, [layers.temp, liveData, regionCoords, regionNames, status]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    windMarkersRef.current.forEach((marker) => marker.setMap(null));
    windMarkersRef.current = [];
    if (!layers.wind) return;

    const maps = window.naver.maps;
    regionNames.forEach((region) => {
      const pos = regionCoords[region];
      const item = liveData.find((data) => data.region === region);
      if (!pos) return;
      const speed = forecast?.current?.windSpeed ?? item?.windSpeed ?? 2.5;
      const html = `
        <div style="transform:translate(-50%,18px);display:flex;align-items:center;gap:4px;background:rgba(255,255,255,.92);
          color:#0369a1;border:1px solid rgba(14,165,233,.35);border-radius:7px;padding:3px 7px;
          font-family:system-ui,sans-serif;font-size:11px;font-weight:800;box-shadow:0 2px 8px rgba(15,23,42,.15);">
          <span style="display:inline-block;transform:rotate(120deg);font-size:13px;">➤</span>${Number(speed).toFixed(1)}m/s
        </div>
      `;
      windMarkersRef.current.push(new maps.Marker({
        position: new maps.LatLng(pos.lat, pos.lng),
        map: mapRef.current,
        zIndex: 3,
        icon: { content: html, anchor: new maps.Point(0, 0) },
      }));
    });
  }, [forecast, layers.wind, liveData, regionCoords, regionNames, status]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.naver?.maps) return;
    pm25CirclesRef.current.forEach((circle) => circle.setMap(null));
    pm25CirclesRef.current = [];
    if (!layers.air) return;

    const maps = window.naver.maps;
    regionNames.forEach((region) => {
      const pos = regionCoords[region];
      if (!pos) return;
      const item = liveData.find((data) => data.region === region);
      const color = pm25ToColor(item?.pm25);
      pm25CirclesRef.current.push(new maps.Circle({
        map: mapRef.current,
        center: new maps.LatLng(pos.lat, pos.lng),
        radius: 65000,
        fillColor: color,
        fillOpacity: 0.25,
        strokeColor: color,
        strokeOpacity: 0.5,
        strokeWeight: 1.5,
      }));
    });
  }, [layers.air, liveData, regionCoords, regionNames, status]);

  if (!NAVER_MAPS_KEY_ID) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#70757a', background: '#f7f8fa', borderRadius: 12 }}>
        네이버 지도 API 키가 설정되어 있지 않습니다. `.env`에 VITE_NAVER_MAPS_KEY_ID를 추가해 주세요.
      </div>
    );
  }

  const currentLive = liveData.find((item) => item.region === activeRegion) || {};
  const hourly = forecast?.hourly || [];

  return (
    <div style={{ margin: '-20px -28px', height: 'calc(100vh - 60px)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes mapWindMove{0%{transform:translate3d(-30px,-22px,0) rotate(112deg);opacity:0}20%{opacity:.34}100%{transform:translate3d(54px,72px,0) rotate(112deg);opacity:0}}
        .naver-wind-line{position:absolute;width:28px;height:1.3px;border-radius:999px;background:rgba(255,255,255,.58);box-shadow:0 0 5px rgba(255,255,255,.28);animation:mapWindMove 5.4s linear infinite;}
      `}</style>

      <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa', zIndex: 20 }}>
          <p style={{ color: '#9aa0a6', fontSize: 14, textAlign: 'center', padding: '0 24px' }}>{mapError}</p>
        </div>
      )}

      {forecast && (
        <WeatherPopup activeRegion={activeRegion} forecast={forecast} layers={layers} />
      )}

      <LayerButtons
        layers={layers}
        allForecastsLoading={false}
        onToggleLayer={(key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }))}
      />

      <WeatherTimeline
        activeRegion={activeRegion}
        forecast={forecast}
        forecastLoading={forecastLoading}
        hourly={hourly}
        currentLive={currentLive}
        regionNames={regionNames}
        onSelectRegion={handleRegionClick}
      />
    </div>
  );
}

function WeatherPopup({ activeRegion, forecast, layers }) {
  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: layers.temp ? 76 : 12,
      zIndex: 15,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)',
      borderRadius: 14,
      padding: '14px 18px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
      minWidth: 165,
      transition: 'left 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 28 }}>{weatherEmoji(forecast.current.sky, forecast.current.pty, null)}</span>
        <div>
          <p style={{ color: '#9aa0a6', fontSize: 10, fontWeight: 700, margin: '0 0 1px', fontFamily: 'system-ui', letterSpacing: '0.3px' }}>
            {activeRegion}
          </p>
          <p style={{ color: '#202124', fontSize: 26, fontWeight: 900, margin: 0, fontFamily: "'Roboto Mono', monospace", lineHeight: 1 }}>
            {forecast.current.temperature != null ? `${forecast.current.temperature}°` : '-'}
          </p>
        </div>
      </div>
      <p style={{ color: '#5f6368', fontSize: 12, margin: '0 0 10px', fontFamily: 'system-ui' }}>
        {forecast.current.condition}
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: '체감', value: forecast.current.feelsLike != null ? `${forecast.current.feelsLike}°` : '-' },
          { label: '습도', value: forecast.current.humidity != null ? `${forecast.current.humidity}%` : '-' },
          { label: '바람', value: forecast.current.windSpeed != null ? `${forecast.current.windSpeed}m/s` : '-' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#f1f5f9', borderRadius: 7, padding: '4px 8px', textAlign: 'center', flex: 1 }}>
            <p style={{ color: '#9aa0a6', fontSize: 9, fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{label}</p>
            <p style={{ color: '#202124', fontSize: 11, fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayerButtons({ layers, allForecastsLoading, onToggleLayer }) {
  return (
    <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[{ key: 'temp', label: '기온' }, { key: 'wind', label: '바람' }, { key: 'air', label: '대기질' }].map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggleLayer(key)}
          style={controlButton(layers[key])}
        >
          {label}{key === 'wind' && allForecastsLoading ? ' ···' : ''}
        </button>
      ))}
    </div>
  );
}

function controlButton(active) {
  return {
    background: active ? '#0ea5e9' : 'rgba(255,255,255,0.94)',
    color: active ? '#fff' : '#202124',
    border: `1px solid ${active ? '#0ea5e9' : '#d7dde5'}`,
    borderRadius: 8,
    padding: '9px 13px',
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.2,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(15,23,42,0.16)',
    fontFamily: 'system-ui',
    minWidth: 64,
  };
}

function WeatherTimeline({ activeRegion, forecast, forecastLoading, hourly, currentLive, regionNames, onSelectRegion }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(84vw, 1500px)',
      zIndex: 20,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(226,232,240,0.95)',
      borderRadius: 14,
      boxShadow: '0 10px 30px rgba(15,23,42,0.18)',
      padding: '13px 18px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ border: '1px solid #d7dde5', borderRadius: 8, padding: '5px 10px', color: '#5f6368', fontSize: 13, fontWeight: 800 }}>기온</span>
          <strong style={{ color: '#202124', fontSize: 18, fontWeight: 900, whiteSpace: 'nowrap' }}>{activeRegion}</strong>
          <span style={{ color: '#70757a', fontSize: 12, whiteSpace: 'nowrap' }}>
            체감 {fmtValue(forecast?.current?.feelsLike, '°')} · 습도 {fmtValue(forecast?.current?.humidity, '%')} · 대기질 PM2.5 {fmtValue(currentLive.pm25)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: 420 }}>
          {regionNames.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => onSelectRegion(region)}
              style={{
                background: region === activeRegion ? '#0ea5e9' : '#f1f5f9',
                color: region === activeRegion ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 20,
                padding: '5px 13px',
                fontSize: 12,
                fontWeight: region === activeRegion ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontFamily: 'system-ui',
              }}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {forecastLoading ? (
        <p style={{ color: '#9aa0a6', fontSize: 12, margin: 0 }}>날씨 정보 불러오는 중...</p>
      ) : hourly.length > 0 ? (
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 2 }}>
          {hourly.map((item, idx) => (
            <div key={item.time} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '8px 17px',
              borderRadius: idx === 0 ? 10 : 0,
              background: idx === 0 ? '#eaf6ff' : 'transparent',
              borderRight: idx < hourly.length - 1 ? '1px solid #eef2f7' : 'none',
              minWidth: 72,
              flexShrink: 0,
            }}>
              <span style={{ color: idx === 0 ? '#0ea5e9' : '#70757a', fontSize: 12, fontWeight: idx === 0 ? 900 : 700 }}>
                {idx === 0 ? '지금' : item.time}
              </span>
              <span style={{ color: '#202124', fontSize: 21, fontWeight: 900, fontFamily: "'Roboto Mono', monospace" }}>
                {item.temp != null ? `${item.temp}°` : '-'}
              </span>
              <span style={{ fontSize: 18 }}>{weatherEmoji(item.sky ?? 1, item.pty ?? 0, item.time)}</span>
              <span style={{ color: '#0ea5e9', fontSize: 10, fontWeight: 600 }}>{item.pop || 0}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#9aa0a6', fontSize: 12, margin: 0 }}>예보 정보 없음</p>
      )}
    </div>
  );
}
