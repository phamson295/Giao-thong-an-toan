'use client';

import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { HazardPoint } from '@gtat/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

const toGeoJson = (items: HazardPoint[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: items
    .filter((h) => !h.deleted)
    .map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      properties: { id: h.id, type: h.type, source: h.source, confirmations: h.confirmations },
    })),
});

export function HazardMap() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center: [105.85, 21.005],
      zoom: 14,
      pitch: 45, // nghiêng để xem tòa nhà 3D
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    const load = async () => {
      const b = map.getBounds();
      const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(',');
      try {
        const res = await fetch(`${API_URL}/hazards?bbox=${bbox}`);
        if (!res.ok) return; // ví dụ vùng quá rộng (> 2°)
        const { items } = (await res.json()) as { items: HazardPoint[] };
        (map.getSource('hazards') as GeoJSONSource | undefined)?.setData(toGeoJson(items));
      } catch {
        /* API chưa chạy */
      }
    };

    map.on('load', () => {
      map.addSource('hazards', { type: 'geojson', data: toGeoJson([]) });
      map.addLayer({
        id: 'hazards',
        type: 'circle',
        source: 'hazards',
        paint: {
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-color': [
            'match', ['get', 'source'],
            'community', '#6a1b9a',
            'official', '#d32f2f',
            '#1565c0',
          ],
        },
      });
      map.on('click', 'hazards', (e) => {
        const p = e.features?.[0]?.properties;
        if (!p) return;
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<b>${p.type}</b><br/>Nguồn: ${p.source}<br/>Xác nhận: ${p.confirmations}`)
          .addTo(map);
      });
      load();
    });
    map.on('moveend', load);

    return () => map.remove();
  }, []);

  return <div ref={container} className="h-full w-full" />;
}
