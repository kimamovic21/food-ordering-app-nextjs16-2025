'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OutgoingMessage } from '@/types/messages';

export function useMessageThreadScroll(messages: OutgoingMessage[], pageCount: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousLastId = useRef<string | null>(null);
  const previousIds = useRef(new Set<string>());
  const readingAnchor = useRef<{ id: string; offset: number } | null>(null);
  const olderAnchor = useRef<{ height: number; top: number; pages: number } | null>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [visibleUnreadIds, setVisibleUnreadIds] = useState<string[]>([]);
  const [documentVisible, setDocumentVisible] = useState(true);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    nearBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    if (nearBottom.current) setHasNewMessages(false);
    const bounds = container.getBoundingClientRect();
    const firstVisible = Array.from(
      container.querySelectorAll<HTMLElement>('[data-message-id]')
    ).find((element) => element.getBoundingClientRect().bottom > bounds.top);
    readingAnchor.current =
      !nearBottom.current && firstVisible
        ? {
            id: firstVisible.dataset.messageId!,
            offset: firstVisible.getBoundingClientRect().top - bounds.top,
          }
        : null;
    const ids = Array.from(container.querySelectorAll<HTMLElement>('[data-unseen-id]'))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > bounds.top && rect.top < bounds.bottom && rect.height > 0;
      })
      .map((element) => element.dataset.unseenId!);
    setVisibleUnreadIds((previous) => (previous.join(',') === ids.join(',') ? previous : ids));
  }, []);

  const scrollToLatest = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    nearBottom.current = true;
    setHasNewMessages(false);
    measure();
  }, [measure]);

  const rememberOlderPosition = () => {
    const container = containerRef.current;
    if (container)
      olderAnchor.current = {
        height: container.scrollHeight,
        top: container.scrollTop,
        pages: pageCount,
      };
  };

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const lastId = messages.at(-1)?._id || null;
    const anchor = olderAnchor.current;
    if (anchor && pageCount > anchor.pages) {
      container.scrollTop = anchor.top + container.scrollHeight - anchor.height;
      olderAnchor.current = null;
    } else if (!anchor) {
      const reading = readingAnchor.current;
      if (!nearBottom.current && reading) {
        const element = Array.from(
          container.querySelectorAll<HTMLElement>('[data-message-id]')
        ).find((element) => element.dataset.messageId === reading.id);
        if (element)
          container.scrollTop +=
            element.getBoundingClientRect().top -
            container.getBoundingClientRect().top -
            reading.offset;
      }
      if (lastId !== previousLastId.current) {
        if (nearBottom.current || previousLastId.current === null) scrollToLatest();
        else if (lastId && !previousIds.current.has(lastId)) setHasNewMessages(true);
      }
    }
    previousLastId.current = lastId;
    previousIds.current = new Set(messages.map((message) => message._id));
    measure();
  }, [messages, pageCount, measure, scrollToLatest]);

  useEffect(() => {
    const onVisibility = () => {
      setDocumentVisible(document.visibilityState === 'visible');
      measure();
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', measure);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  return {
    containerRef,
    onScroll: measure,
    hasNewMessages,
    scrollToLatest,
    rememberOlderPosition,
    cancelOlderPosition: () => {
      olderAnchor.current = null;
    },
    visibleUnreadIds,
    documentVisible,
  };
}
