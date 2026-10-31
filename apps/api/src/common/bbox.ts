import { BadRequestException } from '@nestjs/common';
import type { BBox } from '@gtat/shared';

/** Đọc tham số bbox=tây,nam,đông,bắc. Giới hạn diện tích để tránh tải quá nhiều. */
export function parseBBox(raw: string | undefined, maxDeg = 2): BBox {
  const parts = (raw ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new BadRequestException('bbox phải có dạng tây,nam,đông,bắc');
  }
  const [w, s, e, n] = parts;
  if (w >= e || s >= n) throw new BadRequestException('bbox không hợp lệ');
  if (e - w > maxDeg || n - s > maxDeg) {
    throw new BadRequestException(`bbox tối đa ${maxDeg}° mỗi chiều`);
  }
  return [w, s, e, n];
}

export function parseSince(raw: string | undefined): Date {
  if (!raw) return new Date(0);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new BadRequestException('since phải là thời gian ISO 8601');
  return d;
}
