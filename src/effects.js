import * as T from 'three'

export function makeRaceEffects(scene, kart) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 32)
  gradient.addColorStop(0, '#ffffffc5')
  gradient.addColorStop(.42, '#ffffff80')
  gradient.addColorStop(1, '#ffffff00')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  const smokeTexture = new T.CanvasTexture(canvas)
  const smoke = Array.from({ length: 28 }, () => {
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map: smokeTexture, color: 0xa9a49e, transparent: true, depthWrite: false,
    }))
    sprite.visible = false
    scene.add(sprite)
    return { sprite, age: 1 }
  })
  const flames = new T.Group()
  const flameCore = new T.MeshBasicMaterial({ color: 0xd9ffff, transparent: true, opacity: .86, depthWrite: false, blending: T.AdditiveBlending })
  const flameGlow = new T.MeshBasicMaterial({ color: 0x26aaff, transparent: true, opacity: .72, depthWrite: false, blending: T.AdditiveBlending })
  for (const side of [-1, 1]) {
    const exhaust = new T.Group()
    exhaust.position.set(side * .47, .38, 1.66)
    for (const [radius, length, material] of [[.085, .81, flameCore], [.17, 1.34, flameGlow]]) {
      const jet = new T.Mesh(new T.ConeGeometry(radius, length, 10), material)
      jet.rotation.x = Math.PI / 2
      jet.position.z = length / 2
      exhaust.add(jet)
    }
    flames.add(exhaust)
  }
  flames.visible = false
  kart.add(flames)

  const origin = new T.Vector3()
  const smokeLife = .72
  let cursor = 0
  let sincePuff = 0

  function reset() {
    sincePuff = 0
    flames.visible = false
    for (const { sprite } of smoke) sprite.visible = false
  }

  function update(dt, drifting, boosting, elapsed) {
    flames.visible = boosting
    if (boosting) flames.scale.z = .91 + .12 * Math.sin(elapsed * 81)
    for (const particle of smoke) {
      if (!particle.sprite.visible) continue
      particle.age += dt
      const t = particle.age / smokeLife
      particle.sprite.visible = t < 1
      particle.sprite.material.opacity = Math.max(0, 1 - t) * .68
      particle.sprite.scale.setScalar(.29 + t * 1.15)
      particle.sprite.position.y += dt * .43
    }
    sincePuff += dt
    if (!drifting || sincePuff < .047) return
    sincePuff = 0
    kart.updateMatrixWorld()
    for (const side of [-1, 1]) {
      const particle = smoke[cursor]
      cursor = (cursor + 1) % smoke.length
      particle.age = 0
      particle.sprite.position.copy(kart.localToWorld(origin.set(side * 1.17, .20, 1.16)))
      particle.sprite.scale.setScalar(.29)
      particle.sprite.material.opacity = .68
      particle.sprite.visible = true
    }
  }

  return { reset, update }
}
