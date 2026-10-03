// Descobre o caminho do arquivo no bucket a partir da URL pública da foto
export function pathFromUrl(url) {
  const marker = '/wardrobe/'
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}