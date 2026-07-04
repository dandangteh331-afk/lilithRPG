# ⚔️ RPG Fantasy Bot

Bot Telegram RPG berbasis teks dengan sistem pertarungan, crafting, fishing, looting, skill, artefak, dan banyak lagi. Dibangun dengan [Telegraf](https://telegraf.js.org/) dan Node.js, menggunakan flat-file JSON sebagai database.

---

## 📋 Daftar Fitur

### 🧑 Karakter & Profil
- Registrasi otomatis saat `/start`
- Ganti nama dan avatar (10 pilihan emoji)
- Level system — EXP naik setiap aktivitas
- Rank system — 15 tier dari *Petualang Pemula* sampai *Demon Lord*
- Stat lengkap: Level, EXP, Stamina, Diamond, Rupiah, Weapon, Rumah

### ⚡ Stamina
- Stamina digunakan untuk semua aktivitas
- Regen otomatis +1 setiap 10 menit
- Gunakan Stamina Potion / Elixir dari inventory untuk restore instan
- Menu stamina menampilkan info regen berikutnya

### 🎣 Mancing
- 40 jenis ikan dengan 6 tier rarity: Common, Uncommon, Rare, Epic, Legendary, Mythic
- Ikan langsung masuk inventory & memberikan Rupiah + EXP
- Lucky Amulet meningkatkan chance ikan langka
- Bonus drop material saat mancing (Herba, Besi, Batu Sihir, dll)
- Statistik tangkapan per jenis ikan
- Cooldown 5 detik antar cast

### ⚒️ Kerja
- 5 jenis pekerjaan dengan reward Rupiah & EXP berbeda
- Cooldown 10 detik antar kerja

### 🏰 Dungeon
- Multi-lantai dungeon dengan sistem unlock progresif
- Setiap lantai memiliki monster dengan drop reward berbeda
- Cooldown 15 detik antar masuk dungeon

### 🎲 Looting
- Jelajahi dunia dan temukan item secara acak
- 5 tier loot: Common → Uncommon → Rare → Epic → Legendary
- Luck bonus berpengaruh pada tier item yang didapat
- Material, item konsumable, hingga artefak bisa ditemukan
- Butuh 15 stamina, cooldown 30 detik

### 🏪 Shop — 5 Kategori

#### ⚔️ Weapon (36 senjata)
| Tier | Contoh | Attack |
|------|--------|--------|
| Starter | Pedang Kayu | 5 |
| Mid | Pedang Kristal | 55 |
| High | Pedang Legendaris | 150 |
| Endgame | Pedang Kekacauan | 500 |
| Ultimate | Pembasmi Dewa | 999 |
| God-tier | Pedang Asal-Usul | 1500 |

#### 🧪 Ramuan (12 item)
- Stamina Potion, Elixir, Mega Elixir, Phoenix Down
- EXP Scroll, Kitab EXP, Grimoire EXP
- Lucky Amulet, Energy Drink, Ramuan Vitalitas (+Max Stamina)

#### 💎 Batu Sihir (10 item)
- Kristal, Batu Api, Batu Es, Batu Petir, Batu Bayangan
- Kristal Suci, Kristal Kehampaan, Kristal Naga, Batu Kekacauan, Permata Asal
- Digunakan sebagai bahan crafting alkimia

#### ✨ Skill (10 skill) — Unlock Level 5
| Skill | Tipe | Min Level | Efek |
|-------|------|-----------|------|
| Tebasan Api | Attack | 5 | +50% ATK |
| Penjara Es | Attack | 5 | +45% ATK |
| Dewa Petir | Attack | 10 | +60% ATK |
| Langkah Bayangan | Passive | 10 | Dodge 20% |
| Aura Regenerasi | Passive | 15 | Regen 2x |
| Nafas Naga | Attack | 20 | +100% ATK |
| Bintang Keberuntungan | Passive | 15 | +15% luck loot |
| Tebasan Kehampaan | Attack | 25 | +150% ATK |
| Sentuhan Emas | Passive | 20 | +25% Rupiah |
| Penjaga Ilahi | Passive | 30 | -30% damage dungeon |

#### 🔮 Artefak (10 artefak)
- Setiap artefak memberikan bonus pasif permanen
- Contoh bonus: +attack, +luck, +EXP%, dodge%, -cooldown%
- Ditampilkan di profile setelah dibeli

### 💰 Jual Item
- Jual semua item dari inventory: ikan, material, ramuan, loot
- Harga jual terlihat langsung (per unit & total)
- Dikelompokkan dengan emoji tipe: 🐟 ikan, 🪨 material, 📦 item

### 🧪 Alkimia / Crafting
- Craft item menggunakan material dari inventory
- Resep mencakup Stamina Potion, Elixir, EXP Scroll, Lucky Amulet
- Craft weapon upgrade: Pedang Baja+1, Kristal+1, Naga+1, Legendaris+1

### 🏠 Rumah
- 5 level rumah dengan kapasitas inventory berbeda
| Level | Nama | Kapasitas |
|-------|------|-----------|
| 1 | Gubuk | 80 slot |
| 2 | Rumah Kayu | 150 slot |
| 3 | Rumah Batu | 250 slot |
| 4 | Rumah Mewah | 400 slot |
| 5 | Istana Mini | 600 slot |

### 📜 Quest
- Quest harian dengan berbagai jenis objektif
- Reward EXP, Rupiah, dan Diamond
- Track progress otomatis setiap aktivitas

### 🏆 Leaderboard & Rank
- Leaderboard berdasarkan level & EXP
- 15 tier rank dari level 1 sampai 1900+

### 🎁 Daily Reward
- Claim harian: +20 Diamond, +5.000 Rupiah, +30 Stamina
- Cooldown reset tiap 24 jam

---

## 🛠 Instalasi

### Prasyarat
- [Node.js](https://nodejs.org/) v18 atau lebih baru
- Akun Telegram & Bot Token dari [@BotFather](https://t.me/BotFather)

### Langkah-langkah

**1. Clone repository**
```bash
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

**2. Install dependencies**
```bash
npm install
```

**3. Buat file `.env`**
```bash
cp .env.example .env
```

Lalu edit `.env` dan isi token bot kamu:
```
BOT_TOKEN=123456789:ABCdef...
```

Token bisa didapat dengan chat ke [@BotFather](https://t.me/BotFather) → `/newbot`.

**4. Jalankan bot**
```bash
# Production
npm start

# Development (auto-restart saat file berubah)
npm run dev
```

---

## 📁 Struktur Project

```
├── data/
│   ├── crafting.json      # Resep alkimia
│   ├── dungeon.json       # Data lantai & monster dungeon
│   ├── fish.json          # 40 jenis ikan
│   ├── quests.json        # Daftar quest
│   ├── rank.json          # Tier rank per level
│   ├── shop.json          # Weapon, item, & house shop
│   └── users.json         # Database user (auto-generated)
├── logs/                  # Log aktivitas harian (auto-generated)
├── src/
│   ├── bot.js             # Registrasi semua command & action
│   ├── index.js           # Entry point & startup logger
│   ├── config/
│   │   └── constants.js   # Semua konstanta game
│   ├── controllers/       # Logic tiap fitur
│   │   ├── AlchemyController.js
│   │   ├── AuthController.js
│   │   ├── DungeonController.js
│   │   ├── FishingController.js
│   │   ├── HouseController.js
│   │   ├── LeaderboardController.js
│   │   ├── LootController.js
│   │   ├── ProfileController.js
│   │   ├── QuestController.js
│   │   ├── RankController.js
│   │   ├── ShopController.js
│   │   ├── StaminaController.js
│   │   └── WorkController.js
│   ├── models/
│   │   ├── Database.js    # CRUD flat-file JSON
│   │   └── User.js        # Schema & model user
│   ├── services/
│   │   ├── Logger.js      # Activity logger
│   │   ├── QuestService.js
│   │   └── StaminaService.js
│   ├── utils/
│   │   ├── helpers.js     # Utility functions
│   │   └── pagination.js
│   └── views/
│       ├── Keyboards.js   # Semua inline keyboard
│       └── Messages.js    # Semua teks & UI
└── .env.example
```

---

## ⌨️ Commands

| Command | Fungsi |
|---------|--------|
| `/start` | Daftar & buka menu utama |
| `/menu` | Buka menu utama |
| `/profile` | Lihat profil karakter |
| `/daily` | Claim reward harian |
| `/help` | Bantuan & info fitur |

Semua navigasi lain menggunakan tombol inline keyboard.

---

## 🔧 Konfigurasi

Semua nilai game bisa diubah di `src/config/constants.js`:

```js
STAMINA_REGEN_INTERVAL  // Interval regen stamina (default: 10 menit)
FISHING_STAMINA_COST    // Stamina cost mancing (default: 10)
LOOT_COOLDOWN           // Cooldown looting (default: 30 detik)
SKILL_UNLOCK_LEVEL      // Level unlock skill (default: 5)
DAILY_REWARD            // Isi reward daily claim
FISH_RANK_WEIGHTS       // Probabilitas tier ikan
LOOT_TABLE              // Tabel item looting per tier
ITEM_SELL_PRICES        // Harga jual material & item
```

---

## 📝 Lisensi

MIT License — bebas digunakan dan dimodifikasi.
