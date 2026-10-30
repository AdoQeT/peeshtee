# Project P (Peeshtee: Overdrive) — Developer & Agent Rules

Bu belge, proje genelinde çalışan tüm yapay zeka asistanları ve geliştiriciler için **kalıcı ve bağlayıcı kuralları** tanımlar.

---

## 🚀 Sürüm Güncelleme & Discord Webhook Protokolü (Zorunlu Kural)

Projede yeni bir sürüm çıkarıldığında (örn: `v1.14.4`, `v1.15.0` vb.) şu adımlar **istisnasız her zaman** uygulanmalıdır:

### 1. Sürüm Numarasının Güncellenmesi & Artırma Kuralı
- **Küçük Güncelleme & Yamalar**: Sürüm numarası **+0.00.1 (patch)** yükseltilir (örn: `1.15.0` -> `1.15.1`).
- **Büyük Yamalar & Yeni Özellikler**: Sürüm numarası **+0.01 / +0.1.0 (minor)** yükseltilir (örn: `1.15.x` -> `1.16.0`).
Aşağıdaki 3 dosyada sürüm numarası eşitlenmelidir:
- `package.json` (`"version": "X.Y.Z"`)
- `src/components/MainMenu.tsx` (`vX.Y.Z`)
- `ROADMAP.md` (yeni sürüm maddesi tamamlandı olarak eklenir)

### 2. Discord Webhook Update Log Gönderimi
- Discord webhook'una **zengin Embed mesajı** gönderilmelidir.
- Güncelleme notları **kesinlikle İngilizce**, **çok kısa**, **basit** ve **tire (`-`) formatında** olmalıdır.
- **Biçim Standardı**:
  - **Embed Başlığı**: `vX.Y.Z`
  - **Embed Açıklaması**:
    ```text
    -short bullet point 1
    -short bullet point 2
    -short bullet point 3
    ```
  - **Embed Rengi**: `0x10B981` (Emerald yeşili)
  - **Footer**: `Project P • Peeshtee: Overdrive`
- **Gönderim Komutu**:
  ```bash
  node scripts/sendDiscordChangelog.mjs "vX.Y.Z" "-feature 1\n-bugfix 2\n-update 3"
  ```
  veya `scripts/sendDiscordChangelog.mjs` içindeki varsayılan metin güncellenip `npm run changelog` çalıştırılır.

### 3. Build & Git Dağıtımı
- Kodların hatasız olduğu `npm run build` ile doğrulanır (0 TypeScript / Vite hatası).
- `git commit` ve `git push origin main` ile GitHub'a aktarılır.
