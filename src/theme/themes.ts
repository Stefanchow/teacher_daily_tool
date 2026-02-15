export type ThemeType = 
  | 'default' 
  | 'memphis' 
  | 'cyberpunk' 
  | 'klein' 
  | 'morandi' 
  | 'bauhaus' 
  | 'dopamine'
  | 'movie_scifi'
  | 'movie_fantasy'
  | 'anime_ghibli'
  | 'anime_pastel'
  | 'game_pixel'
  | 'game_zelda';

export interface ThemeColors {
  '--bg-color': string;
  '--bg-image': string;
  '--card-bg': string;
  '--container-bg': string;
  '--sidebar-bg': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--primary-color': string;
  '--secondary-color': string;
  '--border-color': string;
  '--input-bg': string;
  '--button-bg': string;
  '--button-text': string;
  '--shadow-color': string;
  '--avatar-bg': string;
  '--glass-bg': string;
}

export interface Theme {
  label: string;
  colors: ThemeColors;
}

export const themes: Record<ThemeType, Theme> = {
  default: {
    label: '默认 (Default)',
    colors: {
      '--bg-color': '#f8fafc',
      '--bg-image': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#ffffff',
      '--sidebar-bg': '#f1f5f9',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--primary-color': '#6366f1',
      '--secondary-color': '#eef2ff',
      '--border-color': '#cbd5e1',
      '--input-bg': '#ffffff',
      '--button-bg': '#6366f1',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(99, 102, 241, 0.15)',
      '--avatar-bg': '#e0e7ff',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  memphis: {
    label: '孟菲斯 (Memphis)',
    colors: {
      '--bg-color': '#ecfdf5',
      '--bg-image': 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#f0fdf4',
      '--sidebar-bg': '#d1fae5',
      '--text-primary': '#064e3b',
      '--text-secondary': '#047857',
      '--primary-color': '#059669',
      '--secondary-color': '#d1fae5',
      '--border-color': '#6ee7b7',
      '--input-bg': '#ffffff',
      '--button-bg': '#059669',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(5, 150, 105, 0.16)',
      '--avatar-bg': '#a7f3d0',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  cyberpunk: {
    label: '赛博朋克 (Cyberpunk)',
    colors: {
      '--bg-color': '#020617',
      '--bg-image': 'linear-gradient(180deg, #020617 0%, #020617 40%, #0b1120 100%)',
      '--card-bg': '#0b1120',
      '--container-bg': '#1e293b',
      '--sidebar-bg': '#0f172a',
      '--text-primary': '#e5e7eb',
      '--text-secondary': '#9ca3af',
      '--primary-color': '#22d3ee',
      '--secondary-color': '#1d4ed8',
      '--border-color': '#1f2937',
      '--input-bg': '#020617',
      '--button-bg': '#22d3ee',
      '--button-text': '#020617',
      '--shadow-color': 'rgba(15, 23, 42, 0.7)',
      '--avatar-bg': '#1e293b',
      '--glass-bg': 'rgba(11, 17, 32, 0.8)',
    },
  },
  klein: {
    label: '克莱因蓝 (Klein Blue)',
    colors: {
      '--bg-color': '#edf2ff',
      '--bg-image': 'linear-gradient(to bottom, #edf2ff 0%, #dbe4ff 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#eff6ff',
      '--sidebar-bg': '#dbeafe',
      '--text-primary': '#1f2937',
      '--text-secondary': '#4b5563',
      '--primary-color': '#1d4ed8',
      '--secondary-color': '#e0e7ff',
      '--border-color': '#c7d2fe',
      '--input-bg': '#ffffff',
      '--button-bg': '#1d4ed8',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(37, 99, 235, 0.16)',
      '--avatar-bg': '#dbeafe',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  morandi: {
    label: '莫兰迪 (Morandi)',
    colors: {
      '--bg-color': '#f4ede6',
      '--bg-image': 'linear-gradient(to top, #f4ede6 0%, #faf6f1 100%)',
      '--card-bg': '#fcfbf9',
      '--container-bg': '#fafaf9',
      '--sidebar-bg': '#f5f5f4',
      '--text-primary': '#3f3a37',
      '--text-secondary': '#7a6f69',
      '--primary-color': '#8b7a6a',
      '--secondary-color': '#e2d5c8',
      '--border-color': '#d3c4b7',
      '--input-bg': '#ffffff',
      '--button-bg': '#8b7a6a',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(139, 122, 106, 0.16)',
      '--avatar-bg': '#e7e5e4',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  bauhaus: {
    label: '包豪斯 (Bauhaus)',
    colors: {
      '--bg-color': '#f5f5f5',
      '--bg-image': 'linear-gradient(90deg, #f5f5f5 0%, #e5e7eb 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#fafafa',
      '--sidebar-bg': '#f5f5f5',
      '--text-primary': '#111827',
      '--text-secondary': '#4b5563',
      '--primary-color': '#b91c1c',
      '--secondary-color': '#fee2e2',
      '--border-color': '#d1d5db',
      '--input-bg': '#ffffff',
      '--button-bg': '#b91c1c',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(185, 28, 28, 0.16)',
      '--avatar-bg': '#fee2e2',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  dopamine: {
    label: '多巴胺 (Dopamine)',
    colors: {
      '--bg-color': '#fff7ed',
      '--bg-image': 'linear-gradient(120deg, #fff7ed 0%, #ffedd5 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#fff7ed',
      '--sidebar-bg': '#ffedd5',
      '--text-primary': '#7c2d12',
      '--text-secondary': '#9a3412',
      '--primary-color': '#f97316',
      '--secondary-color': '#ffedd5',
      '--border-color': '#fed7aa',
      '--input-bg': '#ffffff',
      '--button-bg': '#ea580c',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(249, 115, 22, 0.18)',
      '--avatar-bg': '#ffedd5',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  movie_scifi: {
    label: '科幻电影 (Sci-Fi)',
    colors: {
      '--bg-color': '#020617',
      '--bg-image': 'radial-gradient(circle, #020617 0%, #0b1120 100%)',
      '--card-bg': '#0b1120',
      '--container-bg': '#0f172a',
      '--sidebar-bg': '#020617',
      '--text-primary': '#e5f3ff',
      '--text-secondary': '#93c5fd',
      '--primary-color': '#38bdf8',
      '--secondary-color': '#1d4ed8',
      '--border-color': '#1e3a8a',
      '--input-bg': '#020617',
      '--button-bg': '#0ea5e9',
      '--button-text': '#020617',
      '--shadow-color': 'rgba(15, 23, 42, 0.7)',
      '--avatar-bg': '#0f172a',
      '--glass-bg': 'rgba(11, 17, 32, 0.8)',
    },
  },
  movie_fantasy: {
    label: '奇幻史诗 (Fantasy)',
    colors: {
      '--bg-color': '#f5f3ff',
      '--bg-image': 'linear-gradient(to bottom right, #f5f3ff 0%, #ede9fe 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#faf5ff',
      '--sidebar-bg': '#f3e8ff',
      '--text-primary': '#312e81',
      '--text-secondary': '#4c1d95',
      '--primary-color': '#6366f1',
      '--secondary-color': '#e0e7ff',
      '--border-color': '#c4b5fd',
      '--input-bg': '#ffffff',
      '--button-bg': '#6366f1',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(99, 102, 241, 0.18)',
      '--avatar-bg': '#f3e8ff',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  anime_ghibli: {
    label: '吉卜力 (Ghibli)',
    colors: {
      '--bg-color': '#f0fdf4',
      '--bg-image': 'linear-gradient(to top, #dcfce7 0%, #f0fdf4 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#f0fdf4',
      '--sidebar-bg': '#dcfce7',
      '--text-primary': '#14532d',
      '--text-secondary': '#166534',
      '--primary-color': '#22c55e',
      '--secondary-color': '#bbf7d0',
      '--border-color': '#bbf7d0',
      '--input-bg': '#ffffff',
      '--button-bg': '#16a34a',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(34, 197, 94, 0.18)',
      '--avatar-bg': '#dcfce7',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  anime_pastel: {
    label: '动漫粉彩 (Anime Pastel)',
    colors: {
      '--bg-color': '#fdf2ff',
      '--bg-image': 'linear-gradient(to right, #fdf2ff 0%, #fce7f3 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#fdf2f8',
      '--sidebar-bg': '#fce7f3',
      '--text-primary': '#6b21a8',
      '--text-secondary': '#a21caf',
      '--primary-color': '#ec4899',
      '--secondary-color': '#fce7f3',
      '--border-color': '#f9a8d4',
      '--input-bg': '#ffffff',
      '--button-bg': '#ec4899',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(236, 72, 153, 0.18)',
      '--avatar-bg': '#fce7f3',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
  game_pixel: {
    label: '像素复古 (8-Bit)',
    colors: {
      '--bg-color': '#020617',
      '--bg-image': 'repeating-linear-gradient(0deg, #020617, #020617 2px, #111827 2px, #111827 4px)',
      '--card-bg': '#111827',
      '--container-bg': '#111827',
      '--sidebar-bg': '#030712',
      '--text-primary': '#e5e7eb',
      '--text-secondary': '#9ca3af',
      '--primary-color': '#f97316',
      '--secondary-color': '#22c55e',
      '--border-color': '#4b5563',
      '--input-bg': '#020617',
      '--button-bg': '#22c55e',
      '--button-text': '#020617',
      '--shadow-color': 'rgba(15, 23, 42, 0.7)',
      '--avatar-bg': '#1f2937',
      '--glass-bg': 'rgba(11, 17, 32, 0.8)',
    },
  },
  game_zelda: {
    label: '海拉鲁 (Hyrule)',
    colors: {
      '--bg-color': '#f3fce9',
      '--bg-image': 'linear-gradient(135deg, #f3fce9 0%, #e3f2d6 100%)',
      '--card-bg': '#ffffff',
      '--container-bg': '#f7fee7',
      '--sidebar-bg': '#ecfccb',
      '--text-primary': '#365314',
      '--text-secondary': '#4d7c0f',
      '--primary-color': '#84cc16',
      '--secondary-color': '#d9f99d',
      '--border-color': '#bbf7d0',
      '--input-bg': '#ffffff',
      '--button-bg': '#65a30d',
      '--button-text': '#ffffff',
      '--shadow-color': 'rgba(101, 163, 13, 0.18)',
      '--avatar-bg': '#ecfccb',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
    },
  },
};

// Helper to get current week number (1-52)
export const getWeekNumber = (): number => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return week;
};

// Get a theme with weekly variations applied (e.g., rotating gradient angle)
export const getThemeWithWeeklyVariation = (theme: Theme): Theme => {
  const weekNum = getWeekNumber();
  const rotation = (weekNum * 45) % 360; // Rotate 45 degrees per week
  
  // Clone the theme to avoid mutating the original
  const newTheme = { ...theme, colors: { ...theme.colors } };
  
  const scheme = getThemeByWeek();
  const c = scheme.colors;
  // Keep theme's own background gradient; do not override with weekly scheme.
  // Weekly variation only blends accent colors, avoiding breaking theme gradients.
  const blend = (hexA: string, hexB: string, alpha: number) => {
    const parse = (h: string) => {
      const s = h.replace('#', '');
      const r = parseInt(s.length === 3 ? s[0] + s[0] : s.substring(0, 2), 16);
      const g = parseInt(s.length === 3 ? s[1] + s[1] : s.substring(2, 4), 16);
      const b = parseInt(s.length === 3 ? s[2] + s[2] : s.substring(4, 6), 16);
      return { r, g, b };
    };
    const a = parse(hexA);
    const b = parse(hexB);
    const mix = (x: number, y: number) => Math.round(x * (1 - alpha) + y * alpha);
    const r = mix(a.r, b.r);
    const g = mix(a.g, b.g);
    const bl = mix(a.b, b.b);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
  };
  const pPick = c[weekNum % c.length];
  const sPick = c[(weekNum + 1) % c.length];
  newTheme.colors['--primary-color'] = blend(newTheme.colors['--primary-color'], pPick, 0.35);
  newTheme.colors['--secondary-color'] = blend(newTheme.colors['--secondary-color'], sPick, 0.35);
  newTheme.colors['--button-bg'] = blend(newTheme.colors['--button-bg'], pPick, 0.35);
  newTheme.colors['--card-bg'] = blend(newTheme.colors['--card-bg'], sPick, 0.12);
  newTheme.colors['--text-secondary'] = blend(newTheme.colors['--text-secondary'], sPick, 0.15);
  newTheme.colors['--avatar-bg'] = blend(newTheme.colors['--avatar-bg'], sPick, 0.25);
  const toRgb = (hex: string) => {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    return `${r}, ${g}, ${b}`;
  };
  const bg = newTheme.colors['--bg-color'] || '#ffffff';
  const p = newTheme.colors['--primary-color'] || '#6366f1';
  const isLight = (() => {
    const h = bg.replace('#','');
    const r = parseInt(h.substring(0,2),16);
    const g = parseInt(h.substring(2,4),16);
    const b = parseInt(h.substring(4,6),16);
    const yiq = (r*299 + g*587 + b*114)/1000;
    return yiq >= 140;
  })();
  const alpha = isLight ? 0.18 : 0.6;
  newTheme.colors['--shadow-color'] = `rgba(${toRgb(p)}, ${alpha})`;
  
  return newTheme;
};

export interface WeeklyThemeScheme {
  colors: string[];
  duration: string;
  lineColor: string;
}

export const weeklyThemeRegistry: WeeklyThemeScheme[] = [
  {
    colors: ['#8ec5fc', '#e0c3fc', '#a8edea', '#fed6e3'],
    duration: '20s',
    lineColor: 'rgba(255, 255, 255, 0.12)'
  },
  {
    colors: ['#00d2ff', '#3a7bd5', '#8ae9b0', '#ffd7d7'],
    duration: '22s',
    lineColor: 'rgba(0, 255, 255, 0.16)'
  },
  {
    colors: ['#fda085', '#f6d365', '#84fab0', '#8fd3f4'],
    duration: '24s',
    lineColor: 'rgba(255, 200, 150, 0.12)'
  },
  {
    colors: ['#a1c4fd', '#c2e9fb', '#d4fc79', '#96e6a1'],
    duration: '26s',
    lineColor: 'rgba(161, 196, 253, 0.14)'
  },
  {
    colors: ['#ff9a9e', '#fad0c4', '#fbc2eb', '#a18cd1'],
    duration: '28s',
    lineColor: 'rgba(250, 208, 196, 0.16)'
  }
];

export const getThemeByWeek = (date: Date = new Date()): WeeklyThemeScheme => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  const week = Math.ceil(day / 7);
  const index = week % weeklyThemeRegistry.length;
  return weeklyThemeRegistry[index];
};
