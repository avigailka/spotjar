import React, { useEffect, useRef, useState } from "react";

type Place = {
  id: string; name: string; category?: string; price?: string;
  area?: string; vibe?: string; dish?: string; recommender?: string;
  rating?: number; notes?: string; lat?: number; lng?: number;
  map_id?: string;
};

type Props = {
  mapRef?: any;
  places: Place[];
  pinMode: boolean;
  onLongPress: (e: any) => void;
  onMarkerPress: (place: Place) => void;
  getPinColor: (category?: string) => string;
};

const DEFAULT_LOCATION = { lat: 49.2827, lng: -123.1207 };
const MAP_CONTAINER_ID = "spotjar-leaflet-map";

function LeafletMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Inject CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject script if needed
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.head.appendChild(script);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 100) { clearInterval(interval); return; }
      
      const L = (window as any).L;
      const container = document.getElementById(MAP_CONTAINER_ID);
      if (!L || !container) return;
      
      // Only skip if we've already initialized in THIS mount
      if (initializedRef.current) { clearInterval(interval); return; }
      
      clearInterval(interval);
      initializedRef.current = true;

      // Clean up any leftover map on the container from a previous mount
      if ((container as any)._leaflet_id) {
        (container as any)._leaflet_id = null;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const createMap = (lat: number, lng: number) => {
        const container = document.getElementById(MAP_CONTAINER_ID);
        if (!container) return;
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

        const map = L.map(container).setView([lat, lng], 13);
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        map.invalidateSize();

        map.on("contextmenu", (e: any) => {
          if (pinMode) {
            onLongPress({ nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } } });
          }
        });

        setReady(true);
      };

      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => createMap(pos.coords.latitude, pos.coords.longitude),
          () => createMap(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng)
        );
      } else {
        createMap(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      initializedRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const L = (window as any).L;
    if (!L) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    places.filter(p => p.lat && p.lng).forEach(p => {
      const marker = L.marker([p.lat!, p.lng!]).addTo(map);
      marker.on("click", () => onMarkerPress(p));
      markersRef.current.push(marker);
    });
  }, [places, ready]);

  return (
    <div style={{ position: "absolute", inset: 0, minHeight: "400px" }}>
      {!ready && <div style={{ position: "absolute", inset: 0, backgroundColor: "#e2e8f0" }} />}
      <div id={MAP_CONTAINER_ID} style={{ height: "100%", width: "100%", zIndex: 2 }} />
    </div>
  );
}

export default function SpotMap(props: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ position: "absolute", inset: 0, backgroundColor: "#e2e8f0" }} />;
  }

  return <LeafletMap {...props} />;
}