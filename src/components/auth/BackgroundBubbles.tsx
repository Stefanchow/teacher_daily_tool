import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface BackgroundBubblesProps {
  isFocused: boolean;
}

export const BackgroundBubbles: React.FC<BackgroundBubblesProps> = React.memo(({ isFocused }) => {
  // Generate random bubbles once
  const bubbles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      size: Math.random() * 120 + 40,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 15 + 10, // Normal duration: 10-25s
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <>
      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="absolute rounded-full bg-indigo-300/30 backdrop-blur-md"
          style={{
            width: bubble.size,
            height: bubble.size,
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
          }}
          animate={{
            y: [0, -120, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            // When focused, speed up (shorter duration). When blurred, slow down (original duration).
            // We divide the original duration by 4 when focused to simulate "acceleration".
            duration: isFocused ? bubble.duration / 4 : bubble.duration,
            repeat: Infinity,
            delay: bubble.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
});
