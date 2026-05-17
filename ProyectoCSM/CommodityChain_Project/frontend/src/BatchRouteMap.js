import React, { useEffect, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Flag, MapPin, Circle } from 'lucide-react';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl: iconShadowUrl,
});

const createSvgIcon = (IconComponent, color = '#0ea5e9') => {
  const svg = renderToStaticMarkup(
    <IconComponent size={28} color={color} strokeWidth={2.5} />
  );
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;background:${color}22;border:2px solid ${color};">${svg}</div>`,
    className: 'batch-route-icon',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -40],
  });
};

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const BatchRouteMap = ({ events = [] }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    [events]
  );

  const positions = useMemo(
    () =>
      sortedEvents
        .filter((event) => event.latitude != null && event.longitude != null)
        .map((event) => [Number(event.latitude), Number(event.longitude)]),
    [sortedEvents]
  );

  const lastPosition = positions.length ? positions[positions.length - 1] : [0, 0];

  const iconMap = useMemo(
    () => ({
      origin: createSvgIcon(MapPin, '#22d3ee'),
      intermediate: createSvgIcon(Circle, '#38bdf8'),
      destination: createSvgIcon(Flag, '#22c55e'),
    }),
    []
  );

  const getIconByStage = (stage, index) => {
    if (stage === 'origin' || index === 0) return iconMap.origin;
    if (stage === 'destination' || index === positions.length - 1) return iconMap.destination;
    return iconMap.intermediate;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full h-[520px] rounded-3xl overflow-hidden border border-slate-700 shadow-xl">
      <MapContainer
        center={lastPosition}
        zoom={9}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <RecenterMap center={lastPosition} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {positions.length > 0 && <Polyline positions={positions} pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.8 }} />}

        {sortedEvents.map((event, index) => {
          const eventPosition = [Number(event.latitude), Number(event.longitude)];
          const txHash = event.tx_hash || event.txHash || '';
          const explorerUrl = txHash ? `https://etherscan.io/tx/${txHash}` : '#';

          return (
            <Marker key={`${event.eventName}-${index}`} position={eventPosition} icon={getIconByStage(event.stage, index)}>
              <Popup>
                <div className="space-y-2">
                  <div className="font-semibold">{event.eventName || 'Evento de ruta'}</div>
                  <div className="text-xs text-slate-600">{formatDate(event.timestamp)}</div>
                  {txHash ? (
                    <a href={explorerUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-600 underline">
                      Ver transacción
                    </a>
                  ) : (
                    <div className="text-sm text-slate-500">Sin hash de transacción</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default BatchRouteMap;
