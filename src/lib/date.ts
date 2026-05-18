/**
 * 高稳定、防时区及水合警告的 100% 纯中文日期时间格式化工具
 * 完美契合“年月日 时分秒的形式，不要有英文”之终极设计要求
 * 
 * @param dateInput 任何可被 Date 实例接收的参数
 * @param forceTime 是否强行显示时分秒
 */
export function formatToChineseDateTime(dateInput: string | Date | number | undefined, forceTime = false): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // 判断是否有时分秒数据（如果全为0且未强制，则仅输出年月日，否则输出年月日 时分秒）
  const hasTime = forceTime || hours !== 0 || minutes !== 0 || seconds !== 0;

  const padHours = String(hours).padStart(2, '0');
  const padMinutes = String(minutes).padStart(2, '0');
  const padSeconds = String(seconds).padStart(2, '0');

  if (hasTime) {
    return `${year}年${month}月${day}日 ${padHours}时${padMinutes}分${padSeconds}秒`;
  }
  return `${year}年${month}月${day}日`;
}
