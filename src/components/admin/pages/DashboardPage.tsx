'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, useId } from 'react';
import { useAdmin } from '../shared/AdminContext';
import styles from './DashboardPage.module.css';
import {
  IconPen,
  IconEye,
  IconMessage,
  IconChartBar,
  IconCalendar,
  IconUser,
  IconFire,
  IconCoffee
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
}

export default function DashboardPage() {
  const { adminToken, setActivePage } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const chartId = useId();
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

  const metrics = data?.metrics;
  const trends = data?.trends;
  const recentComments = data?.recentComments;
  const topPosts = data?.topPosts;

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

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <IconPen size={22} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{metrics.totalPosts}</span>
              <span className={styles.metricLabel}>全站文章总数</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>
              <IconEye size={22} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{metrics.totalViews}</span>
              <span className={styles.metricLabel}>累计阅读量 (PV)</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={`${styles.metricIcon} ${styles.metricIconUv}`}>
              <IconEye size={20} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{metrics.totalUv}</span>
              <span className={styles.metricLabel}>独立访客量 (UV)</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${styles.metricCardPending}`} onClick={() => setActivePage('comments')}>
            <div className={`${styles.metricIcon} ${metrics.pendingComments > 0 ? styles.metricIconWarning : ''}`}>
              <IconMessage size={20} />
            </div>
            <div className={styles.metricInfo}>
              <span className={`${styles.metricValue} ${metrics.pendingComments > 0 ? styles.metricValueWarning : ''}`}>
                {metrics.pendingComments}
              </span>
              <span className={styles.metricLabel}>待审核评论数</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}><IconChartBar size={16} /> 近 7 日流量趋势统计</h3>
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
          onMouseLeave={() => { setTooltip(null); setHoveredIndex(null); }}
        >
          {!hasTrendData ? (
            <div className={styles.chartEmpty}>
              <IconChartBar size={32} />
              <span>暂无流量数据</span>
            </div>
          ) : (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className={styles.svgElement}>
                <defs>
                  <linearGradient id={`${chartId}-pvGrad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-1)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--color-accent-1)" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id={`${chartId}-uvGrad`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const y = padY + r * (H - padY * 2);
                  const gridVal = Math.round(niceMax - r * niceMax);
                  return (
                    <g key={i}>
                      <line x1={padX} y1={y} x2={W - padX} y2={y} className={styles.gridLine} />
                      <text x={padX - 10} y={y + 4} className={styles.gridLabel}>
                        {gridVal}
                      </text>
                    </g>
                  );
                })}

                {hoveredIndex !== null && (
                  <line
                    x1={chartData.xPositions[hoveredIndex]}
                    y1={padY}
                    x2={chartData.xPositions[hoveredIndex]}
                    y2={H - padY}
                    className={styles.hoverLine}
                  />
                )}

                <path d={chartData.pvAreaD} fill={`url(#${chartId}-pvGrad)`} />
                <path d={chartData.pvPathD} fill="none" stroke="var(--color-accent-1)" strokeWidth="2.5" strokeLinecap="round" />

                <path d={chartData.uvAreaD} fill={`url(#${chartId}-uvGrad)`} />
                <path d={chartData.uvPathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

                {trends.labels.map((lbl, idx) => (
                  <text key={idx} x={chartData.xPositions[idx]} y={H - 6} className={styles.axisLabel}>
                    {lbl}
                  </text>
                ))}

                {hoveredIndex !== null && (
                  <>
                    <circle cx={chartData.pvPoints[hoveredIndex].x} cy={chartData.pvPoints[hoveredIndex].y} r="5" fill="var(--bg-body)" stroke="var(--color-accent-1)" strokeWidth="2.5" />
                    <circle cx={chartData.uvPoints[hoveredIndex].x} cy={chartData.uvPoints[hoveredIndex].y} r="5" fill="var(--bg-body)" stroke="#38bdf8" strokeWidth="2.5" />
                  </>
                )}

                {chartData.pvPoints.map((p, idx) => (
                  <rect
                    key={`pv-hit-${idx}`}
                    x={p.x - (W / trends.labels.length) / 2}
                    y={padY}
                    width={W / trends.labels.length}
                    height={H - padY * 2}
                    fill="transparent"
                    className={styles.hitArea}
                    onMouseEnter={() => {
                      setHoveredIndex(idx);
                      const tx = Math.max(60, Math.min(p.x, W - 60));
                      const ty = Math.min(p.y, chartData.uvPoints[idx].y) - 12;
                      setTooltip({
                        visible: true,
                        x: tx,
                        y: ty,
                        date: trends.labels[idx],
                        pv: p.val,
                        uv: trends.uvs[idx],
                      });
                    }}
                  />
                ))}
              </svg>

              {tooltip && tooltip.visible && (
                <div
                  className={styles.chartTooltip}
                  style={{
                    left: `${(tooltip.x / W) * 100}%`,
                    top: `${tooltip.y}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
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
          )}
        </div>
      </div>

        {/* 下方双栏排版：最高阅读与近期评论 */}
        <div className={styles.bottomGrid}>
        {/* 左栏：阅读最高排行榜 */}
        <div className={styles.tableCard}>
          <h3 className={styles.cardTitle}><IconFire size={16} /> 阅读热度排行</h3>
          <div className={styles.topList}>
            {topPosts.length > 0 ? (
              topPosts.map((post, idx) => (
                <div key={post.slug} className={styles.topItem}>
                  <div className={`${styles.rankBadge} ${styles[`rankBadge${idx + 1}`] || ''}`}>
                    {idx + 1}
                  </div>
                  <span className={styles.itemTitle} title={post.title}>
                    {post.title}
                  </span>
                  <span className={styles.itemViews}>
                      <IconEye size={12} /> {post.views} 次阅读
                    </span>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span>暂时没有阅读量排行，快去宣传分享文章吧～</span>
              </div>
            )}
          </div>
        </div>

        {/* 右栏：近期评论 */}
        <div className={styles.tableCard}>
          <h3 className={styles.cardTitle}><IconMessage size={16} /> 最新待审核评论</h3>
          <div className={styles.commentList}>
            {recentComments.length > 0 ? (
              recentComments.map((comment) => (
                <div key={comment.id} className={styles.commentItem} onClick={() => setActivePage('comments')} style={{ cursor: 'pointer' }}>
                  <div className={styles.commentMeta}>
                      <span className={styles.commentUser}>
                        <IconUser size={12} /> {comment.nickname}
                      </span>
                    <span className={styles.commentTime}>
                      {new Date(comment.createdAt).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={styles.commentContent}>
                    {comment.content.length > 100 ? `${comment.content.slice(0, 100)}...` : comment.content}
                  </p>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <IconCoffee size={24} className={styles.emptyIcon} />
                <span>清净无事！当前所有的文章回复评论均已审核完毕。</span>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
