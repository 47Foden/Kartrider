import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const nodes = [[0, 56], [0, -12], [10, -71], [36, -114], [89, -126], [133, -92], [143, -47], [120, -18], [98, 5], [120, 39], [120, 79], [81, 112], [28, 116], [3, 100]]
export const sampleCount = 480
export const track = new T.CatmullRomCurve3(nodes.map(([x, z]) => new T.Vector3(x, 0, z)), true)
export const points = track.getSpacedPoints(sampleCount).slice(0, -1)
export const tangents = points.map((_, i) => track.getTangentAt(i / sampleCount))
export const roadHalf = 7.2
export const startIndex = 0
export const finishLineIndex = 24

const standard = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .86, ...extra })
const basic = (color) => new T.MeshBasicMaterial({ color })
const random = (() => {
  let seed = 2187
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
})()

function offset(index, distance, height = 0) {
  const point = points[index % sampleCount]
  const tangent = tangents[index % sampleCount]
  return new T.Vector3(point.x - tangent.z * distance, height, point.z + tangent.x * distance)
}

function strip(left, right, height, material, start = 0, end = sampleCount) {
  const positions = []
  const uv = []
  for (let i = start; i < end; i++) {
    for (const [j, edge] of [[i, left], [i, right], [i + 1, left], [i, right], [i + 1, right], [i + 1, left]]) {
      positions.push(...offset(j, edge, height).toArray())
      uv.push(edge * .7, j * .7)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  geometry.computeVertexNormals()
  const mesh = new T.Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

function texture(width, height, paint) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  paint(canvas.getContext('2d'))
  const result = new T.CanvasTexture(canvas)
  result.colorSpace = T.SRGBColorSpace
  return result
}

function asphalt() {
  const road = texture(256, 256, (ctx) => {
    ctx.fillStyle = '#4e555b'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 22000; i++) {
      ctx.fillStyle = random() < .5 ? '#202b3640' : '#d4d5ca36'
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1)
    }
  })
  road.wrapS = road.wrapT = T.RepeatWrapping
  road.repeat.set(.3, .3)
  road.anisotropy = 8
  return standard(0xffffff, { map: road })
}

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new T.Mesh(new T.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  return mesh
}

function plane(width, height, material) {
  const mesh = new T.Mesh(new T.PlaneGeometry(width, height), material)
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function between(a, b, thickness, material, shape = 'box', narrow = thickness) {
  const length = a.distanceTo(b)
  const geometry = shape === 'box' ? new T.BoxGeometry(thickness, length, thickness) : new T.CylinderGeometry(narrow, thickness, length, 7)
  const mesh = new T.Mesh(geometry, material)
  mesh.position.copy(a).lerp(b, .5)
  mesh.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP, b.clone().sub(a).normalize())
  return mesh
}

function batch(meshes, scene) {
  const byMaterial = new Map()
  for (const mesh of meshes) {
    mesh.updateMatrix()
    const geometry = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()).applyMatrix4(mesh.matrix)
    mesh.geometry.dispose()
    if (!byMaterial.has(mesh.material)) byMaterial.set(mesh.material, [])
    byMaterial.get(mesh.material).push(geometry)
  }
  for (const [material, geometries] of byMaterial) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    geometries.forEach((geometry) => geometry.dispose())
  }
}

