export type Severity = "ringan" | "sedang" | "berat";
export type FacilityType = "puskesmas" | "klinik" | "apotek" | "bidan" | "rs";

export interface Disease {
  id: string;
  name: string;
  icon: string;
  severity: Severity;
  description: string;
  symptoms: string[];
  prevention: string[];
  treatment: string[];
  emergency: string;
}

export interface FirstAid {
  id: string;
  name: string;
  icon: string;
  steps: string[];
  warnings: string[];
  callAmbulance: boolean;
}

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  icon: string;
  uses: string[];
  dosage: string;
  sideEffects: string[];
  warnings: string;
}

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  distance: number;
  address: string;
  phone: string;
  hours: string;
  isOpen: boolean;
  lat: number;
  lng: number;
}

export interface HealthQA {
  question: string;
  answer: string;
  keywords: string[];
}

export const diseases: Disease[] = [
  {
    id: "dbd",
    name: "Demam Berdarah (DBD)",
    icon: "bug",
    severity: "berat",
    description: "Penyakit yang ditularkan melalui gigitan nyamuk Aedes aegypti.",
    symptoms: ["Demam tinggi mendadak (≥38°C)", "Nyeri sendi dan otot hebat", "Mual dan muntah", "Bintik merah di kulit (ruam)", "Pendarahan gusi atau hidung"],
    prevention: ["Kuras bak mandi seminggu sekali", "Tutup tempat penampungan air", "Gunakan lotion anti nyamuk", "Pasang kelambu saat tidur", "Taburkan abate di genangan air"],
    treatment: ["Istirahat cukup di rumah", "Minum cairan banyak (min. 3L/hari)", "Kompres hangat untuk demam", "Paracetamol untuk demam (JANGAN ibuprofen)", "Pantau trombosit darah ke dokter"],
    emergency: "Segera ke dokter jika: demam tidak turun setelah 2 hari, mimisan hebat, muntah darah, atau kulit kebiruan."
  },
  {
    id: "diare",
    name: "Diare",
    icon: "activity",
    severity: "sedang",
    description: "BAB cair lebih dari 3 kali sehari, sering disebabkan infeksi atau keracunan makanan.",
    symptoms: ["BAB cair lebih dari 3x sehari", "Kram dan nyeri perut", "Mual dan lemas", "Demam ringan", "Tanda dehidrasi (mulut kering, tidak kencing)"],
    prevention: ["Cuci tangan pakai sabun sebelum makan", "Masak makanan hingga benar-benar matang", "Gunakan air bersih yang dimasak", "Simpan makanan di tempat bersih & tertutup"],
    treatment: ["Minum banyak cairan dan oralit", "Makan BRAT (pisang, nasi, apel)", "Hindari susu dan makanan berlemak", "Zinc untuk anak-anak (10-20mg/hari)", "Probiotik membantu pemulihan usus"],
    emergency: "Ke dokter jika: bayi < 6 bulan diare, tinja berdarah, demam > 38.5°C, atau tanda dehidrasi berat (mata cekung, tidak kencing > 8 jam)."
  },
  {
    id: "ispa",
    name: "ISPA (Batuk & Pilek)",
    icon: "wind",
    severity: "ringan",
    description: "Infeksi saluran pernapasan atas yang sangat umum, biasanya disebabkan virus.",
    symptoms: ["Pilek atau hidung tersumbat", "Batuk", "Sakit tenggorokan", "Demam ringan", "Lemas dan tidak enak badan"],
    prevention: ["Cuci tangan dengan sabun rutin", "Hindari kontak dengan penderita", "Tutup mulut dan hidung saat batuk/bersin", "Jaga imunitas dengan nutrisi baik dan tidur cukup"],
    treatment: ["Istirahat cukup", "Minum banyak air hangat", "Berkumur dengan air garam hangat", "Paracetamol untuk demam", "Madu untuk batuk (usia > 1 tahun)"],
    emergency: "Ke dokter jika: sesak napas, demam > 39°C lebih dari 3 hari, atau dahak berwarna kuning/hijau pekat."
  },
  {
    id: "hipertensi",
    name: "Hipertensi (Darah Tinggi)",
    icon: "heart-pulse",
    severity: "berat",
    description: "Tekanan darah ≥140/90 mmHg. Disebut 'silent killer' karena sering tanpa gejala.",
    symptoms: ["Sakit kepala terutama di pagi hari", "Pusing berputar", "Pandangan kabur", "Jantung berdebar", "Hidung berdarah tiba-tiba"],
    prevention: ["Kurangi garam di bawah 5g/hari", "Olahraga ringan 30 menit/hari", "Hindari stres berlebihan", "Berhenti merokok", "Jaga berat badan ideal"],
    treatment: ["Minum obat sesuai resep dokter setiap hari TANPA putus", "Diet DASH (banyak buah & sayur)", "Kontrol berat badan", "Monitor tekanan darah rutin"],
    emergency: "DARURAT jika TD > 180/120: segera ke IGD. Gejala: sakit kepala hebat, pandangan gelap mendadak, nyeri dada."
  },
  {
    id: "diabetes",
    name: "Diabetes Mellitus",
    icon: "droplet",
    severity: "berat",
    description: "Penyakit kronis ditandai kadar gula darah tinggi karena gangguan produksi atau kerja insulin.",
    symptoms: ["Sering merasa haus dan lapar berlebihan", "Sering buang air kecil (terutama malam)", "Luka lama sembuh", "Penglihatan kabur", "Kesemutan di tangan/kaki"],
    prevention: ["Batasi gula dan karbohidrat sederhana", "Olahraga rutin minimal 150 menit/minggu", "Jaga berat badan ideal", "Cek gula darah rutin setahun sekali"],
    treatment: ["Obat sesuai resep dokter diminum rutin", "Diet rendah gula dan karbohidrat", "Monitor gula darah secara rutin", "Periksa kondisi kaki setiap hari untuk luka"],
    emergency: "DARURAT: Jika pingsan/tidak sadar, berkeringat dingin, gemetar—segera beri gula dan hubungi dokter atau 119."
  },
  {
    id: "malaria",
    name: "Malaria",
    icon: "microscope",
    severity: "berat",
    description: "Penyakit menular akibat parasit Plasmodium melalui gigitan nyamuk Anopheles betina.",
    symptoms: ["Demam menggigil yang datang berulang", "Keringat dingin lebat", "Sakit kepala hebat", "Mual dan muntah", "Nyeri otot seluruh tubuh"],
    prevention: ["Tidur pakai kelambu berinsektisida", "Gunakan repellen nyamuk di kulit terbuka", "Pakai baju lengan panjang di sore/malam hari", "Kuras genangan air sekitar rumah"],
    treatment: ["Segera ke puskesmas untuk tes RDT malaria", "Obat antimalaria ACT sesuai resep dokter", "Istirahat penuh dan banyak minum cairan"],
    emergency: "DARURAT: Demam disertai kejang, tidak sadar, atau urin sangat gelap seperti teh pekat—segera ke IGD."
  },
  {
    id: "tbc",
    name: "TBC (Tuberkulosis)",
    icon: "wind",
    severity: "berat",
    description: "Infeksi bakteri Mycobacterium tuberculosis pada paru-paru, sangat menular melalui udara.",
    symptoms: ["Batuk terus-menerus lebih dari 2 minggu", "Dahak bercampur darah", "Keringat malam berlebihan", "Penurunan berat badan drastis", "Demam di sore/malam hari"],
    prevention: ["Vaksinasi BCG pada bayi baru lahir", "Ventilasi dan pencahayaan rumah yang baik", "Hindari kontak dekat dengan penderita TBC aktif", "Nutrisi seimbang untuk jaga imunitas"],
    treatment: ["Pengobatan OAT 6 bulan TIDAK BOLEH putus sama sekali", "Minum obat setiap hari dipantau petugas kesehatan (PMO)", "Periksa dahak secara berkala di puskesmas"],
    emergency: "Ke puskesmas SEGERA untuk pemeriksaan dahak gratis. Pengobatan TBC di Indonesia 100% GRATIS."
  },
  {
    id: "cacar-air",
    name: "Cacar Air",
    icon: "droplets",
    severity: "sedang",
    description: "Infeksi virus varicella-zoster yang sangat menular, umum pada anak-anak dan bisa terjadi pada dewasa.",
    symptoms: ["Ruam merah berisi cairan (vesikel)", "Gatal hebat di seluruh tubuh", "Demam ringan sebelum ruam muncul", "Lemas dan tidak nafsu makan", "Bintik baru muncul bertahap 3-5 hari"],
    prevention: ["Vaksin varicella (2 dosis untuk perlindungan terbaik)", "Hindari kontak dengan penderita aktif", "Cuci tangan rutin dengan sabun"],
    treatment: ["Isolasi di rumah hingga semua luka mengering", "Potong kuku pendek dan hindari menggaruk luka", "Losion calamine untuk mengurangi gatal", "Paracetamol untuk demam (JANGAN aspirin)", "Antivirus dari dokter jika diperlukan"],
    emergency: "Ke dokter jika: demam > 39°C, kesulitan bernapas, atau luka terinfeksi bakteri (kemerahan, bengkak, bernanah)."
  },
  {
    id: "stunting",
    name: "Stunting (Gizi Buruk Anak)",
    icon: "baby",
    severity: "berat",
    description: "Gangguan tumbuh kembang anak akibat kekurangan gizi kronis, terutama dalam 1.000 Hari Pertama Kehidupan.",
    symptoms: ["Tinggi badan jauh di bawah standar usia", "Berat badan kurang dari normal", "Mudah sakit dan infeksi berulang", "Perkembangan motorik dan kognitif terlambat"],
    prevention: ["ASI eksklusif selama 6 bulan penuh", "MPASI bergizi tinggi mulai usia 6 bulan", "Imunisasi lengkap sesuai jadwal", "Sanitasi baik dan akses air bersih"],
    treatment: ["Konsultasi ahli gizi di puskesmas", "Program Pemberian Makanan Tambahan (PMT)", "Suplemen micronutrien (zinc, vitamin A, zat besi)", "Pantau pertumbuhan rutin setiap bulan di Posyandu"],
    emergency: "Bawa ke Puskesmas jika berat badan anak tidak naik (atau turun) selama 2 bulan berturut-turut."
  },
  {
    id: "anemia",
    name: "Anemia (Kurang Darah)",
    icon: "droplet",
    severity: "sedang",
    description: "Kondisi kadar hemoglobin darah di bawah normal, paling sering karena kekurangan zat besi.",
    symptoms: ["Mudah lelah dan lemas tanpa sebab jelas", "Pucat pada gusi, kuku, dan bagian putih mata", "Pusing saat berdiri mendadak", "Jantung berdebar saat aktivitas ringan", "Sesak napas saat beraktivitas"],
    prevention: ["Konsumsi makanan kaya zat besi (daging, bayam, kacang-kacangan)", "Minum jus jeruk bersama makanan zat besi (vitamin C bantu penyerapan)", "Suplemen zat besi rutin untuk ibu hamil dan remaja putri"],
    treatment: ["Suplemen zat besi sesuai anjuran dokter (diminum dengan jus jeruk)", "Perbanyak konsumsi makanan bergizi seimbang", "Atasi penyebab dasar (infeksi cacing, perdarahan)"],
    emergency: "Ke dokter jika: sangat pucat, sesak napas berat saat istirahat, atau pingsan."
  },
];

