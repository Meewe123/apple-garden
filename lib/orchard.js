// @ts-check
/**
 * The site's one illustration: an orchard drawn as a plan, seen from above.
 * Tree crowns are planted in staggered rows, a few carry an apple.
 * Output is deterministic for a given seed, so every build looks the same.
 */

/** Small, fast, seedable PRNG (mulberry32). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (/** @type {number} */ n) => Math.round(n * 10) / 10;

/**
 * @param {{
 *   cols?: number,
 *   rows?: number,
 *   spacing?: number,
 *   seed?: number,
 *   appleChance?: number,
 *   empty?: Array<[number, number]>,
 *   modifier?: string,
 * }} [options]
 *   `empty` lists [row, col] spots left unplanted (drawn as a dashed outline).
 * @returns {{ svg: string, trees: number, apples: number }}
 */
export function orchard({
  cols = 30,
  rows = 4,
  spacing = 48,
  seed = 2014,
  appleChance = 0.12,
  empty = [],
  modifier = "",
} = {}) {
  const rand = random(seed);
  const width = cols * spacing;
  const height = rows * spacing * 0.86 + spacing * 0.5;
  const isEmpty = new Set(empty.map(([r, c]) => `${r}:${c}`));

  const crowns = [];
  const trunks = [];
  const apples = [];
  const holes = [];

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 ? spacing / 2 : 0;
    for (let col = 0; col < cols; col++) {
      const x = col * spacing + offset + (rand() - 0.5) * spacing * 0.12;
      const y = spacing * 0.68 + row * spacing * 0.86 + (rand() - 0.5) * spacing * 0.12;
      const r = spacing * (0.27 + rand() * 0.09);

      if (isEmpty.has(`${row}:${col}`)) {
        holes.push(`<circle cx="${round(x)}" cy="${round(y)}" r="${round(spacing * 0.31)}"/>`);
        continue;
      }

      crowns.push(`<circle cx="${round(x)}" cy="${round(y)}" r="${round(r)}"/>`);
      trunks.push(`<circle cx="${round(x)}" cy="${round(y)}" r="${round(spacing * 0.03)}"/>`);

      if (rand() < appleChance) {
        const angle = rand() * Math.PI * 2;
        const distance = r * 0.55;
        apples.push(
          `<circle cx="${round(x + Math.cos(angle) * distance)}" cy="${round(y + Math.sin(angle) * distance)}" r="${round(spacing * 0.06)}"/>`,
        );
      }
    }
  }

  const svg = [
    `<svg class="${["orchard", modifier && `orchard--${modifier}`].filter(Boolean).join(" ")}" viewBox="0 0 ${width} ${round(height)}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">`,
    `<g class="orchard__crowns">${crowns.join("")}</g>`,
    `<g class="orchard__trunks">${trunks.join("")}</g>`,
    `<g class="orchard__apples">${apples.join("")}</g>`,
    holes.length ? `<g class="orchard__holes">${holes.join("")}</g>` : "",
    "</svg>",
  ].join("");

  return { svg, trees: crowns.length, apples: apples.length };
}
