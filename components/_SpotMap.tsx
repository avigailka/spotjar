import React, { useEffect, useRef, useState } from "react";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";

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
  // Hardcoded ID to ensure VSCode doesn't trip over useId types
  const containerId = "leaflet-web-map-container";
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;

    const initSequence = async () => {
      // 1. Load Assets if window.L isn't there
      if (!(window as any).L) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.async = true;
          script.onload = resolve;
          document.head.appendChild(script);

          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        });
      }

      const L = (window as any).L;

      // 2. Poll for the DOM element by ID
      let element: HTMLElement | null = null;
      for (let i = 0; i < 40; i++) {
        element = document.getElementById(containerId);
        if (element && element.offsetHeight > 0) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!element || mapRef.current) return;

      try {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        const map = L.map(element, {
          tap: false, 
          zoomControl: true,
        }).setView([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng], 13);

        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        setTimeout(() => map.invalidateSize(), 500);

        map.on("contextmenu", (e: any) => {
          if (pinMode) {
            onLongPress({
              nativeEvent: {
                coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng },
              },
            });
          }
        });

        setReady(true);
      } catch (e) {
        console.error("Leaflet Error:", e);
      }
    };

    initSequence();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pinMode, onLongPress]);

  useEffect(() => {
    const map = mapRef.current;
    const L = (window as any).L;
    if (!map || !ready || !L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    places.filter((p) => p.lat && p.lng).forEach((p) => {
      const marker = L.marker([p.lat!, p.lng!]).addTo(map);
      marker.on("click", () => onMarkerPress(p));
      markersRef.current.push(marker);
    });
  }, [places, ready, onMarkerPress]);

  return (
    <View style={styles.webWrapper}>
      {/* Using nativeID ensures the underlying <div> gets an ID leaflet can find.
          We use inline styles with 'any' to bypass VSCode CSS validation.
      */}
      <View 
        nativeID={containerId} 
        style={{ 
          height: "100%", 
          width: "100%", 
          minHeight: "100dvh" 
        } as any} 
      />
      {!ready && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}
    </View>
  );
}

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

const styles = StyleSheet.create({
  webWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f1f5f9",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(241, 245, 249, 0.8)",
  },
});

export default function SpotMap(props: Props) {
  return Platform.OS === "web" ? <WebMap {...props} /> : <NativeMap {...props} />;
}