export const firstAidItems: FirstAid[] = [
  {
    id: "luka-bakar",
    name: "Luka Bakar",
    icon: "flame",
    callAmbulance: false,
    steps: [
      "Jauhkan korban dari sumber panas segera",
      "Aliri dengan air mengalir suhu normal selama 10-20 menit",
      "JANGAN gunakan pasta gigi, es, mentega, atau minyak",
      "Tutup luka dengan kain bersih dan kering",
      "Jangan memecah lepuhan yang terbentuk",
      "Bawa ke fasilitas kesehatan jika luka lebar (>3cm) atau dalam"
    ],
    warnings: ["Jangan pakai es langsung ke luka", "Jangan pakai pasta gigi, mentega, atau minyak", "Jangan memecah lepuhan"]
  },
  {
    id: "tersedak",
    name: "Tersedak",
    icon: "alert-circle",
    callAmbulance: true,
    steps: [
      "Tanya: 'Apakah kamu tersedak?' — jika masih bisa bicara, minta batuk sekuat mungkin",
      "Jika tidak bisa bicara/bernapas: minta seseorang hubungi 119 segera",
      "Miringkan badan korban ke depan (45 derajat)",
      "Tepuk punggung 5 kali kuat dengan telapak tangan di antara tulang belikat",
      "Jika gagal: Heimlich maneuver — berdiri di belakang, kepalkan tangan di atas pusar, dorong ke dalam-atas 5 kali",
      "Ulangi 5 tepukan punggung + 5 Heimlich sampai benda keluar",
      "Jika korban tidak sadar: baringkan dan mulai CPR, hubungi 119"
    ],
    warnings: ["Hubungi bantuan segera", "Jangan masukkan jari ke mulut secara membabi-buta"]
  },
  {
    id: "pingsan",
    name: "Pingsan / Tidak Sadar",
    icon: "alert-circle",
    callAmbulance: true,
    steps: [
      "Pastikan area aman — jauhkan dari bahaya di sekitar",
      "Periksa respons: tepuk bahu dan panggil nama dengan keras",
      "Jika tidak ada respons: hubungi 119 atau minta seseorang hubungi",
      "Periksa pernapasan — lihat gerakan dada naik-turun",
      "Jika bernapas: posisikan miring ke kiri (posisi pemulihan)",
      "Jika tidak bernapas: mulai CPR — 30 kali tekan dada + 2 kali napas buatan",
      "Terus CPR sampai bantuan medis datang atau korban mulai bernapas normal"
    ],
    warnings: ["Jangan beri makan atau minum pada orang tidak sadar", "Jangan tinggalkan korban sendirian"]
  },
  {
    id: "mimisan",
    name: "Mimisan",
    icon: "droplet",
    callAmbulance: false,
    steps: [
      "Duduk tegak dengan kepala sedikit condong ke depan",
      "Jepit kedua lubang hidung dengan ibu jari dan telunjuk",
      "Bernapas tenang melalui mulut",
      "Tahan jepitan 10-15 menit tanpa melepas",
      "Kompres dingin (handuk basah) di batang hidung atau tengkuk",
      "Jangan mendongakkan kepala ke belakang",
      "Ke dokter jika darah tidak berhenti setelah 20 menit"
    ],
    warnings: ["Jangan dongakkan kepala ke belakang", "Jangan memasukkan tisu terlalu dalam ke hidung"]
  },
  {
    id: "patah-tulang",
    name: "Patah Tulang / Keseleo",
    icon: "bone",
    callAmbulance: false,
    steps: [
      "Jangan pindahkan korban jika ada kemungkinan tulang belakang terluka",
      "Imobilisasi bagian yang cedera — jangan digerakkan",
      "Buat bidai dari papan/ranting yang lebih panjang dari sendi di kedua ujung tulang",
      "Kompres dingin (kain basah dingin) untuk kurangi bengkak",
      "Jangan mencoba meluruskan tulang sendiri",
      "Elevasi bagian yang cedera (angkat lebih tinggi dari jantung jika bisa)",
      "Segera bawa ke fasilitas kesehatan terdekat"
    ],
    warnings: ["Jangan pijat area yang cedera", "Jangan coba luruskan tulang sendiri"]
  },
  {
    id: "gigitan-ular",
    name: "Gigitan Ular",
    icon: "zap",
    callAmbulance: true,
    steps: [
      "Jauhkan korban dari ular — jangan mencoba menangkap ularnya",
      "Tenangkan korban dan minta tidak banyak bergerak",
      "Imobilisasi bagian yang digigit dan posisikan di bawah level jantung",
      "Lepaskan perhiasan, jam tangan, atau pakaian ketat di sekitar gigitan",
      "JANGAN: hisap racun, potong/sayat luka, pasang tali tourniquet, atau oleskan alkohol",
      "Foto ular dari jarak aman untuk membantu identifikasi jenis racun",
      "Bawa ke rumah sakit SEGERA — RS dengan stok antivenom ular"
    ],
    warnings: ["JANGAN hisap racun dengan mulut", "JANGAN tourniquet atau potong luka", "SEGERA ke RS yang ada antivenom"]
  },
  {
    id: "keracunan",
    name: "Keracunan Makanan",
    icon: "alert-triangle",
    callAmbulance: false,
    steps: [
      "Hentikan konsumsi makanan yang dicurigai segera",
      "Beri banyak minum air putih bersih atau oralit",
      "Jangan dipaksa muntah kecuali disarankan langsung oleh dokter/petugas medis",
      "Istirahat dan pantau kondisi secara ketat",
      "Simpan sisa makanan atau kemasan untuk dibawa ke dokter",
      "Ke dokter jika: muntah terus > 12 jam, tinja berdarah, demam tinggi, atau tidak sadar"
    ],
    warnings: ["Jangan paksa muntah tanpa arahan medis", "Jangan beri obat sembarangan untuk anak-anak"]
  },
  {
    id: "luka-sayat",
    name: "Luka Sayat / Luka Dalam",
    icon: "bandage",
    callAmbulance: false,
    steps: [
      "Cuci tangan bersih sebelum merawat luka",
      "Tekan luka dengan kain bersih untuk menghentikan perdarahan (5-10 menit)",
      "Bersihkan luka dengan air mengalir bersih (bukan alkohol langsung ke luka)",
      "Oleskan antiseptik (betadine/povidone iodine) di sekitar luka",
      "Tutup dengan plester atau perban bersih",
      "Ganti perban setiap hari atau bila kotor/basah",
      "Ke dokter jika luka dalam, tepi luka menganga lebar, atau perdarahan tidak berhenti"
    ],
    warnings: ["Jangan gunakan kapas berbulu langsung ke luka dalam", "Jangan menutup luka kotor secara rapat-rapat"]
  },
];

