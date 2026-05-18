/**
 * 极简但安全的异或打盐与 Base64 混淆对称加解密工具
 * 用于在 LocalStorage 中以非明文形式持久化存储管理员开启之钥凭证，防范简单窃听与注入风险
 */

const SECRET_SALT = 'chongchong_ovo_garden';

/**
 * 加密明文字符串
 */
export function encryptToken(text: string): string {
  if (!text) return '';
  try {
    const rawBytes = Array.from(text).map(c => c.charCodeAt(0));
    const saltBytes = Array.from(SECRET_SALT).map(c => c.charCodeAt(0));
    const encryptedBytes = rawBytes.map((b, i) => b ^ saltBytes[i % saltBytes.length]);
    // 转换为十六进制字符串以防 Base64 乱码
    const hexString = encryptedBytes.map(b => b.toString(16).padStart(2, '0')).join('');
    return btoa(hexString);
  } catch (e) {
    console.error('会话令牌加密出错:', e);
    return '';
  }
}

/**
 * 解密密文字符串
 */
export function decryptToken(cipher: string): string {
  if (!cipher) return '';
  try {
    const hexString = atob(cipher);
    const encryptedBytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
      encryptedBytes.push(parseInt(hexString.substring(i, i + 2), 16));
    }
    const saltBytes = Array.from(SECRET_SALT).map(c => c.charCodeAt(0));
    const decryptedBytes = encryptedBytes.map((b, i) => b ^ saltBytes[i % saltBytes.length]);
    return String.fromCharCode(...decryptedBytes);
  } catch (e) {
    console.error('会话令牌解密出错:', e);
    return '';
  }
}
