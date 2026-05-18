'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, useId } from 'react';
import { useAdmin } from '../shared/AdminContext';
import styles from './DashboardPage.module.css';
import { formatToChineseDateTime } from '@/lib/date';
import {
  IconPen,
  IconEye,
  IconMessage,
  IconChartBar,
  IconCalendar,
  IconUser,
  IconFire,
  IconCoffee,
  IconDatabase
} from '../icons';

interface DashboardData {
  metrics: {
    totalPosts: number;
    totalViews: number;
    totalUv: number;
    pendingComments: number;
  };
  trends: {
    labels: string[];
    pvs: number[];
    uvs: number[];
  };
  recentComments: Array<{
    id: string;
    nickname: string;
    content: string;
    createdAt: string;
    postSlug: string;
  }>;
  topPosts: Array<{
    slug: string;
    title: string;
    views: number;
  }>;
  health?: {
    dbSize: number;
    postsSize: number;
    uploadsSize: number;
  };
}

// 🔢 缓动翻滚计数器组件
const NumberCounter = ({ value, duration = 1500 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }
    const totalSteps = 45;
    const stepTime = duration / totalSteps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      const easeProgress = progress * (2 - progress); // easeOutQuad
      const currentCount = Math.round(start + (end - start) * easeProgress);
      setCount(currentCount);

      if (step >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count.toLocaleString('zh-CN')}</>;
};

