import { createCursorPage, decodeCursor, encodeCursor } from './pagination';

describe('cursor pagination', () => {
  const rows = [
    { id: 'b', createdAt: '2026-07-24T10:00:00.000Z', value: 2 },
    { id: 'a', createdAt: '2026-07-24T09:00:00.000Z', value: 1 },
  ];

  it('round trips an opaque cursor', () => {
    const position = { id: rows[0].id, createdAt: rows[0].createdAt };
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it('uses the extra row to determine whether another page exists', () => {
    const page = createCursorPage(rows, 1);
    expect(page.data).toEqual([rows[0]]);
    expect(page.page.hasMore).toBe(true);
    expect(decodeCursor(page.page.nextCursor as string)).toEqual({
      id: rows[0].id,
      createdAt: rows[0].createdAt,
    });
  });

  it('rejects malformed cursors', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(
      'Invalid pagination cursor',
    );
  });
});
