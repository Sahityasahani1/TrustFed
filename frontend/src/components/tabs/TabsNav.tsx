import React from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsNavProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'main' | 'sub';
  className?: string;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'sub',
  className = '',
}) => {
  return (
    <div
      className={`relative flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#060D1E]/90 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 z-10 cursor-pointer ${
              isActive
                ? 'text-white font-black drop-shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {/* Animated Bright Blue & Green 3D Pill Background */}
            {isActive && (
              <motion.div
                layoutId="activeSubTabPill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 border border-cyan-300/60 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}

            {/* Icon */}
            {tab.icon && (
              <span className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110 text-white' : 'opacity-80 text-cyan-400'}`}>
                {tab.icon}
              </span>
            )}

            {/* Label */}
            <span className="relative z-10">{tab.label}</span>

            {/* Badge */}
            {tab.badge !== undefined && (
              <span
                className={`relative z-10 ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded-full font-bold ${
                  isActive
                    ? 'bg-white/25 text-white border border-white/40'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