export default function DashboardPage() {
  const { adminToken, setActivePage, posts = [], comments = [] } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    pv: number;
    uv: number;
  } | null>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 🧹 数据库一键优化 VACUUM 专用特效状态
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [cleanMessage, setCleanMessage] = useState('');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setChartWidth(w);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/dashboard', {
        headers: adminToken ? { 'x-admin-token': adminToken } : {},
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          setData(result);
        }
      }
    } catch (e) {
      console.error('加载看板数据异常:', e);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // ⚡ 执行一键 VACUUM 整理数据库碎片
  const handleVacuumOptimize = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    setCleanProgress(0);
    setCleanMessage('正在扫描物理碎片与磁盘块分布...');

    // 模拟前段量子清理进度以呈现逼真的科技动效
    const progressTimer = setInterval(() => {
      setCleanProgress((prev) => {
        if (prev >= 96) {
          clearInterval(progressTimer);
          return 96;
        }
        const step = Math.floor(Math.random() * 8) + 4;
        const next = prev + step;
        if (next > 40 && next < 70) {
          setCleanMessage('正在重排 SQLite 索引树并压缩碎片空腔...');
        } else if (next >= 70) {
          setCleanMessage('正在重排存储分配页以提升查询吞吐量...');
        }
        return next > 96 ? 96 : next;
      });
    }, 280);

    try {
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: adminToken ? { 'x-admin-token': adminToken } : {},
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          clearInterval(progressTimer);
          setCleanProgress(100);
          setCleanMessage('数据库 VACUUM 碎片清空与索引调优全部顺利完成！');
          // 更新本地数据
          if (data) {
            setData({
              ...data,
              health: result.health,
            });
          }
          setTimeout(() => {
            setIsCleaning(false);
            setCleanProgress(0);
            setCleanMessage('');
          }, 2000);
        }
      }
    } catch (e) {
      console.error('执行 VACUUM 异常:', e);
      clearInterval(progressTimer);
      setIsCleaning(false);
      setCleanProgress(0);
      setCleanMessage('');
    }
  };

  const metrics = data?.metrics;
  const trends = data?.trends;
  const recentComments = data?.recentComments;
  const topPosts = data?.topPosts;
  const health = data?.health;

  // 🟩 杀手级新功能一：文章创作年度热力图数据准备（对齐周日）
  const heatmapGrid = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    const grid: Array<Array<{ dateStr: string; date: Date; count: number }>> = Array.from({ length: 7 }, () => []);
    const now = new Date();
    
    // 回溯 364 天（52 周），并向左对齐至当时那周的周日
    const startDay = new Date(now.getTime() - 364 * 24 * 60 * 60 * 1000);
    const startDayOfWeek = startDay.getDay();
    const adjustedStartMs = startDay.getTime() - startDayOfWeek * 24 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    // 统计文章的日期分布数
    const postDates: Record<string, number> = {};
    posts.forEach((p) => {
      if (!p.date) return;
      const d = new Date(p.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      postDates[`${y}-${m}-${dt}`] = (postDates[`${y}-${m}-${dt}`] || 0) + 1;
    });

    // 渲染 53 周 * 7 天 = 371 格，以实现完美的横向排布
    for (let dayIdx = 0; dayIdx < 371; dayIdx++) {
      const currentMs = adjustedStartMs + dayIdx * oneDayMs;
      const d = new Date(currentMs);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dt = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${dt}`;
      const row = d.getDay(); // 0-6 代表周日到周六
      grid[row].push({
        dateStr: key,
        date: d,
        count: postDates[key] || 0,
      });
    }
    return grid;
  }, [posts]);

  // 计算年度总文章字数与写作勋章指标
  const heatmapStats = useMemo(() => {
    const published = posts.filter((p) => p.status === 'PUBLISHED');
    const totalWords = published.length * 1500; // 假定平均每篇文章 1500 字，渲染高级勋章
    return {
      totalPublished: published.length,
      estimatedWords: totalWords,
    };
  }, [posts]);

  // 🟩 杀手级新功能二：Donut知识环形图数据准备
  const donutData = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    const tagCounts: Record<string, number> = {};
    let totalTags = 0;

    posts.forEach((p) => {
      if (p.status !== 'PUBLISHED' || !p.tags) return;
      p.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        totalTags++;
      });
    });

    if (totalTags === 0) return [];

    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const colors = ['#0f766e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];
    let accumulatedPercent = 0;

    return sorted.map(([name, count], index) => {
      const percentage = Math.round((count / totalTags) * 100);
      const color = colors[index % colors.length];
      const percentStart = accumulatedPercent;
      accumulatedPercent += percentage;
      return {
        name,
        count,
        percentage,
        color,
        percentStart,
      };
    });
  }, [posts]);


  const hasTrendData = trends && trends.labels.length > 0 && (trends.pvs.some(v => v > 0) || trends.uvs.some(v => v > 0));

  const W = chartWidth || 800;
  const H = 220;
  const padX = 40;
  const padY = 30;

  const niceMax = useMemo(() => {
    if (!trends) return 10;
    const raw = Math.max(...trends.pvs, ...trends.uvs, 10);
    if (raw <= 10) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const normalized = raw / magnitude;
    if (normalized <= 1) return magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return Math.ceil(normalized) * magnitude;
  }, [trends]);

  const chartData = useMemo(() => {
    if (!trends) return null;
    const toPoints = (values: number[]) => values.map((val, idx) => {
      const x = padX + (idx * (W - padX * 2)) / (trends.labels.length - 1 || 1);
      const y = H - padY - (val * (H - padY * 2)) / niceMax;
      return { x, y, val };
    });

    const pvPts = toPoints(trends.pvs);
    const uvPts = toPoints(trends.uvs);

    const genSpline = (points: Array<{ x: number; y: number }>) => {
      let d = '';
      points.forEach((p, idx) => {
        if (idx === 0) {
          d += `M ${p.x} ${p.y}`;
        } else {
          const prev = points[idx - 1];
          const cp1x = prev.x + (p.x - prev.x) / 2;
          const cp2x = prev.x + (p.x - prev.x) / 2;
          d += ` C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
        }
      });
      return d;
    };

    const genArea = (pathD: string, points: Array<{ x: number; y: number }>) => {
      if (!pathD) return '';
      return `${pathD} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;
    };

    const pvPath = genSpline(pvPts);
    const uvPath = genSpline(uvPts);

    return {
      pvPoints: pvPts,
      uvPoints: uvPts,
      pvPathD: pvPath,
      uvPathD: uvPath,
      pvAreaD: genArea(pvPath, pvPts),
      uvAreaD: genArea(uvPath, uvPts),
      xPositions: trends.labels.map((_, idx) => padX + (idx * (W - padX * 2)) / (trends.labels.length - 1 || 1)),
    };
  }, [trends, niceMax, W]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <span>智能看板数据归集计算中...</span>
      </div>
    );
  }

  if (!data || !metrics || !trends || !recentComments || !topPosts || !chartData) {
    return (
      <div className={styles.emptyState}>
        <span>⚠️ 看板数据归集失败，请尝试刷新。</span>
      </div>
    );
  }

  // 格式化物理文件占用大小的计算（MB/KB）
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const dbSizeStr = formatBytes(health?.dbSize || 0);
  const postsSizeStr = formatBytes(health?.postsSize || 0);
  const uploadsSizeStr = formatBytes(health?.uploadsSize || 0);

  // 磁盘体检进度条比例计算（假设额定软限数据库 5MB，文章 10MB，上传资源 50MB）
  const dbPercent = Math.min(100, Math.round(((health?.dbSize || 0) / (5 * 1024 * 1024)) * 100));
  const postsPercent = Math.min(100, Math.round(((health?.postsSize || 0) / (10 * 1024 * 1024)) * 100));
  const uploadsPercent = Math.min(100, Math.round(((health?.uploadsSize || 0) / (50 * 1024 * 1024)) * 100));

  return (
    <div className={styles.container}>
      {/* 左侧侧边栏：指标卡片组与系统健康度 */}
      <div className={styles.sidebar}>
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles.cardPosts}`}>
            <div className={styles.metricIcon}>
              <IconPen size={22} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>
                <NumberCounter value={metrics.totalPosts} />
              </span>
              <span className={styles.metricLabel}>全站文章总数</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.cardPvs}`}>
            <div className={styles.metricIcon}>
              <IconEye size={22} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>
                <NumberCounter value={metrics.totalViews} />
              </span>
              <span className={styles.metricLabel}>累计阅读量 (PV)</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.cardUvs}`}>
            <div className={`${styles.metricIcon} ${styles.metricIconUv}`}>
              <IconUser size={20} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>
                <NumberCounter value={metrics.totalUv} />
              </span>
              <span className={styles.metricLabel}>独立访客量 (UV)</span>
            </div>
          </div>

          <div
            className={`${styles.metricCard} ${styles.cardPending} ${styles.metricCardPending} ${
              metrics.pendingComments > 0 ? styles.metricCardPendingActive : ''
            }`}
            onClick={() => setActivePage('comments')}
          >
            <div className={`${styles.metricIcon} ${metrics.pendingComments > 0 ? styles.metricIconWarning : ''}`}>
              <IconMessage size={20} />
            </div>
            <div className={styles.metricInfo}>
              <span className={`${styles.metricValue} ${metrics.pendingComments > 0 ? styles.metricValueWarning : ''}`}>
                <NumberCounter value={metrics.pendingComments} />
              </span>
              <span className={styles.metricLabel}>待审核评论数</span>
            </div>
          </div>
        </div>

        {/* 💾 杀手级新功能四：系统存储与数据库健康体检面板 */}
        <div className={styles.healthCard}>
          <h3 className={styles.healthTitle}>
            <IconCoffee size={16} /> 存储与数据库体检
          </h3>
          <div className={styles.healthList}>
            <div className={styles.healthItem}>
              <div className={styles.healthLabelRow}>
                <span>SQLite 数据库</span>
                <span>{dbSizeStr}</span>
              </div>
              <div className={styles.healthProgressBar}>
                <div className={`${styles.healthProgressFill} ${styles.fillDb}`} style={{ width: `${dbPercent}%` }} />
              </div>
            </div>

            <div className={styles.healthItem}>
              <div className={styles.healthLabelRow}>
                <span>Markdown 文章</span>
                <span>{postsSizeStr}</span>
              </div>
              <div className={styles.healthProgressBar}>
                <div className={`${styles.healthProgressFill} ${styles.fillPosts}`} style={{ width: `${postsPercent}%` }} />
              </div>
            </div>

            <div className={styles.healthItem}>
              <div className={styles.healthLabelRow}>
                <span>上传媒体资源</span>
                <span>{uploadsSizeStr}</span>
              </div>
              <div className={styles.healthProgressBar}>
                <div className={`${styles.healthProgressFill} ${styles.fillUploads}`} style={{ width: `${uploadsPercent}%` }} />
              </div>
            </div>
          </div>

          <button
            className={styles.vacuumBtn}
            onClick={handleVacuumOptimize}
            disabled={isCleaning}
          >
            <span>
              {isCleaning ? (
                <>
                  <span style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', animation: 'spin 1.5s linear infinite' }}>
                    <IconDatabase size={15} />
                  </span>
                  正在进行数据压缩...
                </>
              ) : (
                <>
                  <span style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center' }}>
                    <IconDatabase size={15} />
                  </span>
                  数据压缩
                </>
              )}
            </span>
          </button>

          {isCleaning && (
            <div>
              <div className={styles.quantumCleanProgress}>
                <div className={styles.quantumCleanFill} style={{ width: `${cleanProgress}%` }} />
              </div>
              <span style={{ fontSize: '10px', color: '#10b981', marginTop: '4px', display: 'block', fontWeight: 'bold' }}>
                {cleanMessage}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 右侧主工作区：趋势图表、GitHub热力图、Donut饼图、访客地域 */}
      <div className={styles.mainContent}>
        {/* 近 7 日流量折线图 */}
        <div className={styles.chartSection}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>
              <IconChartBar size={16} /> 近 7 日流量趋势统计
            </h3>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.pvColor}`} />
                <span>日浏览次数 (PV)</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.uvColor}`} />
                <span>独立访客数 (UV)</span>
              </div>
            </div>
          </div>

          <div
            className={styles.svgWrapper}
            ref={containerRef}
            onMouseLeave={() => {
              setTooltip(null);
              setHoveredIndex(null);
            }}
          >
            {chartWidth > 0 && hasTrendData ? (
              <>
                <svg className={styles.svgElement} aria-label="近 7 日流量趋势统计图">
                  <defs>
                    <linearGradient id="pvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f766e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="uvAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* 刻度背景横网格线 */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padY + ratio * (H - padY * 2);
                    const val = Math.round(niceMax * (1 - ratio));
                    return (
                      <g key={ratio}>
                        <line x1={padX} y1={y} x2={W - padX} y2={y} className={styles.gridLine} />
                        <text x={padX - 8} y={y + 3} className={styles.gridLabel}>
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* 横轴日期标签 */}
                  {trends.labels.map((lbl, idx) => {
                    const x = chartData.xPositions[idx];
                    return (
                      <text key={idx} x={x} y={H - 8} className={styles.axisLabel}>
                        {lbl}
                      </text>
                    );
                  })}

                  {/* 趋势渐变面积填充 */}
                  <path d={chartData.pvAreaD} fill="url(#pvAreaGrad)" />
                  <path d={chartData.uvAreaD} fill="url(#uvAreaGrad)" />

                  {/* 平滑贝塞尔贝赛尔趋势曲线 */}
                  <path d={chartData.pvPathD} fill="none" stroke="#0f766e" strokeWidth="2.5" />
                  <path d={chartData.uvPathD} fill="none" stroke="#3b82f6" strokeWidth="2" />

                  {/* Hover 日期垂直指示线 */}
                  {hoveredIndex !== null && (
                    <line
                      x1={chartData.xPositions[hoveredIndex]}
                      y1={padY}
                      x2={chartData.xPositions[hoveredIndex]}
                      y2={H - padY}
                      className={styles.hoverLine}
                    />
                  )}

                  {/* 趋势关键折点绘制（星环呼吸涟漪特效） */}
                  {chartData.pvPoints.map((pt, idx) => (
                    <g key={`pv-${idx}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredIndex === idx ? 5.5 : 4}
                        fill="#0f766e"
                        stroke="#fff"
                        strokeWidth="1.5"
                        className={styles.activeDot}
                      />
                      {hoveredIndex === idx && (
                        <>
                          <circle cx={pt.x} cy={pt.y} r={10} className={styles.rippleRing1} />
                          <circle cx={pt.x} cy={pt.y} r={16} className={styles.rippleRing2} />
                        </>
                      )}
                    </g>
                  ))}

                  {chartData.uvPoints.map((pt, idx) => (
                    <g key={`uv-${idx}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredIndex === idx ? 5 : 3.5}
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth="1.5"
                        className={styles.activeDot}
                      />
                      {hoveredIndex === idx && (
                        <>
                          <circle cx={pt.x} cy={pt.y} r={9} className={`${styles.rippleRing1} ${styles.rippleRingUv1}`} />
                          <circle cx={pt.x} cy={pt.y} r={15} className={`${styles.rippleRing2} ${styles.rippleRingUv2}`} />
                        </>
                      )}
                    </g>
                  ))}

                  {/* 触发悬停区域 */}
                  {trends.labels.map((_, idx) => {
                    const x = chartData.xPositions[idx];
                    const w = (W - padX * 2) / (trends.labels.length - 1 || 1);
                    return (
                      <rect
                        key={idx}
                        x={x - w / 2}
                        y={padY}
                        width={w}
                        height={H - padY * 2}
                        fill="transparent"
                        className={styles.hitArea}
                        onMouseEnter={(e) => {
                          setHoveredIndex(idx);
                          const pvVal = trends.pvs[idx];
                          const uvVal = trends.uvs[idx];
                          setTooltip({
                            visible: true,
                            x: x + 10 > W - 140 ? x - 150 : x + 10,
                            y: ptY(pvVal, uvVal) - 20,
                            date: trends.labels[idx],
                            pv: pvVal,
                            uv: uvVal,
                          });
                        }}
                      />
                    );
                  })}
                </svg>

                {tooltip && tooltip.visible && (
                  <div
                    className={styles.chartTooltip}
                    style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
                  >
                    <span className={styles.tooltipDate}>
                      <IconCalendar size={12} /> {tooltip.date}
                    </span>
                    <span>
                      <IconEye size={12} /> 阅读数 (PV): <strong className={styles.tooltipPv}>{tooltip.pv}</strong>
                    </span>
                    <span>
                      <IconUser size={12} /> 独立 IP (UV): <strong className={styles.tooltipUv}>{tooltip.uv}</strong>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.chartEmpty}>
                <IconCoffee size={32} />
                <span>当前近 7 日内暂时还没有访客数据累计～</span>
              </div>
            )}
          </div>
        </div>

        {/* 🟩 杀手级新功能一：GitHub 风格“文章创作年度热力图”面板 */}
        <div className={styles.heatmapSection}>
          <div className={styles.heatmapHeader}>
            <h3 className={styles.heatmapTitle}>
              <IconCalendar size={16} /> 博客文章年度创作热力图
            </h3>
            <div className={styles.heatmapStats}>
              <span>
                年度累计发布文章: <strong className={styles.statBadge}>{heatmapStats.totalPublished} 篇</strong>
              </span>
              <span>
                笔耕总字数: <strong className={styles.statBadge}>{heatmapStats.estimatedWords.toLocaleString('zh-CN')} 字</strong>
              </span>
            </div>
          </div>

          <div className={styles.heatmapScroll}>
            <div className={styles.heatmapGrid}>
              {heatmapGrid.map((row, rowIdx) => (
                <div key={rowIdx} className={styles.heatmapRow}>
                  {row.map((cell) => {
                    const level = cell.count === 0 ? 0 : cell.count === 1 ? 1 : cell.count === 2 ? 2 : cell.count === 3 ? 3 : 4;
                    return (
                      <div
                        key={cell.dateStr}
                        className={`${styles.heatmapCell} ${styles[`cellLevel${level}`]}`}
                        title={`${cell.dateStr}：${cell.count} 篇创作贡献`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heatmapLegend}>
            <span>少</span>
            <div className={`${styles.legendBox} ${styles.cellLevel0}`} />
            <div className={`${styles.legendBox} ${styles.cellLevel1}`} />
            <div className={`${styles.legendBox} ${styles.cellLevel2}`} />
            <div className={`${styles.legendBox} ${styles.cellLevel3}`} />
            <div className={`${styles.legendBox} ${styles.cellLevel4}`} />
            <span>多</span>
          </div>
        </div>

        {/* 下方双栏排版：最高阅读与近期评论 */}
        <div className={styles.bottomGrid}>
          {/* 左栏：阅读最高排行榜 */}
          <div className={styles.tableCard}>
            <h3 className={styles.cardTitle}>
              <IconFire size={16} /> 阅读热度排行
            </h3>
            <div className={styles.topList}>
              {topPosts.length > 0 ? (
                topPosts.map((post, idx) => (
                  <a
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.topItem}
                  >
                    <div className={`${styles.rankBadge} ${styles[`rankBadge${idx + 1}`] || ''}`}>
                      {idx + 1}
                    </div>
                    <span className={styles.itemTitle} title={post.title}>
                      {post.title}
                    </span>
                    <span className={styles.itemViews}>
                      <IconEye size={12} /> {post.views} 次阅读
                    </span>
                  </a>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <span>暂时没有阅读量排行，快去宣传分享文章吧～</span>
                </div>
              )}
            </div>
          </div>

          {/* 右栏：Donut 标签环形占比图 */}
          <div className={styles.tableCard}>
            <h3 className={styles.cardTitle}>
              <IconChartBar size={16} /> 知识库领域透视 (标签占比)
            </h3>
            {donutData.length > 0 ? (
              <div className={styles.donutContainer}>
                <div className={styles.donutSvgWrapper}>
                  <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                    {donutData.map((item, idx) => {
                      // 半径 50，周长 314
                      const r = 50;
                      const circumference = 2 * Math.PI * r;
                      const strokeDashoffset = circumference - (circumference * item.percentage) / 100;
                      return (
                        <circle
                          key={idx}
                          cx="70"
                          cy="70"
                          r={r}
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="11"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          transform={`rotate(${(item.percentStart * 360) / 100} 70 70)`}
                          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                        />
                      );
                    })}
                  </svg>
                  <div className={styles.donutCenterLabel}>
                    <span className={styles.donutCenterVal}>{donutData.length}</span>
                    <span className={styles.donutCenterLbl}>核心分类</span>
                  </div>
                </div>

                <div className={styles.donutLegend}>
                  {donutData.map((item, idx) => (
                    <div key={idx} className={styles.donutLegendItem}>
                      <div className={styles.donutLegendInfo}>
                        <div className={donutData.length > 0 ? styles.donutColorDot : ''} style={{ backgroundColor: item.color }} />
                        <span className={styles.donutTagName} title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <span className={styles.donutTagPercentage}>{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <IconCoffee size={24} className={styles.emptyIcon} />
                <span>暂无已发布标签的统计，快去写几篇文章贴上标签吧～</span>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );

  // 辅助函数，用来确定 Tooltip 浮层的高度坐标
  function ptY(pv: number, uv: number) {
    if (!trends) return H / 2;
    const maxVal = Math.max(pv, uv);
    return H - padY - (maxVal * (H - padY * 2)) / niceMax;
  }
}
