export function translateError(code: number | string, message?: string): string {
  const codeStr = String(code);
  if (codeStr === '4212') return 'Không tìm thấy phòng (hoặc mã phòng sai).';
  if (codeStr === '4211') return 'Phòng đã đầy.';
  if (codeStr === 'too_early') return 'Chưa hết thời gian chờ kết quả.';
  if (codeStr === 'too_many_players') return message || 'This map has a player limit.';
  if (codeStr === '4001' || message?.includes('game_in_progress')) return 'Phòng đang trong ván chơi, không thể vào.';
  if (codeStr === '4000') return 'Bạn đã bị ngắt kết nối.';
  return message ? `Lỗi: ${message}` : `Lỗi kết nối (${codeStr})`;
}
