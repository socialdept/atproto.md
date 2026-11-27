// The landing page's entrance, after the Social Dept. masthead: the ATMD pill
// lands on a spring and its line drops into the hero, the headline rises word by word out of a blur in reading order,
// then the lede and the request box come up, "atproto.md/" types into the field a letter at a time, Fetch pops, and
// the example chips pop in left to right. The start state applies only once the script runs (the intro class on
// <html>), the motion waits for the fonts, reduced motion skips it, and once it has landed every class comes off and
// the page line is rebuilt, so the settled page is the plain page again.
const INTRO_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const INTRO_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const INTRO_TOTAL = 2900;
export const INTRO_STYLES = `
.intro .bar__mark, .intro .bar .link, .intro .bar .btn--ghost { opacity: 0; }
.intro .bar__mark { transform: scale(.86); }
.intro .line-start { clip-path: inset(0 0 100% 0); }
.intro:not(.intro-split) .hero h1 { visibility: hidden; }
.intro .hero .w { display: inline-block; opacity: 0; filter: blur(8px); transform: translateY(.45em); }
.intro .hero .lede, .intro #try .tray { opacity: 0; transform: translateY(16px); }
.intro .field .prefix { clip-path: inset(0 100% 0 0); }
.intro .field input, .intro .examples .chip, .intro .ask .btn, .intro .out { opacity: 0; }
.intro .examples .chip, .intro .ask .btn { transform: scale(.7); }
.intro .wire, .intro .wire-cut { opacity: 0; }

.intro-play .bar__mark { opacity: 1; transform: none; transition: opacity .4s ease-out, transform .7s ${INTRO_SPRING}; }
.intro-play .bar .link, .intro-play .bar .btn--ghost { opacity: 1; transition: opacity .6s ease-out .15s; }
.intro-play .line-start { clip-path: inset(0); transition: clip-path .5s ${INTRO_EASE} .2s; }
.intro-play .hero .w { opacity: 1; filter: blur(0); transform: none;
  transition: opacity .6s ease-out calc(380ms + var(--i) * 55ms), filter .7s ease-out calc(380ms + var(--i) * 55ms), transform .9s ${INTRO_EASE} calc(380ms + var(--i) * 55ms); }
.intro-play .hero .lede { opacity: 1; transform: none; transition: opacity .7s ease-out .95s, transform .9s ${INTRO_EASE} .95s; }
.intro-play #try .tray { opacity: 1; transform: none; transition: opacity .7s ease-out 1.1s, transform .9s ${INTRO_EASE} 1.1s; }
.intro-play .field .prefix { clip-path: inset(0); transition: clip-path .55s steps(11, end) 1.45s; }
.intro-play .field input { opacity: 1; transition: opacity .4s ease-out 2s; }
.intro-play .ask .btn { opacity: 1; transform: none; transition: opacity .25s ease-out 1.95s, transform .55s ${INTRO_SPRING} 1.95s; }
.intro-play .examples .chip { opacity: 1; transform: none; transition: opacity .25s ease-out calc(2.1s + var(--c) * 60ms), transform .5s ${INTRO_SPRING} calc(2.1s + var(--c) * 60ms); }
.intro-play .out { opacity: 1; transition: opacity .6s ease-out 2.45s; }
.intro-play .wire, .intro-play .wire-cut { opacity: 1; transition: opacity .8s ease-out 2.4s; }
`;

// Runs in <head>: marks the page before the first paint, then splits the headline into words and numbers the chips,
// waits for the fonts (at most 1.5s), plays, and takes every class off once it has landed.
export const INTRO_SCRIPT = `
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add('intro');
  document.addEventListener('DOMContentLoaded', () => {
    const h1 = document.querySelector('.hero h1');
    if (!h1) { root.classList.remove('intro'); return; }
    let i = 0;
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of child.textContent.split(/(\\s+)/)) {
            if (!part) continue;
            if (/^\\s+$/.test(part)) { frag.append(part); continue; }
            const w = document.createElement('span');
            w.className = 'w'; w.style.setProperty('--i', i++); w.textContent = part;
            frag.append(w);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      }
    };
    walk(h1);
    root.classList.add('intro-split');
    document.querySelectorAll('.examples .chip').forEach((c, n) => c.style.setProperty('--c', n));
    const play = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('intro-play');
      setTimeout(() => {
        root.classList.remove('intro', 'intro-play', 'intro-split');
        dispatchEvent(new Event('resize'));
      }, ${INTRO_TOTAL + 400});
    }));
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(play);
  });
})();`;
