'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

// A generation token also rejects A -> B -> A responses from the first login.
export default function useAccountScope() {
  const { data, status } = useSession();
  const viewer = status === 'unauthenticated' ? '' : data?.user?.email || '';
  const current = useRef({ viewer });
  if (current.current.viewer !== viewer) current.current = { viewer };
  const token = current.current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = useCallback(
    () => Boolean(viewer) && mounted.current && current.current === token,
    [viewer, token]
  );
  const assertCurrent = useCallback(() => {
    if (!isCurrent()) throw new Error('Your account changed. Please try again.');
  }, [isCurrent]);
  return { viewer, status, isCurrent, assertCurrent };
}
