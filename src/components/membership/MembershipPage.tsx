import React from 'react';

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PricingCard: React.FC<{
  title: string;
  price: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  isTrial?: boolean;
  themeColor: string;
}> = ({ title, price, period, features, isPopular, isTrial, themeColor }) => {
  return (
    <div 
      className={`
        relative flex flex-col p-6 rounded-[24px] bg-white transition-all duration-300
        ${isPopular ? 'shadow-xl scale-105 z-10' : 'shadow-sm hover:shadow-md'}
        ${isTrial ? 'border-2 border-dashed border-gray-300' : 'border-0'}
      `}
      style={{
        boxShadow: isPopular 
          ? `0 20px 40px -12px ${themeColor}40` 
          : '0 10px 40px rgba(0,0,0,0.04)'
      }}
    >
      {isPopular && (
        <div 
          className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-bold shadow-md"
          style={{ backgroundColor: themeColor }}
        >
          最受欢迎
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-500">{title}</h3>
        <div className="flex items-baseline mt-2">
          <span className="text-3xl font-bold text-gray-900">¥{price}</span>
          <span className="ml-1 text-gray-500">/{period}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-3 mb-6">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm text-gray-600">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        className={`
          w-full py-3 rounded-[16px] font-bold transition-all duration-300
          ${isPopular ? 'text-white transform hover:scale-102 active:scale-95' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}
        `}
        style={isPopular ? { backgroundColor: themeColor } : {}}
      >
        立即订阅
      </button>
    </div>
  );
};

export const MembershipPage: React.FC = () => {
  // Use CSS variable for theme color, but we need the actual hex for inline styles sometimes.
  // Or we can just use the variable in style prop.
  // Since we are inside the App, the body class determines the variables.
  // We can just use var(--primary-color)
  
  return (
    <div className="w-full h-full p-4 md:p-8 overflow-y-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          升级会员，解锁<span className="lightning-text mx-2">闪电生成</span>体验
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          获取 Gemini 2.0 Flash Lite 强劲算力，尽享 5 倍生成速度与专业级导出权限。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
        {/* 1元试用 */}
        <PricingCard
          title="体验卡"
          price="1"
          period="24小时"
          features={[
            "解锁组卷 PDF / Word 导出",
            "体验 Gemini 2.0 Flash Lite 引擎",
            "单次教案一键优化",
            "基础排版模版"
          ]}
          isTrial={true}
          themeColor="var(--primary-color)"
        />

        {/* 月度会员 */}
        <PricingCard
          title="月度会员"
          price="29"
          period="月"
          features={[
            "无限次 PDF / Word 导出",
            "无限次 Gemini 2.0 Flash Lite 生成",
            "5倍极速响应 (闪电通道)",
            "无限次教案一键深度优化",
            "解锁所有高级排版模版",
            "优先客服支持"
          ]}
          isPopular={true}
          themeColor="var(--primary-color)"
        />

        {/* 年度达人 */}
        <PricingCard
          title="年度达人"
          price="299"
          period="年"
          features={[
            "包含月度会员所有权益",
            "立省 ¥49 (相当于买10送2)",
            "专属年度学习报告",
            "新功能优先体验权",
            "专属教师社区徽章"
          ]}
          themeColor="var(--primary-color)"
        />
      </div>
      
      <div className="mt-16 text-center text-sm text-gray-400">
        <p>支付即代表同意《用户协议》与《隐私政策》</p>
        <p className="mt-2">所有的订阅都会自动续费，您可以随时在个人设置中取消。</p>
      </div>
    </div>
  );
};
