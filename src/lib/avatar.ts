/**
 * 极客像素头像生成器 (Symmetric 5x5 SVG Identicon Generator)
 * 根据输入种子（经过联系方式加密），在本地通过算法生成独一无二、对称排列的像素太空飞船风格头像。
 */
export function generatePixelAvatar(seed: string): string {
  // 1. 使用 DJB2 算法生成 32 位整型哈希
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }

  // 2. 根据哈希确定主色调 (选用中高饱和度与适度亮度的 HSL，保证暗色背景下十分亮丽)
  const hue = Math.abs(hash % 360);
  const fgColor = `hsl(${hue}, 80%, 60%)`;
  const bgColor = '#1e293b'; // 深灰蓝色底色

  // 3. 构建 5x5 对称布尔矩阵 (只需存储前3列，后2列由对称生成)
  const grid: boolean[][] = [];
  for (let r = 0; r < 5; r++) {
    grid[r] = [];
    for (let c = 0; c < 3; c++) {
      // 通过移位检测哈希位决定该像素点是否填充
      const bitIndex = r * 3 + c;
      grid[r][c] = ((hash >> bitIndex) & 1) === 1;
    }
    // 对称填充第 4 列 (索引 3) 和第 5 列 (索引 4)
    grid[r][3] = grid[r][1];
    grid[r][4] = grid[r][0];
  }

  // 4. 组装 SVG 字符串 (画布尺寸 50x50，每个像素格 8x8，周围留白 padding 为 5)
  const size = 50;
  const padding = 5;
  const cellSize = 8;

  let rectsSvg = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c]) {
        const x = padding + c * cellSize;
        const y = padding + r * cellSize;
        rectsSvg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}" rx="1" />`;
      }
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:${bgColor};">
    ${rectsSvg}
  </svg>`;
}
