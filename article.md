# HTTPS dengan Self-Signed Certificate dan Nginx: Panduan Lengkap

**Topik:** Keamanan Web, SSL/TLS, Nginx, Self-Signed Certificate

---

## Daftar Isi

1. [Apa itu HTTPS?](#1-apa-itu-https)
2. [Cara Kerja TLS/SSL](#2-cara-kerja-tlsssl)
3. [Apa itu Sertifikat Digital?](#3-apa-itu-sertifikat-digital)
4. [Trusted CA vs Self-Signed Certificate](#4-trusted-ca-vs-self-signed-certificate)
5. [Apa itu Nginx?](#5-apa-itu-nginx)
6. [Kenapa Perlu Nginx?](#6-kenapa-perlu-nginx)
7. [Self-Signed Certificate: Seberapa Aman?](#7-self-signed-certificate-seberapa-aman)
8. [Serangan MITM: Bagaimana Caranya?](#8-serangan-mitm-bagaimana-caranya)
9. [Perbedaan HTTP vs HTTPS di Jaringan Bersama](#9-perbedaan-http-vs-https-di-jaringan-bersama)
10. [Konfigurasi Nginx untuk Self-Signed Certificate](#10-konfigurasi-nginx-untuk-self-signed-certificate)
11. [Kesimpulan](#11-kesimpulan)

---

## 1. Apa itu HTTPS?

**HTTPS** (*HyperText Transfer Protocol Secure*) adalah versi aman dari HTTP. Semua data yang dikirim antara browser dan server dienkripsi sehingga tidak bisa dibaca oleh pihak ketiga.

```
HTTP  →  Data dikirim dalam plaintext (bisa dibaca siapa saja)
HTTPS →  Data dienkripsi (hanya pengirim & penerima yang bisa membaca)
```

Tanpa HTTPS, siapa pun yang berada di jalur jaringan antara kamu dan server — misalnya penyedia WiFi, ISP, atau hacker di kafe — bisa membaca semua data yang kamu kirim, termasuk password, token, dan informasi sensitif lainnya.

---

## 2. Cara Kerja TLS/SSL

HTTPS menggunakan protokol **TLS** (*Transport Layer Security*), penerus dari SSL (*Secure Sockets Layer*). Prosesnya disebut **TLS Handshake**:

```
Browser                              Server
   │                                    │
   │──── "Halo, saya support TLS 1.3" ──►│
   │                                    │
   │◄─── "Oke, ini sertifikat saya" ────│
   │                                    │
   │  [Browser verifikasi sertifikat]   │
   │                                    │
   │──── "Setuju, ini session key" ─────►│
   │                                    │
   │  [Semua komunikasi selanjutnya     │
   │   dienkripsi dengan session key]   │
   │                                    │
```

**Session key** adalah kunci enkripsi unik yang dibuat untuk setiap koneksi. Bahkan jika ada yang merekam semua paket data, mereka tetap tidak bisa mendekripsi tanpa session key tersebut.

---

## 3. Apa itu Sertifikat Digital?

Sertifikat digital adalah dokumen elektronik yang berisi:

| Informasi | Contoh |
|-----------|--------|
| Nama domain / IP | `monitor.example.com` |
| Public key milik server | `(kunci kriptografi publik)` |
| Siapa yang menerbitkan | `Let's Encrypt` / `Self-signed` |
| Masa berlaku | `2024-01-01` sampai `2025-01-01` |
| Tanda tangan digital | `(hash terenkripsi)` |

Sertifikat ini ibarat **KTP digital** untuk server. Browser menggunakannya untuk memastikan:
1. Server yang diajak bicara benar-benar pemilik domain tersebut
2. Komunikasi bisa dienkripsi menggunakan public key di sertifikat

---

## 4. Trusted CA vs Self-Signed Certificate

### Certificate Authority (CA)

**Certificate Authority** adalah lembaga tepercaya yang menerbitkan dan menandatangani sertifikat. Browser sudah menyimpan daftar CA yang dipercaya (disebut *root store*).

```
Let's Encrypt (CA)
    │
    └── Menerbitkan sertifikat untuk monitor.example.com
              │
              └── Browser memeriksa: "Apakah Let's Encrypt ada di daftar CA tepercaya?"
                        │
                        └── Ya → Koneksi aman, tidak ada peringatan
```

CA terkenal: **Let's Encrypt** (gratis), DigiCert, Comodo, GlobalSign.

### Self-Signed Certificate

Sertifikat yang kamu buat dan tandatangani **sendiri**, tanpa melibatkan CA manapun.

```
Kamu (bukan CA)
    │
    └── Membuat dan menandatangani sertifikat untuk IP 1.2.3.4
              │
              └── Browser memeriksa: "Apakah pembuatnya ada di daftar CA tepercaya?"
                        │
                        └── Tidak → ⚠️ Peringatan keamanan
```

### Perbandingan

| Aspek | Trusted CA (Let's Encrypt) | Self-Signed |
|-------|---------------------------|-------------|
| Biaya | Gratis | Gratis |
| Perlu domain | Ya | Tidak (bisa pakai IP) |
| Peringatan browser | Tidak ada | Ada ⚠️ |
| Enkripsi traffic | ✅ Sama kuat | ✅ Sama kuat |
| Verifikasi identitas | ✅ Ya | ❌ Tidak |
| Proteksi MITM | ✅ Penuh | ⚠️ Sebagian |
| Auto-renewal | ✅ (certbot) | Manual (tiap 1 tahun) |

> **Penting:** Kekuatan enkripsi self-signed dan trusted CA **identik**. Perbedaannya hanya pada verifikasi identitas.

---

## 5. Apa itu Nginx?

**Nginx** (dibaca: *engine-x*) adalah software server yang berfungsi sebagai:

- **Web server** — menyajikan file statis (HTML, CSS, JS, gambar)
- **Reverse proxy** — meneruskan request ke aplikasi lain (Node.js, Python, dll)
- **Load balancer** — mendistribusikan traffic ke beberapa server
- **TLS terminator** — menangani enkripsi HTTPS

Nginx ditulis dalam bahasa C dan dikenal sangat ringan dan cepat, mampu menangani ribuan koneksi bersamaan dengan konsumsi memori yang rendah.

---

## 6. Kenapa Perlu Nginx?

### Masalah 1: Port Privileged

Port di bawah 1024 (termasuk port 443 untuk HTTPS dan port 80 untuk HTTP) memerlukan izin **root** di Linux untuk dibuka.

```
Port 443 (HTTPS) → memerlukan root
Port 80  (HTTP)  → memerlukan root
Port 3001+       → tidak perlu root
```

Menjalankan aplikasi Node.js sebagai root sangat berbahaya. Jika aplikasi berhasil dieksploitasi, penyerang langsung mendapat akses root ke seluruh server.

**Solusi dengan Nginx:**
```
Nginx (berjalan sebentar sebagai root untuk bind port 443)
    │  → kemudian drop ke user nginx (non-root)
    │
    └── Meneruskan ke Node.js:3001 (tidak perlu root sama sekali)
```

### Masalah 2: TLS Handling

Node.js bisa menangani TLS langsung, tapi:

- Nginx menggunakan library **OpenSSL** yang dioptimasi untuk kinerja kriptografi
- Nginx mendukung **TLS session caching** — koneksi ulang lebih cepat
- Nginx sudah teruji menangani edge case keamanan TLS selama bertahun-tahun
- Memisahkan TLS dari logika aplikasi → lebih mudah dikelola

### Masalah 3: Efisiensi

```
Tanpa Nginx:
Browser → Node.js (handle TLS + serve static + API logic)

Dengan Nginx:
Browser → Nginx (handle TLS + serve static files)
              └──→ Node.js:3001 (API logic saja)
```

File statis (HTML, CSS, JS) jauh lebih efisien disajikan oleh Nginx karena menggunakan `sendfile()` syscall langsung tanpa melewati userspace Node.js.

---

## 7. Self-Signed Certificate: Seberapa Aman?

### Yang Aman ✅

**Enkripsi traffic** sepenuhnya bekerja. Semua data yang dikirim antara browser dan server dienkripsi dengan cipher yang sama kuatnya seperti HTTPS dari bank:

```
Cipher yang digunakan (dari konfigurasi Nginx):
- ECDHE-ECDSA-AES128-GCM-SHA256
- ECDHE-RSA-AES256-GCM-SHA384
- TLS 1.2 / TLS 1.3
```

Pengguna lain di jaringan yang sama **tidak bisa membaca** isi traffic kamu, meskipun mereka menggunakan tools seperti Wireshark.

### Yang Tidak Aman ⚠️

**Verifikasi identitas** tidak ada. Browser tidak bisa membedakan sertifikat asli milikmu dengan sertifikat palsu buatan penyerang. Keduanya menghasilkan peringatan yang sama.

---

## 8. Serangan MITM: Bagaimana Caranya?

**MITM** (*Man-in-the-Middle*) adalah serangan di mana penyerang menyisipkan dirinya di antara komunikasi dua pihak.

### Syarat Terjadinya MITM

Penyerang harus bisa **masuk ke jalur jaringan** antara kamu dan server. Cara umum:

| Metode | Cara | Kesulitan |
|--------|------|-----------|
| ARP Spoofing | Penyerang di jaringan LAN yang sama | Mudah |
| Rogue WiFi | Korban terhubung ke WiFi penyerang | Mudah |
| DNS Poisoning | Memalsukan jawaban DNS | Menengah |
| BGP Hijack | Mengalihkan routing IP | Sangat sulit (level ISP) |
| Router Compromise | Router di jaringan korban diretas | Menengah |

### Alur Serangan MITM dengan Self-Signed Cert

```
[Normal]
Kamu ──────────────────────────────► Server VPS (1.2.3.4)

[MITM]
Kamu ──► Mesin Penyerang ──────────► Server VPS (1.2.3.4)
          (1.2.3.100)
          Dekripsi & baca data
          Re-enkripsi & teruskan
```

**Langkah detail:**

1. Penyerang masuk ke posisi MITM (misal via ARP spoofing di jaringan sama)
2. Kamu membuka `https://1.2.3.4`
3. Penyerang memotong koneksi, menyajikan sertifikat self-signed **milik mereka**
4. Browser menampilkan peringatan ⚠️ — **peringatan yang sama** seperti sertifikat aslimu
5. Jika kamu klik "Lanjutkan/Proceed":
   - Kamu terhubung ke mesin penyerang (TLS terenkripsi ke penyerang)
   - Penyerang mendekripsi, membaca, lalu meneruskan ke server aslimu
   - Kamu melihat respons normal — tidak ada yang terlihat aneh

### Data yang Bisa Dicuri

Jika MITM berhasil, penyerang bisa mengambil:

```
X-API-Key: mysecretapikey123   ← dari setiap request header
POST body: { "value": "..." }  ← seluruh data yang disimpan
GET response: { data pribadi } ← seluruh data yang dibaca
```

### Kenapa Trusted CA Mencegah Ini?

```
[Dengan Let's Encrypt]
Penyerang menyajikan sertifikat palsu untuk domain kamu
    │
    └── Browser cek: "Apakah sertifikat ini ditandatangani CA untuk domain ini?"
              │
              └── Tidak (penyerang tidak bisa memalsukan tanda tangan CA)
                        │
                        └── Browser BLOKIR KERAS — tidak ada tombol "Lanjutkan"
```

---

## 9. Perbedaan HTTP vs HTTPS di Jaringan Bersama

Bayangkan 5 orang di jaringan WiFi yang sama. Salah satu di antaranya menggunakan Wireshark untuk merekam semua paket.

### Dengan HTTP (tanpa enkripsi)

```
Paket yang terlihat di Wireshark:

POST /api/storage/elmon:state HTTP/1.1
Host: 1.2.3.4:3001
X-API-Key: mysecretkey123abc        ← TERLIHAT JELAS
Content-Type: application/json

{"value":"{\"devices\":[...]}"}     ← SEMUA DATA TERLIHAT
```

### Dengan HTTPS (self-signed maupun trusted CA)

```
Paket yang terlihat di Wireshark:

16 03 03 00 28 a3 f2 1b 8c 4e 9d ...  ← TIDAK TERBACA
d4 7a 2c 9f 3b 8e 1a 6d 5c 0f 4b ...  ← GIBBERISH
```

Yang bisa dilihat pengguna lain di jaringan yang sama:

| Data | HTTP | HTTPS |
|------|------|-------|
| IP kamu + IP server | ✅ Terlihat | ✅ Terlihat |
| Port yang digunakan | ✅ Terlihat | ✅ Terlihat |
| Ukuran data (kira-kira) | ✅ Terlihat | ✅ Terlihat |
| URL lengkap | ✅ Terlihat | ❌ Terenkripsi |
| API Key | ✅ Terlihat | ❌ Terenkripsi |
| Isi request/response | ✅ Terlihat | ❌ Terenkripsi |

> Self-signed dan trusted CA memberikan **perlindungan yang identik** terhadap penyadapan pasif di jaringan bersama.

---

## 10. Konfigurasi Nginx untuk Self-Signed Certificate

### Generate Sertifikat

```bash
# Buat direktori untuk menyimpan sertifikat
mkdir -p /etc/nginx/certs/myapp

# Generate self-signed certificate (berlaku 1 tahun)
openssl req -x509 -nodes -newkey rsa:4096 -days 365 \
  -keyout /etc/nginx/certs/myapp/privkey.pem \
  -out    /etc/nginx/certs/myapp/fullchain.pem \
  -subj   "/CN=myapp"

# Amankan private key — hanya root yang bisa baca
chmod 600 /etc/nginx/certs/myapp/privkey.pem
```

**Penjelasan parameter:**
- `-x509` — format sertifikat standar
- `-nodes` — private key tidak dienkripsi dengan password (agar Nginx bisa otomatis load)
- `-newkey rsa:4096` — buat key pair RSA 4096-bit baru
- `-days 365` — berlaku 1 tahun
- `-subj "/CN=myapp"` — Common Name (nama sertifikat)

### Konfigurasi Nginx

```nginx
events {
    worker_connections 1024;
}

http {
    include      /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Aktifkan kompresi gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript;

    # Redirect semua HTTP ke HTTPS
    server {
        listen 80;
        return 301 https://$host$request_uri;
    }

    # Server HTTPS
    server {
        listen 443 ssl;
        server_name _;  # _ berarti terima semua hostname/IP

        # Lokasi sertifikat
        ssl_certificate     /etc/nginx/certs/myapp/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/myapp/privkey.pem;

        # Hanya izinkan TLS 1.2 dan 1.3 (TLS 1.0/1.1 sudah tidak aman)
        ssl_protocols TLSv1.2 TLSv1.3;

        # Cipher suite yang kuat
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Session caching — koneksi ulang lebih cepat
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        # Proxy ke aplikasi Node.js
        location / {
            proxy_pass         http://127.0.0.1:3001;
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
        }
    }
}
```

**Penjelasan konfigurasi penting:**

- `server_name _` — underscore adalah wildcard, menerima request ke IP manapun
- `proxy_pass http://127.0.0.1:3001` — teruskan ke Node.js yang berjalan di port 3001
- `X-Forwarded-Proto $scheme` — memberi tahu Node.js bahwa request aslinya pakai HTTPS
- `ssl_session_cache shared:SSL:10m` — cache session TLS 10MB, shared antar worker process

### Kenapa `ssl_prefer_server_ciphers off`?

Di TLS 1.3, klien (browser) lebih tahu cipher mana yang didukung hardware-nya dengan baik. Membiarkan klien memilih (`off`) umumnya menghasilkan koneksi yang lebih cepat dan aman.

---

## 11. Kesimpulan

| Situasi | Rekomendasi |
|---------|-------------|
| Development lokal | HTTP saja sudah cukup |
| VPS pribadi, akses dari jaringan tepercaya | Self-signed certificate |
| VPS publik, punya domain | Let's Encrypt (gratis) |
| VPS publik, tidak punya domain | Self-signed + edukasi pengguna tentang peringatan browser |

**Poin utama yang perlu diingat:**

1. **Self-signed mengenkripsi traffic** sama kuatnya dengan CA certificate — perbedaannya hanya verifikasi identitas
2. **Nginx** diperlukan karena Node.js tidak boleh berjalan sebagai root, dan Nginx menangani TLS lebih efisien
3. **MITM** pada self-signed cert memerlukan penyerang yang sudah berada di jalur jaringan — bukan sekadar berada di jaringan yang sama
4. **Peringatan browser** pada self-signed adalah normal dan bukan berarti koneksi tidak aman — hanya berarti identitas server tidak terverifikasi oleh pihak ketiga
5. **Pengguna di jaringan yang sama** tidak bisa membaca isi traffic HTTPS, baik self-signed maupun CA certificate

---

*Artikel ini membahas konsep umum yang berlaku untuk aplikasi web manapun yang di-deploy dengan Nginx dan HTTPS.*
