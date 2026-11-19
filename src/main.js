import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import '@fontsource/barlow-condensed/latin-900-italic.css'
import './style.css'
import { boostSlotCount, createRace, trackOutline } from './race.js'
import { configureCircuit, makeTrack } from './circuit.js'
import { circuits, drivers, karts, selectProfile } from './garage.js'

const iconPaths = {
  bolt: '<path d="M13 2 4 14h7l-1 8 10-12h-7l1-8z"/>',
  flag: '<path d="M5 21V4m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0"/><path d="M5 9c5-4 9 4 15 0M10 4v11m5-10v11"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zm6-3v15m6-12v15"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  pause: '<path d="M9 5v14m6-14v14" stroke-width="3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 15h6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  car: '<path d="m5 11 2-5h10l2 5m-16 4v4m18-4v4M3 16h18v-4l-2-1H5l-2 1zm4-2h1m8 0h1"/>',
  user: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
}
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`
const logo = '<svg width="34" height="30" viewBox="0 0 34 30" aria-hidden="true"><path fill="#31dfef" d="M15 2h9l9 25h-8l-2.9-8H12l3.9-6h4.2l-1.9-5L6 27H0z"/><path fill="#31dfef" opacity=".35" d="M8 2h4L1 20v-6z"/></svg>'

function readLocal(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}
const [savedCircuit, savedDriver, savedKart] = selectProfile(new URLSearchParams(readLocal('apex-garage', {})))
const selected = { track: savedCircuit.id, driver: savedDriver.id, kart: savedKart.id }
const raceParams = new URLSearchParams(selected)
for (const [key, value] of new URLSearchParams(location.search)) raceParams.set(key, value)
const [circuit, driver, kart] = selectProfile(raceParams)
const asset = (file) => import.meta.env.BASE_URL + file
const toPath = (coordinates) => coordinates.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ' Z'
const circuitCards = circuits.map((entry) => {
  const outline = toPath(trackOutline(makeTrack(entry.nodes).points))
  return `<button class="choice route-choice" type="button" data-category="track" data-choice="${entry.id}" aria-pressed="false" style="--choice:${entry.color}">
    <div class="route-art" style="background-image:url('${asset('track-' + entry.id + '.webp')}')"><svg viewBox="0 0 240 136" aria-hidden="true"><path d="${outline}"/></svg></div>
    <div class="choice-caption"><span>${entry.english} · ${entry.laps} LAP</span><strong>${entry.name}</strong><small>${entry.description}</small></div></button>`
}).join('')
const driverCards = drivers.map((entry) => `<button class="choice driver-choice" type="button" data-category="driver" data-choice="${entry.id}" aria-pressed="false">
  <img src="${asset(entry.image)}" alt=""><div class="choice-caption"><span>${entry.english}</span><strong>${entry.name}</strong></div></button>`).join('')
const kartCards = karts.map((entry) => `<button class="choice kart-choice" type="button" data-category="kart" data-choice="${entry.id}" aria-pressed="false" style="--choice:${entry.color}">
  <img src="${asset('kart-' + entry.id + '.webp')}" alt=""><div class="choice-caption"><span>${entry.english}</span><strong>${entry.name}</strong></div></button>`).join('')

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div class="nav-shell">
      <a class="brand" href="#home" aria-label="Apex Kart">${logo}<span>APEX<span class="accent">KART</span></span></a>
      <nav aria-label="메인 메뉴">
        <button class="nav-tab active" id="homeTab" type="button">${icon('flag')}<span>홈</span></button>
      </nav>

    </div>
  </header>
  <main class="shell">
    <section class="page-heading" id="pageHeading" hidden>
      <div>
        <p class="eyebrow"><span></span> ARCADE RACING</p>
        <h1 id="pageTitle">선셋 코스트 <em>서킷</em></h1>
        <p id="pageDescription">해안 도로를 질주하며 가장 빠른 랩에 도전하세요.</p>
      </div>

    </section>
    <section id="homePage" class="home-hero" style="--home-image:url('${asset('home-coast.webp')}')">
      <div class="home-title">
        <p class="eyebrow"><span></span> ARCADE RACING</p>
        <h1>APEX <em>KART</em></h1>
      </div>
      <div class="home-modes" aria-label="플레이 모드">
        <a href="#single" class="home-mode primary">${icon('flag', 23)} <strong>싱글 플레이</strong> ${icon('chevron')}</a>
        <button type="button" class="home-mode" disabled>${icon('lock', 22)} <strong>멀티 플레이</strong><small>준비 중</small></button>
      </div>
      <a href="#room" class="home-room">${icon('car', 23)} <strong>마이룸</strong> ${icon('chevron', 16)}</a>
    </section>
    <section id="singlePage" class="lobby" hidden>
      <div class="choices route-choices" role="group" aria-label="서킷 선택">${circuitCards}</div>
      <div class="lobby-actions"><a href="#home" class="outline-button">뒤로</a><a href="#records" class="start-button">확인 ${icon('chevron', 18)}</a></div>
    </section>
    <section id="roomPage" class="lobby" hidden>
      <div class="garage-grid">
        <section class="panel garage-section">
          <div class="panel-heading">${icon('user')}<h2>드라이버 선택</h2></div>
          <div class="choices driver-choices" role="group" aria-label="드라이버 선택">${driverCards}</div>
        </section>
        <section class="panel garage-section">
          <div class="panel-heading">${icon('car')}<h2>카트바디 선택</h2></div>
          <div class="choices kart-choices" role="group" aria-label="카트 선택">${kartCards}</div>
        </section>
      </div>
      <div class="lobby-actions"><a href="#home" class="start-button">완료 ${icon('chevron', 18)}</a></div>
    </section>
    <section id="recordsPage" hidden>
      <div class="record-grid">
        <section class="panel record-panel">
          <div class="panel-heading">${icon('clock', 20)}<h2>타임어택 기록</h2></div>
          <p id="emptyRecords">아직 완주 기록이 없습니다.</p>
          <ol id="recordList" class="record-list"></ol>
        </section>
        <section class="panel record-map" id="recordMap"></section>
      </div>
      <div class="lobby-actions"><a href="#single" class="outline-button">맵 다시 선택</a>
        <button type="button" id="startRace" class="start-button">${icon('flag', 20)} 레이스 시작 ${icon('chevron', 18)}</button>
      </div>
    </section>
    <div id="racePage" hidden>
      <div class="dashboard">
        <section class="game-card" aria-label="레이싱 경기">
          <div class="stage" id="stage" aria-label="3D ${circuit.name} 서킷" tabindex="0">
            <div id="viewport"></div>
            <div class="stage-edge"></div>
            <div class="race-hud">
              <div class="stat"><span>LAP</span><strong id="lap">1<small> / ${circuit.laps}</small></strong></div>
              <div class="stat time"><span>TIME</span><strong id="time">00:00.000</strong></div>
            </div>
            <button class="pause-button" type="button" id="pause" aria-label="일시정지">${icon('pause', 17)} <kbd>Esc</kbd></button>
            <dialog id="pauseDialog" class="pause-dialog" aria-labelledby="pauseTitle">
              <h2 id="pauseTitle">일시정지</h2>
              <button type="button" class="start-button" id="resume" autofocus>계속하기</button>
              <button type="button" class="outline-button" id="restart">재시작</button>
              <button type="button" class="outline-button" id="leave">화면 나가기</button>
            </dialog>
            <button class="fullscreen" type="button" id="fullscreen" aria-label="전체 화면" title="전체 화면">${icon('expand', 20)}</button>
            <div class="notice" id="notice" hidden></div>
            <div class="race-countdown" id="raceCountdown" hidden>
              <span id="countdownNumber" role="status"></span>
            </div>
            <div class="wrong-way" id="wrongWay" role="status" hidden>
              <span aria-hidden="true">↶</span><strong>역주행</strong><small>진행 방향으로 돌아가세요</small>
            </div>
            <div class="boost-hud" id="boostHud" data-state="charge">
              <div class="boost-slots" id="boostSlots" role="img" aria-label="저장한 부스터 0개">
                ${Array.from({ length: boostSlotCount }, () => `<span class="boost-slot">${icon('bolt', 16)}</span>`).join('')}
              </div>
              <div class="boost-details">
                <div><strong>BOOST</strong><span id="boostStatus">드리프트로 충전</span></div>
                <progress id="boostMeter" max="100" value="0" aria-label="다음 부스터 충전량"></progress>
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
          <span><kbd>↑</kbd> <kbd>W</kbd> 가속</span><span><kbd>↓</kbd> <kbd>S</kbd> 브레이크 · 후진</span><span><kbd>←</kbd><kbd>→</kbd> <kbd>A</kbd><kbd>D</kbd> 방향 전환</span><span><kbd>Shift</kbd> 드리프트</span><span><kbd>Ctrl</kbd> 부스터</span><span><kbd>Esc</kbd> 일시정지</span>
        </div>
      </section>
    </div>
    <footer class="footer"><span>APEX KART</span><span>ARCADE RACING</span></footer>
  </main>
`

