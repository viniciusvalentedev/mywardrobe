import { supabase } from './supabase'
import { rowsOfPick } from '../utils/outfits'

export const LOG_ERROR = 'Não deu para registrar agora. Tente de novo em instantes.'

// Registra um look usado no dia `wornOn` ('AAAA-MM-DD', vindo de utils/dates).
// Log e peças são gravados na mesma transação (função log_outfit no banco).
//   pick:     as peças que estão nos espaços da tela de montar
//   outfitId: conjunto de origem, só informativo. Sem `pick`, o banco copia
//             as peças atuais desse conjunto para o registro.
export function logOutfit({ wornOn, pick = null, outfitId = null }) {
  return supabase.rpc('log_outfit', {
    p_worn_on: wornOn,
    p_items: pick ? rowsOfPick(pick) : null,
    p_outfit_id: outfitId,
  })
}
