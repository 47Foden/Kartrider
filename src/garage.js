export const circuits = [
  { id: 'coast', laps: 1, name: '선셋 코스트', english: 'SUNSET COAST', description: '야자수가 늘어선 노을빛 해안 도로', color: '#35dfef',
    nodes: [[0,56],[0,-12],[10,-71],[36,-114],[89,-126],[133,-92],[143,-47],[120,-18],[98,5],[120,39],[120,79],[81,112],[28,116],[3,100]] },
  { id: 'mesa', laps: 2, name: '레드 메사', english: 'RED MESA', description: '붉은 협곡과 넓은 헤어핀', color: '#ff9a5e',
    nodes: [[-17,71],[-20,1],[-35,-56],[-25,-105],[22,-131],[77,-108],[109,-71],[164,-60],[166,-5],[128,38],[105,95],[43,121],[4,112]] },
  { id: 'alpine', laps: 1, name: '알파인 패스', english: 'ALPINE PASS', description: '설산 사이를 잇는 연속 코너', color: '#98c5ff',
    nodes: [[5,75],[5,6],[37,-42],[71,-62],[59,-109],[95,-141],[148,-118],[155,-69],[118,-23],[151,25],[128,77],[95,66],[68,111],[25,121]] },
]

export const drivers = [
  { id: 'frost', name: '프로스트', english: 'FROST', image: 'driver.webp', fur: 0xfff6dc, helmet: 0x173b59, trim: 0x28c9e8, ear: 'fox' },
  { id: 'ember', name: '엠버', english: 'EMBER', image: 'driver-ember.webp', fur: 0xe09b68, helmet: 0xa93423, trim: 0xffa748, ear: 'round' },
  { id: 'orbit', name: '오빗', english: 'ORBIT', image: 'driver-orbit.webp', fur: 0xe2e4f3, helmet: 0x493a89, trim: 0x9770ef, ear: 'none' },
]

export const karts = [
  { id: 'sprint', name: '옐로우 스프린트', english: 'SPRINT', color: '#ffce40', body: 0xffbe11, trim: 0xffd52e, width: 1, length: 1 },
  { id: 'comet', name: '크림슨 코멧', english: 'COMET', color: '#ff6959', body: 0xe33132, trim: 0xff6852, width: 1.10, length: .91 },
  { id: 'pulse', name: '블루 펄스', english: 'PULSE', color: '#63b7ff', body: 0x267fdf, trim: 0x5cbcff, width: .91, length: 1.13 },
]

export function selectProfile(params) {
  return [circuits, drivers, karts].map((options, index) =>
    options.find((entry) => entry.id === params.get(['track', 'driver', 'kart'][index])) ?? options[0],
  )
}
