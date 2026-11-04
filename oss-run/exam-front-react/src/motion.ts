/**
 * GSAP 动效助手（§6 GSAP 动效规范）
 * - 仅用于页面转场 / 列表进入 / 数据面板等非关键提示动画（§6.1）
 * - 时长采用 150 / 250 / 400ms 三档（§6.3）
 * - 检测 prefers-reduced-motion 时关闭非必要动画（§6.4）
 * - 动画不改变布局、不遮挡文字、不阻塞点击（§6.5，仅 opacity/transform，pointer-events 不受影响）
 */
import gsap from 'gsap';

export const DUR = { fast: 0.15, base: 0.25, slow: 0.4 };

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 页面转场：内容淡入上移 */
export function pageIn(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: DUR.base, ease: 'power2.out', clearProps: 'transform' });
}

/** 列表进入：子元素依次上浮 */
export function listIn(el: HTMLElement | null, itemSelector: string) {
  if (!el || reducedMotion()) return;
  const items = el.querySelectorAll(itemSelector);
  if (!items.length) return;
  gsap.fromTo(items, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: DUR.fast, stagger: 0.06, ease: 'power1.out', clearProps: 'transform' });
}

/** 数据面板：数字区块轻微缩放强调 */
export function panelIn(el: HTMLElement | null) {
  if (!el || reducedMotion()) return;
  gsap.fromTo(el, { autoAlpha: 0, scale: 0.985 }, { autoAlpha: 1, scale: 1, duration: DUR.base, ease: 'power2.out', clearProps: 'transform' });
}
