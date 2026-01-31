
/**
 * Helper to convert hex to rgba
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Helper to adjust brightness of a hex color
 * percent: -1.0 to 1.0 (negative = darker, positive = lighter)
 */
export const adjustBrightness = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * (percent * 100));
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

/**
 * Helper to determine if a color is light or dark
 * Returns true if the color is light (perceived brightness > 128)
 */
export const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // YIQ formula
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128;
};

/**
 * Extract average color from an image URL
 */
export const getAverageColor = (imgUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#ffffff');
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        
        for (let i = 0, n = data.length; i < n; i += 4) {
          r += data[i];
          g += data[i+1];
          b += data[i+2];
        }
        
        const count = data.length / 4;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        
        const toHex = (c: number) => {
          const hex = c.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        };
        
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      } catch (e) {
        console.error("Error extracting color", e);
        resolve('#ffffff');
      }
    };
    img.onerror = () => resolve('#ffffff');
  });
};

export const THEME_PRESETS = {
  purple: {
    sidebar: '#2e1a47', // Deep Violet
    inputBorder: '#3f3c95', // Deep Indigo
  },
  // Add other mappings as needed
};
