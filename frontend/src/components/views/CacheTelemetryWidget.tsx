import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Cpu, 
  Server, 
  Trash2, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  Layers, 
  Activity,
  HardDrive
} from 'lucide-react';
import { getCacheStats, clearExplanationCache } from '../../risk_api_client';
import { useToast } from '../common/ToastNotification';

export interface CacheStatsData {
  tier1_memory_entries: number;
  tier1_memory_capacity: number;
  tier1_memory_hits: number;
  tier2_redis_connected: boolean;
  tier2_redis_hits: number;
  total_misses: number;
  total_sets: number;
  hit_ratio: number;
  cache_ttl_seconds: number;
}

export interface CacheTelemetryWidgetProps {
  className?: string;
  compact?: boolean;
}

export const CacheTelemetryWidget: React.FC<CacheTelemetryWidgetProps> = ({ 
  className = '',
  compact = false 
}) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<CacheStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [flushing, setFlushing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getCacheStats();
      setStats(data);
    } catch (err) {
      // Backend may be starting or offline
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setFlushing(true);
    try {
      await clearExplanationCache();
      toast({
        title: 'Semantic Cache Purged',
        description: 'L1 in-memory cache and L2 Redis explanation keys flushed successfully.',
        type: 'success',
      });
      await fetchStats();
    } catch (err: any) {
      toast({
        title: 'Cache Flush Failed',
        description: err?.message || 'Unable to flush cache',
        type: 'warning',
      });
    } finally {
      setFlushing(false);
    }
  };

  const hitPercent = stats ? (stats.hit_ratio * 100).toFixed(1) : '0.0';
  const totalLookups = stats ? (stats.tier1_memory_hits + stats.tier2_redis_hits + stats.total_misses) : 0;
  const l1UsagePct = stats && stats.tier1_memory_capacity > 0 
    ? ((stats.tier1_memory_entries / stats.tier1_memory_capacity) * 100).toFixed(0) 
    : '0';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/10 text-xs font-mono ${className}`}>
        <Database className="w-3.5 h-3.5 text-cyan-500" />
        <span className="text-zinc-600 dark:text-zinc-400">Cache Hit:</span>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{hitPercent}%</span>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className="text-zinc-500 dark:text-zinc-400">L1: {stats?.tier1_memory_entries || 0}</span>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span className={`inline-flex items-center gap-1 text-[11px] ${stats?.tier2_redis_connected ? 'text-emerald-500' : 'text-zinc-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${stats?.tier2_redis_connected ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
          {stats?.tier2_redis_connected ? 'Redis' : 'LRU'}
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              Two-Tier Distributed Semantic Cache
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                Phase 2
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">
              SHAP Fingerprinted Explanations & High-Frequency Inference Caching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            title="Refresh cache metrics"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClearCache}
            disabled={flushing}
            title="Flush in-memory and Redis caches"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Flush Cache</span>
          </button>
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
        {/* Metric 1: Overall Hit Ratio */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Hit Ratio</span>
            <Zap className="w-3 h-3 text-cyan-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {hitPercent}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({totalLookups} calls)
            </span>
          </div>
          <div className="mt-2 w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-500" 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Number(hitPercent))}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Metric 2: Tier 1 (L1 Memory LRU) */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Tier 1 In-Memory LRU</span>
            <Cpu className="w-3 h-3 text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {stats?.tier1_memory_entries || 0}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              / {stats?.tier1_memory_capacity || 1024} ({l1UsagePct}%)
            </span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
            {stats?.tier1_memory_hits || 0} L1 hits (sub-0.1ms)
          </div>
        </div>

        {/* Metric 3: Tier 2 (L2 Redis Store) */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Tier 2 Redis Store</span>
            <Server className={`w-3 h-3 ${stats?.tier2_redis_connected ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${stats?.tier2_redis_connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {stats?.tier2_redis_connected ? 'Active Connected' : 'In-Memory Fallback'}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
            {stats?.tier2_redis_hits || 0} Redis hits • TTL {stats?.cache_ttl_seconds || 3600}s
          </div>
        </div>

        {/* Metric 4: Sets & Misses */}
        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Cache Activity</span>
            <HardDrive className="w-3 h-3 text-indigo-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
              Sets: <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats?.total_sets || 0}</span>
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
              Misses: <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats?.total_misses || 0}</span>
            </span>
          </div>
          <div className="mt-1 text-[10px] text-zinc-400 font-mono truncate">
            Canonical SHA-256 fingerprinting
          </div>
        </div>
      </div>
    </div>
  );
};
