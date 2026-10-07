import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'mw:closet-filters'

export const SORTS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'rating-desc', label: 'Mais gosto → menos gosto' },
  { value: 'rating-asc', label: 'Menos gosto → mais gosto' },
]

export const plural = (n) => `${n} ${n === 1 ? 'peça' : 'peças'}`

const EMPTY = { sort: 'recent', categories: [], colors: [] }

// Chave de comparação: ignora maiúsculas/minúsculas e espaços extras.
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const label = (s) => String(s ?? '').trim().replace(/\s+/g, ' ')

function load() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (!raw) return EMPTY
    return {
      sort: SORTS.some((s) => s.value === raw.sort) ? raw.sort : 'recent',
      categories: Array.isArray(raw.categories) ? raw.categories.map(String) : [],
      colors: Array.isArray(raw.colors) ? raw.colors.map(String) : [],
    }
  } catch {
    return EMPTY
  }
}

// Opções únicas (primeiro rótulo visto), em ordem alfabética.
function uniqueOptions(items, field) {
  const map = new Map()
  for (const it of items) {
    const key = norm(it[field])
    if (key && !map.has(key)) map.set(key, label(it[field]))
  }
  return [...map]
    .map(([key, text]) => ({ key, label: text }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }))
}

const time = (it) => new Date(it.created_at).getTime() || 0
const byRecent = (a, b) => time(b) - time(a)
const hasRating = (it) => Number(it.rating) > 0

export function useWardrobeFilters(items) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* sem sessionStorage: segue sem guardar */
    }
  }, [state])

  const categoryOptions = useMemo(() => uniqueOptions(items, 'category'), [items])
  const colorOptions = useMemo(() => uniqueOptions(items, 'color'), [items])

  // Descarta escolhas guardadas que não existem mais nas peças atuais.
  const categories = useMemo(() => {
    const valid = new Set(categoryOptions.map((o) => o.key))
    return state.categories.filter((k) => valid.has(k))
  }, [state.categories, categoryOptions])
  const colors = useMemo(() => {
    const valid = new Set(colorOptions.map((o) => o.key))
    return state.colors.filter((k) => valid.has(k))
  }, [state.colors, colorOptions])
  const sort = state.sort

  const filtered = useMemo(() => {
    const list = items.filter(
      (it) =>
        (categories.length === 0 || categories.includes(norm(it.category))) &&
        (colors.length === 0 || colors.includes(norm(it.color)))
    )
    if (sort === 'recent') return list.sort(byRecent)
    const dir = sort === 'rating-desc' ? -1 : 1
    return list.sort((a, b) => {
      const ra = hasRating(a)
      const rb = hasRating(b)
      if (ra !== rb) return ra ? -1 : 1 // sem nota sempre por último
      if (ra && a.rating !== b.rating) return (a.rating - b.rating) * dir
      return byRecent(a, b)
    })
  }, [items, categories, colors, sort])

  const toggle = useCallback((group, key) => {
    setState((s) => ({
      ...s,
      [group]: s[group].includes(key) ? s[group].filter((k) => k !== key) : [...s[group], key],
    }))
  }, [])
  const setSort = useCallback((value) => setState((s) => ({ ...s, sort: value })), [])
  const clear = useCallback(() => setState(EMPTY), [])

  const labelOf = (options, key) => options.find((o) => o.key === key)?.label ?? key
  const active = [
    ...categories.map((k) => ({
      id: `categories:${k}`,
      text: labelOf(categoryOptions, k),
      remove: () => toggle('categories', k),
    })),
    ...colors.map((k) => ({
      id: `colors:${k}`,
      text: labelOf(colorOptions, k),
      remove: () => toggle('colors', k),
    })),
    ...(sort !== 'recent'
      ? [{ id: 'sort', text: SORTS.find((s) => s.value === sort).label, remove: () => setSort('recent') }]
      : []),
  ]

  return {
    filtered,
    sort,
    categories,
    colors,
    categoryOptions,
    colorOptions,
    active,
    activeCount: active.length,
    toggle,
    setSort,
    clear,
  }
}
