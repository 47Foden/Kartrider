import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import '@fontsource/barlow-condensed/latin-900-italic.css'
import './style.css'
import { createRace, trackOutline } from './race.js'
import { configureCircuit, makeTrack } from './circuit.js'
import { circuits, drivers, karts, selectProfile } from './garage.js'

const iconPaths = {
  bolt: '<path d="M13 2 4 14h7l-1 8 10-12h-7l1-8z"/>',
  flag: '<path d="M5 21V4m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0"/><path d="M5 9c5-4 9 4 15 0M10 4v11m5-10v11"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zm6-3v15m6-12v15"/>',
  marker: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  reset: '<path d="M3 12a9 9 0 1 1 3 6.7M3 5v7h7"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 15h6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/>',
  car: '<path d="m5 11 2-5h10l2 5m-16 4v4m18-4v4M3 16h18v-4l-2-1H5l-2 1zm4-2h1m8 0h1"/>',
  user: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
}
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`
const logo = '<svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true"><path fill="#31dfef" d="M15 2h9l9 25h-8l-2.9-8H12l3.9-6h4.2l-1.9-5L6 27H0z"/><path fill="#31dfef" opacity=".35" d="M8 2h4L1 20v-6z"/></svg>'

const [circuit, driver, kart] = selectProfile(new URLSearchParams(location.search))
const selected = { track: circuit.id, driver: driver.id, kart: kart.id }
const asset = (file) => import.meta.env.BASE_URL + file
const toPath = (coordinates) => coordinates.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z'
const circuitCards = circuits.map((entry) => {
  const outline = toPath(trackOutline(makeTrack(entry.nodes).points))
  return `<button class="choice route-choice" type="button" data-category="track" data-choice="${entry.id}" aria-pressed="false" style="--choice:${entry.color}">
    <div class="route-art" style="background-image:url('${asset('track-' + entry.id + '.webp')}')"><svg viewBox="0 0 240 136" aria-hidden="true"><path d="${outline}"/></svg></div>
    <div class="choice-caption"><span>${entry.english}</span><strong>${entry.name}</strong><small>${entry.description}</small></div></button>`
}).join('')
const driverCards = drivers.map((entry) => `<button class="choice driver-choice" type="button" data-category="driver" data-choice="${entry.id}" aria-pressed="false">
  <img src="${asset(entry.image)}" alt=""><div class="choice-caption"><span>${entry.english}</span><strong>${entry.name}</strong></div></button>`).join('')
const kartCards = karts.map((entry) => `<button class="choice kart-choice" type="button" data-category="kart" data-choice="${entry.id}" aria-pressed="false" style="--choice:${entry.color}">
  <img src="${asset('kart-' + entry.id + '.webp')}" alt=""><div class="choice-caption"><span>${entry.english}</span><strong>${entry.name}</strong></div></button>`).join('')

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div class="nav-shell">
      <a class="brand" href="#lobby" aria-label="Apex Kart">${logo}<span>APEX<span class="accent">KART</span></span></a>
      <nav aria-label="메인 메뉴">
        <button class="nav-tab active" id="raceTab" type="button">${icon('flag')}<span>레이스 준비</span></button>
        <button class="nav-tab" id="mapsTab" type="button">${icon('map')}<span>구글 지도</span></button>
      </nav>
      <span class="mode"><i></i>싱글 플레이</span>
    </div>
  </header>
  <main class="shell">
    <section class="page-heading">
      <div>
        <p class="eyebrow"><span></span> ARCADE RACING</p>
        <h1 id="pageTitle">선셋 코스트 <em>서킷</em></h1>
        <p id="pageDescription">해안 도로를 질주하며 가장 빠른 랩에 도전하세요.</p>
      </div>
      <button type="button" class="outline-button" id="reset" hidden aria-label="레이스 다시 시작">${icon('reset', 17)} 다시 시작</button>
    </section>
    <div id="lobbyPage" class="lobby">
      <section class="garage-section">
        <div class="panel-heading">${icon('map')}<h2>서킷 선택</h2></div>
        <div class="choices route-choices" role="group" aria-label="서킷 선택">${circuitCards}</div>
      </section>
      <div class="garage-grid">
        <section class="panel garage-section">
          <div class="panel-heading">${icon('user')}<h2>드라이버 선택</h2></div>
          <div class="choices driver-choices" role="group" aria-label="드라이버 선택">${driverCards}</div>
        </section>
        <section class="panel garage-section">
          <div class="panel-heading">${icon('car')}<h2>카트 선택</h2></div>
          <div class="choices kart-choices" role="group" aria-label="카트 선택">${kartCards}</div>
        </section>
      </div>
      <div class="lobby-actions">
        <span>타임 어택 <i></i> 3 LAP</span>
        <button type="button" id="startRace" class="start-button">${icon('flag', 20)} 레이스 시작 ${icon('chevron', 18)}</button>
      </div>
    </div>
    <div id="racePage" hidden>
      <div class="dashboard">
        <section class="game-card" aria-label="레이싱 경기">
          <div class="stage" id="stage" aria-label="3D ${circuit.name} 서킷" tabindex="0">
            <div id="viewport"></div>
            <div class="stage-edge"></div>
            <div class="race-hud">
              <div class="stat"><span>LAP</span><strong id="lap">1<small> / 3</small></strong></div>
              <div class="stat time"><span>TIME</span><strong id="time">00:00.000</strong></div>
            </div>
            <button class="fullscreen" type="button" id="fullscreen" aria-label="전체 화면" title="전체 화면">${icon('expand', 20)}</button>
            <div class="notice" id="notice" hidden></div>
            <div class="race-start" id="raceStart"><span class="ready-dot"></span> <span><kbd>↑</kbd> 키로 출발</span></div>
            <div class="boost-hud" id="boostHud" data-state="charge">
              ${icon('bolt', 18)}
              <div class="boost-details">
                <div><strong>BOOST</strong><span id="boostStatus">드리프트로 충전</span></div>
                <progress id="boostMeter" max="100" value="0" aria-label="부스터 충전량"></progress>
              </div>
            </div>
            <div class="speedometer" aria-label="속도계">
              <svg viewBox="0 0 120 104" aria-hidden="true"><path class="gauge-bg" d="M21 87a49 49 0 1 1 78 0"/><path id="speedArc" class="gauge-line" pathLength="100" d="M21 87a49 49 0 1 1 78 0"/></svg>
              <div class="speed-value"><strong id="speed">000</strong><span>KM/H</span></div>
            </div>
            <div class="touch-controls" aria-label="터치 조작">
              <div><button type="button" data-key="ArrowLeft" aria-label="좌회전">←</button><button type="button" data-key="ArrowRight" aria-label="우회전">→</button><button type="button" class="action-key" data-key="Shift" aria-label="드리프트">DRIFT</button></div>
              <div><button type="button" data-key="ArrowDown" aria-label="브레이크">↓</button><button type="button" data-key="ArrowUp" aria-label="가속">↑</button><button type="button" class="action-key" data-key="Control" aria-label="부스터">${icon('bolt', 19)}</button></div>
            </div>
          </div>
          <div class="stage-footer">
            <div>${icon('flag', 17)} <strong>${circuit.name}</strong><span class="separator"></span><span>타임 어택</span></div>
            <span class="best">BEST LAP <strong id="best">--:--.---</strong></span>
          </div>
        </section>
        <aside class="sidebar" aria-label="레이스 정보">
          <section class="panel circuit-panel">
            <div class="panel-heading">${icon('map', 17)}<h2>서킷 맵</h2></div>
            <div class="track-preview">
              <svg id="trackMap" viewBox="0 0 240 136" role="img" aria-label="주행 위치가 표시된 서킷 지도">
                <path id="trackShadow" fill="none" stroke="#15414e" stroke-width="9" stroke-linejoin="round"/>
                <path id="trackPath" fill="none" stroke="#39dfef" stroke-width="2.5" stroke-linejoin="round"/>
                <circle id="trackDot" r="4.5" fill="#ffce4a" stroke="#fff4bb" stroke-width="1.3"/>
              </svg>
            </div>
            <button type="button" class="map-link" id="openMap">${icon('marker', 15)}<span>Google 지도 열기</span>${icon('chevron', 15)}</button>
          </section>
          <section class="panel driver-panel">
            <div class="panel-heading">${icon('user', 17)}<h2>드라이버</h2></div>
            <div class="driver"><img src="${asset(driver.image)}" alt="${driver.name}"><div><strong>${driver.name}</strong><span>${driver.english}</span></div></div>
            <div class="kart-label">${icon('car', 17)}<span>카트</span><strong>${kart.name}</strong></div>
          </section>
        </aside>
      </div>
      <section class="panel controls" aria-label="키보드 조작법">
        <div class="panel-heading">${icon('keyboard', 20)}<h2>조작법</h2></div>
        <div class="control-list">
          <span><kbd>↑</kbd> 가속</span><span><kbd>↓</kbd> 브레이크 · 후진</span><span><kbd>←</kbd><kbd>→</kbd> 방향 전환</span><span><kbd>Shift</kbd> 드리프트</span><span><kbd>Ctrl</kbd> 부스터</span><span><kbd>R</kbd> 다시 시작</span>
        </div>
      </section>
    </div>
    <section id="mapsPage" class="panel map-page" hidden>
      <form id="locationForm" class="map-form">
        <label for="location">${icon('marker')} Google 지도 검색</label>
        <div class="search-group"><input type="search" id="location" value="${circuit.place}" required maxlength="160"><button class="outline-button" type="submit">${icon('search', 17)} 검색</button></div>
        <a id="externalMap" target="_blank" rel="noopener noreferrer">Google Maps에서 열기 ${icon('chevron', 15)}</a>
      </form>
      <iframe id="googleMap" title="Google 지도" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      <p class="map-caption">서킷의 배경이 된 장소를 둘러보거나 다른 지역을 검색해 보세요.</p>
    </section>
    <footer class="footer"><span>APEX KART</span><span>ARCADE RACING</span></footer>
  </main>
`

