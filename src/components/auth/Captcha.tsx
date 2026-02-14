import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CaptchaProps {
  onRefresh: (code: string) => void;
  height?: number;
  width?: number;
}

export const Captcha: React.FC<CaptchaProps> = ({ 
  onRefresh, 
  height = 40, 
  width = 100 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const randomColor = (min: number, max: number) => {
    const r = Math.floor(Math.random() * (max - min) + min);
    const g = Math.floor(Math.random() * (max - min) + min);
    const b = Math.floor(Math.random() * (max - min) + min);
    return `rgb(${r},${g},${b})`;
  };

  const drawCaptcha = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = randomColor(200, 240);
    ctx.fillRect(0, 0, width, height);

    // Random Characters
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let newCode = '';
    
    for (let i = 0; i < 4; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      newCode += char;
      
      const fontSize = Math.floor(Math.random() * 10) + 20;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = randomColor(50, 160);
      ctx.textBaseline = 'middle';
      
      const x = (width / 4) * i + 10;
      const y = height / 2;
      const angle = (Math.random() - 0.5) * 0.5; // -0.25 to 0.25 radians
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }

    // Interference Lines
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = randomColor(100, 200);
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Interference Dots
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = randomColor(0, 255);
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    onRefresh(newCode);
  }, [height, width, onRefresh]);

  useEffect(() => {
    drawCaptcha();
  }, []); // Run once on mount

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={drawCaptcha}
      className="cursor-pointer rounded-md shadow-sm hover:opacity-90 transition-opacity"
      title="点击刷新验证码"
    />
  );
};
