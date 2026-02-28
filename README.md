# GeoTag App (Expo + Express + MongoDB)

This project includes:

- Expo React Native app (frontend)
- Node.js + Express API (backend)
- MongoDB database

## Features Implemented

- Register and login with JWT
- JWT stored securely using `expo-secure-store`
- Capture photo with camera
- Get current GPS coordinates
- Upload image + location + title + description using `multipart/form-data`
- Fetch and display previous user entries
- Pull-to-refresh on entries screen

## Project Structure

- Frontend: root project (`app`, `components`, etc.)
- Backend: `backend/`

## 1) Backend Setup

1. Go to backend folder:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create environment file:

   ```bash
   copy .env.example .env
   ```

4. Update `backend/.env` values:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `BASE_URL` (your backend URL)

5. Start backend:

   ```bash
   npm run dev
   ```

Backend runs on `http://localhost:5000` by default.

## 2) Frontend Setup

1. Go to project root:

   ```bash
   cd ..
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Update API URL in `app.json`:

   ```json
   "extra": {
     "apiUrl": "http://YOUR_MACHINE_IP:5000/api"
   }
   ```

   Notes:
   - For physical device, use your computer's LAN IP (not `localhost`).
   - For Android emulator, `http://10.0.2.2:5000/api` usually works.

4. Start Expo app:

   ```bash
   npm run start
   ```

## API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Entries (Protected)

- `POST /api/entries` (multipart: `image`, `title`, `description`, `latitude`, `longitude`)
- `GET /api/entries`
- `DELETE /api/entries/:id`

## Notes

- Uploaded images are stored in `backend/uploads` and served at `/uploads/<filename>`.
- Delete API is implemented on backend and ready to use.
