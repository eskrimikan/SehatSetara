import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Clock, MapPin, Navigation, Phone, ChevronLeft, Building2, Stethoscope, Pill, Baby, Cross, LocateFixed, Loader2, Search, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "../api";

type FacilityType = "puskesmas" | "klinik" | "apotek" | "bidan" | "rs";

interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  phone: string;
  hours: string;
  lat: number;
  lng: number;
  distance: number;
  isOpen: boolean;
  source: string;
}

interface Props {}

type FacilityWithDistance = Facility & {
  geoLat: number;
  geoLng: number;
  displayDistance: number;
  openNow: boolean;
};

type UserLocation = { lat: number; lng: number };

const typeConfig: Record<FacilityType, { label: string; color: string; bg: string; dot: string; icon: LucideIcon }> = {
  puskesmas: { label: "Puskesmas", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", icon: Building2 },
  klinik: { label: "Klinik", color: "text-[#5b74f5]", bg: "bg-[#edf2fd] border-blue-200", dot: "bg-[#5b74f5]", icon: Stethoscope },
  apotek: { label: "Apotek", color: "text-violet-700", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500", icon: Pill },
  bidan: { label: "Bidan/Posyandu", color: "text-pink-700", bg: "bg-pink-50 border-pink-200", dot: "bg-pink-500", icon: Baby },
  rs: { label: "Rumah Sakit", color: "text-[#f84848]", bg: "bg-red-50 border-red-200", dot: "bg-[#f84848]", icon: Cross },
};

const filterOptions: { id: FacilityType | "all"; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "puskesmas", label: "Puskesmas" },
  { id: "klinik", label: "Klinik" },
  { id: "apotek", label: "Apotek" },
  { id: "bidan", label: "Bidan" },
  { id: "rs", label: "RS" },
]

const MAP_CENTER: [number, number] = [-6.9167, 106.9267];
const LOCAL_LOCATION_KEY = "sehatsetara_faskes_location_v1";

const haversineKm = (a: UserLocation, b: { lat: number; lng: number }) => {
  const R = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng), Math.sqrt(1 - sinLat * sinLat - Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng));
  return R * c;
};

const isCurrentlyOpen = (hours?: string) => {
  if (!hours) return true;
  const normalized = hours.toLowerCase();
  if (normalized.includes("24 jam")) return true;
  const match = normalized.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
  if (!match) return true;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = match[1].split(":").map(Number);
  const [closeHour, closeMinute] = match[2].split(":").map(Number);
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  if (closeMinutes < openMinutes) return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

function buildFacilityIcon(type: FacilityType, isSelected: boolean) {
  const cfg = typeConfig[type];
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${isSelected ? 34 : 28}px;
        height:${isSelected ? 34 : 28}px;
        border-radius:999px;
        background:${type === "rs" ? "#f84848" : type === "puskesmas" ? "#22c55e" : type === "klinik" ? "#5b74f5" : type === "apotek" ? "#8b5cf6" : "#ec4899"};
        border:3px solid white;
        box-shadow:0 8px 20px rgba(15,23,42,.18);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-size:12px;
        font-weight:700;
        transform:${isSelected ? "translate(-50%, -100%) scale(1.05)" : "translate(-50%, -100%)"};
      ">${cfg.label.charAt(0)}</div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
}

function parseFacilityList(data: any, center: UserLocation): Facility[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((item: any) => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      const type = String(item.type || "") as FacilityType;
      if (!lat || !lng || !typeConfig[type]) return null;
      return {
        id: String(item.id),
        name: String(item.name || "Faskes tanpa nama"),
        type,
        address: String(item.address || "Alamat belum tercatat"),
        phone: String(item.phone || "-"),
        hours: String(item.hours || ""),
        lat,
        lng,
        distance: Number(item.distance || haversineKm(center, { lat, lng }).toFixed(1)),
        isOpen: Boolean(item.isOpen),
        source: String(item.source || "openstreetmap"),
      };
    })
    .filter(Boolean) as Facility[];
}

