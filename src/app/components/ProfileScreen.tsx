import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, Loader2, LogOut, Save } from "lucide-react";
import type { AuthSession, ProfileData } from "../types";

interface Props {
  auth: AuthSession;
  onLogout: () => void;
}

const emptyProfile: ProfileData = {
  fullName: "",
  age: "",
  province: "",
  city: "",
  district: "",
  hospitalName: "",
  photoDataUrl: "",
};

type RegionOption = { id: string; name: string };
type HospitalOption = { id: string; name: string };

export default function ProfileScreen({ auth, onLogout }: Props) {
  const storageKey = useMemo(() => `sehatsetara_profile_${auth.username}`, [auth.username]);
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [provinceOptions, setProvinceOptions] = useState<RegionOption[]>([]);
  const [cityOptions, setCityOptions] = useState<RegionOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<RegionOption[]>([]);
  const [hospitalOptions, setHospitalOptions] = useState<HospitalOption[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        setProfile({ ...emptyProfile, ...(JSON.parse(raw) as ProfileData) });
      } catch {
        setProfile(emptyProfile);
      }
    }

    const loadServerProfile = async () => {
      try {
        const response = await fetch("/profile", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        setProfile((prev) => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          age: data.age || prev.age,
          province: data.province || prev.province,
          city: data.city || prev.city,
          district: data.district || prev.district,
          hospitalName: data.hospitalName || prev.hospitalName,
        }));
      } catch {
        // Keep local cache when backend is unavailable.
      }
    };

    loadServerProfile();
  }, [storageKey]);

  useEffect(() => {
    const loadRegions = async () => {
      setLoadingRegions(true);
      try {
        const response = await fetch("/regions/provinces");
        const data = await response.json().catch(() => []);
        setProvinceOptions(Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), name: String(item.name) })) : []);
      } finally {
        setLoadingRegions(false);
      }
    };

    loadRegions();
  }, []);

  useEffect(() => {
    if (!profile.province || provinceId) return;
    const match = provinceOptions.find((option) => option.name === profile.province);
    if (match) setProvinceId(match.id);
  }, [profile.province, provinceId, provinceOptions]);

  useEffect(() => {
    const loadCities = async () => {
      if (!provinceId) {
        setCityOptions([]);
        setCityId("");
        setDistrictOptions([]);
        setDistrictId("");
        setHospitalOptions([]);
        return;
      }

      setLoadingRegions(true);
      try {
        const response = await fetch(`/regions/cities/${provinceId}`);
        const data = await response.json().catch(() => []);
        const nextCities = Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), name: String(item.name) })) : [];
        setCityOptions(nextCities);
        if (profile.city) {
          const match = nextCities.find((option) => option.name === profile.city);
          if (match) setCityId(match.id);
        }
      } finally {
        setLoadingRegions(false);
      }
    };

    loadCities();
  }, [provinceId, profile.city]);

  useEffect(() => {
    const loadDistricts = async () => {
      if (!cityId) {
        setDistrictOptions([]);
        setDistrictId("");
        setHospitalOptions([]);
        return;
      }

      setLoadingRegions(true);
      try {
        const response = await fetch(`/regions/districts/${cityId}`);
        const data = await response.json().catch(() => []);
        const nextDistricts = Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), name: String(item.name) })) : [];
        setDistrictOptions(nextDistricts);
        if (profile.district) {
          const match = nextDistricts.find((option) => option.name === profile.district);
          if (match) setDistrictId(match.id);
        }
      } finally {
        setLoadingRegions(false);
      }
    };

    loadDistricts();
  }, [cityId, profile.district]);

  useEffect(() => {
    const loadHospitals = async () => {
      if (!districtId) {
        setHospitalOptions([]);
        return;
      }

      setLoadingHospitals(true);
      try {
        const provinceName = provinceOptions.find((option) => option.id === provinceId)?.name || profile.province;
        const cityName = cityOptions.find((option) => option.id === cityId)?.name || profile.city;
        const districtName = districtOptions.find((option) => option.id === districtId)?.name || profile.district;
        const params = new URLSearchParams({ province: provinceName, city: cityName, district: districtName });
        const response = await fetch(`/regions/hospitals?${params.toString()}`);
        const data = await response.json().catch(() => []);
        const nextHospitals = Array.isArray(data) ? data.map((item: any) => ({ id: String(item.id), name: String(item.name) })) : [];
        setHospitalOptions(nextHospitals);
        if (profile.hospitalName && !nextHospitals.some((option) => option.name === profile.hospitalName)) {
          setProfile((prev) => ({ ...prev, hospitalName: "" }));
        }
      } finally {
        setLoadingHospitals(false);
      }
    };

    loadHospitals();
  }, [districtId, districtOptions, cityId, cityOptions, provinceId, provinceOptions, profile.city, profile.district, profile.hospitalName, profile.province]);

  const isDoctor = ["dokter", "produsen"].includes(auth.role);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile((prev) => ({ ...prev, photoDataUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          age: profile.age,
          province: profile.province,
          city: profile.city,
          district: profile.district,
          hospitalName: profile.hospitalName,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Gagal menyimpan profil");
      }

      localStorage.setItem(storageKey, JSON.stringify(profile));
      setSaved(true);
      setStatus("Profil tersimpan di server.");
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full px-4 sm:px-8 pt-18 sm:pt-22 pb-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-blue-100 shadow-sm p-5 sm:p-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[#1a2560] text-2xl font-semibold">Profil</h1>
            <p className="text-[#6b7ab8] text-sm mt-1">Username: {auth.username}</p>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-red-100 bg-red-50 text-red-600">
            <LogOut size={14} />
            Logout
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl border border-blue-100 bg-[#edf2fd] overflow-hidden flex items-center justify-center">
              {profile.photoDataUrl ? <img src={profile.photoDataUrl} alt="Profil" className="w-full h-full object-cover" /> : <Camera size={24} className="text-[#8ea4f8]" />}
            </div>
            <label className="text-sm text-[#5b74f5] cursor-pointer">
              Tambah foto profil
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-[#1a2560]">Nama</span>
              <input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none" />
            </label>
            <label className="block">
              <span className="text-sm text-[#1a2560]">Umur</span>
              <input type="number" value={profile.age} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} className="mt-1.5 w-full border border-blue-100 rounded-2xl px-3 py-3 outline-none" />
            </label>

            {isDoctor && (
              <>
                <label className="block sm:col-span-2">
                  <span className="text-sm text-[#1a2560]">Provinsi rumah sakit</span>
                  <div className="relative mt-1.5">
                    <select
                      value={provinceId}
                      onChange={(e) => {
                        setProvinceId(e.target.value);
                        setCityId("");
                        setDistrictId("");
                        setHospitalOptions([]);
                        setProfile((p) => ({ ...p, province: provinceOptions.find((option) => option.id === e.target.value)?.name || "", city: "", district: "", hospitalName: "" }));
                      }}
                      className="w-full appearance-none border border-blue-100 rounded-2xl px-3 py-3 outline-none bg-white"
                    >
                      <option value="">Pilih provinsi</option>
                      {provinceOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8ea4f8]" />
                  </div>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm text-[#1a2560]">Kota / kabupaten rumah sakit</span>
                  <div className="relative mt-1.5">
                    <select
                      value={cityId}
                      onChange={(e) => {
                        setCityId(e.target.value);
                        setDistrictId("");
                        setHospitalOptions([]);
                        setProfile((p) => ({ ...p, city: cityOptions.find((option) => option.id === e.target.value)?.name || "", district: "", hospitalName: "" }));
                      }}
                      disabled={!provinceId || loadingRegions}
                      className="w-full appearance-none border border-blue-100 rounded-2xl px-3 py-3 outline-none bg-white disabled:bg-blue-50"
                    >
                      <option value="">Pilih kota/kabupaten</option>
                      {cityOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8ea4f8]" />
                  </div>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm text-[#1a2560]">Kecamatan rumah sakit</span>
                  <div className="relative mt-1.5">
                    <select
                      value={districtId}
                      onChange={(e) => {
                        setDistrictId(e.target.value);
                        setProfile((p) => ({ ...p, district: districtOptions.find((option) => option.id === e.target.value)?.name || "", hospitalName: "" }));
                      }}
                      disabled={!cityId || loadingRegions}
                      className="w-full appearance-none border border-blue-100 rounded-2xl px-3 py-3 outline-none bg-white disabled:bg-blue-50"
                    >
                      <option value="">Pilih kecamatan</option>
                      {districtOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8ea4f8]" />
                  </div>
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm text-[#1a2560]">Rumah sakit di kecamatan tersebut</span>
                  <div className="relative mt-1.5">
                    <select
                      value={profile.hospitalName}
                      onChange={(e) => setProfile((p) => ({ ...p, hospitalName: e.target.value }))}
                      disabled={!districtId || loadingHospitals || hospitalOptions.length === 0}
                      className="w-full appearance-none border border-blue-100 rounded-2xl px-3 py-3 outline-none bg-white disabled:bg-blue-50"
                    >
                      <option value="">{loadingHospitals ? "Memuat rumah sakit..." : "Pilih rumah sakit"}</option>
                      {hospitalOptions.map((option) => <option key={option.id} value={option.name}>{option.name}</option>)}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8ea4f8]" />
                  </div>
                  {!loadingHospitals && districtId && hospitalOptions.length === 0 && (
                    <p className="mt-1 text-xs text-[#6b7ab8]">Tidak ada rumah sakit terdeteksi di kecamatan ini.</p>
                  )}
                </label>
              </>
            )}
          </div>

          {(loadingRegions || loadingHospitals) && (
            <div className="inline-flex items-center gap-2 text-sm text-[#5b74f5] bg-[#edf2fd] border border-blue-100 rounded-2xl px-3 py-2">
              <Loader2 size={14} className="animate-spin" />
              Memuat data wilayah
            </div>
          )}

          {status && <div className="text-sm text-[#1a2560] bg-[#edf2fd] border border-blue-100 rounded-2xl px-3 py-2">{status}</div>}

          {saved && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2">Profil tersimpan</div>}

          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-white font-medium disabled:opacity-70" style={{ background: "linear-gradient(135deg,#5b74f5,#7a9bf8)" }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan
          </button>
        </form>
      </div>
    </div>
  );
}
