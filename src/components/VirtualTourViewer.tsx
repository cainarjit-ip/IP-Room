import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VirtualTourScene, VirtualTourHotspot, Language } from '../types';
import {
  RotateCcw,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  ChevronRight,
  Sparkles,
  Info,
  Smartphone
} from 'lucide-react';

interface VirtualTourViewerProps {
  scenes: VirtualTourScene[];
  initialSceneId?: string;
  language: Language;
  onClose?: () => void;
}

export const VirtualTourViewer: React.FC<VirtualTourViewerProps> = ({
  scenes,
  initialSceneId,
  language,
  onClose,
}) => {
  const [currentSceneId, setCurrentSceneId] = useState<string>(
    initialSceneId || scenes[0]?.id || ''
  );
  
  // Camera state
  const [yaw, setYaw] = useState(0); // Horizontal angle in degrees (-180 to 180 or continuous)
  const [pitch, setPitch] = useState(0); // Vertical angle in degrees (-50 to 50)
  const [zoom, setZoom] = useState(1); // 0.8 to 2.0
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);

  // Interaction tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({
    x: 0,
    y: 0,
    yaw: 0,
    pitch: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const currentScene = scenes.find(s => s.id === currentSceneId) || scenes[0];

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoRotate || isDragging) return;

    const interval = setInterval(() => {
      setYaw(prev => (prev + 0.15) % 360);
    }, 30);

    return () => clearInterval(interval);
  }, [isAutoRotate, isDragging]);

  // Touch / Mouse event handlers for 360 degree pan
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setIsAutoRotate(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw,
      pitch,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Sensitivity factor
    const sensitivity = 0.25 / zoom;
    const newYaw = (dragStartRef.current.yaw - deltaX * sensitivity) % 360;
    const newPitch = Math.max(-50, Math.min(50, dragStartRef.current.pitch + deltaY * sensitivity));

    setYaw(newYaw);
    setPitch(newPitch);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if not captured
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.8, Math.min(2.2, prev + zoomFactor)));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Switch scene with smooth transition
  const handleJumpToScene = (sceneId: string) => {
    setCurrentSceneId(sceneId);
    setPitch(0);
    // Maintain natural heading
  };

  if (!currentScene) {
    return (
      <div className="p-8 text-center text-slate-500 bg-slate-900 text-white rounded-xl">
        No 360° virtual tour scenes configured.
      </div>
    );
  }

  // Calculate background position to simulate equirectangular panorama projection
  const normalizedYaw = ((yaw % 360) + 360) % 360;
  const bgPosX = `${(normalizedYaw / 360) * 100}%`;
  const bgPosY = `${50 + (pitch / 50) * 25}%`;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-slate-950 select-none ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'rounded-2xl aspect-[16/9] min-h-[380px] max-h-[560px]'
      }`}
      onWheel={handleWheel}
    >
      {/* 360 Panoramic Surface */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-75 relative overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          backgroundImage: `url(${currentScene.panoramaUrl})`,
          backgroundSize: `${350 * zoom}% auto`,
          backgroundPosition: `${bgPosX} ${bgPosY}`,
          backgroundRepeat: 'repeat-x',
          filter: 'contrast(106%) saturate(108%)'
        }}
      >
        {/* Subdued ambient vignette for realistic architectural depth */}
        <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/40 pointer-events-none" />

        {/* Hotspots placed in 360 field */}
        {currentScene.hotspots.map(hotspot => {
          // Calculate relative screen position based on current yaw and pitch
          const relYaw = ((hotspot.yaw - normalizedYaw + 540) % 360) - 180;
          const isVisible = Math.abs(relYaw) < 85;

          if (!isVisible) return null;

          // Project to screen coordinate percentages
          const leftPercent = 50 + (relYaw / 90) * 45;
          const topPercent = 50 - ((hotspot.pitch - pitch) / 45) * 35;

          return (
            <div
              key={hotspot.id}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-150 hover:scale-110"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleJumpToScene(hotspot.targetSceneId);
              }}
            >
              <div className="flex flex-col items-center group">
                <div className="w-10 h-10 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-emerald-400/40 animate-pulse">
                  <Navigation className="w-4 h-4 transform rotate-45" />
                </div>
                <div className="mt-1 px-2.5 py-1 bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold rounded-md shadow-md border border-white/20 whitespace-nowrap opacity-90 group-hover:opacity-100 flex items-center gap-1">
                  <span>{language === 'np' ? hotspot.titleNp || hotspot.title : hotspot.title}</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Overlay: Current Scene Title & Compass HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '20s' }} />
          <div>
            <h4 className="text-xs font-bold leading-tight">
              {language === 'np' ? currentScene.titleNp : currentScene.title}
            </h4>
            <span className="text-[10px] text-slate-300">
              360° Interactive View · {currentScene.hotspots.length} Linked Areas
            </span>
          </div>
        </div>

        {/* View Controls: Zoom, Auto-rotate, Fullscreen */}
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(2.2, prev + 0.2))}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.8, prev - 0.2))}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`p-1.5 rounded-lg transition ${
              isAutoRotate ? 'text-emerald-400 bg-white/10' : 'text-slate-300 hover:text-white'
            }`}
            title="Toggle Auto Pan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Scene Carousel Strip */}
      <div className="absolute bottom-3 left-4 right-4 z-30 pointer-events-none">
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 pointer-events-auto">
          {scenes.map(scene => {
            const isSelected = scene.id === currentScene.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleJumpToScene(scene.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md transition-all text-xs font-semibold shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg scale-105'
                    : 'bg-black/60 text-slate-200 border-white/10 hover:bg-black/80 hover:text-white'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-md bg-cover bg-center border border-white/30 shrink-0"
                  style={{ backgroundImage: `url(${scene.panoramaUrl})` }}
                />
                <span>{language === 'np' ? scene.titleNp : scene.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Hint Banner */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md text-slate-300 text-[10px] px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
          <Smartphone className="w-3 h-3 text-emerald-400" />
          <span>Drag screen to explore room 360° · Tap hotspots to move between rooms</span>
        </div>
      </div>
    </div>
  );
};
