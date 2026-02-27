import React, { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";

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

function WebMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

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
      const container = containerRef.current;
      if (!L || !container) return;

      clearInterval(interval);

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const createMap = (lat: number, lng: number) => {
        const container = containerRef.current;
        if (!container) return;
        try {
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
        } catch (e) {
          console.error("Map creation failed:", e);
        }
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
      <div ref={containerRef} style={{ height: "100%", width: "100%", zIndex: 2 }} />
    </div>
  );
}

function NativeMap(props: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator?.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(DEFAULT_LOCATION)
    );
    if (!navigator?.geolocation) setLocation(DEFAULT_LOCATION);
  }, []);

  const {
    default: MapView,
    Marker,
    PROVIDER_DEFAULT,
  } = require("react-native-maps");

  const center = location || DEFAULT_LOCATION;

  return (
    <MapView
      ref={props.mapRef}
      style={{ flex: 1 }}
      provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (Platform.OS !== "web") {
    return <NativeMap {...props} />;
  }

  if (!mounted) {
    return <View style={{ flex: 1, backgroundColor: "#e2e8f0" } as any} />;
  }

  return <WebMap {...props} />;
}