import React from "react";
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

export default function SpotMap(props: Props) {
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