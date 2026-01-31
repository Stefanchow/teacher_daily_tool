import React, { useEffect, useState } from 'react';
import styles from './WaveLoading.module.css';

interface WaveLoadingProps {
  progress?: number;
  text?: string;
}

export const WaveLoading: React.FC<WaveLoadingProps> = ({ 
  progress = 0, 
  text = 'AI正在解析中...' 
}) => {
  const [localProgress, setLocalProgress] = useState(progress);

  // Simulate progress if not provided or static
  useEffect(() => {
    if (progress === 0) {
      const interval = setInterval(() => {
        setLocalProgress(prev => {
          if (prev >= 95) return prev;
          // Logarithmic-like slowdown
          const increment = Math.max(0.1, (95 - prev) / 20);
          return prev + increment;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setLocalProgress(progress);
    }
  }, [progress]);

  // Generate random particles
  const particles = Array.from({ length: 8 }).map((_, i) => ({
    left: `${Math.random() * 100}%`,
    animationDuration: `${2 + Math.random() * 3}s`,
    animationDelay: `${Math.random() * 2}s`,
    width: `${4 + Math.random() * 6}px`,
    height: `${4 + Math.random() * 6}px`
  }));

  return (
    <div className={styles.container}>
      <div className={styles.waveWrapper}>
        <svg className={`${styles.wave} ${styles.wave1}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
        <svg className={`${styles.wave} ${styles.wave2}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,170.7C96,181,192,203,288,202.7C384,203,480,181,576,181.3C672,181,768,203,864,224C960,245,1056,267,1152,256C1248,245,1344,203,1392,181.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
        <svg className={`${styles.wave} ${styles.wave3}`} viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,149.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>

      <div className={styles.particles}>
        {particles.map((style, i) => (
          <div key={i} className={styles.particle} style={style} />
        ))}
      </div>

      <div className={styles.content}>
        <span className={styles.percentage}>{Math.round(localProgress)}%</span>
        <span className={styles.text}>{text}</span>
      </div>
    </div>
  );
};
