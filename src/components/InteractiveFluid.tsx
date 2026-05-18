'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface GridCell {
  vx: number;
  vy: number;
}

export default function InteractiveFluid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  // 鼠标状态追踪
  const mouseRef = useRef({
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    isFirst: true,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. 初始化画布尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 2. 流场网格定义 (每个网格大小为 40px)
    const cellSize = 40;
    let cols = Math.ceil(canvas.width / cellSize);
    let rows = Math.ceil(canvas.height / cellSize);

    // 初始化流体力学网格矢量场
    let grid: GridCell[][] = [];
    const initGrid = () => {
      cols = Math.ceil(canvas.width / cellSize);
      rows = Math.ceil(canvas.height / cellSize);
      grid = [];
      for (let x = 0; x < cols; x++) {
        grid[x] = [];
        for (let y = 0; y < rows; y++) {
          grid[x][y] = { vx: 0, vy: 0 };
        }
      }
    };
    initGrid();

    // 3. 微发光粒子群 (增加至 120 个以呈现丰富丝滑的线流细节)
    const particleCount = 480;
    const particles: Particle[] = [];

    const createParticle = (): Particle => {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      return {
        x: rx,
        y: ry,
        prevX: rx,
        prevY: ry,
        vx: (Math.random() - 0.5) * 1.5, // 提高游动速率
        vy: (Math.random() - 0.5) * 1.5,
        life: 0,
        maxLife: 120,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    // 4. 监听鼠标交互并在相应格子注入物理流速
    const handleMouseMove = (e: MouseEvent) => {
      const m = mouseRef.current;
      if (m.isFirst) {
        m.prevX = e.clientX;
        m.prevY = e.clientY;
        m.isFirst = false;
      } else {
        m.prevX = m.x;
        m.prevY = m.y;
      }
      m.x = e.clientX;
      m.y = e.clientY;

      // 瞬时鼠标位移
      const dx = m.x - m.prevX;
      const dy = m.y - m.prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        // 核心妙招：引入基础恒定推动力，确保极慢移动时也有华丽特效，同时按比例叠加高速移动力
        const baseForce = 2.0;
        m.vx = (dx / dist) * baseForce + dx * 0.15;
        m.vy = (dy / dist) * baseForce + dy * 0.15;
      } else {
        m.vx = 0;
        m.vy = 0;
      }

      // 将鼠标速度注入周围一定半径范围内的网格单元 (Gaussian 物理势能场)
      const influenceRadius = 150; // 扩大鼠标影响范围，使得整屏交互更自然！
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const cellCenterX = x * cellSize + cellSize / 2;
          const cellCenterY = y * cellSize + cellSize / 2;
          const gridDx = cellCenterX - m.x;
          const gridDy = cellCenterY - m.y;
          const gridDist = Math.sqrt(gridDx * gridDx + gridDy * gridDy);

          if (gridDist < influenceRadius) {
            const force = (1 - gridDist / influenceRadius) * 0.45; // 提高注入比例
            grid[x][y].vx += m.vx * force;
            grid[x][y].vy += m.vy * force;
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 5. 核心物理模拟与渲染循环
    const updateFluid = () => {
      if (!ctx || !canvas) return;

      // 提取主题变量，自愈支持任何明暗主题颜色
      const htmlStyle = getComputedStyle(document.documentElement);
      const bgPrimary = htmlStyle.getPropertyValue('--bg-primary').trim() || '#ffffff';
      const accentColor = htmlStyle.getPropertyValue('--color-accent-1').trim() || '#0f766e';

      // 🎯 核心渲染秘诀：增大覆盖不透明度到 0.08，防止 8-bit Canvas 像素取整导致的“脏屏幕/灰白色幽灵残影”Bug！
      ctx.fillStyle = bgPrimary;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;

      // 慢速流体物理阻尼与微噪声风力计算
      const time = Date.now() * 0.0005;
      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const cell = grid[x][y];

          // 极大地减慢流体能量耗散（摩擦力由 0.95 改为 0.98），让激起的涡流自旋舞动时间翻倍！
          cell.vx *= 0.98;
          cell.vy *= 0.98;

          // 注入背景微风 (大幅强化环境流体力场，让全屏自带不规则的天然洋流)
          const windAngle = Math.sin(x * 0.15 + time) * Math.cos(y * 0.15 + time) * Math.PI * 2;
          cell.vx += Math.cos(windAngle) * 0.025; // 从 0.006 提升至 0.025
          cell.vy += Math.sin(windAngle) * 0.025;
        }
      }

      // 更新并绘制发光微粒
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.35; // 稍微增粗线条，确保在高分辨率和高亮屏幕下清晰可见

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // 备份上一步坐标，用于无缝画线
        p.prevX = p.x;
        p.prevY = p.y;

        // 计算当前粒子所在的流体网格坐标
        const cellX = Math.floor(p.x / cellSize);
        const cellY = Math.floor(p.y / cellSize);

        if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
          const cellV = grid[cellX][cellY];
          // 粒子获得网格的流体速度，并带有轻微延迟，模拟物理惯性
          p.vx += (cellV.vx - p.vx) * 0.08;
          p.vy += (cellV.vy - p.vy) * 0.08;
        }

        // 赋予粒子自主的生命感：加入布朗运动（随机游走），使得鼠标不动时它们也像萤火虫一样乱飞！
        p.vx += (Math.random() - 0.5) * 0.35;
        p.vy += (Math.random() - 0.5) * 0.35;

        // 减小粒子滑行阻尼，使其顺滑前行更久
        p.vx *= 0.99;
        p.vy *= 0.99;

        // 粒子在背景中的常驻微弱上升气流
        p.vy -= 0.015;

        // 🐢 更新物理位移 (加入 speedScale 统一调控最终画面移速)
        const speedScale = 0.6; // 👈 您可以通过修改这个参数来全局减慢粒子移速！(原先相当于 1.0)
        p.x += p.vx * speedScale;
        p.y += p.vy * speedScale;

        // 边界保护与生命周期耗尽自愈重置
        const isOutOfBounds = p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height;
        if (p.life >= p.maxLife || isOutOfBounds) {
          particles[i] = createParticle();
          continue;
        }

        // 🎯 画出如发丝般淡雅的发光丝线
        ctx.globalAlpha = 0.36 * (1 - p.life / p.maxLife); // 增强不透明度，显著提升视觉辨识度
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // 递归满帧运转
      requestRef.current = requestAnimationFrame(updateFluid);
    };

    // 启动动画环
    requestRef.current = requestAnimationFrame(updateFluid);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        background: 'var(--bg-primary)',
      }}
    />
  );
}
