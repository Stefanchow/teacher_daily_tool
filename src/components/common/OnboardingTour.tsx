import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingTourProps {
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      target: 'sidebar-avatar',
      title: '个性化设置',
      content: '点击左侧边栏顶部的头像，可以修改您的头像、密码，以及查看您的灵感点数余额。',
      position: { top: '60px', left: '280px' },
      arrowRotation: 180
    },
    {
      target: 'left-panel',
      title: '开始创作',
      content: '在左侧输入课程主题、年级等信息，AI 将为您生成精彩的教案和活动。',
      position: { top: '200px', left: '380px' },
      arrowRotation: -135
    },
    {
      target: 'center',
      title: '准备就绪！',
      content: '您已经准备好开始使用了。点击下方按钮开始您的第一次备课吧！',
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      arrowRotation: 0,
      isLast: true
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  // Cute hand-drawn arrow SVG
  const ArrowSVG = ({ rotation }: { rotation: number }) => (
    <motion.svg
      width="60"
      height="60"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ rotate: rotation }}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <motion.path
        d="M10,90 Q50,10 90,50"
        stroke="#5A67D8"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="8 8"
      />
      <motion.path
        d="M70,40 L90,50 L80,70"
        stroke="#5A67D8"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key={step}
          className="absolute max-w-sm w-full"
          style={currentStep.position as any}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.4 }}
        >
          {/* Arrow (Hidden for last step centered modal) */}
          {!currentStep.isLast && (
            <div className={`absolute -left-16 top-0`}>
              <ArrowSVG rotation={currentStep.arrowRotation} />
            </div>
          )}

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-indigo-100 relative overflow-hidden">
            {/* Cute background decoration */}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-50 rounded-full blur-xl opacity-60"></div>
            <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-blue-50 rounded-full blur-xl opacity-60"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-[#5A67D8] font-bold text-sm">
                  {step + 1}/{steps.length}
                </span>
                <h3 className="text-xl font-bold text-gray-800">{currentStep.title}</h3>
              </div>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                {currentStep.content}
              </p>

              <div className="flex justify-end gap-3">
                 <button
                  onClick={onComplete}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  跳过
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-[#5A67D8] hover:bg-[#4c58c0] text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95"
                >
                  {currentStep.isLast ? '完成' : '下一步'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
