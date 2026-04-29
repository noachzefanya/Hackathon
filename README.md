# GuardianFlow AI — Enterprise Fraud Detection Engine

![GuardianFlow AI](https://img.shields.io/badge/Status-Active-emerald?style=for-the-badge) ![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi) ![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js) ![Microsoft Azure](https://img.shields.io/badge/Microsoft_Azure-0089D6?style=for-the-badge&logo=microsoft-azure)

**GuardianFlow AI** adalah *middleware* deteksi *fraud* (penipuan) secara *real-time* yang dirancang untuk skala enterprise (Fintech & E-commerce). Dibangun dengan arsitektur *Cloud-Native* di Microsoft Azure, sistem ini memadukan **XGBoost, Isolation Forest**, dan **Graph Link Analysis** untuk menskor risiko setiap transaksi dalam milidetik (<100ms).

---

## ⚡ Fitur Utama

- **Real-Time ML Scoring**: Prediksi tingkat risiko (0-100) menggunakan kombinasi model Ensemble (XGBoost) dan deteksi anomali (Isolation Forest).
- **Explainable AI (XAI)**: Menggunakan SHAP untuk memberikan penjelasan di balik setiap keputusan AI (mengapa sebuah transaksi diblokir).
- **Graph Link Analysis**: Menganalisis relasi antar *user*, IP, *device*, dan *merchant* secara *real-time* untuk mendeteksi sindikat tersembunyi menggunakan Azure Cosmos DB.
- **WebSocket Live Feed**: *Dashboard* analitik yang memantau aliran transaksi secara langsung.
- **Azure Monitor**: Terintegrasi penuh dengan OpenTelemetry dan Application Insights untuk pemantauan latensi dan error aplikasi.

---

## 🚀 Panduan Menjalankan Secara Lokal (Local Development)

### 1. Menjalankan Frontend (Dashboard Next.js)
```bash
# Di direktori root (atau di dalam folder /frontend)
npm install --prefix frontend
npm run dev
```
Buka **http://localhost:3000** di browser.

### 2. Menjalankan Backend (FastAPI Python)
```bash
cd backend

# Buat virtual environment (opsional tapi direkomendasikan)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate # Mac/Linux

# Install dependensi
pip install -r requirements.txt

# Jalankan server
python -m uvicorn main:app --reload --port 8000
```
Buka **http://localhost:8000/docs** untuk melihat dokumentasi API interaktif.

---

## ☁️ Panduan Integrasi Microsoft Azure

Sistem GuardianFlow AI dirancang untuk menggunakan infrastruktur *PaaS* dari Azure. Berikut adalah cara untuk menghubungkan layanan-layanan tersebut.

### Prasyarat
1. Memiliki akun Microsoft Azure aktif.
2. Menginstall [Azure CLI (`az`)](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (opsional, untuk *deployment* lokal).
3. Buat file `.env` di folder `/backend` (salin dari `.env.example`).

### 1. Azure Application Insights (Telemetri & Log)
Digunakan untuk melacak pergerakan user (*frontend*) dan performa API (*backend*).

- **Cara Setup**: 
  1. Cari "Application Insights" di Azure Portal dan buat *resource* baru.
  2. Salin **Connection String** dari halaman *Overview*.
- **Konfigurasi `.env`**:
  ```env
  APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxxx;IngestionEndpoint=https://..."
  NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxxx;IngestionEndpoint=https://..."
  ```

### 2. Azure Cosmos DB (Graph Link Analysis)
Digunakan untuk menyimpan dan menavigasi jaringan koneksi fraudster menggunakan API Gremlin.

- **Cara Setup**:
  1. Buat akun **Azure Cosmos DB for Apache Gremlin**.
  2. Buat *Database* bernama `FraudGraph` dan *Graph* bernama `Entities`.
  3. Buka menu **Keys** dan salin URI serta *Primary Key*.
- **Konfigurasi `.env`**:
  ```env
  COSMOS_GREMLIN_ENDPOINT="wss://<nama-akun>.gremlin.cosmos.azure.com:443/"
  COSMOS_GREMLIN_KEY="primary-key-anda-disini"
  COSMOS_DATABASE="FraudGraph"
  COSMOS_GRAPH="Entities"
  ```

### 3. Azure Event Hubs (Data Streaming)
Bertindak sebagai jalur pipa antrian berkecepatan tinggi untuk menampung transaksi masuk sebelum diskor oleh backend.

- **Cara Setup**:
  1. Buat **Event Hubs Namespace** (Tier Standard direkomendasikan).
  2. Buat satu buah *Event Hub* bernama `transactions`.
  3. Buat *Shared Access Policy* (Listen/Send) dan salin *Connection String-Primary Key*.
- **Konfigurasi `.env`**:
  ```env
  EVENTHUB_CONNECTION_STRING="Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=..."
  EVENTHUB_NAME="transactions"
  ```

### 4. Azure Key Vault (Keamanan Secrets)
GuardianFlow tidak menyimpan password *Database* atau kredensial lain secara *hardcode*. Key Vault digunakan untuk memuat variabel rahasia ke aplikasi.

- **Cara Setup**:
  1. Buat *Key Vault* di portal.
  2. Tambahkan variabel seperti `DB-PASSWORD` atau `REDIS-KEY` sebagai *Secrets*.
  3. Berikan akses (Role Assignment) ke identitas lokal Anda (`az login`) atau Managed Identity aplikasi.
- **Konfigurasi `.env`**:
  ```env
  AZURE_KEYVAULT_URL="https://<nama-keyvault>.vault.azure.net/"
  ```
  *Sistem autentikasi menggunakan `DefaultAzureCredential` yang secara otomatis mengurus login lokal (lewat Azure CLI) maupun produksi.*

---

## 🏗️ Struktur Proyek
```
GuardianFlow/
├── frontend/             # Next.js 14 App Router, Tailwind CSS, TypeScript
│   ├── app/              # Konfigurasi halaman utama dan routing (Dashboard, Analytics)
│   ├── components/       # Komponen visual yang reusable
│   └── lib/              # Konfigurasi state (Zustand) dan AppInsights
├── backend/              # FastAPI Server (Python)
│   ├── core/             # Konfigurasi database, cache (Redis), telemetri
│   ├── routers/          # Endpoint REST API (Score, Transactions, Alerts)
│   ├── ml/               # Modul AI/ML (XGBoost, Isolation Forest)
│   └── services/         # Integrasi Event Hubs dan integrasi eksternal
└── package.json          # Jembatan NPM untuk menjalankan frontend
```

## Tim Pengembang
Built with ❤️ by **GuardianFlow Team**.