export default function FaskesScreen(_props: Props) {
  const [activeFilter, setActiveFilter] = useState<FacilityType | "all">("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_LOCATION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as UserLocation;
    } catch {
      return null;
    }
  });
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [loadError, setLoadError] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(MAP_CENTER, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const center = userLocation || { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };
    const load = async () => {
      setLoadingFacilities(true);
      setLoadError("");
      try {
        const response = await apiFetch("/faskes/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: center.lat, lng: center.lng, radius: 6000 }),
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.error || "Gagal memuat data faskes");
        }
        const next = parseFacilityList(data, center);
        setFacilities(next);
        setSelectedId((current) => current || next[0]?.id || "");
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Gagal memuat data faskes");
        setFacilities([]);
        setSelectedId("");
      } finally {
        setLoadingFacilities(false);
      }
    };

    load();
  }, [userLocation, reloadTick]);

  const facilitiesWithDistance = useMemo<FacilityWithDistance[]>(() => {
    const center = userLocation || { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };
    return facilities.map((facility) => ({
      ...facility,
      geoLat: facility.lat,
      geoLng: facility.lng,
      displayDistance: Number((userLocation ? haversineKm(center, facility) : facility.distance).toFixed(1)),
      openNow: isCurrentlyOpen(facility.hours),
    }));
  }, [facilities, userLocation]);

  const visibleFacilities = useMemo(() => {
    return facilitiesWithDistance
      .filter((facility) => activeFilter === "all" || facility.type === activeFilter)
      .filter((facility) => {
        if (!searchValue.trim()) return true;
        const searchable = `${facility.name} ${facility.address}`.toLowerCase();
        return searchable.includes(searchValue.toLowerCase());
      })
      .sort((a, b) => a.displayDistance - b.displayDistance);
  }, [activeFilter, facilitiesWithDistance, searchValue]);

  const selectedFacility = visibleFacilities.find((facility) => facility.id === selectedId) || visibleFacilities[0] || null;

  useEffect(() => {
    if (!visibleFacilities.length) return;
    if (!visibleFacilities.some((facility) => facility.id === selectedId)) {
      setSelectedId(visibleFacilities[0].id);
    }
  }, [visibleFacilities, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    visibleFacilities.forEach((facility) => {
      const marker = L.marker([facility.geoLat, facility.geoLng], { icon: buildFacilityIcon(facility.type, facility.id === selectedId) });
      marker.bindPopup(`<strong>${facility.name}</strong><br/>${typeConfig[facility.type].label}<br/>${facility.address}`);
      marker.on("click", () => setSelectedId(facility.id));
      marker.addTo(layer);
      markersRef.current[facility.id] = marker;
      bounds.extend([facility.geoLat, facility.geoLng]);
    });

    if (userLocation) {
      if (userMarkerRef.current) userMarkerRef.current.remove();
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: "",
          html: `
            <div style="
              width:18px;
              height:18px;
              border-radius:999px;
              background:#5b74f5;
              border:3px solid white;
              box-shadow:0 0 0 6px rgba(91,116,245,.16);
              transform:translate(-50%, -50%);
            "></div>
          `,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(layer);
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    if (visibleFacilities.length) {
      map.fitBounds(bounds.pad(0.18));
    } else {
      map.setView(MAP_CENTER, 13);
    }

    if (selectedFacility) {
      markersRef.current[selectedFacility.id]?.openPopup();
    }
  }, [visibleFacilities, selectedId, userLocation, selectedFacility]);

  const activateLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("Perangkat tidak mendukung lokasi.");
      return;
    }

    setIsLocating(true);
    setGeoStatus("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(nextLocation);
        localStorage.setItem(LOCAL_LOCATION_KEY, JSON.stringify(nextLocation));
        setGeoStatus("Lokasi aktif. Jarak dihitung otomatis ke fasilitas terdekat.");
        setIsLocating(false);
      },
      () => {
        setGeoStatus("Gagal mengambil lokasi. Aktifkan izin lokasi di browser.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSelect = (facility: FacilityWithDistance) => {
    setSelectedId(facility.id);
    const map = mapRef.current;
    if (map) {
      map.setView([facility.geoLat, facility.geoLng], Math.max(map.getZoom(), 14), { animate: true });
    }
  };

  const currentCenter = userLocation || { lat: MAP_CENTER[0], lng: MAP_CENTER[1] };

  return (
    <div className="h-full flex flex-col pt-4 sm:pt-8 px-4 sm:px-8 pb-6 sm:pb-8 gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[#1a2560] text-2xl sm:text-3xl mb-1">Radar Faskes</h1>
          <p className="text-[#6b7ab8] text-sm">Fasilitas kesehatan nyata dari OpenStreetMap di sekitar lokasi Anda</p>
        </div>

        <button
          type="button"
          onClick={activateLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-2xl px-4 py-2.5 text-sm font-medium border border-blue-100 bg-white text-[#5b74f5] shadow-sm disabled:opacity-60"
        >
          {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
          {userLocation ? "Lokasi Aktif" : "Aktifkan Lokasi"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8ea4f8]" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Cari nama faskes atau alamat"
            className="w-full rounded-2xl border border-blue-100 bg-white pl-10 pr-3 py-3 text-sm outline-none"
          />
        </label>

        <button
          type="button"
          onClick={() => setReloadTick((value) => value + 1)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium border border-blue-100 bg-white text-[#5b74f5] shadow-sm"
        >
          <RefreshCw size={16} />
          Muat Ulang
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const cfg = opt.id !== "all" ? typeConfig[opt.id as FacilityType] : null;
          const Icon = cfg?.icon;
          const active = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setActiveFilter(opt.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all ${active ? "text-white shadow-md" : "bg-white text-[#6b7ab8] border border-blue-100"}`}
              style={active ? { background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" } : {}}
            >
              {Icon ? <Icon size={13} /> : <MapPin size={13} />}
              {opt.label}
            </button>
          );
        })}
      </div>

      {geoStatus && (
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-[#5b74f5] shadow-sm">
          {geoStatus}
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {loadingFacilities && (
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-[#5b74f5] inline-flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Memuat fasilitas nyata di sekitar lokasi {currentCenter.lat.toFixed(2)}, {currentCenter.lng.toFixed(2)}
        </div>
      )}

      <div className="grid lg:grid-cols-[330px_minmax(0,1fr)] gap-4 sm:gap-5 flex-1 min-h-0">
        <div className="bg-white rounded-3xl border border-blue-50 shadow-sm overflow-y-auto min-h-0 max-h-[460px] lg:max-h-none">
          <div className="px-4 py-2.5 border-b border-blue-50 flex-shrink-0 flex items-center justify-between gap-2">
            <span className="text-[#6b7ab8] text-xs">{visibleFacilities.length} fasilitas ditemukan</span>
            <span className="text-[#6b7ab8] text-[11px]">Data OSM</span>
          </div>

          {visibleFacilities.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[#6b7ab8]">Tidak ada fasilitas yang cocok dengan filter saat ini.</div>
          ) : (
            visibleFacilities.map((facility) => {
              const cfg = typeConfig[facility.type];
              const Icon = cfg.icon;
              const isSelected = selectedFacility?.id === facility.id;
              return (
                <button
                  key={facility.id}
                  onClick={() => handleSelect(facility)}
                  className={`w-full px-4 py-3.5 flex items-start gap-3 border-b border-blue-50 text-left transition-colors ${isSelected ? "bg-[#edf2fd]" : "hover:bg-gray-50"}`}
                >
                  <div className={`w-10 h-10 rounded-xl border ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#1a2560] text-sm font-medium leading-tight">{facility.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${facility.openNow ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {facility.openNow ? "Buka" : "Tutup"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[#6b7ab8] text-xs mt-1">
                      <Navigation size={10} className="flex-shrink-0" />
                      <span>{facility.displayDistance} km dari Anda</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-4 min-h-0">
          <div className="bg-white rounded-3xl border border-blue-50 shadow-sm overflow-hidden min-h-[320px] flex-1">
            <div className="px-4 py-3 border-b border-blue-50 flex items-center justify-between">
              <span className="text-[#1a2560] font-medium">Peta Faskes</span>
              <span className="text-xs text-[#6b7ab8]">{visibleFacilities.length} marker</span>
            </div>
            <div ref={mapContainerRef} className="h-[400px] sm:h-[calc(100%-52px)] w-full" />
            <div className="relative">
              <div className="absolute bottom-3 left-3 bg-white/90 rounded-xl px-3 py-2 backdrop-blur-sm flex flex-wrap gap-2 max-w-[230px] shadow-sm border border-blue-50">
                {Object.entries(typeConfig).map(([type, cfg]) => {
                  const LIcon = cfg.icon;
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <LIcon size={10} className={cfg.color} />
                      <span className="text-xs text-[#6b7ab8]">{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="absolute bottom-3 right-3 text-xs text-[#6b7ab8] opacity-60">Peta Leaflet</div>
            </div>
          </div>

          {selectedFacility && (
            <div className="bg-white rounded-3xl border border-blue-50 shadow-sm p-4 sm:p-5 flex-shrink-0">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl border ${typeConfig[selectedFacility.type].bg} flex items-center justify-center flex-shrink-0`}>
                  {(() => {
                    const Icon = typeConfig[selectedFacility.type].icon;
                    return <Icon size={24} className={typeConfig[selectedFacility.type].color} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-[#1a2560] text-lg font-semibold">{selectedFacility.name}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeConfig[selectedFacility.type].bg} ${typeConfig[selectedFacility.type].color}`}>
                      {typeConfig[selectedFacility.type].label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${selectedFacility.openNow ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedFacility.openNow ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {selectedFacility.openNow ? "Sedang Buka" : "Sedang Tutup"}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 mt-3">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="text-[#b0bef8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#6b7ab8] text-xs">Alamat</p>
                        <p className="text-[#1a2560] text-sm">{selectedFacility.address}</p>
                        <p className="text-[#5b74f5] text-xs font-medium mt-0.5 flex items-center gap-1">
                          <Navigation size={10} /> {selectedFacility.displayDistance} km
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock size={15} className="text-[#b0bef8] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#6b7ab8] text-xs">Jam Operasional</p>
                        <p className="text-[#1a2560] text-sm">{selectedFacility.hours || "Belum tersedia"}</p>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`tel:${selectedFacility.phone}`}
                    className="mt-4 flex items-center gap-3 rounded-2xl p-3 text-white w-full sm:w-[260px]"
                    style={{ background: "linear-gradient(135deg, #5b74f5, #7a9bf8)" }}
                  >
                    <Phone size={18} className="flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-sm">Hubungi</div>
                      <div className="text-white/80 text-xs">{selectedFacility.phone}</div>
                    </div>
                  </a>
                </div>
                <button onClick={() => setSelectedId(visibleFacilities[0]?.id || "")} className="text-[#b0bef8] hover:text-[#6b7ab8] flex-shrink-0">
                  <ChevronLeft size={18} className="rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
