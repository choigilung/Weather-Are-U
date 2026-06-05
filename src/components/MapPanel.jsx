import { useEffect, useMemo, useRef, useState } from 'react';
import { getPm25Grade, fmt } from '../utils/grade';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_AUTH_ERROR =
  'Google Maps API 인증에 실패했습니다. Maps JavaScript API 활성화, 결제 설정, HTTP referrer 제한을 확인해 주세요.';
const REGION_COORDS = {
  서울: { lat: 37.5665, lng: 126.9780 },
  부산: { lat: 35.1796, lng: 129.0756 },
  인천: { lat: 37.4563, lng: 126.7052 },
  대구: { lat: 35.8714, lng: 128.6014 },
  창원: { lat: 35.2280, lng: 128.6811 },
};

let mapsScriptPromise;

function loadGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Google Maps API 키가 설정되어 있지 않습니다.'));
  }
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise((resolve, reject) => {
    window.gm_authFailure = () => {
      const error = new Error(GOOGLE_MAPS_AUTH_ERROR);
      window.dispatchEvent(new CustomEvent('google-maps-auth-failure', { detail: error.message }));
      mapsScriptPromise = null;
      reject(error);
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

export default function MapPanel({ liveData, selectedRegion }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const fallbackCenter = REGION_COORDS[selectedRegion] || REGION_COORDS.서울;
  const markerData = useMemo(
    () => (liveData.length ? liveData : [{ region: selectedRegion }]),
    [liveData, selectedRegion],
  );

  useEffect(() => {
    let cancelled = false;
    const handleAuthFailure = (event) => {
      if (cancelled) return;
      setStatus('error');
      setMessage(event.detail || GOOGLE_MAPS_AUTH_ERROR);
    };

    window.addEventListener('google-maps-auth-failure', handleAuthFailure);

    async function initMap() {
      setStatus('loading');
      setMessage('');

      try {
        const maps = await loadGoogleMaps();
        if (cancelled || !mapEl.current) return;

        const center = await getUserCenter(fallbackCenter);
        if (cancelled) return;

        mapRef.current = new maps.Map(mapEl.current, {
          center,
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoWindowRef.current = new maps.InfoWindow();
        setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error.message);
        }
      }
    }

    initMap();

    return () => {
      cancelled = true;
      window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
    };
  }, [fallbackCenter]);

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.google?.maps) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    markerData.forEach((item) => {
      const position = REGION_COORDS[item.region];
      if (!position) return;

      const marker = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        title: item.region,
      });
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(renderInfo(item));
        infoWindowRef.current.open({ anchor: marker, map: mapRef.current });
      });
      markersRef.current.push(marker);
    });
  }, [markerData, status]);

  if (!GOOGLE_MAPS_API_KEY) {
    return <MapMessage>Google Maps API 키가 설정되어 있지 않습니다. `VITE_GOOGLE_MAPS_API_KEY`를 설정해 주세요.</MapMessage>;
  }

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ color: '#f1f5f9', fontSize: 16, margin: 0 }}>위치 보기</h2>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          위치 권한 거부 시 선택 지역 중심으로 표시합니다.
        </span>
      </div>
      {status === 'error' ? (
        <MapMessage>{message}</MapMessage>
      ) : (
        <>
          {status === 'loading' && <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 10px' }}>지도를 불러오는 중입니다...</p>}
          <div ref={mapEl} style={{ width: '100%', minHeight: 460, borderRadius: 8, overflow: 'hidden', background: '#0f172a' }} />
        </>
      )}
    </div>
  );
}

function getUserCenter(fallbackCenter) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(fallbackCenter);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(fallbackCenter),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  });
}

function renderInfo(item) {
  const grade = getPm25Grade(item.pm25);
  return `
    <div style="font-family: system-ui, sans-serif; min-width: 180px;">
      <strong>${item.region || '-'}</strong>
      <div>상태: <span style="color:${grade.color}; font-weight:700;">${grade.label}</span></div>
      <div>PM2.5: ${fmt(item.pm25, ' ug/m3')}</div>
      <div>PM10: ${fmt(item.pm10, ' ug/m3')}</div>
      <div>온도: ${fmt(item.temperature, ' C')}</div>
      <div>습도: ${fmt(item.humidity, '%')}</div>
    </div>
  `;
}

function MapMessage({ children }) {
  return (
    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '56px 12px', border: '1px dashed #334155', borderRadius: 8 }}>
      {children}
    </div>
  );
}
