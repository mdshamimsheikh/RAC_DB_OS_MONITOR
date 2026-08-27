import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Terminal, FileCode, Container, AlertTriangle, ShieldCheck, X, ExternalLink, RefreshCw } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface DockerDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_FILES: Record<string, string> = {
  'Dockerfile': `# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy source code and config files
COPY . .

# Build application (Vite frontend bundle + esbuild server bundle)
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3030

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/nodes.json ./nodes.json
COPY --from=builder /app/databases.json ./databases.json

# Expose server port 3030
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3030/api/health || exit 1

# Start server
CMD ["node", "dist/server.cjs"]`,

  'docker-compose.yml': `services:
  oracle-datacore:
    build: .
    container_name: oracle-datacore-portal
    restart: unless-stopped
    ports:
      - "3030:3030"
    environment:
      - PORT=3030
      - NODE_ENV=production
    volumes:
      - ./nodes.json:/app/nodes.json
      - ./databases.json:/app/databases.json`,

  'docker-run.bat': `@echo off
echo ========================================================
echo  🚀 Oracle DataCore Portal - Docker Windows Launcher
echo ========================================================

REM Ensure storage JSON files exist before volume mapping
if not exist "nodes.json" (
    echo [] > nodes.json
)

if not exist "databases.json" (
    echo {"primaryDbs":[],"standbyDbs":[],"customNotifications":[]} > databases.json
)

echo 📦 Building and starting Docker container on http://localhost:3030...
docker compose up -d --build

echo.
echo ========================================================
echo  ✅ Docker container is running successfully!
echo  🌐 Open Web Portal: http://localhost:3030
echo  📜 View Logs: docker compose logs -f
echo  🛑 Stop Portal: docker compose down
echo ========================================================
pause`,

  'docker-run.sh': `#!/usr/bin/env bash

echo "========================================================"
echo " 🚀 Oracle DataCore Portal - Docker Automated Launcher"
echo "========================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    echo "Please install Docker Desktop or Docker Engine first."
    exit 1
fi

# Ensure storage JSON files exist before volume mapping
if [ ! -f "nodes.json" ]; then
    echo "[]" > nodes.json
fi

if [ ! -f "databases.json" ]; then
    echo '{"primaryDbs":[],"standbyDbs":[],"customNotifications":[]}' > databases.json
fi

echo "📦 Building & starting Docker container on http://localhost:3030..."
docker compose up -d --build

echo ""
echo "========================================================"
echo " ✅ Docker container is running successfully!"
echo " 🌐 Open Web Portal: http://localhost:3030"
echo " 📜 Logs command: docker compose logs -f"
echo " 🛑 Stop command: docker compose down"
echo "========================================================"`,

  'DOCKER_INSTRUCTIONS.md': `# 🐳 Docker Deployment Guide - Oracle DataCore Portal

আপনার লোকাল মেশিনে (Windows / Mac / Linux) Docker দিয়ে খুব সহজে এই প্রজেক্টটি পোর্ট **3030** এ রান করার সকল ফাইল যুক্ত করা হয়েছে।

---

## 🚀 ১-ক্লিকে রান করার উপায় (Easiest Method)

### 💻 Windows ব্যবহারকারীদের জন্য:
\`docker-run.bat\` ফাইলটিতে ডাবল ক্লিক করুন। এটি নিজে থেকেই Docker Build করবে এবং পোর্ট \`3030\` তে রান করিয়ে দিবে।

### 🐧 Linux / Mac ব্যবহারকারীদের জন্য:
টার্মিনালে এই কমান্ডটি চালান:
\`\`\`bash
chmod +x docker-run.sh
./docker-run.sh
\`\`\`

---

## 🛠 "failed to read dockerfile: open Dockerfile: no such file or directory" ত্রুটির স্থায়ী সমাধান:

যদি \`docker compose up -d --build\` রান করার সময় এই মেসেজ আসে, তবে আপনার প্রজেক্ট ফোল্ডারে \`Dockerfile\` ফাইলটি সরাসরি খুঁজে পাচ্ছে না।

### 📌 স্থায়ী ৪টি স্টেপ সমাধান:
1. আপনার পিসির ফোল্ডারে (\`F:\\DBA_MONITOR\` বা \`F:\\DBA_DOCKER\`) **Dockerfile** নামে একটি নিউ ফাইল খুলুন (কোনো এক্সটেনশন যেমন \`.txt\` থাকবে না)।
2. এই উইন্ডো থেকে **Dockerfile** ট্যাবের **Copy Code** বা **Download File** বাটনে ক্লিক করে ফাইলটি ডাউনলোড বা সেভ করুন।
3. নিশ্চিত করুন \`docker-compose.yml\`, \`package.json\`, \`server.ts\` সব ফাইল একই ফোল্ডারে আছে।
4. এরপর টার্মিনালে কমান্ডটি দিন:
   \`\`\`cmd
   docker compose up -d --build
   \`\`\``
};