export const medications: Medication[] = [
  {
    id: "paracetamol",
    name: "Paracetamol",
    genericName: "Acetaminophen",
    icon: "pill",
    uses: ["Demam", "Nyeri ringan hingga sedang", "Sakit kepala", "Nyeri otot"],
    dosage: "Dewasa: 500–1000mg, 3–4x/hari. Anak: 10–15mg/kgBB per dosis. Maksimal 4g/hari untuk dewasa.",
    sideEffects: ["Mual (jarang)", "Reaksi alergi kulit (sangat jarang)"],
    warnings: "Hindari alkohol saat minum obat ini. Hati-hati pada penderita gangguan hati. Jangan melebihi dosis maksimal."
  },
  {
    id: "ibuprofen",
    name: "Ibuprofen",
    genericName: "Ibuprofen",
    icon: "pill",
    uses: ["Nyeri sedang", "Demam", "Radang sendi", "Nyeri haid"],
    dosage: "Dewasa: 400mg, 3x/hari sesudah makan. Maksimal 1200mg/hari tanpa resep.",
    sideEffects: ["Mual", "Nyeri perut", "Sakit kepala", "Peningkatan tekanan darah"],
    warnings: "TIDAK BOLEH untuk DBD! Hindari saat kehamilan & penyakit ginjal/lambung kronis. Selalu minum setelah makan."
  },
  {
    id: "amoxicillin",
    name: "Amoxicillin",
    genericName: "Amoxicillin trihydrate",
    icon: "pill",
    uses: ["Infeksi bakteri", "Infeksi saluran napas", "Infeksi kulit", "Infeksi saluran kemih"],
    dosage: "Dewasa: 500mg, 3x/hari selama 7 hari penuh. Anak: 25mg/kgBB/hari dibagi 3 dosis.",
    sideEffects: ["Diare", "Mual", "Reaksi alergi (gatal, ruam merah)"],
    warnings: "WAJIB dihabiskan sesuai jadwal! Informasikan ke dokter jika alergi penisilin. Butuh resep dokter."
  },
  {
    id: "oralit",
    name: "Oralit (ORS)",
    genericName: "Oral Rehydration Salts",
    icon: "flask",
    uses: ["Dehidrasi akibat diare", "Muntah-muntah", "Penggantian elektrolit tubuh"],
    dosage: "1 sachet dilarutkan dalam 200ml air matang. Minum sedikit-sedikit tapi sering (sendok demi sendok untuk bayi).",
    sideEffects: ["Mual jika diminum terlalu cepat"],
    warnings: "Jangan tambahkan gula atau garam ekstra. Buat larutan baru setiap 24 jam. Resep mandiri: 1L air matang + 6 sdt gula + 1 sdt garam."
  },
  {
    id: "antasida",
    name: "Antasida (Promag/Mylanta)",
    genericName: "Aluminum & Magnesium Hydroxide",
    icon: "flask",
    uses: ["Maag / nyeri lambung", "Mual akibat asam lambung", "Perut kembung"],
    dosage: "Dewasa: 1–2 tablet atau 1 sendok makan, 3–4x/hari, diminum 1 jam setelah makan.",
    sideEffects: ["Sembelit (kandungan aluminum)", "Diare (kandungan magnesium)"],
    warnings: "Jangan konsumsi bersamaan dengan obat lain — beri jarak minimal 2 jam. Hati-hati pada gangguan ginjal."
  },
  {
    id: "cetirizine",
    name: "Cetirizine",
    genericName: "Cetirizine hydrochloride",
    icon: "pill",
    uses: ["Alergi kulit", "Gatal-gatal (urtikaria)", "Rhinitis alergi (bersin-bersin)"],
    dosage: "Dewasa: 10mg, 1x/hari (malam hari). Anak 6–11 tahun: 5mg/hari.",
    sideEffects: ["Mengantuk (efek umum)", "Mulut kering", "Sakit kepala ringan"],
    warnings: "Hati-hati saat berkendara atau mengoperasikan mesin karena menyebabkan kantuk. Hindari alkohol."
  },
  {
    id: "zinc",
    name: "Zinc Sulfat",
    genericName: "Zinc Sulfate",
    icon: "pill",
    uses: ["Diare pada anak", "Kekurangan zinc", "Pemulihan daya tahan tubuh setelah sakit"],
    dosage: "Anak < 5 tahun: 20mg/hari selama 10–14 hari. Bayi 2–6 bulan: 10mg/hari.",
    sideEffects: ["Mual", "Muntah jika diminum saat perut kosong"],
    warnings: "Berikan 30 menit sebelum makan untuk penyerapan optimal. Tidak untuk dewasa tanpa indikasi medis."
  },
  {
    id: "vitamin-c",
    name: "Vitamin C",
    genericName: "Ascorbic Acid",
    icon: "sun",
    uses: ["Suplemen daya tahan tubuh", "Defisiensi vitamin C", "Membantu penyerapan zat besi"],
    dosage: "Dewasa: 500–1000mg/hari. Anak: 250mg/hari. Minum sesudah makan.",
    sideEffects: ["Mual pada dosis tinggi", "Diare jika dosis > 2g/hari"],
    warnings: "Konsumsi dosis sangat tinggi jangka panjang berisiko batu ginjal. Minum sesudah makan."
  },
  {
    id: "metformin",
    name: "Metformin",
    genericName: "Metformin HCl",
    icon: "pill",
    uses: ["Diabetes mellitus tipe 2"],
    dosage: "500–850mg, 2–3x/hari bersama makan. Dosis awal dan penyesuaian harus dari dokter.",
    sideEffects: ["Mual", "Diare", "Sakit perut (biasanya berkurang setelah 2–4 minggu)"],
    warnings: "HARUS dengan resep dokter. Jangan minum saat puasa total. Informasikan ke dokter jika akan operasi."
  },
  {
    id: "amlodipine",
    name: "Amlodipine",
    genericName: "Amlodipine besylate",
    icon: "pill",
    uses: ["Hipertensi (tekanan darah tinggi)", "Angina (nyeri dada)"],
    dosage: "5–10mg, 1x/hari. Harus sesuai resep dan arahan dokter.",
    sideEffects: ["Kaki bengkak", "Kemerahan dan rasa panas di wajah", "Pusing"],
    warnings: "JANGAN berhenti tiba-tiba tanpa konsultasi dokter. Minum di waktu yang sama setiap hari untuk efek terbaik."
  },
];

