export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface CursorPage<T> {
  data: T[];
  page: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface CursorPosition {
  createdAt: string;
  id: string;
}

export function encodeCursor(position: CursorPosition): string {
  return Buffer.from(JSON.stringify(position), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): CursorPosition {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (
      typeof value !== 'object' ||
      value === null ||
      !('createdAt' in value) ||
      typeof value.createdAt !== 'string' ||
      !('id' in value) ||
      typeof value.id !== 'string' ||
      Number.isNaN(Date.parse(value.createdAt))
    ) {
      throw new Error('invalid cursor payload');
    }
    return { createdAt: value.createdAt, id: value.id };
  } catch {
    throw new BadRequestException({
      code: 'INVALID_CURSOR',
      message: 'Invalid pagination cursor',
    });
  }
}

export function createCursorPage<T extends CursorPosition>(
  rows: T[],
  requestedSize: number,
): CursorPage<T> {
  const hasMore = rows.length > requestedSize;
  const data = hasMore ? rows.slice(0, requestedSize) : rows;
  const last = data.at(-1);
  return {
    data,
    page: {
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last) : null,
    },
  };
}
import { BadRequestException } from '@nestjs/common';
