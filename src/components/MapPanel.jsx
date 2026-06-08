import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { DEFAULT_REGION_META, fetchRegions, regionsToCoords } from '../services/regions';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const SKY_DAY   = { 1: '☀️', 3: '⛅', 4: '☁️' };
const SKY_NIGHT = { 1: '🌙', 3: '🌛', 4: '☁️' };
const PTY_EMOJI = { 1: '🌧️', 2: '🌨️', 3: '❄️', 5: '🌦️', 6: '🌨️', 7: '🌨️' };

function weatherEmoji(sky, pty, timeStr) {
  if (pty > 0) return PTY_EMOJI[pty] || '🌧️';
  const h = timeStr ? parseInt(timeStr.split(':')[0], 10) : new Date().getHours();
  const night = h >= 20 || h < 6;
  return (night ? SKY_NIGHT : SKY_DAY)[sky] || (night ? '🌙' : '☀️');
}

// Temperature color gradient stops
const TEMP_STOPS = [
  [-10, [59, 130, 246]],
  [5,   [6, 182, 212]],
  [15,  [34, 197, 94]],
  [22,  [234, 179, 8]],
  [28,  [249, 115, 22]],
  [35,  [239, 68, 68]],
];

function tempToRGB(temp) {
  if (temp <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
  if (temp >= TEMP_STOPS[TEMP_STOPS.length - 1][0]) return TEMP_STOPS[TEMP_STOPS.length - 1][1];
  for (let i = 0; i < TEMP_STOPS.length - 1; i++) {
    const [t0, c0] = TEMP_STOPS[i];
    const [t1, c1] = TEMP_STOPS[i + 1];
    if (temp >= t0 && temp <= t1) {
      const f = (temp - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return [128, 128, 128];
}

function pm25ToColor(pm25) {
  if (pm25 == null) return '#94a3b8';
  if (pm25 <= 15)  return '#22c55e';
  if (pm25 <= 35)  return '#f59e0b';
  if (pm25 <= 75)  return '#ef4444';
  return '#7c3aed';
}

function fmtValue(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Math.round(Number(value))}${suffix}`;
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

// Custom HTML marker overlay
function makeOverlayClass() {
  class CustomOverlay extends window.google.maps.OverlayView {
    constructor(pos, html, onClick, zIndex = 1) {
      super();
      this._pos = pos; this._html = html; this._onClick = onClick; this._el = null; this._zIndex = zIndex;
    }
    onAdd() {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.zIndex = this._zIndex;
      el.style.cursor = this._onClick ? 'pointer' : 'default';
      el.innerHTML = this._html;
      if (this._onClick) el.addEventListener('click', this._onClick);
      this._el = el;
      this.getPanes().overlayMouseTarget.appendChild(el);
    }
    draw() {
      const pt = this.getProjection().fromLatLngToDivPixel(
        new window.google.maps.LatLng(this._pos.lat, this._pos.lng)
      );
      if (pt && this._el) { this._el.style.left = `${pt.x}px`; this._el.style.top = `${pt.y}px`; }
    }
    onRemove() {
      if (this._el) { this._el.parentNode?.removeChild(this._el); this._el = null; }
    }
  }
  return CustomOverlay;
}

// Canvas IDW temperature overlay
function makeTempCanvasClass() {
  class TempCanvas extends window.google.maps.OverlayView {
    constructor() {
      super();
      this._canvas = null;
      this._pts = [];
      this._timer = null;
    }
    setPoints(pts) {
      this._pts = pts;
      this._scheduleRender();
    }
    _scheduleRender() {
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => this._render(), 60);
    }
    onAdd() {
      const c = document.createElement('canvas');
      c.style.cssText = 'position:absolute;pointer-events:none;opacity:0;transition:opacity 0.6s;';
      this._canvas = c;
      this.getPanes().overlayLayer.appendChild(c);
      setTimeout(() => { if (c) c.style.opacity = '0.42'; }, 80);
    }
    draw() { this._scheduleRender(); }
    _render() {
      const c = this._canvas;
      if (!c || !this._pts.length) return;
      const proj = this.getProjection();
      const map = this.getMap();
      if (!map) return;
      const bounds = map.getBounds();
      if (!bounds) return;

      const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast());
      const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest());
      const left = Math.round(Math.min(ne.x, sw.x));
      const top  = Math.round(Math.min(ne.y, sw.y));
      const w = Math.round(Math.abs(ne.x - sw.x));
      const h = Math.round(Math.abs(ne.y - sw.y));
      if (w <= 0 || h <= 0) return;

      c.style.left = `${left}px`;
      c.style.top  = `${top}px`;
      c.width  = w;
      c.height = h;

      // Project data points to canvas coordinates
      const pts = this._pts.map(({ lat, lng, temp }) => {
        const p = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(lat, lng));
        return { x: Math.round(p.x - left), y: Math.round(p.y - top), temp };
      });

      const ctx = c.getContext('2d');
      const step = 8; // sample every 8px (perf/quality trade-off)

      for (let row = 0; row * step < h; row++) {
        for (let col = 0; col * step < w; col++) {
          const px = col * step;
          const py = row * step;
          let sumW = 0, sumT = 0;
          for (const pt of pts) {
            const d = Math.hypot(px - pt.x, py - pt.y);
            if (d < 1) { sumT = pt.temp; sumW = 1; break; }
            const inv = 1 / (d * d);
            sumW += inv;
            sumT += inv * pt.temp;
          }
          const [r, g, b] = tempToRGB(sumT / sumW);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(px, py, step, step);
        }
      }
    }
    onRemove() {
      if (this._timer) clearTimeout(this._timer);
      if (this._canvas) { this._canvas.parentNode?.removeChild(this._canvas); this._canvas = null; }
    }
  }
  return TempCanvas;
}

export default function MapPanel({ liveData, selectedRegion, onSelectRegion, regions: initialRegions }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const OverlayClass = useRef(null);
  const TempCanvasClass = useRef(null);
  const tempCanvasRef = useRef(null);
  const markerOverlaysRef = useRef([]);
  const windOverlaysRef = useRef([]);
  const pm25CirclesRef = useRef([]);

  const [status, setStatus] = useState('loading');
  const [mapError, setMapError] = useState('');
  const [activeRegion, setActiveRegion] = useState(selectedRegion || '서울');
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [layers, setLayers] = useState({ temp: false, wind: true, air: false });
  const [allForecasts, setAllForecasts] = useState({});
  const [allForecastsLoading, setAllForecastsLoading] = useState(false);
  const [regions, setRegions] = useState(initialRegions?.length ? initialRegions : DEFAULT_REGION_META);

  const regionCoords = useMemo(() => regionsToCoords(regions), [regions]);
  const regionNames = useMemo(() => regions.map((region) => region.name), [regions]);

  useEffect(() => {
    if (initialRegions?.length) setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    fetchRegions().then(setRegions);
  }, []);

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

  useEffect(() => {
    if (!selectedRegion || selectedRegion === activeRegion) return;
    setActiveRegion(selectedRegion);
    loadForecast(selectedRegion);
  }, [activeRegion, loadForecast, selectedRegion]);

  const loadAllForecasts = useCallback(async () => {
    setAllForecastsLoading(true);
    try {
      const results = await Promise.allSettled(
        regionNames.map((r) =>
          api.get(`/api/weather/forecast?region=${encodeURIComponent(r)}`).then((d) => [r, d.data])
        )
      );
      const data = {};
      results.forEach((r) => { if (r.status === 'fulfilled' && r.value[1]) data[r.value[0]] = r.value[1]; });
      setAllForecasts(data);
    } finally {
      setAllForecastsLoading(false);
    }
  }, [regionNames]);

  const handleRegionClick = useCallback((region) => {
    setActiveRegion(region);
    if (onSelectRegion) onSelectRegion(region);
    loadForecast(region);
  }, [onSelectRegion, loadForecast]);

  const toggleLayer = useCallback((key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Init map
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !mapEl.current) return;

        OverlayClass.current = makeOverlayClass();
        TempCanvasClass.current = makeTempCanvasClass();

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
        if (!cancelled) { setStatus('error'); setMapError(err.message); }
      }
    }
    init();
    loadForecast(selectedRegion || '서울');
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wind layer: fetch all region forecasts once
  useEffect(() => {
    if (layers.wind && Object.keys(allForecasts).length === 0 && !allForecastsLoading) {
      loadAllForecasts();
    }
  }, [layers.wind, allForecasts, allForecastsLoading, loadAllForecasts]);

  // Temperature canvas overlay (IDW)
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !TempCanvasClass.current) return;

    if (!layers.temp) {
      if (tempCanvasRef.current) { tempCanvasRef.current.setMap(null); tempCanvasRef.current = null; }
      return;
    }

    const pts = regionNames.map((r) => {
      const item = liveData.find((d) => d.region === r);
      return { lat: regionCoords[r].lat, lng: regionCoords[r].lng, temp: item?.temperature ?? 20 };
    });

    if (!tempCanvasRef.current) {
      const overlay = new TempCanvasClass.current();
      overlay.setMap(mapRef.current);
      tempCanvasRef.current = overlay;
    }
    tempCanvasRef.current.setPoints(pts);
  }, [status, layers.temp, liveData, regionCoords, regionNames]);

  // Markers
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !OverlayClass.current) return;
    markerOverlaysRef.current.forEach((o) => o.setMap(null));
    markerOverlaysRef.current = [];

    const Overlay = OverlayClass.current;
    regionNames.forEach((region) => {
      const pos = regionCoords[region];
      const item = liveData.find((d) => d.region === region) || {};
      const fcst = allForecasts[region];
      const isActive = region === activeRegion;
      const temp = item.temperature != null ? `${Math.round(Number(item.temperature))}°` : '-';
      const emoji = weatherEmoji(fcst?.current?.sky ?? 1, fcst?.current?.pty ?? 0, null);

      const html = isActive ? `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-10px);">
          <div style="background:#ffffff;color:#202124;padding:10px 14px;border-radius:12px;
            font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 8px 22px rgba(15,23,42,0.22);
            border:1px solid rgba(226,232,240,0.95);min-width:96px;text-align:center;">
            <div style="font-size:14px;font-weight:900;margin-bottom:4px;">${region}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:3px;">
              <span style="font-size:18px">${emoji}</span>
              <span style="font-size:28px;font-weight:900;line-height:1;">${temp}</span>
            </div>
            <div style="color:#70757a;font-size:11px;font-weight:700;">습도 ${fmtValue(item.humidity, '%')}</div>
          </div>
          <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:9px solid #ffffff;"></div>
        </div>` : `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%) translateY(-6px);">
          <div style="background:rgba(31,41,55,0.78);color:white;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:800;
            font-family:system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 9px rgba(0,0,0,0.22);
            border:1px solid rgba(255,255,255,0.16);display:flex;align-items:center;gap:5px;">
            <span style="font-size:13px">${emoji}</span>
            <span>${region}</span>
            <span style="color:#bfdbfe;font-size:13px">${temp}</span>
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid rgba(31,41,55,0.78);"></div>
        </div>`;

      const overlay = new Overlay(pos, html, () => handleRegionClick(region), isActive ? 20 : 1);
      overlay.setMap(mapRef.current);
      markerOverlaysRef.current.push(overlay);
    });
  }, [status, liveData, activeRegion, allForecasts, handleRegionClick, regionCoords, regionNames]);

  // PM2.5 circles
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.google?.maps) return;
    pm25CirclesRef.current.forEach((c) => c.setMap(null));
    pm25CirclesRef.current = [];
    if (!layers.air) return;
    const maps = window.google.maps;
    regionNames.forEach((region) => {
      const item = liveData.find((d) => d.region === region);
      const color = pm25ToColor(item?.pm25);
      pm25CirclesRef.current.push(new maps.Circle({
        map: mapRef.current, center: regionCoords[region], radius: 65000,
        fillColor: color, fillOpacity: 0.25, strokeColor: color, strokeOpacity: 0.5, strokeWeight: 1.5, clickable: false,
      }));
    });
  }, [status, layers.air, liveData, regionCoords, regionNames]);

  // Wind overlays
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !OverlayClass.current) return;
    windOverlaysRef.current.forEach((o) => o.setMap(null));
    windOverlaysRef.current = [];
    if (!layers.wind || Object.keys(allForecasts).length === 0) return;

    const Overlay = OverlayClass.current;
    regionNames.forEach((region) => {
      const fcst = allForecasts[region];
      const windVec = fcst?.current?.windVec;
      const windSpeed = fcst?.current?.windSpeed ?? 0;
      if (windVec == null) return;
      const arrowDeg = (windVec + 180) % 360;
      const html = `
        <div style="transform:translate(-50%,16px);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="transform:rotate(${arrowDeg}deg);">
            <span style="display:inline-block;font-size:22px;animation:windSlide 1.4s ease-in-out infinite;
              filter:drop-shadow(0 1px 3px rgba(0,0,0,0.35));">➤</span>
          </div>
          <span style="background:rgba(255,255,255,0.9);color:#1e40af;font-size:10px;font-weight:700;
            padding:1px 6px;border-radius:4px;font-family:system-ui;white-space:nowrap;">${windSpeed}m/s</span>
        </div>`;
      const overlay = new Overlay(regionCoords[region], html, null);
      overlay.setMap(mapRef.current);
      windOverlaysRef.current.push(overlay);
    });
  }, [status, layers.wind, allForecasts, regionCoords, regionNames]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#70757a', background: '#f7f8fa', borderRadius: 12 }}>
        Google Maps API 키가 설정되어 있지 않습니다.
      </div>
    );
  }

  const LEGEND_TEMPS = [35, 28, 22, 15, 5, -10];

  const currentLive = liveData.find((item) => item.region === activeRegion) || {};
  const hourly = forecast?.hourly || [];

  return (
    <div style={{ margin: '-20px -28px', height: 'calc(100vh - 60px)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes windSlide{0%,100%{opacity:0.5;transform:translateX(-3px)}50%{opacity:1;transform:translateX(3px)}}
        @keyframes mapWindMove{0%{transform:translate3d(-30px,-22px,0) rotate(112deg);opacity:0}20%{opacity:.38}100%{transform:translate3d(54px,72px,0) rotate(112deg);opacity:0}}
        .wind-line{position:absolute;width:28px;height:1.3px;border-radius:999px;background:rgba(255,255,255,.58);box-shadow:0 0 5px rgba(255,255,255,.28);animation:mapWindMove 5.4s linear infinite;}
      `}</style>

      <div ref={mapEl} style={{ width: '100%', height: '100%' }} />

      {layers.wind && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 6 }}>
          {Array.from({ length: 30 }).map((_, idx) => (
            <span
              key={idx}
              className="wind-line"
              style={{
                left: `${(idx * 17) % 100}%`,
                top: `${(idx * 23) % 100}%`,
                animationDelay: `${(idx % 9) * 0.32}s`,
                animationDuration: `${4.2 + (idx % 5) * 0.42}s`,
              }}
            />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa', zIndex: 20 }}>
          <p style={{ color: '#9aa0a6', fontSize: 14, textAlign: 'center', padding: '0 24px' }}>{mapError}</p>
        </div>
      )}

      {/* Temperature legend */}
      {layers.temp && (
        <div style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, background: 'rgba(255,255,255,0.93)', borderRadius: 10,
          padding: '10px 8px', boxShadow: '0 2px 10px rgba(0,0,0,0.13)', backdropFilter: 'blur(8px)',
        }}>
          {LEGEND_TEMPS.map((t) => {
            const [r, g, b] = tempToRGB(t);
            return (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: `rgb(${r},${g},${b})`, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#374151', fontFamily: 'system-ui' }}>{t}°</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected region popup */}
      {forecast && (
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
              { label: '습도',  value: forecast.current.humidity  != null ? `${forecast.current.humidity}%`  : '-' },
              { label: '바람',  value: forecast.current.windSpeed != null ? `${forecast.current.windSpeed}m/s` : '-' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f1f5f9', borderRadius: 7, padding: '4px 8px', textAlign: 'center', flex: 1 }}>
                <p style={{ color: '#9aa0a6', fontSize: 9, fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{label}</p>
                <p style={{ color: '#202124', fontSize: 11, fontWeight: 700, margin: 0, fontFamily: 'system-ui' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Layer toggles */}
      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ key: 'temp', label: '기온' }, { key: 'wind', label: '바람' }, { key: 'air', label: '대기질' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleLayer(key)}
            style={{
              background: layers[key] ? '#0ea5e9' : 'rgba(255,255,255,0.94)',
              color: layers[key] ? '#fff' : '#202124',
              border: `1px solid ${layers[key] ? '#0ea5e9' : '#d7dde5'}`,
              borderRadius: 8,
              padding: '9px 13px',
              fontSize: 13,
              fontWeight: 800,
              lineHeight: 1.2,
              cursor: 'pointer', backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 8px rgba(15,23,42,0.16)',
              fontFamily: 'system-ui',
              minWidth: 64,
            }}
          >
            {label}{key === 'wind' && allForecastsLoading ? ' ···' : ''}
          </button>
        ))}
      </div>

      {/* Bottom forecast panel */}
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
                onClick={() => handleRegionClick(region)}
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
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
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
                {item.pop > 0 && (
                  <span style={{ color: '#0ea5e9', fontSize: 10, fontWeight: 600 }}>{item.pop}%</span>
                )}
                {!item.pop && (
                  <span style={{ color: '#0ea5e9', fontSize: 10, fontWeight: 600 }}>0%</span>
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
