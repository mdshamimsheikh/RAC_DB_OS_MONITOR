import React, { useEffect, useRef, useState } from 'react';
import {
  Palette, Sparkles, Video, Activity, Eye, Zap, Layers, Sliders, Check, X,
  Shield, RefreshCw, Radio, Terminal, Cpu, Gauge, Sun, Moon, Droplets
} from 'lucide-react';
import { InfographicThemeConfig, InfographicThemePreset } from '../types';

interface DynamicVideoInfographicCanvasProps {
  config: InfographicThemeConfig;
  onChangeConfig: (newConfig: InfographicThemeConfig) => void;
  cursorEnabled: boolean;
  onToggleCursor: () => void;
}

export interface ThemePresetItem {
  id: InfographicThemePreset;
  name: string;
  desc: string;
  primaryColor: string;
  secondaryColor: string;
  bgGradient: string;
  border: string;
  glow: string;
  chipClass: string;
}

export const ALL_THEME_PRESETS: ThemePresetItem[] = [
  {
    id: 'executive-white',
    name: 'Executive Clean Light (White)',
    desc: 'Crisp high-contrast executive white & slate with deep sapphire azure accents',
    primaryColor: '#0284c7',
    secondaryColor: '#2563eb',
    bgGradient: 'from-slate-100 via-white to-sky-50',
    border: 'border-slate-300',
    glow: 'rgba(2, 132, 199, 0.25)',
    chipClass: 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
  },
  {
    id: 'arctic-light-glass',
    name: 'Glacier Frost Light (Glass)',
    desc: 'Translucent frosted ice glass with crystalline cyan highlights & pure light styling',
    primaryColor: '#0284c7',
    secondaryColor: '#0ea5e9',
    bgGradient: 'from-sky-100 via-blue-50 to-slate-100',
    border: 'border-sky-300',
    glow: 'rgba(14, 165, 233, 0.3)',
    chipClass: 'bg-sky-200/80 text-sky-950 border-sky-400 font-bold'
  },
  {
    id: 'emerald-light',
    name: 'Emerald Health Light (Mint)',
    desc: 'Clean clinical emerald mint white with high-contrast forest green data vectors',
    primaryColor: '#059669',
    secondaryColor: '#10b981',
    bgGradient: 'from-emerald-50 via-white to-teal-50',
    border: 'border-emerald-300',
    glow: 'rgba(16, 185, 129, 0.25)',
    chipClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
  },
  {
    id: 'royal-sapphire-glass',
    name: 'Royal Sapphire Translucent Glass',
    desc: 'Deep translucent sapphire navy glass with ultra-luminous cyan glow & frosted blur',
    primaryColor: '#38bdf8',
    secondaryColor: '#60a5fa',
    bgGradient: 'from-[#07132c]/80 via-[#0e224e]/70 to-[#07142d]/80',
    border: 'border-cyan-400/50',
    glow: 'rgba(56, 189, 248, 0.5)',
    chipClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
  },
  {
    id: 'cyber-blue',
    name: 'Cyber Blue NOC',
    desc: 'Deep obsidian with ultra-cyan lasers & electric blue conduits',
    primaryColor: '#00f0ff',
    secondaryColor: '#3b82f6',
    bgGradient: 'from-cyan-950 via-slate-900 to-blue-950',
    border: 'border-cyan-400',
    glow: 'rgba(0, 240, 255, 0.4)',
    chipClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
  },
  {
    id: 'synthwave-neon',
    name: 'Synthwave Matrix',
    desc: 'Cyberpunk dark violet with electric magenta & hot pink aura',
    primaryColor: '#f43f5e',
    secondaryColor: '#a855f7',
    bgGradient: 'from-fuchsia-950 via-purple-950 to-slate-950',
    border: 'border-pink-400',
    glow: 'rgba(244, 63, 94, 0.45)',
    chipClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/40'
  },
  {
    id: 'matrix-green',
    name: 'Terminal Matrix HUD',
    desc: 'Deep phosphor green with streaming data vectors & CRT aura',
    primaryColor: '#10b981',
    secondaryColor: '#22c55e',
    bgGradient: 'from-emerald-950 via-slate-950 to-green-950',
    border: 'border-emerald-400',
    glow: 'rgba(16, 185, 129, 0.45)',
    chipClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
  },
  {
    id: 'solar-amber',
    name: 'Solar Plasma Command',
    desc: 'Magma obsidian with radioactive amber & plasma gold glows',
    primaryColor: '#f59e0b',
    secondaryColor: '#ea580c',
    bgGradient: 'from-amber-950 via-stone-950 to-orange-950',
    border: 'border-amber-400',
    glow: 'rgba(245, 158, 11, 0.45)',
    chipClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40'
  },
  {
    id: 'crimson-alert',
    name: 'Quantum Crimson Alert',
    desc: 'High-contrast ruby laser defense & emergency NOC alert state',
    primaryColor: '#ef4444',
    secondaryColor: '#be123c',
    bgGradient: 'from-red-950 via-slate-950 to-rose-950',
    border: 'border-red-500',
    glow: 'rgba(239, 68, 68, 0.5)',
    chipClass: 'bg-red-500/20 text-red-300 border-red-400/40'
  },
  {
    id: 'deep-nebula',
    name: 'Deep Space Nebula',
    desc: 'Cosmic deep teal with starlight indigo & galaxy telemetry',
    primaryColor: '#14b8a6',
    secondaryColor: '#6366f1',
    bgGradient: 'from-teal-950 via-slate-900 to-indigo-950',
    border: 'border-teal-400',
    glow: 'rgba(20, 184, 166, 0.4)',
    chipClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40'
  },
  {
    id: 'royal-indigo',
    name: 'Royal Sapphire Indigo',
    desc: 'Premium deep royal navy with brilliant sapphire & amethyst highlights',
    primaryColor: '#6366f1',
    secondaryColor: '#3b82f6',
    bgGradient: 'from-indigo-950 via-slate-900 to-blue-950',
    border: 'border-indigo-400',
    glow: 'rgba(99, 102, 241, 0.45)',
    chipClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40'
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Glacier Frost',
    desc: 'Crisp glacial ice cyan with diamond silver & clean high-tech contrast',
    primaryColor: '#38bdf8',
    secondaryColor: '#e0f2fe',
    bgGradient: 'from-sky-950 via-slate-900 to-cyan-950',
    border: 'border-sky-400',
    glow: 'rgba(56, 189, 248, 0.45)',
    chipClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40'
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral Tangerine',
    desc: 'Vibrant sunset orange and coral peach with high dynamic warmth',
    primaryColor: '#fb923c',
    secondaryColor: '#f43f5e',
    bgGradient: 'from-orange-950 via-slate-900 to-rose-950',
    border: 'border-orange-400',
    glow: 'rgba(251, 146, 60, 0.45)',
    chipClass: 'bg-orange-500/20 text-orange-300 border-orange-400/40'
  },
  {
    id: 'electric-lime',
    name: 'Electric Lime & Carbon',
    desc: 'Ultra high-voltage acid lime on stealth carbon black panels',
    primaryColor: '#84cc16',
    secondaryColor: '#10b981',
    bgGradient: 'from-lime-950 via-slate-950 to-neutral-950',
    border: 'border-lime-400',
    glow: 'rgba(132, 204, 22, 0.45)',
    chipClass: 'bg-lime-500/20 text-lime-300 border-lime-400/40'
  },
  {
    id: 'titanium-gray',
    name: 'Titanium Stealth Dark',
    desc: 'Monochrome minimalist carbon gray with crisp white reticle accents',
    primaryColor: '#94a3b8',
    secondaryColor: '#cbd5e1',
    bgGradient: 'from-slate-900 via-zinc-900 to-neutral-950',
    border: 'border-slate-400',
    glow: 'rgba(148, 163, 184, 0.3)',
    chipClass: 'bg-slate-500/20 text-slate-300 border-slate-400/40'
  },
  {
    id: 'sakura-pink',
    name: 'Cyber Sakura Blossom',
    desc: 'Futuristic cherry blossom pink with soft neon velvet background',
    primaryColor: '#ec4899',
    secondaryColor: '#f472b6',
    bgGradient: 'from-pink-950 via-slate-950 to-purple-950',
    border: 'border-pink-400',
    glow: 'rgba(236, 72, 153, 0.45)',
    chipClass: 'bg-pink-500/20 text-pink-300 border-pink-400/40'
  },
  {
    id: 'custom-studio',
    name: 'Custom Color Studio',
    desc: 'Create your own personalized palette with full RGB/HEX color picker',
    primaryColor: '#06b6d4',
    secondaryColor: '#8b5cf6',
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
    border: 'border-cyan-400',
    glow: 'rgba(6, 182, 212, 0.45)',
    chipClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
  }
];