const byId = (id) => document.getElementById(id)
const stage = byId('stage')
const notice = byId('notice')
const boostSlots = byId('boostSlots')
const slots = [...boostSlots.children]
const formatTime = (value) => {
  const ms = Math.floor(value * 1000)
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}
let race
let raceInitialized = false
let recorded = false
const pauseDialog = byId('pauseDialog')
const recordKey = (track) => `apex-records-${track.id}-${track.laps}`
function recordsFor(track) {
  const saved = readLocal(recordKey(track), [])
  return Array.isArray(saved) ? saved.filter((time) => Number.isFinite(time) && time > 0) : []
}
function showRecords() {
  const track = circuits.find((entry) => entry.id === selected.track)
  const times = recordsFor(track)
  byId('recordList').innerHTML = times.map((time) => `<li><strong>${formatTime(time)}</strong></li>`).join('')
  byId('emptyRecords').hidden = times.length > 0
  byId('recordMap').innerHTML = `<img src="${asset('track-' + track.id + '.webp')}" alt="">
    <div><span>${track.english} · ${track.laps} LAP</span><h2>${track.name}</h2><p>${track.description}</p></div>`
}
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
    race = createRace(byId('viewport'), driver, kart, circuit.laps, (state) => {
      byId('lap').firstChild.textContent = state.lap
      byId('time').textContent = formatTime(state.time)
      byId('best').textContent = state.best ? formatTime(state.best) : '--:--.---'
      byId('speed').textContent = String(state.speed).padStart(3, '0')
      byId('speedArc').style.strokeDasharray = `${Math.max(2, state.speed / 3)} 100`
      const boostState = state.boost ? 'active' : state.boostSlots > 0 ? 'ready' : state.drifting ? 'drift' : 'charge'
      byId('boostHud').dataset.state = boostState
      byId('boostMeter').value = state.boostSlots === boostSlotCount ? 100 : Math.round(state.charge * 100)
      const slotLabel = `저장한 부스터 ${state.boostSlots}개 / ${boostSlotCount}칸`
      if (boostSlots.getAttribute('aria-label') !== slotLabel) boostSlots.setAttribute('aria-label', slotLabel)
      slots.forEach((slot, index) => slot.classList.toggle('filled', index < state.boostSlots))
      const boostLabel = {
        active: '', ready: 'Ctrl 사용', drift: '드리프트 중', charge: '드리프트로 충전',
      }[boostState]
      byId('boostStatus').textContent = state.quickBoost ? '순간 부스터' : state.launchBoost ? '출발 부스터' : boostLabel
      const [x, y] = outline[state.index]
      byId('trackDot').setAttribute('cx', x)
      byId('trackDot').setAttribute('cy', y)
      const counting = state.countdown > 0
      byId('raceCountdown').hidden = !counting && !state.showGo
      byId('raceCountdown').classList.toggle('launch-ready', state.launchReady || state.showGo)
      const countText = counting ? String(state.countdown) : 'GO!'
      if (byId('countdownNumber').textContent !== countText) byId('countdownNumber').textContent = countText
      byId('wrongWay').hidden = !state.wrongWay
      notice.hidden = !state.finished
      if (state.finished) {
        notice.textContent = `완주!  ${formatTime(state.time)}`
        if (!recorded) {
          writeLocal(recordKey(circuit), [...recordsFor(circuit), state.time].sort((a, b) => a - b).slice(0, 5))
          recorded = true
        }
      }
    })
  } catch (error) {
    console.error(error)
    notice.textContent = '3D 화면을 열 수 없습니다. WebGL을 지원하는 브라우저에서 다시 시도해 주세요.'
    notice.hidden = false
  }
}

