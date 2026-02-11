import { useState, useMemo } from "react";

interface UseInteractionOptions {
  disabled?: boolean;
}

export function useInteraction(opts: UseInteractionOptions = {}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handlers = useMemo(() => {
    if (opts.disabled) {
      return {
        onMouseEnter: undefined,
        onMouseLeave: undefined,
        onMouseDown: undefined,
        onMouseUp: undefined,
      };
    }
    return {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => {
        setIsHovered(false);
        setIsActive(false);
      },
      onMouseDown: () => setIsActive(true),
      onMouseUp: () => setIsActive(false),
    };
  }, [opts.disabled]);

  return {
    isHovered: opts.disabled ? false : isHovered,
    isActive: opts.disabled ? false : isActive,
    handlers,
  };
}
