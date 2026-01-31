import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64: string) => void;
  initialMode?: 'camera' | 'album';
}

export const AvatarEditor: React.FC<AvatarEditorProps> = ({ isOpen, onClose, onSave, initialMode }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoEnhance, setAutoEnhance] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setAutoEnhance(false);
      // Small timeout to allow render before clicking
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
        }
      }, 100);
    }
  }, [isOpen, initialMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const img = new Image();
          img.src = ev.target.result as string;
          img.onload = () => {
            imgRef.current = img;
            setImageSrc(ev.target!.result as string);
            // Fit image to canvas initially
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          };
        }
      };
      reader.readAsDataURL(file);
    } else if (!imageSrc) {
      onClose(); // Close if canceled without image
    }
  };

  // Draw loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background fill
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = imgRef.current;
    const size = 300; // Canvas logic size
    
    // Calculate aspect ratio to fit
    const scale = Math.max(size / img.width, size / img.height) * zoom;
    const x = (size - img.width * scale) / 2 + offset.x;
    const y = (size - img.height * scale) / 2 + offset.y;

    ctx.save();
    
    // Circular Clip
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Auto Enhance Filter
    if (autoEnhance) {
      ctx.filter = 'contrast(1.15) brightness(1.1) saturate(1.1)';
    }

    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    ctx.restore();

    // Draw Border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();

  }, [zoom, offset, autoEnhance, imageSrc]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse/Touch Handlers
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (isDragging) {
      setOffset({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    }
  };

  const handleEnd = () => setIsDragging(false);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      // 0.8 quality for compression < 100KB typically
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      onSave(base64);
      onClose();
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-[90%] max-w-md p-6 shadow-2xl overflow-hidden flex flex-col items-center">
        <h3 className="text-xl font-bold mb-4 text-gray-800">调整头像</h3>
        
        {/* Hidden Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*"
          capture={initialMode === 'camera' ? 'user' : undefined}
          className="hidden"
          onChange={handleFileChange}
        />

        <div 
          className="relative w-[300px] h-[300px] bg-gray-100 rounded-full shadow-inner overflow-hidden cursor-move touch-none"
          ref={containerRef}
          onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
        >
          <canvas 
            ref={canvasRef} 
            width={300} 
            height={300} 
            className="w-full h-full pointer-events-none"
          />
        </div>

        <div className="w-full mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">缩放</span>
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <button 
              onClick={() => setAutoEnhance(!autoEnhance)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${autoEnhance ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-100 text-gray-600 border border-transparent'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              自动增强
            </button>
            
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">取消</button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all hover:scale-105"
              >
                确认使用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};