import * as T from 'three'
import { makeCircuit, points, tangents, roadHalf, startIndex, finishLineIndex } from './circuit.js'
import { makeKart } from './kart.js'

const totalLaps = 3
const arrows = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export function trackOutline() {
  const bounds = new T.Box3().setFromPoints(points)
  const center = bounds.getCenter(new T.Vector3())
  const size = bounds.getSize(new T.Vector3())
  const scale = Math.min(195 / size.z, 101 / size.x)
  return points.map((p) => [120 - (p.z - center.z) * scale, 68 + (p.x - center.x) * scale])
}

const angleOf = (direction) => Math.atan2(-direction.x, -direction.z)
const damp = (rate, dt) => 1 - Math.exp(-rate * dt)

export function createRace(container, renderHud) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.32
  container.append(renderer.domElement)

  const scene = new T.Scene()
  scene.fog = new T.FogExp2(0xbcdae0, .0044)
  const camera = new T.PerspectiveCamera(56, 1, .17, 1200)
  scene.add(new T.HemisphereLight(0xe0f4ff, 0xb58a65, 2.05))
  const sun = new T.DirectionalLight(0xffebc3, 2.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 })
  sun.shadow.bias = -.0003
  sun.shadow.normalBias = .055
  scene.add(sun, sun.target)
  makeCircuit(scene)
  const kart = makeKart(scene)
  const keys = new Set()
  const pos = new T.Vector3()
  const direction = new T.Vector3()
  const desiredCamera = new T.Vector3()
  const desiredLook = new T.Vector3()
  const look = new T.Vector3()
  const sunOffset = new T.Vector3(-36, 52, -29)
  let heading, velocity, index, progress, elapsed, lapTime, nextCrossing, lap, started, finished
  let best = 0
  let active = true
  let lastFrame = performance.now()
  let hudAt = 0
  let renderUntil = 0

  function showHud() {
    renderHud({ index, lap, time: elapsed, best, speed: Math.round(Math.abs(velocity) * 3.6), started, finished })
  }

  function updateView(dt) {
    direction.set(-Math.sin(heading), 0, -Math.cos(heading))
    kart.group.position.copy(pos)
    kart.group.rotation.y = heading
    const chaseDistance = 7.2 + Math.max(0, velocity) * .028
    desiredCamera.copy(pos).addScaledVector(direction, -chaseDistance).setY(4.05)
    desiredLook.copy(pos).addScaledVector(direction, 7.7).setY(1.03)
    camera.position.lerp(desiredCamera, damp(9, dt))
    look.lerp(desiredLook, damp(8, dt))
    camera.lookAt(look)
    camera.fov = T.MathUtils.lerp(camera.fov, 56 + Math.max(0, velocity) * .115, damp(4, dt))
    camera.updateProjectionMatrix()
    sun.target.position.copy(pos)
    sun.position.copy(pos).add(sunOffset)
  }

  function reset() {
    keys.clear()
    pos.copy(points[startIndex])
    index = startIndex
    heading = angleOf(tangents[index])
    elapsed = progress = velocity = 0
    lapTime = null
    nextCrossing = finishLineIndex
    lap = 1
    started = finished = false
    for (const wheel of kart.wheels) {
      wheel.hub.rotation.x = 0
      wheel.pivot.rotation.y = 0
    }
    updateView(Infinity)
    showHud()
    renderer.render(scene, camera)
  }

  function nearestPoint() {
    let bestDistance = Infinity
    let nearest = index
    for (let off = -11; off <= 11; off++) {
      const i = (index + off + points.length) % points.length
      const distance = points[i].distanceToSquared(pos)
      if (distance < bestDistance) {
        bestDistance = distance
        nearest = i
      }
    }
    return nearest
  }

  function step(dt) {
    const throttle = keys.has('ArrowUp')
    const brake = keys.has('ArrowDown')
    const steer = Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'))
    if (throttle || brake) started = true
    if (started) elapsed += dt
    if (throttle) velocity = Math.min(33, velocity + (20 - Math.max(0, velocity) * .34) * dt)
    else if (brake) velocity = Math.max(-9, velocity - (velocity > 0 ? 30 : 10) * dt)
    else velocity *= Math.exp(-1.52 * dt)
    if (Math.abs(velocity) < .045) velocity = 0

    heading += steer * Math.sign(velocity) * Math.min(1, Math.abs(velocity) / 3) * (1.92 - Math.min(30, Math.abs(velocity)) * .029) * dt
    direction.set(-Math.sin(heading), 0, -Math.cos(heading))
    pos.addScaledVector(direction, velocity * dt)

    const next = nearestPoint()
    const middle = points[next]
    const tangent = tangents[next]
    const lateral = (pos.x - middle.x) * -tangent.z + (pos.z - middle.z) * tangent.x
    const limit = roadHalf + .22
    if (Math.abs(lateral) > limit) {
      const push = lateral - Math.sign(lateral) * limit
      pos.x += tangent.z * push
      pos.z -= tangent.x * push
      velocity *= Math.exp(-4.6 * dt)
    }

    const length = points.length
    progress += ((next - index + length * 1.5) % length) - length / 2
    index = next
    if (progress >= nextCrossing) {
      nextCrossing += length
      if (lapTime !== null) {
        const split = elapsed - lapTime
        best = best ? Math.min(split, best) : split
        if (lap === totalLaps) {
          finished = true
          velocity = 0
        } else lap++
      }
      lapTime = elapsed
    }
    for (const wheel of kart.wheels) {
      wheel.hub.rotation.x -= velocity * dt / wheel.radius
      if (wheel.front) wheel.pivot.rotation.y = T.MathUtils.lerp(wheel.pivot.rotation.y, steer * .32, damp(10, dt))
    }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = container
    if (!width || !height) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    renderer.render(scene, camera)
  }

  function animate(now) {
    const dt = Math.min((now - lastFrame) / 1000, .05)
    lastFrame = now
    if (!active || document.hidden) return
    if (velocity || keys.size) renderUntil = now + 800
    if (!finished) step(dt)
    if (now < renderUntil) {
      updateView(dt)
      renderer.render(scene, camera)
    }
    if (now >= hudAt) {
      showHud()
      hudAt = now + 45
    }
  }

  function setKey(key, pressed) {
    if (active && pressed) keys.add(key)
    else keys.delete(key)
  }

  window.addEventListener('keydown', (event) => {
    if (!active || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable]')) return
    if (arrows.has(event.key)) {
      event.preventDefault()
      setKey(event.key, true)
    } else if (event.code === 'KeyR' && !event.repeat) reset()
  })
  window.addEventListener('keyup', (event) => setKey(event.key, false))
  window.addEventListener('blur', () => keys.clear())
  document.addEventListener('visibilitychange', () => keys.clear())
  new ResizeObserver(resize).observe(container)
  reset()
  resize()
  renderer.setAnimationLoop(animate)
  return { reset, setKey, setActive(value) { active = value; keys.clear() } }
}
