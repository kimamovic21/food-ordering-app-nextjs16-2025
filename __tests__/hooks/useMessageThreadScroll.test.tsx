// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMessageThreadScroll } from '@/hooks/useMessageThreadScroll';
import type { OutgoingMessage } from '@/types/messages';

const message = (id: string): OutgoingMessage => ({
  _id: id,
  body: id,
  senderUserId: 'sender',
  recipientUserId: 'recipient',
  deletedFor: [],
  createdAt: '2026-10-30T10:00:00Z',
  updatedAt: '2026-10-30T10:00:00Z',
});
const setup = () => {
  const hook = renderHook(({ messages, pages }) => useMessageThreadScroll(messages, pages), {
    initialProps: { messages: [] as OutgoingMessage[], pages: 1 },
  });
  const element = document.createElement('div');
  Object.defineProperty(element, 'scrollHeight', { value: 1000, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: 200, configurable: true });
  Object.assign(hook.result.current.containerRef, { current: element });
  hook.rerender({ messages: [message('first')], pages: 1 });
  return { ...hook, element };
};
afterEach(cleanup);

describe('message scroll behavior', () => {
  it('opens at the latest messages and follows arrivals near the bottom', () => {
    const { result, rerender, element } = setup();
    expect(element.scrollTop).toBe(1000);
    Object.defineProperty(element, 'scrollHeight', { value: 1100, configurable: true });
    rerender({ messages: [message('first'), message('second')], pages: 1 });
    expect(element.scrollTop).toBe(1100);
    expect(result.current.hasNewMessages).toBe(false);
  });
  it('keeps reading position and offers a new-message jump', () => {
    const { result, rerender, element } = setup();
    act(() => {
      element.scrollTop = 200;
      result.current.onScroll();
    });
    rerender({ messages: [message('first'), message('second')], pages: 1 });
    expect(element.scrollTop).toBe(200);
    expect(result.current.hasNewMessages).toBe(true);
    act(() => result.current.scrollToLatest());
    expect(element.scrollTop).toBe(1000);
    expect(result.current.hasNewMessages).toBe(false);
  });
  it('preserves the visual anchor when older history is prepended', () => {
    const { result, rerender, element } = setup();
    act(() => {
      element.scrollTop = 50;
      result.current.onScroll();
      result.current.rememberOlderPosition();
    });
    Object.defineProperty(element, 'scrollHeight', { value: 1600, configurable: true });
    rerender({ messages: [message('older'), message('first')], pages: 2 });
    expect(element.scrollTop).toBe(650);
    expect(result.current.hasNewMessages).toBe(false);
  });
  it('does not jump or signal new arrivals for receipt or edit updates', () => {
    const { result, rerender, element } = setup();
    act(() => {
      element.scrollTop = 200;
      result.current.onScroll();
    });
    rerender({ messages: [{ ...message('first'), body: 'Edited' }], pages: 1 });
    expect(element.scrollTop).toBe(200);
    expect(result.current.hasNewMessages).toBe(false);
  });
  it('reports only incoming unread elements intersecting the viewport', () => {
    const { result, element } = setup();
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 300,
      height: 200,
    } as DOMRect);
    const visible = document.createElement('div');
    visible.dataset.unseenId = 'visible';
    const offscreen = document.createElement('div');
    offscreen.dataset.unseenId = 'offscreen';
    vi.spyOn(visible, 'getBoundingClientRect').mockReturnValue({
      top: 150,
      bottom: 190,
      height: 40,
    } as DOMRect);
    vi.spyOn(offscreen, 'getBoundingClientRect').mockReturnValue({
      top: 400,
      bottom: 440,
      height: 40,
    } as DOMRect);
    element.append(visible, offscreen);
    act(() => result.current.onScroll());
    expect(result.current.visibleUnreadIds).toEqual(['visible']);
  });

  it('does not announce an older message as new when the last message is removed', () => {
    const { result, rerender, element } = setup();
    rerender({ messages: [message('first'), message('second')], pages: 1 });
    act(() => {
      element.scrollTop = 200;
      result.current.onScroll();
    });
    rerender({ messages: [message('first')], pages: 1 });
    expect(result.current.hasNewMessages).toBe(false);
    expect(element.scrollTop).toBe(200);
  });

  it('anchors the visible message when refetch shifts the loaded page boundary', () => {
    const { result, rerender, element } = setup();
    const row = document.createElement('div');
    row.dataset.messageId = 'first';
    element.append(row);
    let top = 80;
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 300,
      height: 200,
    } as DOMRect);
    vi.spyOn(row, 'getBoundingClientRect').mockImplementation(
      () => ({ top, bottom: top + 80, height: 80 }) as DOMRect
    );
    act(() => {
      element.scrollTop = 200;
      result.current.onScroll();
    });
    top = 40;
    rerender({ messages: [message('first'), message('second')], pages: 1 });
    expect(element.scrollTop).toBe(160);
    expect(result.current.hasNewMessages).toBe(true);
  });
});