const pageInfo = {
  single: ['서킷 <em>선택</em>', '타임어택에 도전할 서킷을 고르세요.'],
  room: ['마이<em>룸</em>', '출전할 캐릭터와 카트바디를 고르세요.'],
  records: ['타임<em>어택</em>', '선택한 서킷의 완주 기록입니다.'],
  race: [`${circuit.name} <em>서킷</em>`, circuit.description],
}
const pages = ['home', ...Object.keys(pageInfo)]
function syncPage() {
  const requested = location.hash.slice(1)
  const page = pages.includes(requested) ? requested : 'home'
  for (const name of pages) byId(`${name}Page`).hidden = name !== page
  byId('pageHeading').hidden = page === 'home'
  byId('homeTab').setAttribute('aria-current', page === 'home' ? 'page' : 'false')
  if (pageInfo[page]) {
    const [title, description] = pageInfo[page]
    byId('pageTitle').innerHTML = title
    byId('pageDescription').textContent = description
  }
  if (page === 'records') showRecords()
  if (page === 'race') {
    initRace()
    stage.focus({ preventScroll: true })
  } else if (pauseDialog.open) pauseDialog.close()
  race?.setActive(page === 'race' && !pauseDialog.open)
  window.scrollTo(0, 0)
}

function togglePause() {
  if (!race || location.hash !== '#race') return
  if (pauseDialog.open) {
    pauseDialog.close()
    race.setActive(true)
    stage.focus({ preventScroll: true })
  } else {
    race.setActive(false)
    pauseDialog.showModal()
  }
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
    writeLocal('apex-garage', selected)
    syncChoices()
  }
}
syncChoices()

byId('startRace').onclick = () => {
  if (selected.track === circuit.id && selected.driver === driver.id && selected.kart === kart.id) {
    recorded = false
    race?.reset()
    location.hash = '#race'
    return
  }
  const url = new URL(location.href)
  for (const [key, value] of Object.entries(selected)) url.searchParams.set(key, value)
  url.hash = '#race'
  location.assign(url)
}
byId('homeTab').onclick = () => { location.hash = '#home' }
window.addEventListener('hashchange', syncPage)
syncPage()

byId('pause').onclick = togglePause
byId('resume').onclick = togglePause
byId('restart').onclick = () => {
  recorded = false
  race.reset()
  togglePause()
}
byId('leave').onclick = () => {
  pauseDialog.close()
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  location.hash = '#home'
}
pauseDialog.addEventListener('cancel', (event) => {
  event.preventDefault()
  togglePause()
})
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && !event.repeat && location.hash === '#race') {
    event.preventDefault()
    togglePause()
  }
})
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
    race?.setKey(button.dataset.key, true, event.pointerId)
  })
  button.addEventListener('lostpointercapture', (event) => race?.setKey(button.dataset.key, false, event.pointerId))
}