function makePalm(meshes, x, z, size, wood, leaves) {
  const foot = new T.Vector3(x, -.17, z)
  const mid = foot.clone().add(new T.Vector3(.26 * size, 2.9 * size, 0))
  const top = foot.clone().add(new T.Vector3(.98 * size, 5.3 * size, .15 * size))
  meshes.push(between(foot, mid, .29 * size, wood, 'cylinder', .23 * size))
  meshes.push(between(mid, top, .23 * size, wood, 'cylinder', .15 * size))
  for (let i = 0; i < 9; i++) {
    const angle = i * Math.PI * 2 / 9 + .33
    const length = (2.25 + random() * 1.2) * size
    const direction = new T.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const side = new T.Vector3(-direction.z, 0, direction.x)
    const positions = []
    let previous = [top, top, top]
    for (let step = 1; step <= 5; step++) {
      const t = step / 5
      const center = top.clone().addScaledVector(direction, t * length)
      center.y += (Math.sin(t * Math.PI) * .85 - t * .51) * size
      const width = (Math.sin(Math.PI * t) * .43 + .025) * size
      const left = center.clone().addScaledVector(side, width)
      const right = center.clone().addScaledVector(side, -width)
      left.y -= width * .65
      right.y -= width * .65
      const [oldLeft, oldCenter, oldRight] = previous
      for (const vertex of [oldLeft, left, center, oldLeft, center, oldCenter, oldCenter, center, right, oldCenter, right, oldRight]) positions.push(...vertex.toArray())
      previous = [left, center, right]
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2))
    geometry.computeVertexNormals()
    meshes.push(new T.Mesh(geometry, leaves[i % leaves.length]))
  }
}

