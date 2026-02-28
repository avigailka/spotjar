import React, { useEffect, useRef, useState, useId } from "react";
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
  // Generates a unique ID for this specific map instance to prevent DOM clutter
  const uniqueId = useId().replace(/:/g, ""); 
  const containerId = `map-container-${uniqueId}`;
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isBrowser) return;

    // 1. Inject Leaflet CSS & JS if not already present
    const injectAssets = () => {
      if (!(window as any).L) {
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => startInitialization();
        document.head.appendChild(script);
      } else {
        startInitialization();
      }
    };

    const startInitialization = () => {
      let attempts = 0;
      const checkExist = setInterval(() => {
        const L = (window as any).L;
        const container = document.getElementById(containerId);
        
        // Wait until BOTH the library is loaded AND the div has a physical height
        if (L && container && container.offsetHeight > 0) {
          clearInterval(checkExist);
          initLeaflet(L, container);
        }
        
        if (attempts > 50) clearInterval(checkExist); // Stop after 5 seconds
        attempts++;
      }, 100);
    };

    const initLeaflet = (L: any, container: HTMLElement) => {
      if (mapRef.current) return;

      try {
        // Fix for default Leaflet marker icons not loading from CDN
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Initialize Map
        const map = L.map(container, {
          tap: false, // CRITICAL for Android Chrome touch interaction
          zoomControl: true,
        }).setView([DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng], 13);

        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        // Force an immediate size refresh to fix "grey box" issues
        setTimeout(() => map.invalidateSize(), 250);

        map.on("contextmenu", (e: any) => {
          if (pinMode) {
            onLongPress({ 
              nativeEvent: { 
                coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } 
              } 
            });
          }
        });

        setReady(true);

        // Location check: Initialize map first, then move to user if they allow
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 13),
            null,
            { timeout: 5000, enableHighAccuracy: false }
          );
        }
      } catch (err) {
        console.error("Leaflet initialization failed:", err);
      }
    };

    injectAssets();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers when places change
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
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#f1f5f9" }}>
      <div 
        id={containerId} 
        style={{ 
          height: "100%", 
          width: "100%", 
          minHeight: "100dvh" // Fixes Pixel 8/9 Address Bar height issues
        }} 
      />
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