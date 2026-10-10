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
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/10 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors z-10 cursor-pointer select-none ${
              isActive
                ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeSubTabPill"
                className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-800 shadow-xs border border-zinc-200/70 dark:border-zinc-700/60"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            {tab.icon && (
              <span className={`relative z-10 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {tab.icon}
              </span>
            )}

            <span className="relative z-10">{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={`relative z-10 ml-1 px-1.5 py-0.2 text-[10px] font-mono rounded font-medium ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                    : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
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
