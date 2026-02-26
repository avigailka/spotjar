import React from "react";

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

export default function SpotMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const [ready, setReady] = React.useState(false);

  // Step 1: Load Leaflet from CDN
  React.useEffect(() => {
    if ((window as any).L) { initMap(); return; }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => initMap();
    script.onerror = (e) => console.error("Leaflet script failed to load", e);
    document.head.appendChild(script);
  }, []);

  function initMap() {
    const getLocation = (cb: (lat: number, lng: number) => void) => {
      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => cb(pos.coords.latitude, pos.coords.longitude),
          () => cb(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng)
        );
      } else {
        cb(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      }
    };

    getLocation((lat, lng) => {
      // Wait for the div to be in the DOM
      const tryInit = () => {
        const container = containerRef.current;
        if (!container) { setTimeout(tryInit, 50); return; }
        if (mapInstanceRef.current) return;

        const L = (window as any).L;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(container).setView([lat, lng], 13);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        map.on("contextmenu", (e: any) => {
          if (pinMode) {
            onLongPress({ nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } } });
          }
        });

        setReady(true);
      };

      tryInit();
    });
  }

  // Step 2: Update markers when places change
  React.useEffect(() => {
    const map = mapInstanceRef.current;
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

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, minHeight: "400px" }}>
      {!ready && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#e2e8f0" }} />
      )}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}