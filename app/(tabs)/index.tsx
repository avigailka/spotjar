import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Modal, StyleSheet, Alert, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import SpotMap from "./SpotMap";
import type { LongPressEvent } from "react-native-maps";
import { createClient, Session } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Place = {
  id: string; name: string; category?: string; price?: string;
  area?: string; vibe?: string; dish?: string; recommender?: string;
  rating?: number; notes?: string; lat?: number; lng?: number;
  map_id?: string;
};

type MapList = {
  id: string; name: string; emoji: string; category: string;
  code: string; members: string[]; places: Place[];
  created_at: number; owner_id?: string;
};

type GeoResult = { display_name: string; lat: string; lon: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const CUISINE_COLORS: Record<string, string> = {
  japanese: "#3b82f6", chinese: "#6366f1", italian: "#0ea5e9",
  thai: "#14b8a6", french: "#8b5cf6", indian: "#f59e0b",
  korean: "#ec4899", mexican: "#f97316", vietnamese: "#10b981",
};

function getPinColor(item?: string) {
  if (!item) return "#2563eb";
  const key = Object.keys(CUISINE_COLORS).find(k => (item || "").toLowerCase().includes(k));
  return key ? CUISINE_COLORS[key] : "#2563eb";
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const EMOJI_OPTIONS = ["🍜","☕","✂️","🌿","🏋️","🎨","🛍️","🍺","🌸","📚","🎵","🐾"];
const CATEGORY_PRESETS = ["Restaurants", "Cafés", "Hair Salons", "Parks", "Gyms", "Shops", "Bars", "Custom…"];

// ─── Small components ─────────────────────────────────────────────────────────

function Stars({ rating, onSet }: { rating: number; onSet?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <TouchableOpacity key={i} onPress={() => onSet?.(i)} disabled={!onSet}>
          <Text style={{ fontSize: onSet ? 24 : 13, color: i <= rating ? "#f59e0b" : "#cbd5e1" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Badge({ children, color = "#eff6ff", textColor = "#1d4ed8" }: { children: React.ReactNode; color?: string; textColor?: string }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 4, marginBottom: 4 }}>
      <Text style={{ color: textColor, fontSize: 11, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setError("Please enter email and password"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) onAuth(data.session);
        else setError("Check your email to confirm your account!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) onAuth(data.session);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { justifyContent: "center" }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Image source={require("../../assets/images/icon.png")} style={{ width: 80, height: 80, marginBottom: 12, borderRadius: 20 }} />
          <Text style={{ color: "white", fontSize: 28, fontWeight: "700", marginBottom: 4 }}>Spotjar</Text>
          <Text style={{ color: "#94a3b8", fontSize: 15 }}>Your jar of favourite spots, shared with friends</Text>
        </View>

        <View style={{ backgroundColor: "white", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20 }}>
          {/* Mode toggle */}
          <View style={{ flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 12, padding: 3, marginBottom: 24 }}>
            {(["login", "signup"] as const).map(m => (
              <TouchableOpacity key={m} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: mode === m ? "white" : "transparent" }}
                onPress={() => { setMode(m); setError(""); }}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: mode === m ? "#0f172a" : "#94a3b8" }}>
                  {m === "login" ? "Log In" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput style={styles.formInput} value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor="#94a3b8"
              autoCapitalize="none" keyboardType="email-address" autoCorrect={false} />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Password</Text>
            <TextInput style={styles.formInput} value={password} onChangeText={setPassword}
              placeholder="Min. 6 characters" placeholderTextColor="#94a3b8"
              secureTextEntry autoCapitalize="none" />
          </View>

          {error ? (
            <View style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: "#fecaca" }}>
              <Text style={{ color: "#b91c1c", fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.btnPrimary, { alignItems: "center", paddingVertical: 14 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>{mode === "login" ? "Log In →" : "Create Account →"}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [maps, setMaps] = useState<MapList[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<"home" | "map">("home");
  const [activeMap, setActiveMap] = useState<MapList | null>(null);

  // Check for existing session on startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (!session) setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session) loadMaps();
  }, [session]);

  async function loadMaps() {
    setLoading(true);
    try {
      const userId = session?.user.id;
      if (!userId) return;
      const { data: userMaps, error: umError } = await supabase
        .from("user_maps").select("map_id").eq("user_id", userId);
      if (umError) throw umError;
      const mapIds = (userMaps || []).map((r: any) => r.map_id);
      if (mapIds.length === 0) { setMaps([]); return; }
      const { data: mapsData, error: mapsError } = await supabase
        .from("maps").select("*").in("id", mapIds);
      if (mapsError) throw mapsError;
      const { data: placesData, error: placesError } = await supabase
        .from("places").select("*").in("map_id", mapIds);
      if (placesError) throw placesError;
      const combined: MapList[] = (mapsData || []).map((m: any) => ({
        ...m, places: (placesData || []).filter((p: any) => p.map_id === m.id),
      }));
      setMaps(combined);
    } catch (e) {
      Alert.alert("Error loading data", "Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMaps([]);
    setScreen("home");
    setActiveMap(null);
  }

  function openMap(m: MapList) { setActiveMap(m); setScreen("map"); }
  function updateMapLocally(updated: MapList) {
    setMaps(ms => ms.map(m => m.id === updated.id ? updated : m));
    setActiveMap(updated);
  }
  async function deleteMap(id: string) {
    await supabase.from("maps").delete().eq("id", id);
    setMaps(ms => ms.filter(m => m.id !== id));
    setScreen("home");
  }

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, alignItems: "center", backgroundColor: "#0f172a" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 480 : undefined }}>
          <AuthScreen onAuth={setSession} />
        </View>
      </View>
    );
  }

  if (screen === "map" && activeMap) {
    return (
      <View style={{ flex: 1, alignItems: "center", backgroundColor: "#0f172a" }}>
      <View style={{ flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 480 : undefined }}>
      <MapDetailScreen
        mapList={activeMap}
        onUpdate={updateMapLocally}
        onBack={() => { setScreen("home"); loadMaps(); }}
        onDelete={() => deleteMap(activeMap.id)}
        userId={session.user.id}
      />
      </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1, alignItems: "center", backgroundColor: "#0f172a" }}>
    <View style={{ flex: 1, width: "100%", maxWidth: Platform.OS === "web" ? 480 : undefined }}>
    <HomeScreen
      maps={maps}
      userId={session.user.id}
      userEmail={session.user.email || ""}
      onOpen={openMap}
      onSignOut={handleSignOut}
      onMapCreated={async m => {
        await supabase.from("user_maps").insert({ user_id: session.user.id, map_id: m.id });
        setMaps(ms => [...ms, m]);
      }}
      onRemove={id => setMaps(ms => ms.filter(m => m.id !== id))}
      onMapJoined={async code => {
        const { data: mapData } = await supabase.from("maps").select("*").eq("code", code.toUpperCase()).single();
        if (!mapData) return false;
        const { data: placesData } = await supabase.from("places").select("*").eq("map_id", mapData.id);
        const found: MapList = { ...mapData, places: placesData || [] };
        await supabase.from("user_maps").upsert({ user_id: session.user.id, map_id: found.id });
        setMaps(ms => ms.find(m => m.id === found.id) ? ms : [...ms, found]);
        openMap(found);
        return true;
      }}
    />
    </View>
    </View>
    </SafeAreaProvider>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ maps, userId, userEmail, onOpen, onSignOut, onMapCreated, onMapJoined, onRemove }: {
  maps: MapList[];
  userId: string;
  userEmail: string;
  onOpen: (m: MapList) => void;
  onSignOut: () => void;
  onMapCreated: (m: MapList) => void;
  onMapJoined: (code: string) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customEmoji, setCustomEmoji] = useState(false);

  const [cName, setCName] = useState("");
  const [cEmoji, setCEmoji] = useState("🍜");
  const [cCategory, setCCategory] = useState("Restaurants");
  const [cCustomCat, setCCustomCat] = useState("");
  const [cMemberName, setCMemberName] = useState("");
  const [cMembers, setCMembers] = useState<string[]>([]);

  const myMapsCount = maps.filter(m => m.owner_id === userId).length;

  async function handleCreate() {
    if (!cName.trim()) { Alert.alert("Please enter a map name"); return; }
    if (myMapsCount >= 10) { Alert.alert("Map limit reached", "You can have a maximum of 10 maps. Delete one to create a new one."); return; }
    setSaving(true);
    const newMap = {
      id: Date.now().toString(),
      name: cName.trim(),
      emoji: cEmoji,
      category: cCategory === "Custom…" ? cCustomCat.trim() || "Places" : cCategory,
      code: generateCode(),
      members: cMembers,
      created_at: Date.now(),
      owner_id: userId,
    };
    const { error } = await supabase.from("maps").insert(newMap);
    if (error) { Alert.alert("Error creating map", error.message); setSaving(false); return; }
    onMapCreated({ ...newMap, places: [] });
    setCreateOpen(false);
    setCName(""); setCEmoji("🍜"); setCCategory("Restaurants");
    setCCustomCat(""); setCMembers([]); setCMemberName("");
    setCustomEmoji(false);
    setSaving(false);
  }

  async function handleJoin() {
    const success = await onMapJoined(joinCode);
    if (!success) setJoinError("No map found with that code. Check with your friend!");
    else { setJoinOpen(false); setJoinCode(""); setJoinError(""); }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ backgroundColor: "#0f172a", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={require("../../assets/images/icon.png")} style={{ width: 28, height: 28, borderRadius: 6 }} />
          <Text style={styles.logo}><Text style={{ color: "#60a5fa" }}>Spotjar</Text></Text>
        </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>{userEmail.split("@")[0]}</Text>
            <TouchableOpacity onPress={() => Alert.alert("Sign out?", "", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: onSignOut },
            ])}>
              <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "700" }}>⎋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setCreateOpen(true)}>
              <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>+ New Map</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.btnGhost, { flex: 1, alignItems: "center", borderColor: editMode ? "#60a5fa" : "rgba(255,255,255,0.25)" }]}
            onPress={() => setEditMode(e => !e)}>
            <Text style={{ color: editMode ? "#60a5fa" : "white", fontWeight: "700", fontSize: 13 }}>{editMode ? "✓ Done" : "✏️ Edit"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnGhost, { flex: 1, alignItems: "center" }]} onPress={() => setJoinOpen(true)}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>🔗 Join a Map</Text>
          </TouchableOpacity>
        </View>
        {myMapsCount >= 8 && (
          <Text style={{ color: "#f59e0b", fontSize: 11, marginTop: 6, textAlign: "center" }}>
            {10 - myMapsCount} map{10 - myMapsCount !== 1 ? "s" : ""} remaining on your plan
          </Text>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {maps.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🗺️</Text>
            <Text style={{ color: "white", fontSize: 20, fontWeight: "700", marginBottom: 8 }}>No maps yet</Text>
            <Text style={{ color: "#94a3b8", textAlign: "center", lineHeight: 20 }}>Create your first map or join one{"\n"}with a code from a friend</Text>
          </View>
        )}
        {maps.map(m => (
          <TouchableOpacity key={m.id} style={[styles.mapCard, editMode && { opacity: 0.95 }]} onPress={() => !editMode && onOpen(m)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={styles.mapEmoji}>
                <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#0f172a", fontSize: 17, fontWeight: "700", marginBottom: 2 }}>{m.name}</Text>
                <Text style={{ color: "#64748b", fontSize: 13 }}>{m.category} · {m.places.length} place{m.places.length !== 1 ? "s" : ""}</Text>
                <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>
                  👥 {m.members.length > 0 ? m.members.slice(0,3).join(", ") + (m.members.length > 3 ? ` +${m.members.length - 3}` : "") : "Just you"}
                </Text>
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 20 }}>›</Text>
              {editMode && (
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    "Remove from your list?",
                    "The map stays in the database. You can rejoin anytime with the code.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => onRemove(m.id) },
                    ]
                  )}
                  style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: 6, marginLeft: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 18 }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.codeTag}>
              <Text style={{ color: "#2563eb", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>CODE: {m.code}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* CREATE MODAL */}
      <Modal visible={createOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ New Map</Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)}>
                <Text style={{ fontSize: 22, color: "#94a3b8" }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Map Name</Text>
                <TextInput style={styles.formInput} value={cName} onChangeText={setCName} placeholder="e.g. Vancouver Eats, Hair Salons…" placeholderTextColor="#94a3b8" />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Icon</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {[...EMOJI_OPTIONS, "Custom…"].map(e => (
                    <TouchableOpacity key={e} onPress={() => { if (e === "Custom…") { setCEmoji(""); setCustomEmoji(true); } else { setCEmoji(e); setCustomEmoji(false); } }}
                      style={{ width: e === "Custom…" ? "auto" : 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: e === "Custom…" ? 12 : 0, backgroundColor: (customEmoji && e === "Custom…") || cEmoji === e ? "#eff6ff" : "#f8fafc", borderWidth: 1.5, borderColor: (customEmoji && e === "Custom…") || cEmoji === e ? "#2563eb" : "#e2e8f0" }}>
                      <Text style={{ fontSize: e === "Custom…" ? 13 : 22, fontWeight: e === "Custom…" ? "700" : "400", color: (customEmoji && e === "Custom…") || cEmoji === e ? "#2563eb" : "#64748b" }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {customEmoji && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0" }}>
                      <Text style={{ fontSize: 26 }}>{cEmoji || "?"}</Text>
                    </View>
                    <TextInput style={[styles.formInput, { flex: 1 }]} value={cEmoji} onChangeText={t => setCEmoji(t.slice(-2))}
                      placeholder="Tap emoji keyboard…" placeholderTextColor="#94a3b8" autoFocus />
                  </View>
                )}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORY_PRESETS.map(c => (
                    <TouchableOpacity key={c} style={[styles.chip, cCategory === c && styles.chipActive]} onPress={() => setCCategory(c)}>
                      <Text style={[styles.chipText, cCategory === c && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {cCategory === "Custom…" && (
                  <TextInput style={[styles.formInput, { marginTop: 8 }]} value={cCustomCat} onChangeText={setCCustomCat} placeholder="Type your category…" placeholderTextColor="#94a3b8" />
                )}
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Add Friends (optional)</Text>
                <Text style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>You can also share the map code with them later</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {cMembers.map(m => (
                    <View key={m} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 }}>
                      <Text style={{ color: "#1d4ed8", fontWeight: "700", fontSize: 13 }}>{m}</Text>
                      <TouchableOpacity onPress={() => setCMembers(ms => ms.filter(x => x !== m))}>
                        <Text style={{ color: "#93c5fd", fontWeight: "700" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput style={[styles.formInput, { flex: 1 }]} value={cMemberName} onChangeText={setCMemberName} placeholder="Friend's name…" placeholderTextColor="#94a3b8"
                    onSubmitEditing={() => { if (cMemberName.trim()) { setCMembers(ms => [...ms, cMemberName.trim()]); setCMemberName(""); } }} />
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => { if (cMemberName.trim()) { setCMembers(ms => [...ms, cMemberName.trim()]); setCMemberName(""); } }}>
                    <Text style={{ color: "white", fontWeight: "700" }}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 40 }}>
                <TouchableOpacity style={[styles.btnGhost2, { flex: 1, alignItems: "center" }]} onPress={() => setCreateOpen(false)}>
                  <Text style={{ color: "#64748b", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 2, alignItems: "center" }]} onPress={handleCreate} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Create Map 🗺️</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
          </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* JOIN MODAL */}
      <Modal visible={joinOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.modalContainer}>
          <View style={[styles.modalInner, { padding: 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔗 Join a Map</Text>
            <TouchableOpacity onPress={() => { setJoinOpen(false); setJoinCode(""); setJoinError(""); }}>
              <Text style={{ fontSize: 22, color: "#94a3b8" }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#64748b", marginBottom: 20, lineHeight: 20 }}>
            Ask a friend to share their map code. You'll find it on the map card on their home screen.
          </Text>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Map Code</Text>
            <TextInput
              style={[styles.formInput, { fontSize: 22, fontWeight: "700", letterSpacing: 4, textAlign: "center" }]}
              value={joinCode} onChangeText={t => { setJoinCode(t.toUpperCase()); setJoinError(""); }}
              placeholder="ABC123" placeholderTextColor="#cbd5e1"
              autoCapitalize="characters" autoCorrect={false} maxLength={6}
            />
            {joinError ? <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 6, textAlign: "center" }}>{joinError}</Text> : null}
          </View>
          <TouchableOpacity style={[styles.btnPrimary, { alignItems: "center", paddingVertical: 14, marginTop: 8 }]} onPress={handleJoin}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Join Map →</Text>
          </TouchableOpacity>
          </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Map Detail Screen ────────────────────────────────────────────────────────

function MapDetailScreen({ mapList, onUpdate, onBack, onDelete, userId }: {
  mapList: MapList;
  onUpdate: (m: MapList) => void;
  onBack: () => void;
  onDelete: () => void;
  userId: string;
}) {
  const [tab, setTab] = useState<"map" | "list">("map");
  const [filters, setFilters] = useState({ search: "", recommender: "", price: "", minRating: 0 });
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Place>>({});
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [newMember, setNewMember] = useState("");
  const [pinMode, setPinMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "success" | "noresults">("idle");
  const geoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<any>(null);

  const isOwner = mapList.owner_id === userId;
  const placesCount = mapList.places.length;

  const filtered = mapList.places.filter(p => {
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && !(p.notes || "").toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.recommender && p.recommender !== filters.recommender) return false;
    if (filters.price && p.price !== filters.price) return false;
    if (filters.minRating && (p.rating || 0) < filters.minRating) return false;
    return true;
  });

  function searchLocation(query: string) {
    setGeoQuery(query); setGeoResults([]); setGeoStatus("idle");
    if (geoTimeout.current) clearTimeout(geoTimeout.current);
    if (!query.trim()) return;
    geoTimeout.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const q = encodeURIComponent(query + " Vancouver BC");
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=4`, { headers: { "User-Agent": "MyMapsApp/1.0" } });
        const data: GeoResult[] = await res.json();
        setGeoResults(data);
        setGeoStatus(data.length === 0 ? "noresults" : "idle");
      } catch { setGeoStatus("noresults"); }
      finally { setGeoLoading(false); }
    }, 600);
  }

  function pickGeoResult(r: GeoResult) {
    setForm(f => ({ ...f, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
    setGeoQuery(r.display_name.split(",")[0]);
    setGeoResults([]); setGeoStatus("success");
  }

  function handleMapLongPress(e: LongPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setForm(f => ({ ...f, lat: latitude, lng: longitude }));
    setGeoStatus("success"); setGeoQuery(""); setGeoResults([]);
    setPinMode(false); setAddOpen(true);
  }

  function openAdd(p?: Place) {
    setEditing(p ? p.id : null);
    setForm(p ? { ...p } : { rating: 0 });
    setGeoQuery(""); setGeoResults([]);
    setGeoStatus(p?.lat ? "success" : "idle");
    setPinMode(false); setAddOpen(true);
  }

  async function savePlace() {
    if (!form.name?.trim()) { Alert.alert("Name required"); return; }
    if (!editing && placesCount >= 200) { Alert.alert("Place limit reached", "This map has reached the maximum of 200 places."); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("places").update(form).eq("id", editing);
        if (error) throw error;
        onUpdate({ ...mapList, places: mapList.places.map(p => p.id === editing ? { ...p, ...form } : p) });
      } else {
        const newPlace = { ...form, id: Date.now().toString(), map_id: mapList.id } as Place;
        const { error } = await supabase.from("places").insert(newPlace);
        if (error) throw error;
        onUpdate({ ...mapList, places: [...mapList.places, newPlace] });
      }
      setAddOpen(false);
    } catch (e: any) {
      Alert.alert("Error saving", e.message);
    } finally { setSaving(false); }
  }

  async function deletePlace(id: string) {
    Alert.alert("Remove this place?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        await supabase.from("places").delete().eq("id", id);
        onUpdate({ ...mapList, places: mapList.places.filter(p => p.id !== id) });
      }},
    ]);
  }

  async function updateMembers(members: string[]) {
    await supabase.from("maps").update({ members }).eq("id", mapList.id);
    onUpdate({ ...mapList, members });
  }

  function focusOn(p: Place) {
    setSelectedPlace(p); setTab("map");
    if (p.lat && p.lng && mapRef.current) {
      mapRef.current.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <TouchableOpacity onPress={onBack}>
            <Text style={{ color: "#60a5fa", fontSize: 17, fontWeight: "700" }}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
            {mapList.emoji} {mapList.name}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.btnGhost} onPress={() => setSettingsOpen(true)}>
            <Text style={{ color: "white", fontSize: 13 }}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btnPrimary, placesCount >= 200 && { opacity: 0.5 }]} onPress={() => openAdd()}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {placesCount >= 180 && (
        <View style={{ backgroundColor: "#1e293b", paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={{ color: "#f59e0b", fontSize: 11, textAlign: "center" }}>
            {200 - placesCount} place{200 - placesCount !== 1 ? "s" : ""} remaining in this map
          </Text>
        </View>
      )}

      <View style={styles.tabs}>
        {(["map","list"] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "map" ? "🗺 Map" : `📋 List (${filtered.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "map" && (
        <View style={{ flex: 1 }}>
          <SpotMap
            mapRef={mapRef}
            places={filtered}
            pinMode={pinMode}
            onLongPress={handleMapLongPress}
            onMarkerPress={setSelectedPlace}
            getPinColor={getPinColor}
          />

          {/* Bottom info panel — shows when a marker is tapped */}
          {selectedPlace && (
            <View style={styles.infoPanel}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: "#0f172a", marginBottom: 4 }}>{selectedPlace.name}</Text>
                  <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>{[selectedPlace.category, selectedPlace.price, selectedPlace.area].filter(Boolean).join(" · ")}</Text>
                  {selectedPlace.dish ? <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>✨ {selectedPlace.dish}</Text> : null}
                  {selectedPlace.notes ? <Text style={{ fontSize: 12, fontStyle: "italic", color: "#94a3b8", marginBottom: 6 }}>"{selectedPlace.notes}"</Text> : null}
                  <Text style={{ fontSize: 12, color: "#2563eb", fontWeight: "700" }}>via {selectedPlace.recommender}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPlace(null)}>
                  <Text style={{ fontSize: 20, color: "#94a3b8" }}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={[styles.btnGhost2, { flex: 1, alignItems: "center" }]} onPress={() => openAdd(selectedPlace)}>
                  <Text style={{ color: "#64748b", fontWeight: "700", fontSize: 13 }}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1, alignItems: "center" }]} onPress={() => { setTab("list"); }}>
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>📋 See in List</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {tab === "list" && (
        <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
          <View style={styles.filterBar}>
            <TextInput style={styles.searchInput} placeholder="Search…" value={filters.search} onChangeText={t => setFilters(f => ({ ...f, search: t }))} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <TouchableOpacity style={[styles.chip, !filters.recommender && styles.chipActive]} onPress={() => setFilters(f => ({ ...f, recommender: "" }))}>
                <Text style={[styles.chipText, !filters.recommender && styles.chipTextActive]}>All</Text>
              </TouchableOpacity>
              {mapList.members.map(m => (
                <TouchableOpacity key={m} style={[styles.chip, filters.recommender === m && styles.chipActive]}
                  onPress={() => setFilters(f => ({ ...f, recommender: filters.recommender === m ? "" : m }))}>
                  <Text style={[styles.chipText, filters.recommender === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 }} />
              {["$","$$","$$$","$$$$"].map(p => (
                <TouchableOpacity key={p} style={[styles.chip, filters.price === p && styles.chipActive]}
                  onPress={() => setFilters(f => ({ ...f, price: filters.price === p ? "" : p }))}>
                  <Text style={[styles.chipText, filters.price === p && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 }} />
              {[{l:"3+⭐",v:3},{l:"4+⭐",v:4},{l:"5⭐",v:5}].map(({l,v}) => (
                <TouchableOpacity key={v} style={[styles.chip, filters.minRating === v && styles.chipActive]}
                  onPress={() => setFilters(f => ({ ...f, minRating: filters.minRating === v ? 0 : v }))}>
                  <Text style={[styles.chipText, filters.minRating === v && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList data={filtered} keyExtractor={p => p.id} contentContainerStyle={{ padding: 12, gap: 10 }}
            ListEmptyComponent={<View style={{ alignItems: "center", padding: 40 }}><Text style={{ fontSize: 40 }}>{mapList.emoji}</Text><Text style={{ color: "#94a3b8", marginTop: 8 }}>No places yet — add one!</Text></View>}
            renderItem={({ item: p }) => (
              <TouchableOpacity style={[styles.card, selectedPlace?.id === p.id && styles.cardSelected]} onPress={() => focusOn(p)}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={styles.cardName} numberOfLines={1}>{p.name}</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <TouchableOpacity onPress={() => openAdd(p)}><Text style={{ fontSize: 16 }}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => deletePlace(p.id)}><Text style={{ fontSize: 16 }}>🗑️</Text></TouchableOpacity>
                  </View>
                </View>
                <Stars rating={p.rating || 0} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                  {p.category && <Badge color="#eff6ff" textColor="#1d4ed8">{p.category}</Badge>}
                  {p.price && <Badge color="#f0fdf4" textColor="#15803d">{p.price}</Badge>}
                  {p.vibe && <Badge color="#faf5ff" textColor="#7c3aed">{p.vibe}</Badge>}
                  {p.area && <Badge color="#f0f9ff" textColor="#0369a1">📍 {p.area}</Badge>}
                </View>
                {p.notes && <Text style={styles.cardNotes} numberOfLines={2}>"{p.notes}"</Text>}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={styles.cardRecommender}>via <Text style={{ color: "#2563eb" }}>{p.recommender || "?"}</Text></Text>
                  {p.dish && <Text style={styles.cardDish}>✨ {p.dish}</Text>}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ADD/EDIT MODAL */}
      <Modal visible={addOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.modalContainer}>
          <View style={styles.modalInner}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? "✏️ Edit" : `✨ Add to ${mapList.name}`}</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}>
                <Text style={{ fontSize: 22, color: "#94a3b8" }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
              {[
                { label: "Name *", key: "name", placeholder: "e.g. Bao Bei, Great Clips…" },
                { label: mapList.category === "Restaurants" ? "Cuisine" : "Type", key: "category", placeholder: "e.g. Italian, Balayage…" },
                { label: "Area / Neighbourhood", key: "area", placeholder: "e.g. Gastown, Kits…" },
                { label: "Vibe / Occasion", key: "vibe", placeholder: "e.g. Date night, Quick lunch" },
                { label: "Must-Try / Do", key: "dish", placeholder: "e.g. Truffle ramen, Ask for balayage…" },
              ].map(({ label, key, placeholder }) => (
                <View key={key} style={styles.formGroup}>
                  <Text style={styles.formLabel}>{label}</Text>
                  <TextInput style={styles.formInput} value={(form as any)[key] || ""} onChangeText={t => setForm(f => ({ ...f, [key]: t }))} placeholder={placeholder} placeholderTextColor="#94a3b8" />
                </View>
              ))}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Price Range</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {["$","$$","$$$","$$$$"].map(p => (
                    <TouchableOpacity key={p} style={[styles.chip, form.price === p && styles.chipActive]} onPress={() => setForm(f => ({ ...f, price: p }))}>
                      <Text style={[styles.chipText, form.price === p && styles.chipTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Recommended By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {mapList.members.map(m => (
                    <TouchableOpacity key={m} style={[styles.chip, form.recommender === m && styles.chipActive]} onPress={() => setForm(f => ({ ...f, recommender: m }))}>
                      <Text style={[styles.chipText, form.recommender === m && styles.chipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rating</Text>
                <Stars rating={form.rating || 0} onSet={v => setForm(f => ({ ...f, rating: v }))} />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput style={[styles.formInput, { height: 80, textAlignVertical: "top" }]} value={form.notes || ""} onChangeText={t => setForm(f => ({ ...f, notes: t }))} placeholder="Any tips or details?" placeholderTextColor="#94a3b8" multiline />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>📍 Location</Text>
                <View>
                  <TextInput style={[styles.formInput, geoStatus === "success" && { borderColor: "#22c55e" }]}
                    value={geoQuery} onChangeText={searchLocation}
                    placeholder="Search to find on map…" placeholderTextColor="#94a3b8" autoCorrect={false} />
                  {geoLoading && <ActivityIndicator size="small" color="#2563eb" style={{ position: "absolute", right: 12, top: 12 }} />}
                </View>
                {geoResults.length > 0 && (
                  <View style={styles.geoDropdown}>
                    {geoResults.map((r, i) => (
                      <TouchableOpacity key={i} style={[styles.geoResult, i < geoResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }]} onPress={() => pickGeoResult(r)}>
                        <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "600" }} numberOfLines={1}>{r.display_name.split(",")[0]}</Text>
                        <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }} numberOfLines={1}>{r.display_name.split(",").slice(1,3).join(",")}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {geoStatus === "success" && (
                  <View style={styles.locSuccess}>
                    <Text style={{ color: "#15803d", fontSize: 12, fontWeight: "600" }}>✅ Location set! ({form.lat?.toFixed(4)}, {form.lng?.toFixed(4)})</Text>
                  </View>
                )}
                {geoStatus === "noresults" && <Text style={{ color: "#f59e0b", fontSize: 12, marginTop: 4 }}>⚠️ No results — try a different name</Text>}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                </View>
                <TouchableOpacity style={styles.pinBtn} onPress={() => {
                  setPinMode(true); setAddOpen(false); setTab("map");
                  Alert.alert("Drop a pin", "Long-press anywhere on the map to set the location.", [{ text: "Got it" }]);
                }}>
                  <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 13 }}>📍 Long-press on map to drop a pin</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 40 }}>
                <TouchableOpacity style={[styles.btnGhost2, { flex: 1, alignItems: "center" }]} onPress={() => setAddOpen(false)}>
                  <Text style={{ color: "#64748b", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 2, alignItems: "center" }]} onPress={savePlace} disabled={saving}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Save {mapList.emoji}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
          </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* SETTINGS MODAL */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
          <View style={styles.modalContainer}>
          <View style={[styles.modalInner, { padding: 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚙️ Map Settings</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <Text style={{ fontSize: 22, color: "#94a3b8" }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.formGroup, { marginTop: 8 }]}>
            <Text style={styles.formLabel}>Share Code</Text>
            <View style={{ backgroundColor: "#f0f9ff", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#bae6fd" }}>
              <Text style={{ fontSize: 32, fontWeight: "700", letterSpacing: 6, color: "#0369a1" }}>{mapList.code}</Text>
              <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Share this code with friends so they can join</Text>
            </View>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Members</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {mapList.members.map(m => (
                <View key={m} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
                  <Text style={{ color: "#1d4ed8", fontWeight: "700" }}>{m}</Text>
                  <TouchableOpacity onPress={() => updateMembers(mapList.members.filter(x => x !== m))}>
                    <Text style={{ color: "#93c5fd", fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {mapList.members.length === 0 && <Text style={{ color: "#94a3b8", fontSize: 13 }}>No members yet</Text>}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[styles.formInput, { flex: 1 }]} value={newMember} onChangeText={setNewMember} placeholder="Add a member…" placeholderTextColor="#94a3b8"
                onSubmitEditing={() => { if (newMember.trim()) { updateMembers([...mapList.members, newMember.trim()]); setNewMember(""); } }} />
              <TouchableOpacity style={styles.btnPrimary} onPress={() => { if (newMember.trim()) { updateMembers([...mapList.members, newMember.trim()]); setNewMember(""); } }}>
                <Text style={{ color: "white", fontWeight: "700" }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          {isOwner && (
            <TouchableOpacity style={{ backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1.5, borderColor: "#fecaca", marginTop: 20 }} onPress={onDelete}>
              <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 15 }}>🗑️ Delete this map</Text>
            </TouchableOpacity>
          )}
          </View>
          </View>
        </SafeAreaView>
      </Modal>

      {pinMode && (
        <View style={styles.pinBanner}>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>📍 Long-press to drop a pin</Text>
          <TouchableOpacity onPress={() => { setPinMode(false); setAddOpen(true); }}>
            <Text style={{ color: "#f87171", fontWeight: "700" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: { backgroundColor: "#0f172a", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  logo: { color: "white", fontSize: 20, fontWeight: "700" },
  btnPrimary: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  btnGhost: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  btnGhost2: { borderWidth: 1.5, borderColor: "#e2e8f0", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  tabs: { flexDirection: "row", backgroundColor: "#1e293b", paddingHorizontal: 16, paddingBottom: 10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#2563eb" },
  tabText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "white" },
  filterBar: { backgroundColor: "white", padding: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  searchInput: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: "#e2e8f0", marginRight: 6 },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#64748b", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "white" },
  card: { backgroundColor: "white", borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: "#e2e8f0" },
  cardSelected: { borderColor: "#2563eb", shadowColor: "#2563eb", shadowOpacity: 0.15, shadowRadius: 8 },
  cardName: { fontWeight: "700", fontSize: 15, color: "#0f172a", flex: 1, marginRight: 8 },
  cardNotes: { fontSize: 12, color: "#64748b", fontStyle: "italic", marginTop: 4, lineHeight: 17 },
  cardRecommender: { fontSize: 12, color: "#94a3b8", fontWeight: "700" },
  cardDish: { fontSize: 11, color: "#94a3b8" },
  mapCard: { backgroundColor: "white", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8 },
  mapEmoji: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#f0f9ff", alignItems: "center", justifyContent: "center" },
  codeTag: { marginTop: 12, backgroundColor: "#f0f9ff", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: "flex-start", borderWidth: 1, borderColor: "#bae6fd" },
  modalContainer: { flex: 1, alignItems: "center" },
  modalInner: { flex: 1, width: "100%", maxWidth: 480 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  formInput: { backgroundColor: "#f8fafc", borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 15, color: "#0f172a" },
  geoDropdown: { backgroundColor: "white", borderRadius: 10, borderWidth: 1.5, borderColor: "#e2e8f0", marginTop: 4, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  geoResult: { padding: 12 },
  locSuccess: { marginTop: 6, backgroundColor: "#f0fdf4", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#bbf7d0" },
  pinBtn: { marginTop: 8, borderWidth: 1.5, borderColor: "#2563eb", borderRadius: 10, padding: 12, alignItems: "center", borderStyle: "dashed" },
  pinBanner: { position: "absolute", bottom: 20, left: 16, right: 16, backgroundColor: "#0f172a", borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12 },
  infoPanel: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, zIndex: 1000 },
});