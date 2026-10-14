// Gera os ícones do PWA em public/ a partir da logo (public/my-wardrobe-mark.svg).
// Uso: npm run icons
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const PINK = '#ffd3e2'
const publicDir = new URL('../public/', import.meta.url)

const mark = await readFile(new URL('my-wardrobe-mark.svg', publicDir), 'utf8')
// só os desenhos da logo, sem a tag <svg> e o <title>
const art = mark.replace(/<\/?svg[^>]*>/g, '').replace(/<title>.*?<\/title>/s, '')

// A logo é desenhada em 200x200, com o guarda-roupa centrado perto de (102, 97).
// scale: quanto do ícone a logo ocupa; radius: cantos do fundo (0 = quadrado cheio).
function icon({ scale, radius }) {
  const k = (512 * scale) / 200
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${PINK}"/>
  <g transform="translate(${256 - 102 * k} ${256 - 97 * k}) scale(${k})">${art}</g>
</svg>`
}

const files = [
  // cantos arredondados e fundo transparente fora deles
  { name: 'pwa-192x192.png', size: 192, svg: icon({ scale: 0.78, radius: 120 }) },
  { name: 'pwa-512x512.png', size: 512, svg: icon({ scale: 0.78, radius: 120 }) },
  // maskable: fundo até a borda e logo dentro da área segura (círculo de 80%)
  { name: 'pwa-maskable-512x512.png', size: 512, svg: icon({ scale: 0.72, radius: 0 }) },
  // iOS: fundo sólido, sem transparência (o próprio iOS arredonda os cantos)
  { name: 'apple-touch-icon.png', size: 180, svg: icon({ scale: 0.92, radius: 0 }), opaque: true },
]

for (const { name, size, svg, opaque } of files) {
  let image = sharp(Buffer.from(svg), { density: 300 }).resize(size, size)
  if (opaque) image = image.flatten({ background: PINK })
  await image.png().toFile(fileURLToPath(new URL(name, publicDir)))
  console.log('✓', name)
}
