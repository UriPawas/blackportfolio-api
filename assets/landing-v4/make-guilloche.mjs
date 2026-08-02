/* Genera assets/landing-v4/guilloche.svg — la roseta grabada de los
   certificados de acciones. Se usa como `mask-image`, así que el trazo va en
   negro opaco: el color lo pone el CSS con el token del tema.
 *
 * Un guilloche real no es una curva punto por punto, son circunferencias
 * repetidas alrededor de un centro; el moiré sale del traslape. Dibujarlo así
 * baja el archivo de 230 KB a ~6 KB y además se ve mejor.
 *
 *   node assets/landing-v4/make-guilloche.mjs
 */
import { writeFileSync } from 'node:fs';

const SIZE = 1000;
const C = SIZE / 2;

/* count: cuántas circunferencias · R: radio del recorrido de los centros
   r: radio de cada circunferencia · w: grosor · phase: desfase en grados */
const RINGS = [
  { count: 54, R: 214, r: 196, w: 0.85, phase: 0 },
  { count: 54, R: 214, r: 190, w: 0.55, phase: 3.33 },
  { count: 42, R: 262, r: 148, w: 0.8,  phase: 0 },
  { count: 34, R: 168, r: 118, w: 0.7,  phase: 5.29 },
  { count: 26, R: 104, r: 76,  w: 0.6,  phase: 0 },
  { count: 18, R: 56,  r: 44,  w: 0.5,  phase: 10 }
];

const defs = RINGS
  .map((ring, i) => `  <circle id="g${i}" cx="${C + ring.R}" cy="${C}" r="${ring.r}"/>`)
  .join('\n');

const groups = RINGS.map((ring, i) => {
  const uses = [];
  for (let n = 0; n < ring.count; n++) {
    const a = (ring.phase + (n * 360) / ring.count).toFixed(2);
    uses.push(`<use href="#g${i}" transform="rotate(${a} ${C} ${C})"/>`);
  }
  return `  <g stroke-width="${ring.w}">${uses.join('')}</g>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<defs>
${defs}
</defs>
<g fill="none" stroke="#000">
  <circle cx="${C}" cy="${C}" r="474" stroke-width="1.2"/>
  <circle cx="${C}" cy="${C}" r="464" stroke-width="0.5"/>
  <circle cx="${C}" cy="${C}" r="330" stroke-width="0.5"/>
${groups}
</g>
</svg>
`;

writeFileSync(new URL('./guilloche.svg', import.meta.url), svg);
console.log('guilloche.svg', (svg.length / 1024).toFixed(1) + ' KB');
