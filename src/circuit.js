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
    ctx.fillStyle = '#41464a'
    ctx.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 22000; i++) {
      ctx.fillStyle = random() < .5 ? '#22262732' : '#cfcbc12b'
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1)
    }
  })
  road.wrapS = road.wrapT = T.RepeatWrapping
  road.repeat.set(.48, .45)
  road.anisotropy = 8
  return standard(0xffffff, { map: road, bumpMap: road, bumpScale: .026 })
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
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI * 2 / 12 + .33
    const length = (2.25 + random() * 1.2) * size
    const direction = new T.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const side = new T.Vector3(-direction.z, 0, direction.x)
    const positions = []
    let previous = [top, top, top]
    for (let step = 1; step <= 16; step++) {
      const t = step / 16
      const center = top.clone().addScaledVector(direction, t * length)
      center.y += (Math.sin(t * Math.PI) * .85 - t * .51) * size
      const width = (Math.sin(Math.PI * t) * (step % 2 ? .31 : .46) + .025) * size
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

function imageTexture(name, redraw) {
  const map = new T.TextureLoader().load(import.meta.env.BASE_URL + name, redraw)
  map.colorSpace = T.SRGBColorSpace
  return map
}

function addSky(scene, redraw) {
  const panorama = imageTexture('coastal-sky.webp', redraw)
  const sky = new T.Mesh(new T.SphereGeometry(1050, 40, 24), new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: { panorama: { value: panorama } },
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D panorama;
      varying vec3 vPos;
      void main() {
        vec3 d = normalize(vPos);
        float heading = atan(d.x,-d.z);
        float u = .5 + asin(sin(heading)) / 3.14159;
        float v = clamp(.035 + asin(d.y) / .53, .022, .98);
        vec3 photo = texture2D(panorama, vec2(u,v)).rgb;
        photo = pow(photo, vec3(1.0 / 2.2));
        vec3 color = mix(photo, vec3(.30,.46,.61), smoothstep(.4,1.,d.y));
        gl_FragColor = vec4(color,1.);
      }`,
  }))
  scene.add(sky)
}

function addBeach(scene, redraw) {
  const sandMap = imageTexture('coastal-sand.webp', redraw)
  sandMap.wrapS = sandMap.wrapT = T.RepeatWrapping
  sandMap.anisotropy = 8
  const sandMaterial = standard(0xc5b5a2, { map: sandMap, bumpMap: sandMap, bumpScale: .10 })
  const sand = new T.PlaneGeometry(364, 820, 64, 144)
  const positions = sand.attributes.position
  const uv = sand.attributes.uv
  for (let i = 0; i < positions.count; i++) {
    const z = -positions.getY(i) - 26
    const shoreWeight = Math.pow(1 - uv.getX(i), 4)
    const x = positions.getX(i) + 150 + shoreWeight * coastVariation(z)
    const shoreDrop = Math.max(0, 1 - (positions.getX(i) + 182) / 9)
    positions.setXYZ(i, x, -.19 - shoreDrop * .81, z)
    uv.setXY(i, x / 4.8, z / 4.8)
  }
  sand.computeVertexNormals()
  const beach = new T.Mesh(sand, sandMaterial)
  beach.receiveShadow = true
  scene.add(beach)
}

function coastVariation(z) {
  return Math.sin(z * .047) * 2.4 + Math.sin(z * .086) * 1.15
}

function addOcean(scene) {
  const water = new T.Mesh(new T.PlaneGeometry(1080, 1400), new T.ShaderMaterial({
    uniforms: { tint: { value: new T.Color(0x397f91) } },
    vertexShader: `
      varying vec3 worldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.);
        worldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform vec3 tint;
      varying vec3 worldPosition;
      void main() {
        vec2 p = worldPosition.xz;
        float a = sin(p.x * 1.8 + sin(p.y*.43) + p.y*.11);
        float b = sin(p.x * 3.2 - p.y*.46 + sin(p.y*.76));
        float distanceToCamera = distance(worldPosition,cameraPosition);
        float detail = 1. - smoothstep(30.,240.,distanceToCamera);
        float shore = -32. + sin(p.y*.047)*2.4 + sin(p.y*.086)*1.15;
        float breakers = pow(.5 + .5*sin((p.x-shore)*1.45 + sin(p.y*.45)*.67 + sin(p.y*.9)*.23),16.)
          * smoothstep(shore-9.,shore+1.,p.x)
          * (.56 + .44 * sin(p.y*.21 + p.x*.34));
        float shimmer = pow(.5 + .5*a*b, 8.) * detail;
        vec3 water = tint * (.79 + (a+b)*.065*detail) + vec3(.06,.08,.08)*shimmer;
        water = mix(water,vec3(.44,.58,.55),breakers*.82*detail);
        water = mix(water,vec3(.30,.38,.44), smoothstep(48.,580.,distanceToCamera)*.85);
        gl_FragColor = vec4(water,1.);
        #include <colorspace_fragment>
      }`,
  }))
  water.rotation.x = -Math.PI / 2
  water.position.set(-512, -.76, -30)
  scene.add(water)
}

function rockyHill() {
  const geometry = new T.IcosahedronGeometry(1, 4)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const ridge = Math.sin(x * 13 + y * 6) * Math.cos(z * 9 - y * 5) * .07 +
      Math.sin(z * 19 - x * 10) * .024
    position.setXYZ(i, x * (1 + ridge), y + ridge - Math.abs(x) * .18, z * (1 + ridge))
  }
  geometry.computeVertexNormals()
  return geometry
}

function addLandscape(scene, meshes, redraw) {
  addBeach(scene, redraw)
  addOcean(scene)

  const cliffs = [0x78695f, 0x8c7b66, 0x98826c, 0x998a76, 0x817570].map((color) => standard(color, { flatShading: true }))
  for (let i = 0; i < 32; i++) {
    const behind = i < 19
    const x = behind ? 44 + i * 13 : 180 + random() * 120
    const z = behind ? -258 + random() * 43 : -180 + (i - 19) * 23
    const width = 12 + random() * 28
    const height = 12 + random() * 35
    const hill = new T.Mesh(rockyHill(), cliffs[i % cliffs.length])
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

export function makeCircuit(scene, redraw) {
  addSky(scene, redraw)
  const staticMeshes = []
  addLandscape(scene, staticMeshes, redraw)
  addTrackside(scene, staticMeshes)
  batch(staticMeshes, scene)
}
