## Live Demo

[Open Carnatic Raga Identification App](https://carnatic-raga-identification.vercel.app/)

# RagaVani — Carnatic Raga Identification (Full Stack) — v2

A full-stack web app that identifies the Carnatic raga of a sung or uploaded
audio clip. Includes user accounts, an **admin dashboard**, a personal prediction
dashboard, a curated raga dataset browser (60+ ragas), live microphone-based
identification, and a **virtual Swara Keyboard with real-time raga prediction**.

- **Backend:** Python (Flask, SQLAlchemy, JWT auth, librosa, TensorFlow/Keras, scikit-learn)
- **Frontend:** React (Vite) + Tailwind CSS v4 + Recharts + Lucide icons

---

## What's New in v2

### 🎹 Virtual Swara Keyboard (`/keyboard`)
- Piano-style keyboard showing all 12 Carnatic swaras (Sa through Ni3)
- **Play with mouse clicks** or **type on your keyboard**
  - White keys: `A S D F G H J K` → Sa, Ri2, Ga3, Ma1, Pa, Da2, Ni3, Sa′
  - Black keys: `W E T Y U` → Ri1, Ga2, Ma2, Da1, Ni2
- **Real-time raga prediction** as you play (auto-predicts 800 ms after last note)
- Shows pitch class distribution, top-5 raga matches with confidence bars
- Displays full raga details: arohana, avarohana, mood, time, composer, famous songs
- "Missing swaras" hint tells you which notes to add to strengthen the prediction
- Audio synthesis via Web Audio API — no external sound files needed

### 📚 Expanded Raga Dataset (20 → 60+ ragas)
Covers all 72 Melakarta ragas (numbered, with arohana/avarohana) plus
the most popular Janya ragas including:
- Mohanam, Hamsadhwani, Bhairavi, Hindolam, Abhogi, Madhyamavati, Kambhoji
- Bilahari, Arabhi, Nilambari, Varali, Pantuvarali, Sriranjani, Vasanta
- Kalyani, Shankarabharanam, Todi, Kharaharapriya, Natabhairavi, Kiravani
- Shanmukhapriya, Hemavati, Dharmavati, Vachaspati, Latangi, Rasikapriya
- … and many more

### 🔌 New API Endpoint
- `POST /api/keyboard/predict` — predict raga from a list of swara semitones
- `GET /api/keyboard/swara-map` — get the full swara↔keyboard-key mapping

---

## 1. How raga identification works

**Audio-based identification** (`/identify`):
1. **Pitch-class template matching** — chroma profile vs. raga swara templates, always available
2. **Keras neural network** (`model.h5`) — trained on 85-dimensional audio features, blended with template scores

**Keyboard-based identification** (`/keyboard`):
- Takes the pitch classes you've played and scores every raga using:
  - Cosine similarity (50%) between your pitch-class vector and raga templates
  - Jaccard similarity (30%) between your note set and raga swara sets
  - Coverage (20%) — what fraction of your notes appear in the raga

---

## 2. Project structure

```
carnatic-raga-app/
├── backend/
│   ├── app.py                     # Flask app factory — registers all blueprints
│   ├── config.py
│   ├── models.py
│   ├── ragas_data.py               # ★ 60+ raga definitions (expanded)
│   ├── raga_engine.py              # audio identification pipeline
│   ├── feature_extraction.py
│   ├── preprocess.py
│   ├── predict.py                  # Keras model wrapper
│   ├── train.py
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── profile_routes.py
│   │   ├── predict_routes.py
│   │   ├── history_routes.py
│   │   ├── dashboard_routes.py
│   │   ├── favorites_routes.py
│   │   ├── dataset_routes.py
│   │   ├── admin_routes.py
│   │   └── keyboard_routes.py      # ★ NEW: swara keyboard + prediction API
│   ├── dataset/                    # one folder per raga, add .wav/.mp3 here
│   ├── model/                      # model.h5, scaler.pkl, label_encoder.pkl
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx                 # React router — includes /keyboard route
    │   ├── api/client.js           # axios client + all API helpers
    │   ├── components/
    │   │   ├── Navbar.jsx          # ★ updated — includes Swara Keyboard link
    │   │   ├── SwaraKeyboard.jsx   # ★ NEW: piano keyboard component
    │   │   ├── AudioRecorder.jsx
    │   │   ├── ResultPanel.jsx
    │   │   ├── RagaCard.jsx
    │   │   └── ConfidenceBar.jsx
    │   └── pages/
    │       ├── Landing.jsx
    │       ├── Dashboard.jsx
    │       ├── Identify.jsx
    │       ├── Keyboard.jsx        # ★ NEW: swara keyboard + prediction page
    │       ├── Ragas.jsx
    │       ├── History.jsx
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       └── AdminDashboard.jsx
    ├── package.json
    └── vite.config.js
```

---

## 3. Quick Start (VS Code / local)

### Prerequisites
- Python 3.10, 3.11, or 3.12 (recommended)
- Node.js 18+ and npm
- ffmpeg (for non-WAV audio formats — `brew install ffmpeg` / `choco install ffmpeg` / `apt install ffmpeg`)

### Backend

```bash
cd carnatic-raga-app/backend
python -m venv venv

# macOS / Linux:
source venv/bin/activate
# Windows PowerShell:
# venv\Scripts\activate

pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

On first run a default admin account is created:
- Email: `admin@ragavani.local`
- Password: `Admin@123`

### Frontend

```bash
cd carnatic-raga-app/frontend
npm install
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in Chrome/Firefox (not an editor's embedded preview —
live mic recording and Web Audio both require a real browser).

---

## 4. Using the Swara Keyboard

1. Log in and click **Swara Keyboard** in the nav
2. Play notes by clicking the on-screen keys or typing on your keyboard:
   - White keys: `A` (Sa), `S` (Ri2), `D` (Ga3), `F` (Ma1), `G` (Pa), `H` (Da2), `J` (Ni3), `K` (Sa′)
   - Black keys: `W` (Ri1), `E` (Ga2), `T` (Ma2), `Y` (Da1), `U` (Ni2)
3. After 2+ notes, the app auto-predicts the raga (or toggle auto-predict off and click **Predict Raga**)
4. See the top-5 raga matches with confidence bars
5. Click **Raga Details** to see arohana, avarohana, mood, composer, and famous songs
6. Use the "Missing swaras" hint to improve accuracy
7. Click **Clear** to start a new sequence

### Example sequences to try
| Raga             | Swaras to type           |
|------------------|--------------------------|
| Shankarabharanam | A S D F G H J  (Sa R2 G3 M1 Pa D2 N3) |
| Kalyani          | A S D T G H J  (Sa R2 G3 M2 Pa D2 N3) |
| Mohanam          | A S D G H      (Sa R2 G3 Pa D2)        |
| Hamsadhwani      | A S D G J      (Sa R2 G3 Pa N3)        |
| Hindolam         | A E F Y U      (Sa G2 M1 D1 N2)        |
| Mayamalavagowla  | A W D F G Y J  (Sa R1 G3 M1 Pa D1 N3) |

---

## 5. Using the Audio Identifier

1. Register / log in
2. Go to **Identify Raga** → Live Recording (sing into mic) or Upload File
3. View predicted raga, confidence, alternatives, pitch-class distribution

---

## 6. Improving Prediction Accuracy

The ML model ships trained on **synthetic data** — real accuracy comes from
real audio. To improve:

```bash
# Download labelled recordings from HuggingFace:
pip install datasets
python scripts/download_dataset.py --raga Kalyani
python scripts/download_dataset.py        # all ragas

# Retrain:
python train.py

# Or use the Admin Dashboard → Retrain Model button in the UI
```

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| numpy build fails on Windows | Use Python 3.11/3.12; or loosen pins to `>=` in requirements.txt |
| tensorflow won't install | App works without it (template matching always runs); use Python 3.11/3.12 for ML |
| "could not analyze audio" | Install ffmpeg; ensure recording is not silent/too short |
| Microphone does nothing | Open in a real browser (Chrome/Firefox), not an editor's embedded preview |
| CORS errors | Confirm backend is running and `VITE_API_URL` in frontend/.env matches its address |
| Web Audio no sound | Click anywhere on the page first to unblock the AudioContext |

---

## 8. Environment Variables

**Backend** (`backend/.env` or environment):
```
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite:///raga_app.db
ADMIN_EMAIL=admin@ragavani.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@123
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:5000/api
```
