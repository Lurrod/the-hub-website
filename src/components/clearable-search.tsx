"use client";

import { useEffect, useRef } from "react";

/** Échantillonneur cubic-bezier minimal, pour que le JS suive la même
 *  courbe que le CSS (repris tel quel du snippet). */
function bezier(str: string): (t: number) => number {
  const m = String(str).match(/cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/);
  if (!m) return (t) => t;
  const [x1, y1, x2, y2] = m.slice(1).map(parseFloat);
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6 || d === 0) break;
      s -= dx / d;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}

/**
 * Champ de recherche dont l'effacement dissout le texte : les mots s'envolent
 * en se floutant pendant qu'une traînée lumineuse balaie le champ, et le
 * placeholder redescend à leur place. Snippet `13-input-clear-dissolve`.
 *
 * Le rendu est piloté image par image en JS : le CSS ne possède que l'état de
 * repos et les variables que ce composant relit à chaque effacement.
 */
export default function ClearableSearch({
  name,
  defaultValue = "",
  placeholder,
  ariaLabel,
  className,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const pholdRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const clearing = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const phold = pholdRef.current;
    const glow = glowRef.current;
    if (!wrap || !input || !mirror || !phold || !glow) return;

    const root = document.documentElement;
    const num = (name: string, fb: number) => {
      const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(v) ? v : fb;
    };
    const canvas = document.createElement("canvas").getContext("2d")!;

    const sync = () => {
      const has = input.value.length > 0;
      wrap.classList.toggle("has-value", has);
      if (has) mirror.textContent = input.value.replace(/ /g, " ");
    };

    function buildGlow(text: string) {
      canvas.font = getComputedStyle(input!).font;
      // Thème sombre : dégradés blancs, cf. la section « Dark mode » du snippet.
      const rgb = "255,255,255";
      const w = wrap!.clientWidth || 280;
      const padLeft = parseFloat(getComputedStyle(input!).paddingLeft) || 12;
      const spread = num("--glow-spread", 1.5);
      const layers: string[] = [];
      let x = 0;
      text.split(/(\s+)/).forEach((seg) => {
        const segW = canvas.measureText(seg).width;
        if (seg.trim()) {
          const cx = padLeft + x + segW / 2;
          const hw = Math.max(segW * 0.45, 8) * spread;
          (
            [
              [0, 0.8, 7, 0.22],
              [hw * 0.45, 0.55, 8, 0.18],
              [-hw * 0.4, 0.65, 6, 0.16],
              [hw * 0.15, 0.9, 5, 0.14],
            ] as const
          ).forEach(([dx, rwm, rh, a]) => {
            const lx = (((cx + dx) / w) * 100).toFixed(2);
            layers.push(
              `radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`
            );
          });
        }
        x += segW;
      });
      return layers.join(", ");
    }

    function clearWithAnimation() {
      if (clearing.current || !input!.value) return;
      clearing.current = true;
      const keepFocus = document.activeElement === input;
      mirror!.textContent = input!.value.replace(/ /g, " ");

      const total = num("--clear-dur", 1000);
      const outDur = num("--clear-out-dur", 400);
      const inDur = num("--clear-in-dur", 400);
      const outFly = num("--clear-out-fly", 12);
      const inFly = num("--clear-in-fly", 12);
      const blur = num("--clear-blur", 2);
      const delay = num("--glow-delay", 50);
      const peakAt = num("--glow-peak-at", 0.15);
      const gOp = num("--glow-opacity", 0.42);
      const easeOut = bezier(getComputedStyle(root).getPropertyValue("--clear-out-ease"));
      const easeIn = bezier(getComputedStyle(root).getPropertyValue("--clear-in-ease"));

      input!.value = "";
      wrap!.classList.remove("has-value");
      wrap!.classList.add("is-clearing");
      glow!.style.background = buildGlow(mirror!.textContent ?? "");
      glow!.style.opacity = "0";
      phold!.style.transform = `translateY(-${inFly}px)`;
      phold!.style.opacity = "0.9";
      phold!.style.filter = `blur(${blur}px)`;

      const t0 = performance.now();
      (function tick(now: number) {
        const el = now - t0;
        const eo = easeOut(Math.min(1, el / outDur));
        mirror!.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
        mirror!.style.opacity = (1 - eo).toFixed(3);
        mirror!.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;

        const ei = easeIn(Math.min(1, el / inDur));
        phold!.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`;
        phold!.style.opacity = (0.9 + ei * 0.1).toFixed(3);
        phold!.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;

        let g = 0;
        if (el > delay) {
          const gp = Math.min(1, (el - delay) / Math.max(1, total - delay));
          g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
        }
        glow!.style.opacity = (g * gOp).toFixed(3);

        if (el < total) {
          requestAnimationFrame(tick);
        } else {
          wrap!.classList.remove("is-clearing");
          [mirror!, phold!].forEach((e) => (e.style.cssText = ""));
          mirror!.textContent = "";
          glow!.style.opacity = "0";
          glow!.style.background = "";
          clearing.current = false;
          if (keepFocus) requestAnimationFrame(() => input!.focus({ preventScroll: true }));
        }
      })(performance.now());
    }

    const btn = wrap.querySelector<HTMLButtonElement>(".t-clear-btn");
    const keep = (e: Event) => {
      if (document.activeElement === input) e.preventDefault();
    };
    btn?.addEventListener("pointerdown", keep);
    btn?.addEventListener("mousedown", keep);
    btn?.addEventListener("click", clearWithAnimation);
    input.addEventListener("input", sync);
    sync();

    return () => {
      btn?.removeEventListener("pointerdown", keep);
      btn?.removeEventListener("mousedown", keep);
      btn?.removeEventListener("click", clearWithAnimation);
      input.removeEventListener("input", sync);
    };
  }, []);

  return (
    <span ref={wrapRef} className={`t-clear field inline-flex items-center ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        defaultValue={defaultValue}
        maxLength={40}
        aria-label={ariaLabel}
        className="w-full bg-transparent outline-none"
      />
      <span ref={mirrorRef} className="t-clear-mirror" aria-hidden="true" />
      <span ref={pholdRef} className="t-clear-placeholder" aria-hidden="true">
        {placeholder}
      </span>
      <span ref={glowRef} className="t-clear-glow" aria-hidden="true" />
      <button
        type="button"
        className="t-clear-btn relative z-[4] ml-1 shrink-0 text-[var(--text-subtle)] transition-colors hover:text-[var(--text)]"
        aria-label="Effacer la recherche"
      >
        ×
      </button>
    </span>
  );
}
