export const CART_ITEM_NOTE_MAX_LENGTH = 160;

export const limitCartItemNoteInput = (value: unknown) =>
  String(value ?? '').slice(0, CART_ITEM_NOTE_MAX_LENGTH);

export const normalizeCartItemNote = (value: unknown) =>
  limitCartItemNoteInput(value)
    .trim()
    .replace(/\s+/g, ' ');
