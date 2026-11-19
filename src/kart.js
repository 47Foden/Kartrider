import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const material = (color, props) => new T.MeshStandardMaterial({ color, roughness: .53, ...props })
const navy = material(0x121b30)
const rubber = material(0x161c20, { roughness: .94 })
const tireWall = material(0x252c30, { roughness: .83 })
const alloy = material(0xb5c7cd, { roughness: .3, metalness: .62 })
const white = material(0xfff6dc)
const tail = material(0xff4939, { emissive: 0xf23717, emissiveIntensity: .6 })

function part(group, geometry, paint, x, y, z) {
  const model = new T.Mesh(geometry, paint)
  model.position.set(x, y, z)
  model.castShadow = true
  model.receiveShadow = true
  group.add(model)
  return model
}

const block = (group, w, h, d, paint, x, y, z, radius = .07) =>
  part(group, new RoundedBoxGeometry(w, h, d, 2, radius), paint, x, y, z)

function wheel(group, x, z, radius, width, side, tread) {
  const pivot = new T.Group()
  pivot.position.set(x, radius + .045, z)
  group.add(pivot)
  const hub = new T.Group()
  pivot.add(hub)
  const tire = part(hub, new T.CylinderGeometry(radius, radius, width, 24, 1), [tread, tireWall, tireWall], 0, 0, 0)
  tire.rotation.z = Math.PI / 2
  const rim = part(hub, new T.CylinderGeometry(radius * .68, radius * .68, .035, 20), alloy, side * (width / 2 + .01), 0, 0)
  rim.rotation.z = Math.PI / 2
  const ring = part(hub, new T.TorusGeometry(radius * .56, .034, 6, 24), navy, side * (width / 2 + .03), 0, 0)
  ring.rotation.y = Math.PI / 2
  const axle = part(hub, new T.CylinderGeometry(radius * .27, radius * .27, .06, 12), navy, side * (width / 2 + .042), 0, 0)
  axle.rotation.z = Math.PI / 2
  return { pivot, hub, radius, front: z < 0 }
}

function makeTread() {
  const image = document.createElement('canvas')
  image.width = 256
  image.height = 64
  const ctx = image.getContext('2d')
  ctx.fillStyle = '#282c30'
  ctx.fillRect(0, 0, 256, 64)
  ctx.strokeStyle = '#131719'
  ctx.lineWidth = 3
  for (let x = -16; x < 272; x += 16) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 10, 25)
    ctx.lineTo(x + 3, 36)
    ctx.lineTo(x + 13, 64)
    ctx.stroke()
  }
  for (const y of [12, 31, 51]) {
    ctx.fillStyle = '#181e22'
    ctx.fillRect(0, y, 256, 2)
  }
  const map = new T.CanvasTexture(image)
  map.colorSpace = T.SRGBColorSpace
  return material(0xffffff, { map, roughness: .94 })
}

function makeDriver(group, driver) {
  const fur = material(driver.fur)
  const helmet = material(driver.helmet, { metalness: .14, roughness: .29 })
  const trim = material(driver.trim, { roughness: .36 })
  part(group, new T.SphereGeometry(.41, 16, 12), navy, 0, .98, .36).scale.set(1, .9, .72)
  const head = new T.Group()
  head.position.set(0, 1.53, .25)
  group.add(head)
  part(head, new T.SphereGeometry(.405, 24, 16), helmet, 0, 0, 0).scale.set(1, .97, .96)
  part(head, new T.SphereGeometry(.385, 20, 12, 0, Math.PI * 2, .95, 1.45), trim, 0, -.025, 0).scale.set(1.07, 1, 1.08)
  part(head, new T.SphereGeometry(.28, 16, 10), fur, 0, -.09, -.21).scale.set(1.2, .64, .62)
  for (const side of [-1, 1]) {
    if (driver.ear === 'fox') {
      const ear = part(head, new T.ConeGeometry(.135, .36, 4), fur, side * .25, .36, -.075)
      ear.rotation.set(-.14, Math.PI / 4, -side * .26)
      const inner = part(head, new T.ConeGeometry(.08, .23, 4), trim, side * .25, .355, -.132)
      inner.rotation.copy(ear.rotation)
    } else if (driver.ear === 'round') {
      part(head, new T.SphereGeometry(.127, 12, 8), fur, side * .29, .28, -.08)
    } else {
      part(head, new T.SphereGeometry(.11, 12, 8), trim, side * .37, .02, -.05).scale.x = .55
    }
  }
  block(head, .25, .08, .05, trim, 0, .075, .376, .02)
}

export function makeKart(scene, profile, driver) {
  const body = material(profile.body, { roughness: .33, metalness: .11 })
  const trim = material(profile.trim, { roughness: .38 })
  const group = new T.Group()
  scene.add(group)
  const tread = makeTread()
  const wheels = []
  block(group, 1.82, .27, 2.8, navy, 0, .36, .04)
  block(group, 2.12, .22, .47, navy, 0, .32, 1.43)
  block(group, 2.06, .29, .46, body, 0, .52, 1.41)
  block(group, 2.45, .21, .44, navy, 0, .32, -1.49)
  block(group, 2.51, .30, .58, trim, 0, .48, -1.43, .13)
  const nose = block(group, .70, .28, 1.16, body, 0, .62, -.97, .075)
  nose.rotation.x = -.25
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      const decal = block(group, .091, .016, .14, (i + j) % 2 ? navy : white, (j - .5) * .092, .695 + i * .033, -1.38 + i * .135, .005)
      decal.rotation.x = -.25
    }
  }
  block(group, 1.18, .29, .60, navy, 0, .83, .8, .09)
  const seat = block(group, .85, .63, .24, navy, 0, 1.04, .67, .115)
  seat.rotation.x = .14
  block(group, 1.34, .14, .62, trim, 0, 1.04, 1.03)
  block(group, 1.33, .22, .57, navy, 0, .88, 1.065)
  const steering = part(group, new T.TorusGeometry(.245, .035, 8, 20), navy, 0, .96, -.49)
  steering.rotation.x = -.58

  for (const side of [-1, 1]) {
    wheels.push(wheel(group, side * 1.13, -.99, .425, .37, side, tread))
    wheels.push(wheel(group, side * 1.2, 1.02, .485, .43, side, tread))
    block(group, .43, .23, 1.14, navy, side * 1.01, .35, .02)
    block(group, .47, .28, 1.08, body, side * 1.00, .54, -.02, .11)
    for (let i = 0; i < 7; i++) block(group, .024, .11, .14, i % 2 ? white : navy, side * 1.247, .435, -.42 + i * .14, .005)
    block(group, .25, .12, .08, tail, side * .74, .57, 1.65, .035)
    const outlet = part(group, new T.CylinderGeometry(.108, .14, .35, 10), alloy, side * .47, .38, 1.52)
    outlet.rotation.x = Math.PI / 2
    part(group, new T.CircleGeometry(.081, 10), rubber, side * .47, .38, 1.699)
  }
  if (profile.id === 'comet') {
    for (const side of [-1, 1]) block(group, .13, .46, .16, navy, side * .62, .94, 1.36)
    block(group, 1.98, .13, .46, trim, 0, 1.21, 1.36, .055)
  }
  if (profile.id === 'pulse') {
    for (const side of [-1, 1]) {
      const fin = block(group, .28, .24, .87, trim, side * .88, .60, -1.19, .07)
      fin.rotation.y = side * .24
    }
    block(group, .045, .12, .72, trim, 0, .70, -.85, .02).rotation.x = -.2
  }
  makeDriver(group, driver)
  group.scale.set(profile.width, 1, profile.length)
  return { group, wheels }
}