const byId = (id) => document.getElementById(id)
const stage = byId('stage')
const notice = byId('notice')
const formatTime = (value) => {
  const ms = Math.floor(value * 1000)
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}
let race
let raceInitialized = false
function initRace() {
  if (raceInitialized) return
  raceInitialized = true
  configureCircuit(circuit)
  const outline = trackOutline()
  const path = toPath(outline)
  byId('trackPath').setAttribute('d', path)
  byId('trackPath').setAttribute('stroke', circuit.color)
  byId('trackShadow').setAttribute('d', path)
  try {
    race = createRace(byId('viewport'), driver, kart, (state) => {
      byId('lap').firstChild.textContent = state.lap
      byId('time').textContent = formatTime(state.time)
      byId('best').textContent = state.best ? formatTime(state.best) : '--:--.---'
      byId('speed').textContent = String(state.speed).padStart(3, '0')
      byId('speedArc').style.strokeDasharray = `${Math.max(2, state.speed / 3)} 100`
      const boostState = state.boost > 0 ? 'active' : state.charge >= 1 ? 'ready' : state.drifting ? 'drift' : 'charge'
      byId('boostHud').dataset.state = boostState
      byId('boostMeter').value = Math.round((state.boost || state.charge) * 100)
      byId('boostStatus').textContent = {
        active: '부스터 작동 중', ready: '부스터 준비', drift: '드리프트 중', charge: '드리프트로 충전',
      }[boostState]
      const [x, y] = outline[state.index]
      byId('trackDot').setAttribute('cx', x)
      byId('trackDot').setAttribute('cy', y)
      stage.classList.toggle('wall-hit', state.impact > .09)
      byId('raceStart').hidden = state.started
      notice.hidden = !state.finished
      if (state.finished) notice.textContent = `완주!  ${formatTime(state.time)}  ·  R 키로 다시 시작`
    })
  } catch (error) {
    console.error(error)
    notice.textContent = '3D 화면을 열 수 없습니다. WebGL을 지원하는 브라우저에서 다시 시도해 주세요.'
    notice.hidden = false
    byId('raceStart').hidden = true
  }
}

