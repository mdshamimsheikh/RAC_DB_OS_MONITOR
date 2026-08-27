# 🐳 Docker Deployment Guide - Oracle DataCore Portal

আপনার লোকাল মেশিনে (Windows / Mac / Linux) Docker দিয়ে খুব সহজে এই প্রজেক্টটি পোর্ট **3030** এ রান করার সকল ফাইল যুক্ত করা হয়েছে।

---

## 🚀 ১-ক্লিকে রান করার উপায় (Easiest Method)

### 💻 Windows ব্যবহারকারীদের জন্য:
`docker-run.bat` ফাইলটিতে ডাবল ক্লিক করুন। এটি নিজে থেকেই Docker Build করবে এবং পোর্ট `3030` তে রান করিয়ে দিবে।

### 🐧 Linux / Mac ব্যবহারকারীদের জন্য:
টার্মিনালে এই কমান্ডটি চালান:
```bash
chmod +x docker-run.sh
./docker-run.sh
```

---

## 🛠 ম্যানুয়ালি Docker দিয়ে রান করার উপায় (Standard Docker Commands)

### Step 1: Docker Container Build & Run
```bash
docker compose up -d --build
```

### Step 2: ওয়েব পোর্টালে এক্সেস করুন
ব্রাউজার অন করে প্রবেশ করুন:
👉 **`http://localhost:3030`**

---

## 📊 প্রয়োজনীয় অন্যান্য Docker কমান্ড

* **লগ দেখার জন্য (View Live Logs):**
  ```bash
  docker compose logs -f
  ```

* **সার্ভার স্টপ করার জন্য (Stop Portal):**
  ```bash
  docker compose down
  ```

* **পুনরায় রিস্টার্ট দেওয়ার জন্য (Restart Portal):**
  ```bash
  docker compose restart
  ```

---

## ⚠️ "failed to read dockerfile: no such file or directory" ত্রুটি কেন আসে ও সমাধান:

এই সমস্যাটির দুটি কারণ থাকে:
1. **`Dockerfile` ফাইলটি অনুপস্থিত:** আপনার `F:\DBA_DOCKER` ফোল্ডারে পুরো প্রজেক্টের সব ফাইল (বিশেষ করে `Dockerfile` ফাইলটি) ডাউনলোড/কপি করা হয়নি।
2. **ফাইল এক্সটেনশন সমস্যা (Windows Extension):** Windows এ অনেক সময় `Dockerfile` ফাইলটি `Dockerfile.txt` নামে সেভ হয়ে যায়।

### 🛠 সমাধান:
1. নিশ্চিত করুন আপনার `F:\DBA_DOCKER` ফোল্ডারের ভেতর প্রজেক্টের সব ফাইল রয়েছে:
   - `Dockerfile` (কোনো `.txt` এক্সটেনশন থাকবে না)
   - `docker-compose.yml`
   - `package.json`
   - `server.ts`
   - `src/` ফোল্ডার
2. ফাইল নেম ঠিক রাখতে Windows Explorer এ **View -> File name extensions** টিক মার্ক দিয়ে নিশ্চিত করুন ফাইলের নাম শুধু `Dockerfile` (কোনো `.txt` ছাড়া)।
3. এরপর পুনরায় চালান:
   ```cmd
   docker compose up -d --build
   ```
