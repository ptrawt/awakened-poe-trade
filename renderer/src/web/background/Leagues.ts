import { computed, shallowRef, readonly } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { AppConfig, poeWebApi } from '@/web/Config'
import { Host } from './IPC'

// pc-ggg, pc-garena
export const PERMANENT_SC = ['Standard', '標準模式']
const PERMANENT_HC = ['Hardcore', '專家模式']

interface ApiLeague {
  id: string
  event?: boolean
  rules: Array<{ id: string }>
}

interface TradeApiLeagues {
  result: Array<{ id: string, realm: string }>
}

async function readLeagueJson<T> (path: string): Promise<T> {
  const response = await Host.proxy(`${poeWebApi()}${path}`)
  if (!response.ok) throw new Error(`League request failed (HTTP ${response.status})`)
  return await response.json() as T
}

export async function fetchLeagueIds () {
  try {
    const leagues = await readLeagueJson<ApiLeague[]>('/api/leagues?type=main&realm=pc')
    const ids = leagues.filter(league =>
      !PERMANENT_HC.includes(league.id) &&
      !league.rules.some(rule => rule.id === 'NoParties' ||
        (rule.id === 'HardMode' && !league.event))
    ).map(league => league.id)
    if (ids.length) return ids
  } catch {
    // The public trade catalog can still be available when the ladder API fails.
  }
  const { result } = await readLeagueJson<TradeApiLeagues>('/api/trade/data/leagues')
  const ids = result.filter(league =>
    league.realm === 'pc' && !PERMANENT_HC.includes(league.id) &&
    !/Ruthless|殘暴/.test(league.id)
  ).map(league => league.id)
  if (!ids.length) throw new Error('No trade leagues were returned')
  return ids
}

interface League {
  id: string
  isPopular: boolean
}

export const useLeagues = createGlobalState(() => {
  const isLoading = shallowRef(false)
  const error = shallowRef<string | null>(null)
  const tradeLeagues = shallowRef<League[]>([])

  const selectedId = computed<string | undefined>({
    get () {
      return (tradeLeagues.value.length)
        ? AppConfig().leagueId
        : undefined
    },
    set (id) {
      AppConfig().leagueId = id
    }
  })

  const selected = computed(() => {
    const { leagueId } = AppConfig()
    if (!tradeLeagues.value || !leagueId) return undefined
    const listed = tradeLeagues.value.find(league => league.id === leagueId)
    return {
      id: leagueId,
      realm: AppConfig().realm,
      isPopular: !isPrivateLeague(leagueId) && Boolean(listed?.isPopular)
    }
  })

  async function load () {
    isLoading.value = true
    error.value = null

    try {
      const ids = await fetchLeagueIds()
      tradeLeagues.value = ids.map(id => ({ id, isPopular: true }))

      const leagueIsAlive = tradeLeagues.value.some(league => league.id === selectedId.value)
      if (!leagueIsAlive && !isPrivateLeague(selectedId.value ?? '')) {
        selectedId.value = ids.find(id => !PERMANENT_SC.includes(id) && !/^Hardcore |（專家）$/.test(id)) ?? ids[0]
      }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    selectedId,
    selected,
    list: readonly(tradeLeagues),
    load
  }
})

function isPrivateLeague (id: string) {
  if (id.includes('Ruthless')) {
    return true
  }
  return /\(PL\d+\)$/.test(id)
}