function setMap(place) {
  const query = encodeURIComponent(place)
  byId('googleMap').src = `https://maps.google.com/maps?q=${query}&z=14&output=embed`
  byId('externalMap').href = `https://www.google.com/maps/search/?api=1&query=${query}`
}

function syncPage() {
  const maps = location.hash === '#maps'
  const racing = location.hash === '#race'
  byId('lobbyPage').hidden = maps || racing
  byId('racePage').hidden = !racing
  byId('mapsPage').hidden = !maps
  byId('raceTab').classList.toggle('active', !maps)
  byId('mapsTab').classList.toggle('active', maps)
  byId('raceTab').setAttribute('aria-current', maps ? 'false' : 'page')
  byId('mapsTab').setAttribute('aria-current', maps ? 'page' : 'false')
  byId('reset').hidden = !racing
  byId('pageTitle').innerHTML = maps ? '구글 <em>지도</em>' : racing ? `${circuit.name} <em>서킷</em>` : '레이스 <em>준비</em>'
  byId('pageDescription').textContent = maps ? 'Google 지도에서 실제 장소를 검색하세요.' : racing ? circuit.description : '서킷, 드라이버, 카트를 선택하고 출발하세요.'
  if (racing) {
    initRace()
    stage.focus({ preventScroll: true })
  }
  race?.setActive(racing)
  if (maps && !byId('googleMap').hasAttribute('src')) setMap(byId('location').value)
  window.scrollTo(0, 0)
}

