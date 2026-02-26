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
const MAP_CONTAINER_ID = "spotjar-leaflet-map";

function waitForL(cb: (L: any) => void) {
  // If already available, use it immediately
  if ((window as any).L) { cb((window as any).L); return; }
  // Otherwise poll until available
  const interval = setInterval(() => {
    if ((window as any).L) {
      clearInterval(interval);
      cb((window as any).L);
    }
  }, 50);
}

export default function SpotMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const mapInstanceRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Inject CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Inject JS if not already present
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      document.head.appendChild(script);
    }

    // Wait for L to be available (handles both fresh load and cached load)
    waitForL((L) => {
      const container = document.getElementById(MAP_CONTAINER_ID);
      if (!container || mapInstanceRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => createMap(L, pos.coords.latitude, pos.coords.longitude),
          () => createMap(L, DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng)
        );
      } else {
        createMap(L, DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  function createMap(L: any, lat: number, lng: number) {
    const container = document.getElementById(MAP_CONTAINER_ID);
    if (!container || mapInstanceRef.current) return;

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
  }

  // Update markers when places change
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

  return (
    <div style={{ position: "absolute", inset: 0, minHeight: "400px" }}>
      {!ready && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#e2e8f0" }} />
      )}
      <div id={MAP_CONTAINER_ID} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}