import { useEffect, useRef } from 'react';
import { createMedicalCanvasEngine } from '../lib/medicalCanvasEngine.js';
import { useTheme } from '../context/ThemeContext.jsx';

/**
 * GlobalMedicalCanvas — the single living background shared by EVERY module.
 *
 * One fixed canvas sits behind the whole application shell (sidebar, topbar and
 * every route) so the particle mesh, the floating glass medical glyphs, the
 * space mosaic and the ECG pulse line are continuous and never restart when the
 * user navigates.
 *
 * Accessibility / performance
 *  - Purely decorative: `aria-hidden`, no pointer events, sits under the UI.
 *  - Honours `prefers-reduced-motion` (renders one static frame instead).
 *  - Pauses while the tab is hidden and follows the OS "reduce motion" setting
 *    live, so it never burns a frame the user cannot see.
 */
export default function GlobalMedicalCanvas() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const { theme } = useTheme();

  // Create + own the engine for the lifetime of the app shell.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const engine = createMedicalCanvasEngine(canvas, {
      theme: document.documentElement.getAttribute('data-theme') ?? 'light',
      reducedMotion: motionQuery.matches,
    });
    engineRef.current = engine;
    engine.resize();
    engine.start();

    const onResize = () => engine.resize();
    const onScroll = () => engine.setScroll(window.scrollY || 0);
    const onPointerMove = (event) => {
      engine.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
    };
    const onVisibility = () => {
      if (document.hidden) engine.stop();
      else engine.start();
    };
    const onMotionChange = (event) => engine.setReducedMotion(event.matches);

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener?.('change', onMotionChange);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener?.('change', onMotionChange);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Follow the light/dark switch without rebuilding the field.
  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  return (
    <div className="global-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="global-canvas" />
      <span className="global-backdrop-glow" />
    </div>
  );
}