const choices = document.querySelectorAll('[data-choice]')
function syncChoices() {
  for (const button of choices) {
    button.setAttribute('aria-pressed', String(selected[button.dataset.category] === button.dataset.choice))
  }
}
for (const button of choices) {
  button.onclick = () => {
    selected[button.dataset.category] = button.dataset.choice
    syncChoices()
  }
}
syncChoices()

byId('startRace').onclick = () => {
  if (selected.track === circuit.id && selected.driver === driver.id && selected.kart === kart.id) {
    race?.reset()
    location.hash = '#race'
    return
  }
  const url = new URL(location.href)
  for (const [key, value] of Object.entries(selected)) url.searchParams.set(key, value)
  url.hash = '#race'
  location.assign(url)
}
byId('raceTab').onclick = () => { location.hash = '#lobby' }
byId('mapsTab').onclick = byId('openMap').onclick = () => { location.hash = '#maps' }
window.addEventListener('hashchange', syncPage)
syncPage()

byId('locationForm').addEventListener('submit', (event) => {
  event.preventDefault()
  const place = byId('location').value.trim()
  if (place) setMap(place)
})
byId('reset').onclick = () => {
  race?.reset()
  stage.focus({ preventScroll: true })
}
byId('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await stage.requestFullscreen()
  } catch {
    byId('fullscreen').title = '이 브라우저에서 전체 화면을 사용할 수 없습니다.'
  }
}
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? '전체 화면 닫기' : '전체 화면'
  byId('fullscreen').setAttribute('aria-label', label)
  byId('fullscreen').title = label
})

for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    race?.setKey(button.dataset.key, true)
  })
  button.addEventListener('lostpointercapture', () => race?.setKey(button.dataset.key, false))
}
