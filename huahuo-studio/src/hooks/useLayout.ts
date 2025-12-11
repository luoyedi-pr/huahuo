import { useEffect, useState } from 'react';

/** 响应式断点 */
export const BREAKPOINTS = {
  compact: 768,
  standard: 1280,
  wide: 1536,
} as const;

export type LayoutMode = 'compact' | 'standard' | 'wide' | 'ultrawide';

/**
 * 获取当前布局模式
 */
export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>('standard');

  useEffect(() => {
    const updateMode = () => {
      const width = window.innerWidth;
      if (width < BREAKPOINTS.compact) {
        setMode('compact');
      } else if (width < BREAKPOINTS.standard) {
        setMode('standard');
      } else if (width < BREAKPOINTS.wide) {
        setMode('wide');
      } else {
        setMode('ultrawide');
      }
    };

    updateMode();
    window.addEventListener('resize', updateMode);
    return () => window.removeEventListener('resize', updateMode);
  }, []);

  return mode;
}

/**
 * 媒体查询 Hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * 快捷断点检测
 */
export function useBreakpoint() {
  const mode = useLayoutMode();

  return {
    isCompact: mode === 'compact',
    isStandard: mode === 'standard',
    isWide: mode === 'wide',
    isUltrawide: mode === 'ultrawide',
    isMobile: mode === 'compact',
    isDesktop: mode !== 'compact',
  };
}
