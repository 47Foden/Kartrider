export const startingCoins = 1000
export const upgradeCost = 100
export const maxUpgrade = 5
export const finishReward = 50
export const speedSettings = {
  base: { label: '기본 속도', initial: 238, increase: 6 },
  boost: { label: '부스터 속도', initial: 300, increase: 8 },
}

export function kartPerformance(wallet, kartId) {
  const levels = wallet.upgrades[kartId] ?? {}
  return Object.fromEntries(Object.entries(speedSettings).map(([kind, setting]) => {
    const level = levels[kind] ?? 0
    return [kind, { level, speed: setting.initial + setting.increase * level }]
  }))
}
