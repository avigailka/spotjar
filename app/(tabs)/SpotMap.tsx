import React from "react";
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

function useCurrentLocation() {
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation(DEFAULT_LOCATION)
      );
    } else {
      setLocation(DEFAULT_LOCATION);
    }
  }, []);

  return location;
}

// Web map using react-leaflet
function WebMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const [LeafletComponents, setLeafletComponents] = React.useState<any>(null);
  const location = useCurrentLocation();

  React.useEffect(() => {
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, L]) => {
      const leaflet = L.default || L;
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeafletComponents(reactLeaflet);
    });
  }, []);

  React.useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  if (!LeafletComponents || !location) {
    return (
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#e2e8f0" }} />
    );
  }

  const { MapContainer, TileLayer, Marker, useMapEvents } = LeafletComponents;

  function LongPressHandler() {
    useMapEvents({
      contextmenu(e: any) {
        if (pinMode) {
          onLongPress({ nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } } });
        }
      },
    });
    return null;
  }

  return (
    <div style={{ position: "absolute", inset: 0, minHeight: "400px" }}>
      <MapContainer
        center={[location.lat, location.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LongPressHandler />
        {(places || []).filter(p => p.lat && p.lng).map(p => (
          <Marker
            key={p.id}
            position={[p.lat!, p.lng!]}
            eventHandlers={{ click: () => onMarkerPress(p) }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

// Native map using react-native-maps
function NativeMap(props: Props) {
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
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
  if (Platform.OS === "web") {
    return <WebMap {...props} />;
  }
  return <NativeMap {...props} />;
}