export default function DynamicVideoInfographicCanvas({
  config,
  onChangeConfig,
  cursorEnabled,
  onToggleCursor
}: DynamicVideoInfographicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'fx'>('presets');
  const [timecode, setTimecode] = useState('00:00:00:00');
  const [fpsCounter, setFpsCounter] = useState(60);

  const currentTheme = ALL_THEME_PRESETS.find(t => t.id === config.preset) || ALL_THEME_PRESETS[0];

  // Apply theme and CSS variables to document
  useEffect(() => {
    document.body.setAttribute('data-theme', config.preset);
    document.body.setAttribute('data-transparency', config.transparencyMode || 'TRANSPARENT_GLASS');

    const primary = config.preset === 'custom-studio' && config.customPrimaryColor
      ? config.customPrimaryColor
      : currentTheme.primaryColor;

    const secondary = config.preset === 'custom-studio' && config.customSecondaryColor
      ? config.customSecondaryColor
      : currentTheme.secondaryColor;

    document.documentElement.style.setProperty('--theme-primary', primary);
    document.documentElement.style.setProperty('--theme-secondary', secondary);
    document.documentElement.style.setProperty('--theme-glow', currentTheme.glow);

    if (config.themeHue !== 0) {
      document.documentElement.style.filter = `hue-rotate(${config.themeHue}deg)`;
    } else {
      document.documentElement.style.filter = 'none';
    }
  }, [config.preset, config.transparencyMode, config.themeHue, config.customPrimaryColor, config.customSecondaryColor, currentTheme]);

  // Video Timecode Generator
  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame = (frame + 1) % 60;
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const f = String(frame).padStart(2, '0');
      setTimecode(`${h}:${m}:${s}:${f}`);
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, []);

  // GPU-Accelerated Dynamic Infographic Background Canvas
  useEffect(() => {
    if (!config.particlesEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const count = config.particleDensity === 'HIGH' ? 55 : config.particleDensity === 'LOW' ? 20 : 35;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      baseAlpha: number;
      pulseSpeed: number;
      color: string;
    }[] = [];

    const themeColor = config.preset === 'custom-studio' && config.customPrimaryColor
      ? config.customPrimaryColor
      : currentTheme.primaryColor;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        baseAlpha: Math.random() * 0.4 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        color: themeColor
      });
    }

    const packets: {
      fromIdx: number;
      toIdx: number;
      progress: number;
      speed: number;
    }[] = [];

    let radarAngle = 0;
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const render = (nowTime: number) => {
      frameCount++;
      if (nowTime - lastFrameTime >= 1000) {
        setFpsCounter(frameCount);
        frameCount = 0;
        lastFrameTime = nowTime;
      }

      ctx.clearRect(0, 0, width, height);

      // Subtle cyber grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Rotating Radar Sweep in center background
      radarAngle += 0.008;
      const centerX = width * 0.5;
      const centerY = height * 0.45;
      const radarRadius = Math.min(width, height) * 0.35;

      const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radarRadius);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.015)');
      grad.addColorStop(1, 'rgba(6, 182, 212, 0.03)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw Particles & Links
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.alpha = p.baseAlpha + Math.sin(nowTime * p.pulseSpeed) * 0.15;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, p.alpha));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const linkAlpha = (1 - dist / 130) * 0.18;
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = linkAlpha;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            if (Math.random() < 0.0008 && packets.length < 12) {
              packets.push({
                fromIdx: i,
                toIdx: j,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02
              });
            }
          }
        }
      }

      // Draw telemetry packets
      for (let k = packets.length - 1; k >= 0; k--) {
        const pkt = packets[k];
        pkt.progress += pkt.speed;

        const p1 = particles[pkt.fromIdx];
        const p2 = particles[pkt.toIdx];

        if (!p1 || !p2 || pkt.progress >= 1) {
          packets.splice(k, 1);
          continue;
        }

        const curX = p1.x + (p2.x - p1.x) * pkt.progress;
        const curY = p1.y + (p2.y - p1.y) * pkt.progress;

        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = themeColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [config.particlesEnabled, config.particleDensity, config.preset, currentTheme, config.customPrimaryColor]);

  return (
    <>
      {/* 1. Dynamic Canvas Layer for Infographic Particle Swarm */}
      {config.particlesEnabled && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-0 opacity-75"
          aria-hidden="true"
        />
      )}

      {/* 2. Video Scanline Beam & CRT Overlays */}
      {config.videoScanlines && (
        <>
          <div className="fixed inset-0 video-hud-overlay z-[5] pointer-events-none opacity-40" />
          <div className="video-scanline-beam z-[6] pointer-events-none" />
        </>
      )}

      {/* 3. Live Video HUD Recording & Telemetry Banner (Video Overlay) */}
      {config.videoRecHud && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-3 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono shadow-2xl">
          <div className="flex items-center gap-1.5 text-red-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-rec-dot shadow-[0_0_8px_#ef4444]" />
            <span>REC</span>
          </div>
          <span className="text-slate-300 font-bold">{timecode}</span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-300 font-semibold">{fpsCounter} FPS</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400 font-semibold">1080P HD NOC FEED</span>
          <span className="text-slate-500">•</span>
          <span className="text-purple-300 font-semibold">H.265 24.8 Mbps</span>
        </div>
      )}

      {/* 4. Live Audio / Redo Spectrum Equalizer Strip (Disabled as requested) */}
      {config.spectrumVisualizer && (
        <div className="hidden" aria-hidden="true" />
      )}

      {/* 5. Floating Dynamic Infographic Theme & Visual FX Quick-Dock Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setShowThemeModal(true)}
          className="group px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-cyan-950 hover:to-indigo-900 text-white text-xs font-bold border border-cyan-400/40 shadow-2xl shadow-cyan-950/60 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Customize Dynamic Infographic Video Theme & Multiple Colors"
          id="btn-open-dynamic-theme-dock"
        >
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 group-hover:rotate-180 transition-transform duration-500">
            <Palette className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <span className="text-[10px] text-cyan-300 font-mono block leading-tight">12+ THEMES &amp; COLORS</span>
            <span className="text-xs font-extrabold text-white block">{currentTheme.name}</span>
          </div>
          <span
            className="w-2.5 h-2.5 rounded-full shadow-md animate-pulse"
            style={{ backgroundColor: currentTheme.primaryColor, boxShadow: `0 0 8px ${currentTheme.primaryColor}` }}
          />
        </button>
      </div>

      {/* 6. Dynamic Theme & Video FX Modal / Studio Customizer */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl rounded-3xl bg-slate-950/95 border-2 border-cyan-500/40 p-6 shadow-2xl shadow-cyan-950/80 space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
                  <Palette className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-extrabold text-white flex items-center gap-2">
                    Dynamic Multi-Theme &amp; Color Studio
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                      12+ STYLES
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Switch between 12 distinct futuristic themes, custom color pickers, and video HUD motion FX.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs inside Studio */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab('presets')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'presets'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>12+ Theme Presets</span>
              </button>

              <button
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'custom'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Custom Color Studio</span>
              </button>

              <button
                onClick={() => setActiveTab('fx')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'fx'
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video HUD &amp; Cursor FX</span>
              </button>
            </div>

            {/* TAB 1: 12+ THEME PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4 animate-fade-in">
                {/* Transparency Style Switcher */}
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Portal Transparency &amp; Glass Blurring Mode
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300 font-bold">
                      {config.transparencyMode === 'SOLID_OPAQUE' ? 'Solid Opaque' : config.transparencyMode === 'SEMI_TRANSLUCENT' ? 'Semi-Translucent' : 'Transparent Glass (Full Blur)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: 'TRANSPARENT_GLASS', label: 'Transparent Glass', desc: 'Frosted acrylic glass with backdrop blur' },
                      { id: 'SEMI_TRANSLUCENT', label: 'Semi-Translucent', desc: 'Balanced contrast with subtle transparency' },
                      { id: 'SOLID_OPAQUE', label: 'Solid Opaque', desc: '100% solid high contrast colors' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => onChangeConfig({ ...config, transparencyMode: mode.id as any })}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          (config.transparencyMode || 'TRANSPARENT_GLASS') === mode.id
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{mode.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Click any theme to instantly apply across the entire portal:</span>
                  <span className="font-mono text-cyan-300 font-bold">{ALL_THEME_PRESETS.length} Available Themes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_THEME_PRESETS.map(preset => {
                    const isSelected = config.preset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => onChangeConfig({ ...config, preset: preset.id })}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? `bg-gradient-to-b ${preset.bgGradient} ${preset.border} ring-2 ring-cyan-400/60 shadow-xl shadow-cyan-950/60`
                            : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center -space-x-1">
                              <span
                                className="w-3.5 h-3.5 rounded-full shadow-md border border-black/40"
                                style={{ backgroundColor: preset.primaryColor, boxShadow: `0 0 8px ${preset.primaryColor}` }}
                              />
                              <span
                                className="w-3.5 h-3.5 rounded-full shadow-md border border-black/40"
                                style={{ backgroundColor: preset.secondaryColor }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white">{preset.name}</span>
                          </div>
                          {isSelected && (
                            <span className="p-0.5 rounded-full bg-cyan-400 text-slate-950">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{preset.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM COLOR STUDIO */}
            {activeTab === 'custom' && (
              <div className="space-y-4 animate-fade-in p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-pink-400" />
                      RGB / Hex Dynamic Color Customizer
                    </h4>
                    <p className="text-xs text-slate-400">
                      Choose custom primary and secondary accent colors to create your bespoke portal appearance.
                    </p>
                  </div>
                  <button
                    onClick={() => onChangeConfig({
                      ...config,
                      preset: 'custom-studio',
                      customPrimaryColor: '#00f0ff',
                      customSecondaryColor: '#a855f7'
                    })}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/40 text-xs font-bold hover:bg-purple-500/30 transition cursor-pointer"
                  >
                    Activate Custom Mode
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Primary Color Picker */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Primary Neon Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.customPrimaryColor || '#00f0ff'}
                        onChange={e => onChangeConfig({
                          ...config,
                          preset: 'custom-studio',
                          customPrimaryColor: e.target.value
                        })}
                        className="w-12 h-12 rounded-xl bg-transparent cursor-pointer border-2 border-slate-700"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-bold text-white block">
                          {config.customPrimaryColor || '#00f0ff'}
                        </span>
                        <span className="text-[10px] text-slate-400">Used for lasers, active buttons & badges</span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Color Picker */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Secondary Glow / Conduit Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={config.customSecondaryColor || '#8b5cf6'}
                        onChange={e => onChangeConfig({
                          ...config,
                          preset: 'custom-studio',
                          customSecondaryColor: e.target.value
                        })}
                        className="w-12 h-12 rounded-xl bg-transparent cursor-pointer border-2 border-slate-700"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-mono font-bold text-white block">
                          {config.customSecondaryColor || '#8b5cf6'}
                        </span>
                        <span className="text-[10px] text-slate-400">Used for conduits, gradients & secondary telemetry</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hue rotation slider */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-purple-400" />
                      Dynamic Hue Rotation (360° Spectrum)
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">{config.themeHue}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={config.themeHue}
                    onChange={e => onChangeConfig({ ...config, themeHue: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>0° (Default)</span>
                    <button
                      onClick={() => onChangeConfig({ ...config, themeHue: 0 })}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      Reset Hue
                    </button>
                    <span>360°</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VIDEO HUD & FX */}
            {activeTab === 'fx' && (
              <div className="space-y-3 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Particles & Cyber Grid */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Particle Swarm & Laser Conduits
                      </div>
                      <p className="text-[10px] text-slate-400">GPU-accelerated background particle network</p>
                    </div>
                    <button
                      onClick={() => onChangeConfig({ ...config, particlesEnabled: !config.particlesEnabled })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        config.particlesEnabled
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {config.particlesEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Video Scanlines */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Holographic Scanline & CRT Filter
                      </div>
                      <p className="text-[10px] text-slate-400">Cinematic sci-fi beam sweep across panels</p>
                    </div>
                    <button
                      onClick={() => onChangeConfig({ ...config, videoScanlines: !config.videoScanlines })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        config.videoScanlines
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {config.videoScanlines ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Video REC HUD */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-red-400" />
                        Live CCTV REC 60FPS Timecode
                      </div>
                      <p className="text-[10px] text-slate-400">Mission control header timecode stamp</p>
                    </div>
                    <button
                      onClick={() => onChangeConfig({ ...config, videoRecHud: !config.videoRecHud })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        config.videoRecHud
                          ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {config.videoRecHud ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Spectrum Visualizer */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        Redo Telemetry Spectrum EQ
                      </div>
                      <p className="text-[10px] text-slate-400">Live dynamic bottom audio-visualizer spectrum</p>
                    </div>
                    <button
                      onClick={() => onChangeConfig({ ...config, spectrumVisualizer: !config.spectrumVisualizer })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        config.spectrumVisualizer
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {config.spectrumVisualizer ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* HUD Reticle Cursor Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between sm:col-span-2">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        Infographic HUD Reticle Cursor Tracker
                      </div>
                      <p className="text-[10px] text-slate-400">Cybernetic interactive mouse cursor with laser crosshair & coordinate tracking</p>
                    </div>
                    <button
                      onClick={onToggleCursor}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        cursorEnabled
                          ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cursorEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  onChangeConfig({
                    preset: 'cyber-blue',
                    particlesEnabled: true,
                    particleDensity: 'MEDIUM',
                    videoScanlines: true,
                    videoRecHud: true,
                    spectrumVisualizer: true,
                    cornerBrackets: true,
                    cyberGlow: true,
                    gridCoordinates: true,
                    themeHue: 0
                  });
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono border border-slate-700 transition flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>

              <button
                onClick={() => setShowThemeModal(false)}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 transition cursor-pointer"
              >
                Apply &amp; Close
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
