import React, { useEffect, useRef, useState, useId } from "react";
import { Platform, View, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";

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
  const mapInstanceId = useId().replace(/:/g, "");
  const containerId = `map-container-${mapInstanceId}`;
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;

    const initSequence = async () => {
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

      let element: HTMLElement | null = null;
      for (let i = 0; i < 30; i++) {
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

        setTimeout(() => map.invalidateSize(), 400);

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

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 13),
            null,
            { timeout: 5000 }
          );
        }
      } catch (e) {
        console.error("Leaflet logic error:", e);
      }
    };

    initSequence();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerId, pinMode, onLongPress]);

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

  // We use a plain object for styles here because StyleSheet.create 
  // doesn't support '100dvh' or web-specific string units.
  const mapElementStyle: any = {
    height: "100%",
    width: "100%",
    minHeight: "100dvh",
  };

  return (
    <View style={styles.webContainer}>
      <View 
        nativeID={containerId} 
        style={mapElementStyle} 
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
  webContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#f1f5f9",
  } as ViewStyle,
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(241, 245, 249, 0.8)",
    zIndex: 10,
  } as ViewStyle,
});

export default function SpotMap(props: Props) {
  return Platform.OS === "web" ? <WebMap {...props} /> : <NativeMap {...props} />;
}