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

### 3. Build, Test & Git Dağıtımı
- Her görev için ayrı git dalı (`git switch -c <dal-adi>`) açılır; her parçadan sonra `npm test` ve `npm run build` çalıştırılır ve geçmeden görev tamamlandı denmez.
- Tamamlanmayan madde `ROADMAP.md` içinde "tamamlandı" olarak işaretlenmez; doğrulanmamış iddia yazılmaz.
- `git commit` ve `git push origin main` ile GitHub'a aktarılır.

---

## 🧪 Elle Oynama Doğrulama Listesi (Manual Playtest Checklist)

Yeni bir özellik veya taşıma (refactoring) sonrasında `main`'e birleştirmeden önce aşağıdaki akışlar doğrulanmalıdır:

- [ ] **Ana Menü**: Profil düzenleme, ayarlar, ses/dil geçişi ve mod seçimi.
- [ ] **Tek Kişilik 2 Oyunculu Maç**: Başlangıç, kart oynama ve bot tepkileri.
- [ ] **Tek Kişilik 4 Oyunculu Maç**: Sıra dönüşü, 4 koltuk yerleşimi ve puanlama.
- [ ] **Kesme (Deck Cut)**: Kesme ekranı, kaydırıcı ve "Tam Ortadan (+5 Puan)" kontrolü.
- [ ] **Dağıtım (Dealing)**: Yere 3 kapalı + 1 açık kart ve oyunculara 4'er kart dağıtım animasyonu.
- [ ] **Pişti & Çift Pişti**: Tek karta eşleşme (+10), Vale üstüne Vale (+20) ve çapraz pişti çifti görünümü.
- [ ] **Vale (Jack Sweep)**: Yerdeki kartları Vale ile toplama.
- [ ] **El Sonu & Sayım (Card Counting)**: Toplanan destenin kaybolmadan/ışınlanmadan sayım alanına süzülmesi ve kart üstünlüğü (+3 puan) hesabı.
- [ ] **Sonraki El & Maç Sonu**: Yeni ele geçiş (`SONRAKİ EL`) ve hedef puana ulaşıldığında maç sonu ekranı.
- [ ] **Bot Sohbeti**: Botların doğru isimleriyle (`playersRef` üzerinden) sohbet baloncuğu göstermesi.
- [ ] **İki Sekmeyle Çok Oyunculu Oda**: Oda kurma, kodla katılma, lobi senkronizasyonu ve maç başlatma.
- [ ] **Bağlantı Kopması**: Çok oyunculu odada konuk veya kurucu ayrıldığında/koptuğunda bildirim ve koltuk devri.
- [ ] **Uno (RENQ) Geçişi**: RENQ moduna geçiş, kart oynama (+2/+4 cezaları, renk seçimi) ve ana menüye dönüş.
