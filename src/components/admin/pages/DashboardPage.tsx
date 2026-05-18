'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAdmin } from '../shared/AdminContext';
import styles from './DashboardPage.module.css';
import {
  IconPen,
  IconEye,
  IconMessage,
  IconArrowRight,
  IconPencil
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
  const { adminToken, setActivePage, setEditSlug } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 测量容器尺寸状态，实现 1:1 物理像素完美高清渲染
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 220 });

  // 交互悬浮 Tooltip 状态
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    date: string;
    pv: number;
    uv: number;
  } | null>(null);

  // 1. 注册 ResizeObserver 动态获取容器的物理分辨率，自适应全屏或窗口缩放
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 600,
          height: height || 220
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [loading, data]); // 当加载状态变更或数据刷新时，重新核验容器

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

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <span>智能看板数据归集计算中...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyState}>
        <span>⚠️ 看板数据归集失败，请尝试刷新。</span>
      </div>
    );
  }

  const { metrics, trends, recentComments, topPosts } = data;

  // --- SVG 平滑样条曲线几何点生成算法 (物理像素点对点自适应) ---
  const W = dimensions.width;
  const H = dimensions.height;
  const padX = 40;
  const padY = 30; // 留出底边时间标注和顶边最高点的安全空白

  // 找出 PV 和 UV 中的最大值作为 Y 轴上限
  const maxVal = Math.max(...trends.pvs, ...trends.uvs, 10); // 至少为 10 防零除

  // 转换 PV 坐标点
  const pvPoints = trends.pvs.map((val, idx) => {
    const x = padX + (idx * (W - padX * 2)) / (trends.labels.length - 1);
    const y = H - padY - (val * (H - padY * 2)) / maxVal;
    return { x, y, val };
  });

  // 转换 UV 坐标点
  const uvPoints = trends.uvs.map((val, idx) => {
    const x = padX + (idx * (W - padX * 2)) / (trends.labels.length - 1);
    const y = H - padY - (val * (H - padY * 2)) / maxVal;
    return { x, y, val };
  });

  // 立方贝塞尔样条生成器
  const generateSplineD = (points: Array<{ x: number; y: number }>) => {
    let d = '';
    points.forEach((p, idx) => {
      if (idx === 0) {
        d += `M ${p.x} ${p.y}`;
      } else {
        const prev = points[idx - 1];
        const cp1x = prev.x + (p.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (p.x - prev.x) / 2;
        const cp2y = p.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`;
      }
    });
    return d;
  };

  const pvPathD = generateSplineD(pvPoints);
  const uvPathD = generateSplineD(uvPoints);

  // 面积填充封闭路径生成器
  const generateAreaD = (pathD: string, points: Array<{ x: number; y: number }>) => {
    if (!pathD) return '';
    return `${pathD} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`;
  };

  const pvAreaD = generateAreaD(pvPathD, pvPoints);
  const uvAreaD = generateAreaD(uvPathD, uvPoints);

  return (
    <div className={styles.container}>
      {/* 四大指标卡片 */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <IconPen size={22} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{metrics.totalPosts}</span>
            <span className={styles.metricLabel}>全站博文总数</span>
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
          <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <IconPencil size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue}>{metrics.totalUv}</span>
            <span className={styles.metricLabel}>独立访客量 (UV)</span>
          </div>
        </div>

        <div className={styles.metricCard} onClick={() => setActivePage('comments')} style={{ cursor: 'pointer' }}>
          <div className={styles.metricIcon} style={{ background: metrics.pendingComments > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(15, 118, 110, 0.1)', color: metrics.pendingComments > 0 ? '#ef4444' : 'var(--color-accent-1)' }}>
            <IconMessage size={20} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricValue} style={{ color: metrics.pendingComments > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {metrics.pendingComments}
            </span>
            <span className={styles.metricLabel}>待审核评论数</span>
          </div>
        </div>
      </div>

      {/* 近 7 日趋势 SVG 数据图表 */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>📈 近 7 日流量趋势统计</h3>
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

        {/* 动态分辨率测量与原生像素比对的高清 SVG 图表区 */}
        <div className={styles.svgWrapper} ref={containerRef}>
          <svg 
            width={W} 
            height={H} 
            style={{ overflow: 'visible', display: 'block' }}
          >
            <defs>
              {/* 松石青渐变 */}
              <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent-1)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--color-accent-1)" stopOpacity="0.00" />
              </linearGradient>
              {/* 碧蓝渐变 */}
              <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* 水平网格虚线网格背景 */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
              const y = padY + r * (H - padY * 2);
              const gridVal = Math.round(maxVal - r * maxVal);
              return (
                <g key={i}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={W - padX}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padX - 10}
                    y={y + 4}
                    fill="var(--text-secondary)"
                    fontSize="9"
                    textAnchor="end"
                    opacity="0.6"
                  >
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* PV 面积与曲线 */}
            <path d={pvAreaD} fill="url(#pvGrad)" />
            <path d={pvPathD} fill="none" stroke="var(--color-accent-1)" strokeWidth="2.5" strokeLinecap="round" />

            {/* UV 面积与曲线 */}
            <path d={uvAreaD} fill="url(#uvGrad)" />
            <path d={uvPathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

            {/* 底部日期轴标注 */}
            {trends.labels.map((lbl, idx) => {
              const x = padX + (idx * (W - padX * 2)) / (trends.labels.length - 1);
              return (
                <text
                  key={idx}
                  x={x}
                  y={H - 6}
                  fill="var(--text-secondary)"
                  fontSize="9"
                  textAnchor="middle"
                  opacity="0.7"
                >
                  {lbl}
                </text>
              );
            })}

            {/* 数据交互节点（圆圈） */}
            {pvPoints.map((p, idx) => (
              <circle
                key={`pv-dot-${idx}`}
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="var(--bg-body)"
                stroke="var(--color-accent-1)"
                strokeWidth="2.5"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: p.x,
                    y: p.y - 12,
                    date: trends.labels[idx],
                    pv: p.val,
                    uv: trends.uvs[idx],
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}

            {/* UV 圆圈数据交互 */}
            {uvPoints.map((p, idx) => (
              <circle
                key={`uv-dot-${idx}`}
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="var(--bg-body)"
                stroke="#38bdf8"
                strokeWidth="2.5"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => {
                  setTooltip({
                    visible: true,
                    x: p.x,
                    y: p.y - 12,
                    date: trends.labels[idx],
                    pv: trends.pvs[idx],
                    uv: p.val,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </svg>

          {/* 看板 Tooltip */}
          {tooltip && tooltip.visible && (
            <div
              className={styles.chartTooltip}
              style={{
                left: `${(tooltip.x / W) * 100}%`,
                top: `${(tooltip.y / H) * 100}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <span className={styles.tooltipDate}>📅 {tooltip.date}</span>
              <span>👁️ 阅读数 (PV): <strong style={{ color: 'var(--color-accent-1)' }}>{tooltip.pv}</strong></span>
              <span>👤 独立 IP (UV): <strong style={{ color: '#38bdf8' }}>{tooltip.uv}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* 下方双栏排版：最高阅读与近期评论 */}
      <div className={styles.bottomGrid}>
        {/* 左栏：阅读最高排行榜 */}
        <div className={styles.tableCard}>
          <h3 className={styles.cardTitle}>🔥 博文阅读热度排行</h3>
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
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        setEditSlug(post.slug);
                        setActivePage('write');
                      }} 
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="立即编辑"
                    >
                      <IconPencil size={14} />
                    </button>
                    <span className={styles.itemViews}>👁️ {post.views} 次阅读</span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span>暂时没有阅读量排行，快去宣传分享博文吧～</span>
              </div>
            )}
          </div>
        </div>

        {/* 右栏：近期评论 */}
        <div className={styles.tableCard}>
          <h3 className={styles.cardTitle}>💬 最新待审核评论</h3>
          <div className={styles.commentList}>
            {recentComments.length > 0 ? (
              recentComments.map((comment) => (
                <div key={comment.id} className={styles.commentItem} onClick={() => setActivePage('comments')} style={{ cursor: 'pointer' }}>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentUser}>👤 {comment.nickname}</span>
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
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>🍵</span>
                <span>清净无事！当前所有的文章回复评论均已审核完毕。</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