function addSky(scene) {
  const sky = new T.Mesh(new T.SphereGeometry(1050, 32, 20), new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        vec3 d = normalize(vPos);
        float t = clamp(d.y * 2.4, 0., 1.);
        vec3 color = mix(vec3(.69,.86,.88),vec3(.09,.53,.80),pow(t,.55));
        vec3 sun = normalize(vec3(-.58,.27,-.77));
        color += vec3(.43,.30,.08) * pow(max(dot(d,sun),0.),17.);
        color = mix(color,vec3(1.,.98,.77),smoothstep(.997,.9985,dot(d,sun)));
        gl_FragColor = vec4(color,1.);
      }`,
  }))
  scene.add(sky)

  const cloud = texture(512, 192, (ctx) => {
    for (const [x, y, rx, ry] of [[85, 105, 81, 43], [160, 81, 96, 62], [250, 69, 110, 68], [334, 104, 126, 48], [433, 119, 77, 36]]) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(rx, ry)
      const gradient = ctx.createRadialGradient(0, -.15, .05, 0, 0, 1)
      gradient.addColorStop(0, '#fff9e9')
      gradient.addColorStop(.45, '#fffdf3c9')
      gradient.addColorStop(1, '#fffff000')
      ctx.fillStyle = gradient
      ctx.fillRect(-1, -1, 2, 2)
      ctx.restore()
    }
  })
  const cloudMaterial = new T.SpriteMaterial({ map: cloud, transparent: true, opacity: .83, depthWrite: false, fog: false })
  for (const [x, y, z, width] of [[-106, 45, -200, 91], [46, 64, -244, 97], [138, 31, -226, 64], [-198, 76, -246, 109], [216, 75, -225, 111], [-35, 38, -210, 78], [116, 59, 247, 94], [-168, 57, 220, 76]]) {
    const sprite = new T.Sprite(cloudMaterial)
    sprite.position.set(x, y, z)
    sprite.scale.set(width, width * .375, 1)
    scene.add(sprite)
  }
}

function addLandscape(scene, meshes) {
  const sand = plane(360, 820, standard(0xd5a677))
  sand.position.set(151, -.19, -26)
  sand.receiveShadow = true
  scene.add(sand)
  const ocean = plane(900, 1300, standard(0x258aac, { metalness: .14, roughness: .36 }))
  ocean.position.set(-477, -.94, -30)
  scene.add(ocean)

  const foam = basic(0x8bded7)
  const waves = basic(0x54bec3)
  for (let i = 0; i < 80; i++) {
    const edge = i < 38
    const x = edge ? -30 - random() * 7 : -45 - random() * 92
    const z = -180 + random() * 335
    const wave = plane(.08 + random() * .34, 2 + random() * (edge ? 7 : 18), edge ? foam : waves)
    wave.position.set(x, -.91, z)
    meshes.push(wave)
  }

  const cliffs = [0x8c7474, 0x9d7b67, 0xb48c76, 0xc19a7e, 0x8a7776].map((color) => standard(color, { flatShading: true }))
  for (let i = 0; i < 32; i++) {
    const behind = i < 19
    const x = behind ? -29 + i * 15 : 177 + random() * 111
    const z = behind ? -226 + random() * 45 : -180 + (i - 19) * 23
    const width = 12 + random() * 28
    const height = 18 + random() * 35
    const hill = new T.Mesh(new T.DodecahedronGeometry(1, 0), cliffs[i % cliffs.length])
    hill.position.set(x, height * .35 - 10, z)
    hill.scale.set(width, height, 15 + random() * 25)
    hill.rotation.set(.15, random() * Math.PI, random() * .32 - .16)
    meshes.push(hill)
  }

  const rocks = [0xbc9071, 0xe0ad82, 0x94776b].map((color) => standard(color, { flatShading: true }))
  const scrub = [0x687b42, 0x88934c, 0x536b3d].map((color) => standard(color, { flatShading: true }))
  const wood = standard(0x8a6044)
  const leaves = [0x2d7745, 0x528742, 0x8f9d48].map((color) => standard(color, { side: T.DoubleSide }))
  const clearOfTrack = (x, z, margin) => !points.some((point) => (x - point.x) ** 2 + (z - point.z) ** 2 < margin ** 2)
  for (let i = 0; i < 380; i++) {
    const x = -25 + random() * 194
    const z = -163 + random() * 301
    if (!clearOfTrack(x, z, roadHalf + 3.4)) continue
    const green = random() < .57
    const fill = green ? scrub : rocks
    const size = (green ? .25 : .38) + random() * (green ? .75 : 1.85)
    const mesh = new T.Mesh(new T.IcosahedronGeometry(size, 0), fill[i % fill.length])
    mesh.position.set(x, size * .18 - .12, z)
    mesh.scale.set(1.3, green ? .63 : .8, .87)
    mesh.rotation.y = random() * 5
    meshes.push(mesh)
  }
  for (const [x, z, size] of [[-11, 42, 1.35], [15, 39, 1.22], [-13, 19, 1], [-17, 3, 1.28], [16, 2, 1.33], [19, -21, 1.27], [-14, -30, 1.28], [-13, -56, 1.4], [28, -51, 1.2], [6, -75, .98], [50, -92, 1.19], [70, -95, 1.2], [115, -128, 1.25], [152, -85, 1.12], [123, -56, 1.15], [86, -10, 1.27], [149, 24, 1.2], [99, 59, 1.43], [-10, 79, 1.3], [70, 92, 1.25], [30, 87, 1.12]]) {
    if (clearOfTrack(x, z, roadHalf + 2.45)) makePalm(meshes, x, z, size, wood, leaves)
  }
}

function addTrackside(scene, meshes) {
  const cream = standard(0xf2eee2)
  const red = standard(0xdf6648)
  const yellow = standard(0xf7b83c)
  const dark = standard(0x182b37)
  const steel = standard(0x8296a0, { metalness: .27 })
  const cyan = standard(0x13b8c7)
  scene.add(strip(-roadHalf, roadHalf, 0, asphalt()))
  scene.add(strip(-8.7, -roadHalf, -.06, standard(0xa69482)))
  scene.add(strip(roadHalf, 8.7, -.06, standard(0xa69482)))
  scene.add(strip(-6.92, -6.8, .024, cream))
  scene.add(strip(6.8, 6.92, .024, cream))
  const curbs = []
  for (let i = 0; i < sampleCount; i += 2) {
    const material = i % 4 === 0 ? cream : red
    curbs.push(strip(-8, -7.23, .055, material, i, i + 2), strip(7.23, 8, .055, material, i, i + 2))
  }
  batch(curbs, scene)

  for (const side of [-1, 1]) {
    for (let i = 0; i < sampleCount; i += 6) {
      const distance = side * 8.55
      const base = offset(i, distance)
      meshes.push(box(.18, 1.12, .20, dark, base.x, .42, base.z))
      for (const height of [.36, .9]) {
        meshes.push(between(offset(i, distance, height), offset(i + 6, distance, height), height > .5 ? .16 : .11, height > .5 ? steel : dark))
      }
    }
  }

  const lineIndex = finishLineIndex
  const origin = offset(lineIndex, 0)
  const forward = tangents[lineIndex]
  const angle = Math.atan2(-forward.x, -forward.z)
  for (let i = 0; i < 18; i++) {
    for (let row = 0; row < 2; row++) {
      const position = offset(lineIndex, (i - 8.5) * .78, .026).addScaledVector(forward, (row - .5) * .57)
      const square = plane(.787, .58, (i + row) % 2 ? cream : dark)
      square.position.copy(position)
      square.rotation.order = 'YXZ'
      square.rotation.y = angle
      meshes.push(square)
    }
  }
  const signMap = texture(1024, 128, (ctx) => {
    ctx.fillStyle = '#102a37'
    ctx.fillRect(0, 0, 1024, 128)
    ctx.fillStyle = '#23c9dc'
    ctx.fillRect(0, 0, 1024, 10)
    ctx.fillRect(0, 118, 1024, 10)
    ctx.font = 'italic 900 70px Arial'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f7faf3'
    ctx.fillText('SUNSET COAST', 512, 90)
    for (const x of [48, 853]) {
      ctx.fillStyle = '#ffcc4a'
      ctx.fillRect(x, 37, 123, 54)
      ctx.font = '900 37px Arial'
      ctx.fillStyle = '#16252f'
      ctx.fillText('APEX', x + 61, 77)
    }
  })
  const sign = new T.Mesh(new T.PlaneGeometry(17.75, 2.22), new T.MeshBasicMaterial({ map: signMap, side: T.DoubleSide }))
  sign.position.copy(origin).addScaledVector(forward, -.78).setY(5.1)
  sign.rotation.y = angle
  scene.add(sign)
  meshes.push(between(offset(lineIndex, -8.83, 5.1).addScaledVector(forward, .18), offset(lineIndex, 8.83, 5.1).addScaledVector(forward, .18), 1.48, dark))
  for (const side of [-1, 1]) {
    const p = offset(lineIndex, side * 8.86)
    meshes.push(box(.54, 1.0, .64, dark, p.x, .45, p.z))
    meshes.push(box(.41, 4.05, .46, cyan, p.x, 2.52, p.z))
    for (let i = 0; i < 5; i++) {
      const q = offset(lineIndex + 7 + i * 14, side * 9.55)
      const top = q.clone().setY(6.8)
      const tip = offset(lineIndex + 7 + i * 14, side * 7.8, 6.66)
      meshes.push(between(q, top, .12, dark, 'cylinder', .081))
      meshes.push(between(top, tip, .088, dark, 'cylinder', .077))
      meshes.push(box(.38, .13, .58, cream, tip.x, tip.y, tip.z))
    }
  }
  for (const [index, side] of [[6, -1], [15, 1], [42, 1], [59, -1], [75, 1], [165, -1], [291, 1]]) {
    const p = offset(index, side * 10.4)
    meshes.push(box(.10, 3.6, .10, steel, p.x, 1.7, p.z))
    meshes.push(box(1.12, 2.05, .10, index % 2 ? yellow : cyan, p.x + .55, 2.46, p.z))
    for (let stripe = 0; stripe < 3; stripe++) {
      const dash = box(.52, .1, .12, dark, p.x + .55, 2.24 + stripe * .26, p.z)
      dash.rotation.z = .5
      meshes.push(dash)
    }
  }
}

export function makeCircuit(scene) {
  addSky(scene)
  const staticMeshes = []
  addLandscape(scene, staticMeshes)
  addTrackside(scene, staticMeshes)
  batch(staticMeshes, scene)
}