export const facilities: Facility[] = [
  {
    id: "f1",
    name: "Puskesmas Cibadak",
    type: "puskesmas",
    distance: 1.2,
    address: "Jl. Raya Cibadak No. 45",
    phone: "(0266) 531-234",
    hours: "Sen–Jum 07:30–14:00, Sab 07:30–11:00",
    isOpen: true,
    lat: 38, lng: 32,
  },
  {
    id: "f2",
    name: "Klinik Pratama Sehat",
    type: "klinik",
    distance: 0.8,
    address: "Jl. Merdeka No. 12",
    phone: "(0266) 511-100",
    hours: "Sen–Min 08:00–21:00",
    isOpen: true,
    lat: 58, lng: 62,
  },
  {
    id: "f3",
    name: "Apotek Kimia Farma",
    type: "apotek",
    distance: 0.5,
    address: "Jl. Pasar Baru No. 3",
    phone: "(0266) 543-210",
    hours: "Sen–Min 07:00–22:00",
    isOpen: true,
    lat: 62, lng: 42,
  },
  {
    id: "f4",
    name: "Bidan Desa Ibu Sari",
    type: "bidan",
    distance: 0.3,
    address: "RT 05/RW 03 Gg. Mawar",
    phone: "0812-3456-7890",
    hours: "Sen–Sab 08:00–20:00",
    isOpen: true,
    lat: 52, lng: 52,
  },
  {
    id: "f5",
    name: "RSUD Kota Sukabumi",
    type: "rs",
    distance: 3.5,
    address: "Jl. Rumah Sakit No. 1",
    phone: "(0266) 221-2345",
    hours: "24 Jam (IGD Selalu Buka)",
    isOpen: true,
    lat: 18, lng: 22,
  },
  {
    id: "f6",
    name: "Apotek Sehat Mandiri",
    type: "apotek",
    distance: 1.8,
    address: "Jl. Sudirman No. 88",
    phone: "0821-5678-9012",
    hours: "Sen–Sab 08:00–21:00",
    isOpen: false,
    lat: 28, lng: 72,
  },
  {
    id: "f7",
    name: "Posyandu Anggrek",
    type: "bidan",
    distance: 0.4,
    address: "Balai Desa Karanganyar",
    phone: "0857-1234-5678",
    hours: "Sel & Kam 08:00–11:00",
    isOpen: false,
    lat: 74, lng: 58,
  },
];

