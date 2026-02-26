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

export default function SpotMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const location = useCurrentLocation();
  const [MapComponents, setMapComponents] = React.useState<any>(null);

  React.useEffect(() => {
    // Inject Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Dynamically import inside useEffect so window is available
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(([reactLeaflet, leafletModule]) => {
      const L = leafletModule.default || leafletModule;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setMapComponents(reactLeaflet);
    }).catch(e => console.error("Leaflet load failed:", e));

    return () => { document.head.removeChild(link); };
  }, []);

  if (!MapComponents || !location) {
    return (
      <div style={{ position: "absolute", inset: 0, backgroundColor: "#e2e8f0" }} />
    );
  }

  const { MapContainer, TileLayer, Marker, useMapEvents } = MapComponents;

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