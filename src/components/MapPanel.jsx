import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const REGION_COORDS = {
  서울: { lat: 37.5665, lng: 126.9780 },
  부산: { lat: 35.1796, lng: 129.0756 },
  인천: { lat: 37.4563, lng: 126.7052 },
  대구: { lat: 35.8714, lng: 128.6014 },
  창원: { lat: 35.2280, lng: 128.6811 },
};

const SKY_DAY   = { 1: '☀️', 3: '⛅', 4: '☁️' };
const SKY_NIGHT = { 1: '🌙', 3: '🌛', 4: '☁️' };
const PTY_EMOJI = { 1: '🌧️', 2: '🌨️', 3: '❄️', 5: '🌦️', 6: '🌨️', 7: '🌨️' };

function weatherEmoji(sky, pty, timeStr) {
  if (pty > 0) return PTY_EMOJI[pty] || '🌧️';
  const h = timeStr ? parseInt(timeStr.split(':')[0], 10) : new Date().getHours();
  const night = h >= 20 || h < 6;
  return (night ? SKY_NIGHT : SKY_DAY)[sky] || (night ? '🌙' : '☀️');
}

function tempToColor(temp) {
  if (temp == null) return '#94a3b8';
  if (temp < 0)  return '#3b82f6';
  if (temp < 10) return '#06b6d4';
  if (temp < 20) return '#22c55e';
  if (temp < 28) return '#f97316';
  return '#ef4444';
}

function pm25ToColor(pm25) {
  if (pm25 == null) return '#94a3b8';
  if (pm25 <= 15)  return '#22c55e';
  if (pm25 <= 35)  return '#f59e0b';
  if (pm25 <= 75)  return '#ef4444';
  return '#7c3aed';
}

