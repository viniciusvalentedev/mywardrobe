import { useState } from 'react'
import Chip from '../components/Chip'
import OutfitRating from '../components/OutfitRating'
import OutfitStack from '../components/OutfitStack'
import { CalendarIcon, Chevron } from '../components/icons'
import { useStat } from '../hooks/useStat'
import { hexOfColor } from '../utils/colors'
import { outfitRating } from '../utils/outfits'

// O período vale só para os blocos de uso. O banco conta "os últimos N dias, com hoje".
const PERIODS = [
  { days: 30, label: '30 dias', text: 'nos últimos 30 dias' },
  { days: 90, label: '90 dias', text: 'nos últimos 90 dias' },
  { days: null, label: 'Tudo', text: 'desde o primeiro registro' },
]

// Com menos dias de histórico que isto, ranking e comparação não significam nada.
const MIN_DAYS_USAGE = 3
const MIN_DAYS_RATINGS = 5
// diferença de nota (em estrelas) a partir da qual vale comentar
const RATING_GAP = 0.3

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`
const days = (n) => count(n, 'dia', 'dias')

function Skeleton({ rows = 3 }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span className="skeleton" key={i} />
      ))}
    </div>
  )
}

// Um bloco da tela. `stat` vem do useStat: mostra esqueleto enquanto carrega e,
// se falhar, o erro fica só neste cartão.
function StatCard({ title, hint, stat, rows, children }) {
  return (
    <section className="stat-card">
      <h2>{title}</h2>
      {hint && <p className="small muted stat-hint">{hint}</p>}
      {stat.loading ? (
        <>
          <Skeleton rows={rows} />
          <span className="visually-hidden" role="status">
            Carregando {title}...
          </span>
        </>
      ) : stat.error ? (
        <p className="msg msg-error" role="alert">
          Não deu para carregar este bloco agora. Tente de novo em instantes.
        </p>
      ) : (
        children(stat.data)
      )}
    </section>
  )
}

// Bolinha com a cor real da peça. A borda mantém branco e bege visíveis.
function ColorDot({ color }) {
  const hex = hexOfColor(color)
  return <span className={hex ? 'color-dot' : 'color-dot color-dot-unknown'} style={hex ? { background: hex } : undefined} />
}

function Thumb({ item }) {
  return (
    <span className="stat-thumb">
      <img src={item.image_url} alt={`${item.category} ${item.color}`} loading="lazy" />
    </span>
  )
}

// 1) Resumo
function Summary({ stat, period }) {
  return (
    <StatCard title="Resumo" stat={stat} rows={2}>
      {([s]) => (
        <div className="kpis">
          <div className="kpi">
            <strong>{s.total_items}</strong>
            <span>{s.total_items === 1 ? 'peça' : 'peças'}</span>
          </div>
          <div className="kpi">
            <strong>{s.total_outfits}</strong>
            <span>{s.total_outfits === 1 ? 'conjunto salvo' : 'conjuntos salvos'}</span>
          </div>
          <div className="kpi">
            <strong>{s.days_logged}</strong>
            <span>
              {s.days_logged === 1 ? 'dia com look' : 'dias com look'} {period.text}
            </span>
          </div>
        </div>
      )}
    </StatCard>
  )
}

// 2) Peças mais usadas
function TopItems({ period }) {
  const stat = useStat('stats_top_items', period.days)
  return (
    <StatCard title="Peças mais usadas" hint={`Em quantos dias cada peça saiu do armário ${period.text}.`} stat={stat} rows={5}>
      {(items) => (
        <ol className="rank">
          {items.map((it, i) => (
            <li key={it.id}>
              <span className="rank-pos">{i + 1}</span>
              <Thumb item={it} />
              <span className="rank-name">
                <strong>{it.category}</strong>
                <span className="small muted">{it.color}</span>
              </span>
              <span className="rank-value">{days(it.days_used)}</span>
            </li>
          ))}
        </ol>
      )}
    </StatCard>
  )
}

// 3) Peças esquecidas no armário
function ForgottenItems({ period }) {
  const stat = useStat('stats_forgotten_items', period.days)
  return (
    <StatCard
      title="Esquecidas no armário"
      hint={`Peças sem nenhum uso ${period.text} e cadastradas há mais de 30 dias.`}
      stat={stat}
      rows={3}
    >
      {(items) =>
        items.length === 0 ? (
          <p className="stat-happy">Nenhuma peça esquecida, você usa tudo ♥</p>
        ) : (
          <>
            <ul className="thumb-grid">
              {items.map((it) => (
                <li key={it.id}>
                  <Thumb item={it} />
                </li>
              ))}
            </ul>
            <p className="small muted stat-foot">
              {count(items[0].total, 'peça esperando', 'peças esperando')} uma chance
              {items[0].total > items.length ? `. Aqui estão as ${items.length} mais antigas.` : '.'}
            </p>
          </>
        )
      }
    </StatCard>
  )
}

// 4) Conjunto mais usado
function TopOutfit({ period }) {
  const stat = useStat('stats_top_outfit', period.days)
  return (
    <StatCard title="Conjunto mais usado" stat={stat} rows={3}>
      {(outfit) => {
        if (!outfit) {
          return (
            <p className="muted stat-note">
              Nenhum conjunto salvo foi registrado {period.text}. Looks avulsos não entram nesta conta.
            </p>
          )
        }
        const rating = outfitRating(outfit.outfit_items.map((link) => link.item))
        return (
          <div className="look stat-look">
            <OutfitStack links={outfit.outfit_items} small />
            <div className="look-info">
              <strong>{outfit.name || 'Conjunto sem nome'}</strong>
              <span>
                Usado em {days(outfit.days_used)} {period.text}
              </span>
              {rating !== null && <OutfitRating value={rating} small />}
            </div>
          </div>
        )
      }}
    </StatCard>
  )
}

// 5) Categorias: barras horizontais, a categoria com mais peças em destaque
function Categories() {
  const stat = useStat('stats_categories')
  return (
    <StatCard title="Categorias" hint="Quantas peças de cada tipo há no guarda-roupa hoje." stat={stat} rows={5}>
      {(rows) => {
        if (rows.length === 0) return <p className="muted stat-note">Adicione peças para ver as categorias por aqui.</p>
        const max = rows[0].total
        const leaders = rows.filter((r) => r.total === max)
        return (
          <>
            <ul className="bars">
              {rows.map((r) => (
                <li key={r.category} className={r.total === max ? 'is-top' : undefined}>
                  <span className="bar-label">{r.category}</span>
                  <span className="bar-plot">
                    <span className="bar-fill" style={{ width: `${(r.total / max) * 100}%` }} />
                  </span>
                  <span className="bar-value">{r.total}</span>
                </li>
              ))}
            </ul>
            {leaders.length === 1 && rows.length > 1 && (
              <p className="small muted stat-foot">
                O que você mais tem é <strong>{leaders[0].category}</strong>.
              </p>
            )}
          </>
        )
      }}
    </StatCard>
  )
}

// 6) Cores do guarda-roupa e, se houver histórico, as cores mais vestidas
function Colors({ period, showWorn }) {
  const stat = useStat('stats_colors')
  return (
    <StatCard title="Cores" hint="Como as cores se dividem entre as peças cadastradas." stat={stat} rows={5}>
      {(rows) => {
        if (rows.length === 0) return <p className="muted stat-note">Adicione peças para ver as cores por aqui.</p>
        const total = rows.reduce((sum, r) => sum + r.total, 0)
        const max = rows[0].total
        const single = rows.filter((r) => r.total === max).length === 1
        return (
          <>
            {/* parte do todo: uma barra só, com a cor real de cada peça */}
            <div className="color-bar" aria-hidden="true">
              {rows.map((r) => (
                <span
                  key={r.color}
                  className={hexOfColor(r.color) ? undefined : 'color-dot-unknown'}
                  style={{ flexGrow: r.total, background: hexOfColor(r.color) ?? undefined }}
                />
              ))}
            </div>
            <ul className="color-list">
              {rows.map((r) => {
                const top = single && r.total === max
                return (
                  <li key={r.color} className={top ? 'is-top' : undefined}>
                    <ColorDot color={r.color} />
                    <span className="color-name">
                      {r.color}
                      {top && <span className="tag">predominante</span>}
                    </span>
                    <span className="small muted">{count(r.total, 'peça', 'peças')}</span>
                    <span className="color-pct">{Math.round((r.total / total) * 100)}%</span>
                  </li>
                )
              })}
            </ul>
            {showWorn && <WornColors period={period} />}
          </>
        )
      }}
    </StatCard>
  )
}

function WornColors({ period }) {
  const stat = useStat('stats_worn_colors', period.days)
  if (stat.loading) return <Skeleton rows={2} />
  if (stat.error || stat.data.length === 0) return null
  return (
    <div className="worn-colors">
      <h3>Cores que você mais veste</h3>
      <p className="small muted stat-hint">Dias {period.text} em que você usou pelo menos uma peça da cor.</p>
      <ol className="worn-list">
        {stat.data.map((r) => (
          <li key={r.color}>
            <ColorDot color={r.color} />
            <span className="color-name">{r.color}</span>
            <span className="small muted">{days(r.days_used)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// 7) Média das notas: o que ela veste contra o guarda-roupa inteiro
function Ratings({ period }) {
  const stat = useStat('stats_ratings', period.days)
  return (
    <StatCard title="Você veste o que mais gosta?" stat={stat} rows={3}>
      {([r]) => {
        if (r.days_logged < MIN_DAYS_RATINGS) {
          return (
            <p className="muted stat-note">
              Esta comparação aparece com pelo menos {MIN_DAYS_RATINGS} dias registrados no período. Por enquanto são{' '}
              {r.days_logged}.
            </p>
          )
        }
        if (r.worn_avg === null || r.closet_avg === null) {
          return <p className="muted stat-note">Dê estrelas às suas peças para ver esta comparação.</p>
        }
        const worn = Number(r.worn_avg)
        const closet = Number(r.closet_avg)
        const gap = worn - closet
        return (
          <>
            <dl className="rating-pair">
              <div>
                <dt>O que você vestiu {period.text}</dt>
                <dd>
                  <OutfitRating value={worn} />
                </dd>
              </div>
              <div>
                <dt>Guarda-roupa inteiro</dt>
                <dd>
                  <OutfitRating value={closet} />
                </dd>
              </div>
            </dl>
            <p className="stat-foot">
              {gap >= RATING_GAP
                ? 'Sim: você veste mesmo o que mais gosta ♥'
                : gap <= -RATING_GAP
                  ? 'Suas favoritas estão ficando no armário. Que tal dar mais chance a elas?'
                  : 'Você usa um pouco de tudo, sem deixar as favoritas de lado.'}
            </p>
          </>
        )
      }}
    </StatCard>
  )
}

export default function Stats({ onGoCalendar }) {
  const [period, setPeriod] = useState(PERIODS[0])
  const summary = useStat('stats_summary', period.days)
  const s = summary.data?.[0]

  // O resumo decide o que os blocos de uso mostram:
  //   never = nenhum look registrado até hoje   few = poucos dias no período
  // Enquanto ele carrega, os blocos de uso já vão buscando os próprios dados.
  let usage = 'ok'
  if (summary.error) usage = 'error'
  else if (s && s.days_logged_all === 0) usage = 'never'
  else if (s && s.days_logged < MIN_DAYS_USAGE) usage = 'few'

  const all = PERIODS[PERIODS.length - 1]

  return (
    <div className="page page-narrow stats">
      <button className="link-btn back-link" onClick={onGoCalendar}>
        <Chevron left /> Calendário
      </button>
      <h1>Estatísticas</h1>

      <div className="chip-row" role="group" aria-label="Período dos blocos de uso">
        {PERIODS.map((p) => (
          <Chip key={p.label} selected={p === period} onClick={() => setPeriod(p)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <Summary stat={summary} period={period} />

      {usage === 'never' && (
        <div className="empty">
          <CalendarIcon size={40} />
          <h2>As estatísticas nascem do calendário.</h2>
          <p>
            Conforme você marca “Usei hoje”, aparecem aqui as peças mais usadas, as esquecidas e as cores que você mais
            veste.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={onGoCalendar}>
            Ir para o calendário
          </button>
        </div>
      )}

      {usage === 'few' && (
        <section className="stat-card">
          <h2>Ainda é cedo para os rankings</h2>
          <p className="muted stat-note">
            {s.days_logged === 0
              ? `Nenhum look registrado ${period.text}.`
              : `Só ${days(s.days_logged)} com look ${period.text}.`}{' '}
            As peças mais usadas e as esquecidas aparecem a partir de {MIN_DAYS_USAGE} dias, para os números fazerem
            sentido.
          </p>
          <div className="btn-row">
            {period !== all && s.days_logged_all >= MIN_DAYS_USAGE && (
              <button className="btn btn-soft btn-sm" onClick={() => setPeriod(all)}>
                Ver o histórico todo
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={onGoCalendar}>
              Ir para o calendário
            </button>
          </div>
        </section>
      )}

      {usage === 'ok' && (
        <>
          <TopItems period={period} />
          <ForgottenItems period={period} />
          <TopOutfit period={period} />
        </>
      )}

      {/* guarda-roupa atual: não dependem do período nem do histórico */}
      <Categories />
      <Colors period={period} showWorn={usage === 'ok'} />

      {usage === 'ok' && <Ratings period={period} />}
    </div>
  )
}