export const healthQA: HealthQA[] = [
  {
    question: "Apa gejala demam berdarah (DBD)?",
    answer: "Gejala utama DBD: demam tinggi mendadak (≥38°C), nyeri sendi dan otot hebat, mual, bintik merah di kulit, dan pendarahan. Segera ke dokter jika demam tidak turun dalam 2 hari.",
    keywords: ["demam berdarah", "dbd", "dengue", "bintik merah", "nyamuk"]
  },
  {
    question: "Bagaimana cara membuat oralit sendiri di rumah?",
    answer: "Larutkan 6 sendok teh gula pasir dan 1 sendok teh garam dapur dalam 1 liter air matang yang sudah dingin. Aduk rata dan minum sedikit-sedikit. Ganti larutan baru setiap 24 jam.",
    keywords: ["oralit", "dehidrasi", "diare", "garam", "gula", "mencret"]
  },
  {
    question: "Berapa tekanan darah yang normal?",
    answer: "Tekanan darah normal di bawah 120/80 mmHg. Pre-hipertensi: 120–139/80–89 mmHg. Hipertensi: ≥140/90 mmHg. Periksa rutin minimal setiap 6 bulan, terutama jika ada riwayat keluarga.",
    keywords: ["tekanan darah", "tensi", "hipertensi", "darah tinggi", "normal"]
  },
  {
    question: "Kapan harus ke dokter saat demam?",
    answer: "Segera ke dokter jika: demam > 39°C, tidak turun setelah 3 hari, disertai sesak napas, ruam merah, atau kejang. Untuk bayi di bawah 3 bulan: demam apapun harus segera ke dokter.",
    keywords: ["demam", "panas", "kapan ke dokter", "suhu tinggi", "fever"]
  },
  {
    question: "Apa makanan pantangan penderita asam urat?",
    answer: "Hindari: jeroan (hati, ginjal, ampela), seafood (kerang, sarden, teri, udang), daging merah berlebihan, minuman berpemanis tinggi, dan alkohol. Perbanyak minum air putih minimal 2 liter/hari.",
    keywords: ["asam urat", "gout", "pantangan", "jeroan", "seafood", "nyeri sendi"]
  },
  {
    question: "Bagaimana mencegah stunting pada anak?",
    answer: "Kunci pencegahan: ASI eksklusif 0–6 bulan, MPASI bergizi mulai 6 bulan (protein hewani, sayur, karbohidrat), imunisasi lengkap, sanitasi dan air bersih yang baik, serta pantau BB/TB rutin di Posyandu.",
    keywords: ["stunting", "gizi buruk", "anak pendek", "mpasi", "asi", "posyandu"]
  },
  {
    question: "Berapa kadar gula darah yang normal?",
    answer: "Gula darah puasa normal: 70–100 mg/dL. Setelah makan 2 jam: < 140 mg/dL. Jika puasa > 126 mg/dL atau setelah makan > 200 mg/dL pada dua pemeriksaan berbeda, segera konsultasi dokter — bisa tanda diabetes.",
    keywords: ["gula darah", "diabetes", "kadar gula", "gula normal", "DM"]
  },
  {
    question: "Apa itu BPJS Kesehatan dan cara mendaftar?",
    answer: "BPJS Kesehatan adalah jaminan kesehatan nasional yang menanggung biaya berobat. Daftar di kantor BPJS terdekat atau aplikasi Mobile JKN dengan membawa KTP dan KK. Iuran mulai Rp42.000/bulan untuk kelas III.",
    keywords: ["bpjs", "jkn", "jaminan kesehatan", "daftar", "iuran", "gratis berobat"]
  },
  {
    question: "Apa gejala dan cara mengatasi diare?",
    answer: "Gejala: BAB cair > 3x/hari, kram perut, mual. Atasi: minum oralit atau air garam-gula banyak-banyak, makan makanan lunak (nasi, pisang), Zinc untuk anak. Ke dokter jika: tinja berdarah, bayi < 6 bulan, atau tanda dehidrasi berat.",
    keywords: ["diare", "mencret", "BAB cair", "mencret", "perut mules"]
  },
  {
    question: "Bagaimana cara pertolongan pertama luka bakar?",
    answer: "Langkah: (1) Jauhkan dari sumber panas, (2) Aliri dengan air mengalir normal 10–20 menit, (3) JANGAN pakai pasta gigi, es, atau mentega, (4) Tutup dengan kain bersih kering, (5) Ke klinik/puskesmas jika luka lebar atau dalam.",
    keywords: ["luka bakar", "terbakar", "fire", "api", "p3k bakar"]
  },
];