let mapsScriptPromise = null;

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error('Google Maps API 키가 설정되어 있지 않습니다.'));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    window.gm_authFailure = () => {
      mapsScriptPromise = null;
      reject(new Error('Google Maps API 인증에 실패했습니다.'));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly&language=ko&region=KR`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

function makeOverlayClass() {
  class CustomOverlay extends window.google.maps.OverlayView {
    constructor(pos, html, onClick) {
      super();
      this._pos = pos;
      this._html = html;
      this._onClick = onClick;
      this._el = null;
    }

    onAdd() {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.cursor = this._onClick ? 'pointer' : 'default';
      el.innerHTML = this._html;
      if (this._onClick) el.addEventListener('click', this._onClick);
      this._el = el;
      this.getPanes().overlayMouseTarget.appendChild(el);
    }

    draw() {
      const proj = this.getProjection();
      const pt = proj.fromLatLngToDivPixel(
        new window.google.maps.LatLng(this._pos.lat, this._pos.lng)
      );
      if (pt && this._el) {
        this._el.style.left = `${pt.x}px`;
        this._el.style.top = `${pt.y}px`;
      }
    }

    onRemove() {
      if (this._el) {
        this._el.parentNode?.removeChild(this._el);
        this._el = null;
      }
    }
  }
  return CustomOverlay;
}

export default function MapPanel({ liveData, selectedRegion, onSelectRegion }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const OverlayClass = useRef(null);
  const markerOverlaysRef = useRef([]);
  const windOverlaysRef = useRef([]);
  const tempCirclesRef = useRef([]);
  const pm25CirclesRef = useRef([]);

  const [status, setStatus] = useState('loading');
  const [mapError, setMapError] = useState('');
  const [activeRegion, setActiveRegion] = useState(selectedRegion || '서울');
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [layers, setLayers] = useState({ temp: false, wind: false, air: false });
  const [allForecasts, setAllForecasts] = useState({});
  const [allForecastsLoading, setAllForecastsLoading] = useState(false);

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

  const loadAllForecasts = useCallback(async () => {
    setAllForecastsLoading(true);
    try {
      const regions = Object.keys(REGION_COORDS);
      const results = await Promise.allSettled(
        regions.map((r) =>
          api.get(`/api/weather/forecast?region=${encodeURIComponent(r)}`).then((d) => [r, d.data])
        )
      );
      const data = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value[1]) {
          data[r.value[0]] = r.value[1];
        }
      });
      setAllForecasts(data);
    } finally {
      setAllForecastsLoading(false);
    }
  }, []);

  const handleRegionClick = useCallback((region) => {
    setActiveRegion(region);
    if (onSelectRegion) onSelectRegion(region);
    loadForecast(region);
  }, [onSelectRegion, loadForecast]);

  const toggleLayer = useCallback((key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !mapEl.current) return;

        OverlayClass.current = makeOverlayClass();

        mapRef.current = new maps.Map(mapEl.current, {
          center: { lat: 36.5, lng: 127.8 },
          zoom: 7,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: { position: maps.ControlPosition.LEFT_BOTTOM },
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });

        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMapError(err.message);
        }
      }
    }

    init();
    loadForecast(selectedRegion || '서울');
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all forecasts when wind layer toggled on (first time only)
  useEffect(() => {
    if (layers.wind && Object.keys(allForecasts).length === 0 && !allForecastsLoading) {
      loadAllForecasts();
    }
  }, [layers.wind, allForecasts, allForecastsLoading, loadAllForecasts]);

  // Rebuild region markers
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !OverlayClass.current) return;

    markerOverlaysRef.current.forEach((o) => o.setMap(null));
    markerOverlaysRef.current = [];

    const Overlay = OverlayClass.current;

    Object.keys(REGION_COORDS).forEach((region) => {
      const pos = REGION_COORDS[region];
      const item = liveData.find((d) => d.region === region) || {};
      const fcst = allForecasts[region];
      const isActive = region === activeRegion;
      const temp = item.temperature != null ? `${Math.round(Number(item.temperature))}°` : '-';
      const sky = fcst?.current?.sky ?? 1;
      const pty = fcst?.current?.pty ?? 0;
      const emoji = weatherEmoji(sky, pty, null);

      const bg = isActive ? '#0ea5e9' : 'rgba(15,23,42,0.82)';
      const border = isActive ? 'rgba(186,230,253,0.7)' : 'rgba(255,255,255,0.15)';
      const tempColor = isActive ? '#bae6fd' : '#93c5fd';

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-6px);">
          <div style="background:${bg};color:white;padding:5px 12px;border-radius:20px;font-size:13px;font-weight:700;font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.25);border:1.5px solid ${border};display:flex;align-items:center;gap:5px;">
            <span style="font-size:15px">${emoji}</span>
            <span>${region}</span>
            <span style="color:${tempColor};font-size:15px">${temp}</span>
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg};"></div>
        </div>
      `;

      const overlay = new Overlay(pos, html, () => handleRegionClick(region));
      overlay.setMap(mapRef.current);
      markerOverlaysRef.current.push(overlay);
    });
  }, [status, liveData, activeRegion, allForecasts, handleRegionClick]);

  // Temperature overlay circles
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.google?.maps) return;

    tempCirclesRef.current.forEach((c) => c.setMap(null));
    tempCirclesRef.current = [];

    if (!layers.temp) return;

    const maps = window.google.maps;
    Object.keys(REGION_COORDS).forEach((region) => {
      const item = liveData.find((d) => d.region === region);
      const color = tempToColor(item?.temperature);
      tempCirclesRef.current.push(
        new maps.Circle({
          map: mapRef.current,
          center: REGION_COORDS[region],
          radius: 65000,
          fillColor: color,
          fillOpacity: 0.22,
          strokeColor: color,
          strokeOpacity: 0.45,
          strokeWeight: 1.5,
          clickable: false,
        })
      );
    });
  }, [status, layers.temp, liveData]);

  // PM2.5 air quality circles
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.google?.maps) return;

    pm25CirclesRef.current.forEach((c) => c.setMap(null));
    pm25CirclesRef.current = [];

    if (!layers.air) return;

    const maps = window.google.maps;
    Object.keys(REGION_COORDS).forEach((region) => {
      const item = liveData.find((d) => d.region === region);
      const color = pm25ToColor(item?.pm25);
      pm25CirclesRef.current.push(
        new maps.Circle({
          map: mapRef.current,
          center: REGION_COORDS[region],
          radius: 65000,
          fillColor: color,
          fillOpacity: 0.22,
          strokeColor: color,
          strokeOpacity: 0.45,
          strokeWeight: 1.5,
          clickable: false,
        })
      );
    });
  }, [status, layers.air, liveData]);

  // Wind direction overlays
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !OverlayClass.current) return;

    windOverlaysRef.current.forEach((o) => o.setMap(null));
    windOverlaysRef.current = [];

    if (!layers.wind || Object.keys(allForecasts).length === 0) return;

    const Overlay = OverlayClass.current;

    Object.keys(REGION_COORDS).forEach((region) => {
      const pos = REGION_COORDS[region];
      const fcst = allForecasts[region];
      const windVec = fcst?.current?.windVec;
      const windSpeed = fcst?.current?.windSpeed ?? 0;

      if (windVec == null) return;

      // windVec = direction FROM which wind blows; arrow points TO
      const arrowDeg = (windVec + 180) % 360;

      const html = `
        <div style="transform:translate(-50%,16px);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="transform:rotate(${arrowDeg}deg);">
            <span style="display:inline-block;font-size:22px;animation:windSlide 1.4s ease-in-out infinite;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35));">➤</span>
          </div>
          <span style="background:rgba(255,255,255,0.9);color:#1e40af;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;font-family:system-ui;white-space:nowrap;">${windSpeed}m/s</span>
        </div>
      `;

      const overlay = new Overlay(pos, html, null);
      overlay.setMap(mapRef.current);
      windOverlaysRef.current.push(overlay);
    });
  }, [status, layers.wind, allForecasts]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#70757a', background: '#f7f8fa', borderRadius: 12 }}>
        Google Maps API 키가 설정되어 있지 않습니다.
      </div>
    );
  }

  return (
    <div style={{ margin: '-20px -28px', height: 'calc(100vh - 60px)', position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes windSlide{0%,100%{opacity:0.5;transform:translateX(-3px)}50%{opacity:1;transform:translateX(3px)}}`}</style>

      <div ref={mapEl} style={{ width: '100%', height: '100%' }} />

      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa', zIndex: 20 }}>
          <p style={{ color: '#9aa0a6', fontSize: 14, textAlign: 'center', padding: '0 24px' }}>{mapError}</p>
        </div>
      )}

      {/* Layer toggle buttons */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[{ key: 'temp', label: '기온' }, { key: 'wind', label: '바람' }, { key: 'air', label: '대기질' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            style={{
              background: layers[key] ? '#0ea5e9' : 'rgba(255,255,255,0.92)',
              color: layers[key] ? '#fff' : '#374151',
              border: `1.5px solid ${layers[key] ? '#0ea5e9' : '#e8eaed'}`,
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
              fontFamily: 'system-ui',
              minWidth: 56,
            }}
          >
            {label}
            {key === 'wind' && allForecastsLoading && layers.wind ? ' ···' : ''}
          </button>
        ))}
      </div>

      {/* Bottom forecast panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #e8eaed',
        padding: '12px 20px 16px',
      }}>
        {/* Region selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto' }}>
          {Object.keys(REGION_COORDS).map((region) => (
            <button
              key={region}
              onClick={() => handleRegionClick(region)}
              style={{
                background: region === activeRegion ? '#0ea5e9' : '#f1f5f9',
                color: region === activeRegion ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 20,
                padding: '4px 14px',
                fontSize: 12,
                fontWeight: region === activeRegion ? 700 : 500,
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

        {/* Hourly forecast strip */}
        {forecastLoading ? (
          <p style={{ color: '#9aa0a6', fontSize: 12, margin: 0 }}>날씨 정보 불러오는 중...</p>
        ) : forecast?.hourly?.length > 0 ? (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {forecast.hourly.map((item, idx) => (
              <div key={item.time} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 12px',
                borderRadius: 10,
                background: idx === 0 ? '#e0f2fe' : 'transparent',
                border: `1.5px solid ${idx === 0 ? '#0ea5e9' : 'transparent'}`,
                minWidth: 52,
                flexShrink: 0,
              }}>
                <span style={{ color: idx === 0 ? '#0369a1' : '#70757a', fontSize: 10, fontWeight: idx === 0 ? 700 : 500 }}>
                  {idx === 0 ? '지금' : item.time}
                </span>
                <span style={{ fontSize: 18 }}>{weatherEmoji(item.sky ?? 1, item.pty ?? 0, item.time)}</span>
                <span style={{ color: '#202124', fontSize: 12, fontWeight: 700 }}>
                  {item.temp != null ? `${item.temp}°` : '-'}
                </span>
                {item.pop > 0 && (
                  <span style={{ color: '#0ea5e9', fontSize: 10, fontWeight: 600 }}>{item.pop}%</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9aa0a6', fontSize: 12, margin: 0 }}>예보 정보 없음</p>
        )}
      </div>
    </div>
  );
}
