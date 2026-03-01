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

const DEFAULT_LAT = 49.2827;
const DEFAULT_LNG = -123.1207;

const MAP_HTML = [
  '<!DOCTYPE html><html><head>',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
  '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>',
  '<style>html,body,#map{height:100%;width:100%;margin:0;padding:0;}</style>',
  '</head><body><div id="map"></div><script>',
  'var map=L.map("map").setView([' + DEFAULT_LAT + ',' + DEFAULT_LNG + '],13);',
  'L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);',
  'map.on("contextmenu",function(e){',
  'window.parent.postMessage({type:"longpress",lat:e.latlng.lat,lng:e.latlng.lng},"*");',
  '});',
  'window._markers=[];',
  'window.addEventListener("message",function(e){',
  'if(e.data.type==="updateMarkers"){',
  'window._markers.forEach(function(m){m.remove();});',
  'window._markers=[];',
  'e.data.places.forEach(function(p){',
  'if(p.lat&&p.lng){',
  'var mk=L.marker([p.lat,p.lng]).addTo(map);',
  'mk.on("click",function(){window.parent.postMessage({type:"markerClick",place:p},"*");});',
  'window._markers.push(mk);',
  '}});}})',
  ';window.parent.postMessage({type:"ready"},"*");',
  '<\/script></body></html>'
].join('');

function WebMap({ places, pinMode, onLongPress, onMarkerPress }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        setIframeReady(true);
      } else if (e.data.type === 'longpress' && pinMode) {
        onLongPress({ nativeEvent: { coordinate: { latitude: e.data.lat, longitude: e.data.lng } } });
      } else if (e.data.type === 'markerClick') {
        onMarkerPress(e.data.place);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pinMode, onLongPress, onMarkerPress]);

  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ type: 'updateMarkers', places }, '*');
  }, [places, iframeReady]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const blob = new Blob([MAP_HTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <iframe
        ref={iframeRef}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts"
      />
    </div>
  );
}

function NativeMap(props: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator?.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG })
    );
    if (!navigator?.geolocation) setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  }, []);

  const { default: MapView, Marker, PROVIDER_DEFAULT } = require("react-native-maps");
  const center = location || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

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
  if (Platform.OS !== 'web') return <NativeMap {...props} />;
  return <WebMap {...props} />;
}