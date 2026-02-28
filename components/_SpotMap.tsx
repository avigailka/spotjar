import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

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
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

function WebMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;

    // 1. Inject CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 2. Inject JS
    if (!document.querySelector('script[src*="leaflet.js"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      document.head.appendChild(script);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const L = (window as any).L;
      const container = containerRef.current;

      if (!L || !container || attempts > 50) {
        if (attempts > 50) clearInterval(interval);
        return;
      }

      clearInterval(interval);

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const createMap = (lat: number, lng: number) => {
        if (!containerRef.current || mapRef.current) return;

        // Ensure layout is ready before initializing
        requestAnimationFrame(() => {
          try {
            const map = L.map(containerRef.current!, {
              tap: false, // CRITICAL: Fixes Android Chrome touch/render issues
              zoomControl: true,
            }).setView([lat, lng], 13);

            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: '&copy; OpenStreetMap',
            }).addTo(map);

            // Give the browser a moment to render tiles, then fix size
            setTimeout(() => {
              map.invalidateSize();
            }, 200);

            map.on("contextmenu", (e: any) => {
              if (pinMode) {
                onLongPress({ nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } } });
              }
            });

            setReady(true);
          } catch (e) {
            console.error("Leaflet Init Error:", e);
          }
        });
      };

      if (navigator?.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => createMap(pos.coords.latitude, pos.coords.longitude),
          () => createMap(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng),
          { timeout: 5000 }
        );
      } else {
        createMap(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !ready || !L) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    places.filter(p => p.lat && p.lng).forEach(p => {
      const marker = L.marker([p.lat!, p.lng!]).addTo(map);
      marker.on("click", () => onMarkerPress(p));
      markersRef.current.push(marker);
    });
  }, [places, ready]);

  return (
    <div style={{ 
      position: "absolute", 
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "#e2e8f0" 
    }}>
      <div 
        ref={containerRef} 
        style={{ height: "100%", width: "100%", visibility: ready ? "visible" : "hidden" }} 
      />
    </div>
  );
}

// NativeMap implementation stays largely the same as your previous version
function NativeMap(props: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator?.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(DEFAULT_LOCATION)
    );
  }, []);

  const { default: MapView, Marker, PROVIDER_DEFAULT } = require("react-native-maps");
  const center = location || DEFAULT_LOCATION;

  return (
    <MapView
      ref={props.mapRef}
      style={{ flex: 1 }}
      provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
      initialRegion={{ 
        latitude: center.lat, 
        longitude: center.lng, 
        latitudeDelta: 0.06, 
        longitudeDelta: 0.06 
      }}
      onLongPress={props.pinMode ? props.onLongPress : undefined}
      showsUserLocation={true}
    >
      {props.places.filter(p => p.lat && p.lng).map(p => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.lat!, longitude: p.lng! }}
          pinColor={props.getPinColor(p.category)}
          onPress={() => props.onMarkerPress(p)}
        />
      ))}
    </MapView>
  );
}

export default function SpotMap(props: Props) {
  return Platform.OS === "web" ? <WebMap {...props} /> : <NativeMap {...props} />;
}