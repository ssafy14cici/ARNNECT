import { useEffect, useRef, useState } from "react";

export function useReveal(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, options);

    io.observe(el);
    return () => io.disconnect();
  }, [options]);

  return { ref, isVisible };
}
