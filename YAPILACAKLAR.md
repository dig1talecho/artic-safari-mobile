# 📋 Senin Yapman Gerekenler

Bu liste **sadece senin yapabileceğin** işleri içeriyor — çoğu Supabase
panelinden birkaç tıklama. Kod tarafında yapılacak bir şey kalmadı.

Sırayla git. Her adımın başında **ne kadar sürer** ve **yapmazsan ne olmaz**
yazıyor.

---

## 🔴 ADIM 1 — Puan sistemini aç (2 dakika)

**Yapmazsan:** Puan/ödül ekranı çalışmaz, rezervasyonda "puan kullan" çıkmaz.

1. https://supabase.com adresine gir, projene tıkla
2. Sol menüden **SQL Editor** → **New query**
3. Şu dosyanın **tamamını** kopyalayıp yapıştır:
   `Desktop\Artic-Safari\supabase-loyalty-points-setup.sql`
4. Sağ alttaki yeşil **Run** düğmesine bas
5. Alt tarafta **"Success"** yazmalı

> Not: Bu dosyayı daha önce çalıştırmadın, ilk kez çalıştırıyorsun.

---

## 🔴 ADIM 1.5 — Şoför sadece taksi işlerini görsün (1 dakika)

**Yapmazsan:** Uygulamada şoföre zaten sadece taksi istekleri gösteriliyor,
ama bu sadece ekran filtresi. Veritabanı hâlâ şoförün tur rezervasyonlarını
da okumasına izin veriyor. Bu dosya o izni kapatıyor.

1. Supabase → **SQL Editor** → **New query**
2. Şu dosyanın tamamını kopyala-yapıştır:
   `Desktop\Artic-Safari\supabase-driver-taxi-only-rls.sql`
3. **Run** → "Success"

Sonra kontrol etmek istersen, aynı ekranda şunu çalıştır — sadece
`transfer` ve `tour` görmelisin:

```sql
select booking_type, count(*) from bookings group by 1 order by 2 desc;
```

Başka bir değer çıkarsa bana söyle, SQL'i ona göre güncellerim.

---

## 🟡 ADIM 2 — Puan oranını kontrol et (1 dakika)

Şu an ayarlı: **%2 geri kazanım** (100 kr harcama = 2 puan, 1 puan = 1 kr)

| Rezervasyon | Kazanılan puan | Değeri |
|---|---|---|
| 2.250 kr | 45 puan | 45 kr |
| 5.000 kr | 100 puan | 100 kr |
| 15.000 kr | 300 puan | 300 kr |

**Karar vermen gereken tek şey:** Şu an bir misafirin puanını
kullanabilmesi için **en az 100 puan** biriktirmesi gerekiyor — yani
yaklaşık 5.000 kr'lık rezervasyon.

Tromsø'ya gelen misafirlerin çoğu **bir kez** geldiği için bu eşik yüksek
olabilir. İlk rezervasyonda da puanını kullanabilsinler istersen, Supabase
SQL Editor'de şunu çalıştır:

```sql
update loyalty_rules set min_redeem_points = 50;
```

Yüksek kalsın, sadık müşteriye özel olsun diyorsan hiçbir şey yapma.

---

## 🟡 ADIM 3 — Google ile giriş (15 dakika)

**Yapmazsan:** "Google ile devam et" düğmesi hata verir. E-posta/şifre ile
giriş yine de sorunsuz çalışır.

### 3a. Google tarafı
1. https://console.cloud.google.com → yeni proje oluştur
2. **APIs & Services** → **Credentials** → **Create Credentials** →
   **OAuth client ID**
3. **Üç ayrı** client oluştur: **Web**, **iOS**, **Android**
4. **Web** olanın Client ID'sini kopyala (uzun, `.apps.googleusercontent.com`
   ile biter)

### 3b. Supabase tarafı
1. Supabase → **Authentication** → **Providers** → **Google**
2. Aç, kopyaladığın **Web** Client ID + Secret'ı yapıştır, kaydet

### 3c. Bana haber ver
Web Client ID'yi bana ilet, uygulamaya bağlayayım (tek satır).

> ⚠️ Google girişi **Expo Go'da çalışmaz**. Gerçek test için ADIM 5'teki
> "development build" gerekiyor.

