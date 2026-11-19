import * as T from 'three'
import { makeCircuit, points, tangents, roadHalf, startIndex, finishLineIndex } from './circuit.js'
import { makeKart } from './kart.js'
import { makeRaceEffects } from './effects.js'

const totalLaps = 3
const drivingKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control'])
const topSpeed = 42
const boostSpeed = 53
const reverseSpeed = 17
const speedScale = 300 / boostSpeed
const boostDuration = 2.25
const driftMinSpeed = 8

export function trackOutline(trackPoints = points) {
  const bounds = new T.Box3().setFromPoints(trackPoints)
  const center = bounds.getCenter(new T.Vector3())
  const size = bounds.getSize(new T.Vector3())
  const scale = Math.min(195 / size.z, 101 / size.x)
  return trackPoints.map((p) => [120 - (p.z - center.z) * scale, 68 + (p.x - center.x) * scale])
}

const angleOf = (direction) => Math.atan2(-direction.x, -direction.z)
const damp = (rate, dt) => 1 - Math.exp(-rate * dt)

export function createRace(container, driver, kartProfile, renderHud) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  container.append(renderer.domElement)

  const scene = new T.Scene()
  scene.fog = new T.FogExp2(0xaebbc4, .0038)
  const camera = new T.PerspectiveCamera(56, 1, .17, 1200)
  scene.add(new T.HemisphereLight(0xd9e9ff, 0xb18b73, 1.90))
  const sun = new T.DirectionalLight(0xffdfb0, 2.6)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 140 })
  sun.shadow.bias = -.0003
  sun.shadow.normalBias = .055
  scene.add(sun, sun.target)
  makeCircuit(scene, () => renderer.render(scene, camera))
  const kart = makeKart(scene, kartProfile, driver)
  const effects = makeRaceEffects(scene, kart.group)
  const keys = new Set()
  const pos = new T.Vector3()
  const direction = new T.Vector3()
  const wallNormal = new T.Vector3()
  const desiredCamera = new T.Vector3()
  const desiredLook = new T.Vector3()
  const look = new T.Vector3()
  const sunOffset = new T.Vector3(-48, 38, -34)
  let heading, velocity, index, progress, elapsed, lapTime, nextCrossing, lap, started, finished
  let travelHeading, driftDirection, drifting, charge, boostRemaining, boostRequested, impact
  let best = 0
  let active = true
  let lastFrame = performance.now()
  let hudAt = 0
  let renderUntil = 0

  function showHud() {
    renderHud({ index, lap, time: elapsed, best, speed: Math.round(Math.abs(velocity) * speedScale), started, finished, drifting, charge, boost: boostRemaining / boostDuration, impact })
  }

  function updateView(dt) {
    direction.set(-Math.sin(travelHeading), 0, -Math.cos(travelHeading))
    kart.group.position.copy(pos)
    kart.group.rotation.y = heading
    const chaseDistance = 7.2 + Math.max(0, velocity) * .028
    desiredCamera.copy(pos).addScaledVector(direction, -chaseDistance).setY(4.05)
    desiredLook.copy(pos).addScaledVector(direction, 7.7).setY(1.03)
    camera.position.lerp(desiredCamera, damp(9, dt))
    look.lerp(desiredLook, damp(8, dt))
    camera.lookAt(look)
    camera.fov = T.MathUtils.lerp(camera.fov, 56 + Math.max(0, velocity) * .115 + (boostRemaining > 0 ? 5 : 0), damp(4, dt))
    camera.updateProjectionMatrix()
    sun.target.position.copy(pos)
    sun.position.copy(pos).add(sunOffset)
    effects.update(Number.isFinite(dt) ? dt : 0, drifting, boostRemaining > 0, elapsed)
  }

  function reset() {
    keys.clear()
    pos.copy(points[startIndex])
    index = startIndex
    heading = travelHeading = angleOf(tangents[index])
    charge = boostRemaining = driftDirection = impact = 0
    drifting = boostRequested = false
    effects.reset()
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
    boostRemaining = Math.max(0, boostRemaining - dt)
    impact = Math.max(0, impact - dt)
    if (boostRequested && charge >= 1 && velocity > 0 && !brake && boostRemaining === 0) {
      boostRemaining = boostDuration
      charge = 0
    }
    boostRequested = false
    if (brake) boostRemaining = 0
    const boosting = boostRemaining > 0

    if (!keys.has('Shift') || velocity < driftMinSpeed || brake || impact > .12) driftDirection = 0
    else if (steer && !driftDirection) driftDirection = steer
    drifting = driftDirection !== 0

    if (brake) velocity = Math.max(-reverseSpeed, velocity - (velocity > 0 ? 39 : 17) * dt)
    else if (boosting) velocity = Math.min(boostSpeed, velocity + 31 * dt)
    else if (throttle && velocity <= topSpeed) velocity = Math.min(topSpeed, velocity + (24 - Math.max(0, velocity) * .36) * dt)
    else if (throttle) velocity = Math.max(topSpeed, velocity - 15 * dt)
    else velocity *= Math.exp((drifting ? -.9 : -1.52) * dt)
    if (drifting) velocity *= Math.exp(-.24 * dt)
    if (Math.abs(velocity) < .045) velocity = 0

    const turnRate = Math.sign(velocity) * Math.min(1, Math.abs(velocity) / 3) * (1.92 - Math.min(30, Math.abs(velocity)) * .029)
    const steering = drifting ? driftDirection * .72 + steer * .69 : steer
    heading += steering * turnRate * dt
    const slipTarget = heading - driftDirection * .22
    travelHeading = T.MathUtils.lerp(travelHeading, slipTarget, damp(impact > 0 ? 4 : drifting ? 3.8 : 15, dt))
    direction.set(-Math.sin(travelHeading), 0, -Math.cos(travelHeading))
    pos.addScaledVector(direction, velocity * dt)

    const next = nearestPoint()
    const middle = points[next]
    const tangent = tangents[next]
    const lateral = (pos.x - middle.x) * -tangent.z + (pos.z - middle.z) * tangent.x
    const limit = roadHalf - .20
    if (Math.abs(lateral) > limit) {
      const side = Math.sign(lateral)
      const push = lateral - side * (limit - .22)
      pos.x += tangent.z * push
      pos.z -= tangent.x * push
      wallNormal.set(-tangent.z * side, 0, tangent.x * side)
      const directionSign = Math.sign(velocity)
      const outgoing = direction.multiplyScalar(directionSign)
      const outward = outgoing.dot(wallNormal)
      if (outward > 0) {
        outgoing.addScaledVector(wallNormal, -1.48 * outward - .20).normalize().multiplyScalar(directionSign)
        const reflectedHeading = angleOf(outgoing)
        const turn = Math.atan2(Math.sin(reflectedHeading - travelHeading), Math.cos(reflectedHeading - travelHeading))
        travelHeading += turn
        heading = travelHeading
        velocity *= .70
        impact = .22
        drifting = false
        driftDirection = 0
      }
    } else if (drifting) {
      charge = Math.min(1, charge + Math.min(.94, velocity * .046) * dt)
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
          velocity = boostRemaining = 0
          drifting = false
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
    const dt = T.MathUtils.clamp((now - lastFrame) / 1000, 0, .05)
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
    if (!active || !pressed) {
      keys.delete(key)
      return
    }
    if (key === 'Control' && !keys.has(key)) boostRequested = true
    keys.add(key)
  }

  window.addEventListener('keydown', (event) => {
    if (!active || event.altKey || event.metaKey || event.target.closest?.('input, textarea, [contenteditable]')) return
    const key = event.key
    if (drivingKeys.has(key)) {
      event.preventDefault()
      setKey(key, true)
    } else if (event.code === 'KeyR' && !event.ctrlKey && !event.repeat) reset()
  })
  function clearKeys() {
    keys.clear()
    boostRequested = false
  }

  window.addEventListener('keyup', (event) => setKey(event.key, false))
  window.addEventListener('blur', clearKeys)
  document.addEventListener('visibilitychange', clearKeys)
  new ResizeObserver(resize).observe(container)
  reset()
  resize()
  renderer.setAnimationLoop(animate)
  return { reset, setKey, setActive(value) { active = value; clearKeys() } }
}
