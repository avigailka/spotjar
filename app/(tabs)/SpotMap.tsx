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

// Web map using react-leaflet
function WebMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const [LeafletComponents, setLeafletComponents] = React.useState<any>(null);

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

  if (!LeafletComponents) {
    return <View style={{ flex: 1, backgroundColor: "#e2e8f0" }} />;
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
    <div style={{ flex: 1, height: "100%", width: "100%" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={[49.2827, -123.1207]}
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
  const {
    default: MapView,
    Marker,
    PROVIDER_DEFAULT,
  } = require("react-native-maps");

  return (
    <MapView
      ref={props.mapRef}
      style={{ flex: 1 }}
      provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
      initialRegion={{ latitude: 49.2827, longitude: -123.1207, latitudeDelta: 0.06, longitudeDelta: 0.06 }}
      onLongPress={props.pinMode ? props.onLongPress : undefined}
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