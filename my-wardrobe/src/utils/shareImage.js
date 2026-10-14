import { getFontEmbedCSS, toBlob } from 'html-to-image'

// Tamanhos da imagem compartilhada. O primeiro é o padrão.
export const SHARE_FORMATS = {
  feed: { label: 'Feed (4:5)', width: 1080, height: 1350 },
  story: { label: 'Stories (9:16)', width: 1080, height: 1920 },
}

// maior lado de cada foto dentro do modelo: mais que isso só pesa na memória do Safari
const MAX_SIDE = 1000
// fontes do modelo, pedidas pelo nome para o navegador não deixar para depois
const FONTS = ['600 72px Fredoka', '700 32px Nunito']

async function fetchBlob(url) {
  const options = { mode: 'cors', credentials: 'omit' }
  let response
  try {
    response = await fetch(url, options)
  } catch {
    // o cache do navegador pode ter guardado a foto sem os cabeçalhos de CORS
    response = await fetch(url, { ...options, cache: 'reload' })
  }
  if (!response.ok) throw new Error(`Foto indisponível (${response.status}): ${url}`)
  return response.blob()
}

// Baixa a foto e devolve um dataURL em PNG, já reduzido. Com as fotos embutidas
// o canvas não fica "tainted" e a captura não depende da rede.
export async function imageToDataUrl(url) {
  const objectUrl = URL.createObjectURL(await fetchBlob(url))
  try {
    const img = new Image()
    img.src = objectUrl
    await img.decode()
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// As fontes embutidas são as mesmas em toda captura: busca uma vez só.
let fontCss = null
function fontEmbedCss(node) {
  fontCss ??= getFontEmbedCSS(node).catch((error) => {
    console.error(error)
    fontCss = null
    return '' // sem as fontes da marca a imagem ainda sai, com a fonte do sistema
  })
  return fontCss
}

// Transforma o modelo (já na página, fora da tela) em PNG.
export async function renderShareImage(node, { width, height }) {
  await Promise.all(FONTS.map((font) => document.fonts.load(font).catch(() => {})))
  await document.fonts.ready
  await Promise.all([...node.querySelectorAll('img')].map((img) => img.decode()))

  // pixelRatio 1: o modelo já tem 1080px; mais que isso estoura a memória do Safari
  const options = { width, height, pixelRatio: 1, skipAutoScale: true, fontEmbedCSS: await fontEmbedCss(node) }
  // o Safari às vezes entrega a primeira captura sem as fotos: ela só aquece, vale a segunda
  await toBlob(node, options)
  const blob = await toBlob(node, options)
  if (!blob) throw new Error('A captura do conjunto saiu vazia')
  return blob
}

// "Passeio de domingo" -> "conjunto-passeio-de-domingo.png"
export function shareFileName(name) {
  const slug = String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `conjunto-${slug || 'my-wardrobe'}.png`
}

export function downloadFile(file, url) {
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
}