export default function DockerDeploymentModal({ isOpen, onClose }: DockerDeploymentModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>('Dockerfile');
  const [filesContent, setFilesContent] = useState<Record<string, string>>(DEFAULT_FILES);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchDockerFiles();
    }
  }, [isOpen]);

  const fetchDockerFiles = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/docker/files');
      if (res.ok) {
        const data = await res.json();
        if (data.files && Object.keys(data.files).length > 0) {
          setFilesContent(prev => ({
            ...prev,
            ...data.files
          }));
        }
      }
    } catch (e) {
      console.warn('Using default docker fallback files', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentContent = filesContent[selectedFile] || DEFAULT_FILES[selectedFile] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = (fileName: string) => {
    const content = filesContent[fileName] || DEFAULT_FILES[fileName] || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullProjectZip = () => {
    const link = document.createElement('a');
    link.href = '/api/download/full-project-zip';
    link.download = 'oracle-datacore-full-project.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    handleDownloadFullProjectZip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="bg-[#0f111a] border border-indigo-500/30 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-950 via-[#13172e] to-slate-900 border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-cyan-400 rounded-xl border border-cyan-400/30">
              <Container className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                🐳 Docker Container Center & Deployment Files
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready to Deploy
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full Dockerfile, docker-compose, batch scripts & quick fix for "failed to read dockerfile" error
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Quick Alert Notice for User Error */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-200">
                  "failed to read dockerfile: open Dockerfile: no such file or directory" সমস্যার স্থায়ী সমাধান:
                </h4>
                <p className="text-xs text-amber-300/80 mt-1">
                  আপনার পিসির ফোল্ডারে পুরো প্রজেক্ট জিপ সহ সরাসরি সেভ করতে <strong>Download Complete Project (.ZIP)</strong> বাটনে ক্লিক করুন অথবা নিচের ফাইলগুলি ডাউনলোড করে সেভ করুন।
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadFullProjectZip}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 shrink-0 cursor-pointer transition border border-emerald-400/40"
            >
              <Download className="w-4 h-4" />
              📦 Download Complete Project (.ZIP)
            </button>
          </div>

          {/* File Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(DEFAULT_FILES).map(fileName => (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    selectedFile === fileName
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  {fileName}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => handleDownloadSingle(selectedFile)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-700/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download {selectedFile}
              </button>
            </div>
          </div>

          {/* Code Viewer Container */}
          <div className="relative rounded-xl border border-slate-800 bg-[#090b10] overflow-hidden shadow-inner">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Terminal className="w-4 h-4 text-cyan-400" />
                {selectedFile}
              </span>
              <span>UTF-8 • {currentContent.split('\n').length} lines</span>
            </div>
            <pre className="p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto max-h-96 select-text">
              <code>{currentContent}</code>
            </pre>
          </div>

          {/* Execution Commands Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Windows / Linux Command Quick Reference
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-black/50 p-3 rounded-lg border border-slate-800">
                <p className="text-slate-400 font-semibold mb-1">Windows (PowerShell / CMD):</p>
                <code className="text-emerald-400 font-mono block bg-black/80 p-2 rounded">
                  docker compose up -d --build
                </code>
              </div>
              <div className="bg-black/50 p-3 rounded-lg border border-slate-800">
                <p className="text-slate-400 font-semibold mb-1">Open Portal in Browser:</p>
                <code className="text-cyan-400 font-mono block bg-black/80 p-2 rounded">
                  http://localhost:3030
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-t border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verified Multi-stage Alpine Container Build (Port 3030)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-indigo-600/20"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
