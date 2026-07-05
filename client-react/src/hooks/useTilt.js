import { useCallback, useRef } from "react";

const MAX_TILT_DEG = 9;

export function useTilt() {
  const ref = useRef(null);

  const handlePointerMove = useCallback((event) => {
    if (event.pointerType === "touch") return;

    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    const tiltX = (0.5 - py) * MAX_TILT_DEG;
    const tiltY = (px - 0.5) * MAX_TILT_DEG;

    node.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    node.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
    node.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
    node.style.setProperty("--glare-opacity", "1");
  }, []);

  const handlePointerLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
    node.style.setProperty("--glare-opacity", "0");
  }, []);

  return { ref, handlePointerMove, handlePointerLeave };
}