---

## 🟡 ADIM 4 — Apple ile giriş (30 dakika, **ücretli hesap gerekir**)

**Yapmazsan:** Apple düğmesi iPhone'da görünmez (otomatik gizleniyor,
kırık görünmez). Android'i zaten hiç etkilemez.

> ⚠️ **Apple Developer Program üyeliği gerekli — yılda $99.**
> App Store'a çıkacaksan ve Google girişi de sunuyorsan, Apple bunu
> **zorunlu** tutuyor. App Store'a çıkmayacaksan bu adımı atlayabilirsin.

1. https://developer.apple.com → **Certificates, Identifiers & Profiles**
2. **Identifiers** → App ID oluştur → **Sign in with Apple** işaretle
3. Bir **Services ID** ve bir **Key** oluştur
4. Supabase → **Authentication** → **Providers** → **Apple** → bilgileri gir

---

## 🟢 ADIM 5 — Uygulamayı telefonunda dene

### Hızlı deneme (5 dakika, Google/Apple girişi HARİÇ her şey çalışır)
1. Telefonuna **Expo Go** uygulamasını indir (App Store / Play Store)
2. Bilgisayarda bu klasörde terminal aç, şunu yaz:

```bash
npx expo start
```

3. Ekranda çıkan **QR kodu** telefonunla okut
4. Uygulama açılır — üye ol, turlara bak, rezervasyon yap

### Tam deneme (Google/Apple girişi dahil)
Bunun için "development build" gerekiyor. Hazır olduğunda bana söyle,
adım adım birlikte yaparız.

---

## 🟢 ADIM 6 — Ödeme (şimdilik yapılacak bir şey yok)

Vipps ve Stripe için **altyapı hazır** ama **hiçbir para tahsil etmiyor**.
Uygulama şu an rezervasyonu "talep" olarak kaydediyor, sen WhatsApp'tan
onaylıyorsun — web sitesinde zaten böyle çalışıyor.

Vipps/Stripe anlaşman olduğunda bana söyle. O zaman gereken:
- Bir sunucu adresi (gizli anahtar telefona konulamaz, yasak)
- Ödeme onaylanınca rezervasyonu "ödendi" yapan bir webhook

---

## ⚠️ Bilmen gereken tek eksik: kapalıyken bildirim

Uygulama **açıkken** bildirimler anında geliyor (banner + sekmede "+1" +
titreşim). Ama uygulama **kapalıyken** telefona bildirim düşmüyor.

Sebebi teknik: Expo Go artık kapalı uygulamaya bildirim göndermiyor.
Bunun için "development build" gerekiyor (ADIM 5'in alt kısmı). Hazır
olduğunda söyle, birlikte yaparız.

---

## ✅ Hazır olanlar (senden bir şey gerekmiyor)

**Müşteri tarafı**
- Üyelik / giriş (e-posta + şifre)
- Tur listesi ve tur detay sayfaları — web sitesindeki turlarla **aynı
  veriden** besleniyor, admin panelinden tur eklersen uygulamada da çıkar
- 4 adımlı rezervasyon (tarih → ekstralar → bilgiler → onay)
- Partner promosyon kodu
- Rezervasyonlarım + geri sayım
- Canlı sürücü takibi (sürücü konum göndermeye başlayınca)
- Transfer fiyat hesaplama + adres arama + konumumu kullan
- Puan/ödül ekranı

**Şoför / yönetici tarafı** (aynı uygulama, giriş yapana göre değişiyor)
- Web sitesinin admin/şoför bilgileriyle giriş → doğrudan istek kuyruğu
- Şoför **sadece taksi** isteklerini görür
- Yönetici **Taksi / Turlar** diye iki bölüm arasında geçiş yapar
- Açık / Bendeki / Kapanmış filtreleri, her birinde sayı
- Anlık bildirim: banner + sekmede "+1" + titreşim
- "Bu işi al" — iki şoför aynı anda basarsa sadece biri alır
- Haritada aç (Google Maps) — koordinat kayıtlıysa

**Her ikisi**
- **İngilizce ve Norveççe dil seçeneği** (profil ekranından değiştirilir)
