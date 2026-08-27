import React, { useEffect, useState, useRef } from 'react';

interface InfographicCursorProps {
  enabled?: boolean;
}

export const InfographicCursor: React.FC<InfographicCursorProps> = ({ enabled = true }) => {
  const [cursorState, setCursorState] = useState<{
    x: number;
    y: number;
    targetType: string;
    targetName: string;
    isHovering: boolean;
    isClicking: boolean;
    isVisible: boolean;
  }>({
    x: -100,
    y: -100,
    targetType: 'IDLE',
    targetName: 'SYSTEM READY',
    isHovering: false,
    isClicking: false,
    isVisible: false
  });

  const mousePos = useRef({ x: -100, y: -100 });
  const smoothPos = useRef({ x: -100, y: -100 });
  const rippleQueue = useRef<{ id: number; x: number; y: number; created: number }[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const animFrameId = useRef<number | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    // Check if on touch device
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch && window.innerWidth < 768) return;

    let isVisible = false;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) {
        isVisible = true;
        setCursorState(prev => ({ ...prev, isVisible: true }));
      }

      // Check hovered element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest('button, a, input, select, textarea, [role="button"], [data-active], .ticker-item, [id^="nav-"], [id^="btn-"]');
        const card = target.closest('.rounded-xl, .rounded-2xl, aside, header, table, tr');

        if (interactive) {
          const text = (interactive.textContent || '').trim().slice(0, 18) || interactive.getAttribute('title') || interactive.getAttribute('id') || 'INTERACTIVE';
          const type = interactive.tagName.toLowerCase() === 'input' ? 'INPUT FIELD' :
                       interactive.tagName.toLowerCase() === 'select' ? 'SELECT MENU' :
                       interactive.tagName.toLowerCase() === 'button' ? 'ACTION CMD' : 'NAV LINK';
          
          setCursorState(prev => ({
            ...prev,
            isHovering: true,
            targetType: type,
            targetName: text.toUpperCase()
          }));
        } else if (card) {
          const cardId = card.getAttribute('id') || 'MODULE CARD';
          setCursorState(prev => ({
            ...prev,
            isHovering: false,
            targetType: 'MONITOR',
            targetName: cardId.replace('-root', '').toUpperCase()
          }));
        } else {
          setCursorState(prev => ({
            ...prev,
            isHovering: false,
            targetType: 'STANDBY',
            targetName: 'NOC SCAN'
          }));
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setCursorState(prev => ({ ...prev, isClicking: true }));
      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
        created: Date.now()
      };
      rippleQueue.current.push(newRipple);
      setRipples([...rippleQueue.current]);

      setTimeout(() => {
        rippleQueue.current = rippleQueue.current.filter(r => r.id !== newRipple.id);
        setRipples([...rippleQueue.current]);
      }, 600);
    };

    const handleMouseUp = () => {
      setCursorState(prev => ({ ...prev, isClicking: false }));
    };

    const handleMouseLeave = () => {
      isVisible = false;
      setCursorState(prev => ({ ...prev, isVisible: false }));
    };

    const handleMouseEnter = () => {
      isVisible = true;
      setCursorState(prev => ({ ...prev, isVisible: true }));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Render loop for ultra high performance hardware-accelerated 60-120fps tracking
    let lastRender = 0;
    const renderLoop = (time: number) => {
      // Lerp smooth trailing ring
      const factor = 0.22;
      smoothPos.current.x += (mousePos.current.x - smoothPos.current.x) * factor;
      smoothPos.current.y += (mousePos.current.y - smoothPos.current.y) * factor;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${smoothPos.current.x}px, ${smoothPos.current.y}px, 0)`;
      }

      if (textRef.current && (time - lastRender > 40)) {
        // Update coordinate HUD text at ~25fps to save CPU while looking like a high-tech scanner
        lastRender = time;
        const xCoord = Math.round(mousePos.current.x).toString().padStart(4, '0');
        const yCoord = Math.round(mousePos.current.y).toString().padStart(4, '0');
        const coordSpan = textRef.current.querySelector('#hud-coords');
        if (coordSpan) {
          coordSpan.textContent = `X:${xCoord} Y:${yCoord}`;
        }
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [enabled]);

  if (!enabled || !cursorState.isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden select-none" aria-hidden="true">
      {/* Click Ripples / Shockwaves */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute pointer-events-none rounded-full border-2 border-pink-500/80 animate-ping shadow-[0_0_20px_#ec4899]"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: '44px',
            height: '44px',
            marginLeft: '-22px',
            marginTop: '-22px',
            animationDuration: '0.6s'
          }}
        />
      ))}

      {/* Lag-free Precision Reticle Dot & Crosshair */}
      <div
        ref={cursorRef}
        className="absolute top-0 left-0 -ml-[10px] -mt-[10px] w-5 h-5 flex items-center justify-center will-change-transform pointer-events-none"
      >
        {/* Central Glowing Core */}
        <div className={`w-2 h-2 rounded-full transition-all duration-150 ${
          cursorState.isHovering
            ? 'bg-pink-500 shadow-[0_0_12px_#ec4899] scale-125 ring-2 ring-pink-300'
            : cursorState.isClicking
            ? 'bg-rose-400 scale-75 shadow-[0_0_16px_#f43f5e]'
            : 'bg-cyan-400 shadow-[0_0_10px_#06b6d4] ring-1 ring-cyan-200'
        }`} />

        {/* Micro Crosshair Ticks */}
        <div className="absolute w-3.5 h-[1px] bg-cyan-400/80 -left-1.5" />
        <div className="absolute w-3.5 h-[1px] bg-cyan-400/80 -right-1.5" />
        <div className="absolute h-3.5 w-[1px] bg-cyan-400/80 -top-1.5" />
        <div className="absolute h-3.5 w-[1px] bg-cyan-400/80 -bottom-1.5" />
      </div>

      {/* Smooth Holographic Radar Ring & Infographic HUD Follower */}
      <div
        ref={trailRef}
        className="absolute top-0 left-0 -ml-[24px] -mt-[24px] will-change-transform pointer-events-none flex items-center justify-center"
      >
        {/* Outer Orbital Ring / Radar Scanner */}
        <div className={`relative rounded-full border transition-all duration-200 flex items-center justify-center ${
          cursorState.isHovering
            ? 'w-16 h-16 -ml-2 -mt-2 border-pink-500/90 shadow-[0_0_24px_rgba(236,72,153,0.6)] bg-pink-500/10'
            : cursorState.isClicking
            ? 'w-10 h-10 border-rose-400/90 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.7)]'
            : 'w-12 h-12 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-cyan-500/5'
        }`}>
          {/* Rotating Radar Sweep Segment */}
          <div className="absolute inset-0 rounded-full border-t-2 border-r-transparent border-b-transparent border-l-transparent border-cyan-300 animate-spin" style={{ animationDuration: '3s' }} />

          {/* Cyber Corner Brackets when locked on an element */}
          {cursorState.isHovering && (
            <>
              <div className="absolute -top-1.5 -left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-pink-400" />
              <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-pink-400" />
              <div className="absolute -bottom-1.5 -left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-pink-400" />
              <div className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-pink-400" />
            </>
          )}

          {/* Compass 4-Axis Cardinal Marks */}
          <div className="absolute -top-1 w-1 h-1 bg-cyan-300 rounded-full" />
          <div className="absolute -bottom-1 w-1 h-1 bg-cyan-300 rounded-full" />
          <div className="absolute -left-1 w-1 h-1 bg-cyan-300 rounded-full" />
          <div className="absolute -right-1 w-1 h-1 bg-cyan-300 rounded-full" />
        </div>

        {/* Infographic Telemetry Floating Badge */}
        <div
          ref={textRef}
          className="absolute left-14 top-1.5 flex flex-col gap-0.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-cyan-500/40 shadow-xl shadow-cyan-950/60 min-w-[120px]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[8px] font-mono font-black text-cyan-300 tracking-wider">
              <span className={`w-1.5 h-1.5 rounded-full ${cursorState.isHovering ? 'bg-pink-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
              {cursorState.targetType}
            </span>
            <span id="hud-coords" className="text-[8px] font-mono text-slate-400 font-bold tracking-tighter">
              X:0000 Y:0000
            </span>
          </div>

          <div className="text-[9px] font-mono font-bold text-white tracking-wide truncate max-w-[130px]">
            {cursorState.targetName}
          </div>

          {cursorState.isHovering && (
            <div className="text-[7px] font-mono text-pink-400 font-extrabold tracking-widest uppercase flex items-center gap-1 border-t border-pink-500/30 pt-0.5 mt-0.5">
              <span>⚡ TARGET ACQUIRED</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfographicCursor;
