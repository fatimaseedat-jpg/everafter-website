import * as THREE from '../assets/vendor/three.module.min.js';

export function createCelebrationScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#E6EEE8');
  scene.fog = new THREE.Fog('#E6EEE8', 38, 85);
  const camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 120);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const batches = new Map();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const rotation = new THREE.Euler();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  const midpoint = new THREE.Vector3();
  const group = new THREE.Group();
  scene.add(group);

  const geometry = (value) => {
    geometries.add(value);
    return value;
  };
  const material = (color, roughness = 0.85, metalness = 0) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(value);
    return value;
  };
  const palette = {
    plaster: material('#FAFBF8'),
    linen: material('#F2F0E7'),
    stone: material('#D6D8C6'),
    edge: material('#B8BEAC'),
    earth: material('#9BA38A'),
    grass: material('#94A77D'),
    lawn: material('#A6B58F'),
    forest: material('#193C32'),
    olive: material('#617750'),
    leaf: material('#7C9060'),
    darkLeaf: material('#3F5D42'),
    sage: material('#9AA985'),
    oak: material('#A2825C'),
    bark: material('#736B50'),
    gold: material('#BCA373', 0.36, 0.62),
    blush: material('#D9B8B0'),
    petal: material('#F4E4DA'),
    flowerHeart: material('#C8AE76'),
    gravel: material('#DDE0CE'),
    water: material('#759A91', 0.19, 0.22),
    wick: material('#9F8050'),
  };
  const unitBox = geometry(new THREE.BoxGeometry(1, 1, 1));
  const unitCylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const unitCone = geometry(new THREE.ConeGeometry(1, 1, 10));
  const unitSphere = geometry(new THREE.SphereGeometry(1, 8, 6));
  const littleSphere = geometry(new THREE.SphereGeometry(1, 6, 4));
  const organicSphere = geometry(new THREE.IcosahedronGeometry(1, 1));
  const leafSphere = geometry(new THREE.IcosahedronGeometry(1, 0));
  const unitRing = geometry(new THREE.TorusGeometry(1, 0.035, 5, 28));

  // Repeated furniture, flowers, and foliage share a handful of GPU batches.
  function instance(geo, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const key = `${geo.id}:${mat.id}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { geometry: geo, material: mat, transforms: [] };
      batches.set(key, batch);
    }
    position.set(x, y, z);
    scale.set(sx, sy, sz);
    rotation.set(rx, ry, rz);
    quaternion.setFromEuler(rotation);
    matrix.compose(position, quaternion, scale);
    batch.transforms.push(matrix.clone());
  }
  const box = (mat, x, y, z, w, h, d, ry = 0, rz = 0) =>
    instance(unitBox, mat, x, y, z, w, h, d, 0, ry, rz);
  const cylinder = (mat, x, y, z, radius, height) =>
    instance(unitCylinder, mat, x, y, z, radius, height, radius);
  const sphere = (mat, x, y, z, sx, sy, sz, ry = 0) =>
    instance(unitSphere, mat, x, y, z, sx, sy, sz, 0, ry);
  function beam(mat, start, end, width, depth = width) {
    direction.subVectors(end, start);
    midpoint.addVectors(start, end).multiplyScalar(0.5);
    quaternion.setFromUnitVectors(up, direction.clone().normalize());
    matrix.compose(midpoint, quaternion, scale.set(width, direction.length(), depth));
    const key = `${unitBox.id}:${mat.id}`;
    if (!batches.has(key)) batches.set(key, { geometry: unitBox, material: mat, transforms: [] });
    batches.get(key).transforms.push(matrix.clone());
  }
  function mesh(geo, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geo, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    group.add(object);
    return object;
  }
  function roundedShape(width, depth, radius) {
    const x = -width / 2;
    const y = -depth / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + depth - radius);
    shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
    shape.lineTo(x + radius, y + depth);
    shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  }
  function terrace(mat, x, z, width, depth, radius, top, thickness) {
    const geo = geometry(
      new THREE.ExtrudeGeometry(roundedShape(width, depth, radius), {
        depth: thickness,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.045,
        bevelThickness: 0.035,
        curveSegments: 10,
      }),
    );
    const object = mesh(geo, mat, x, top - thickness, z);
    object.rotation.x = -Math.PI / 2;
    return object;
  }
  function path(points, width, mat = palette.gravel, height = 0.035) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, height, z)),
    );
    const vertices = [];
    const indices = [];
    const normal = new THREE.Vector3();
    for (let i = 0; i <= 48; i += 1) {
      const point = curve.getPoint(i / 48);
      const tangent = curve.getTangent(i / 48);
      normal
        .set(-tangent.z, 0, tangent.x)
        .normalize()
        .multiplyScalar(width / 2);
      vertices.push(
        point.x + normal.x,
        height,
        point.z + normal.z,
        point.x - normal.x,
        height,
        point.z - normal.z,
      );
      if (i < 48) {
        const j = i * 2;
        indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
      }
    }
    const geo = geometry(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    mesh(geo, mat);
  }

  // A softened, stratified landscape edge makes the estate read as a single place.
  terrace(palette.edge, 0, 0, 16.3, 11.9, 2.3, -0.49, 0.31);
  terrace(palette.stone, 0, 0, 16.05, 11.65, 2.2, -0.2, 0.3);
  terrace(palette.earth, 0, 0, 15.8, 11.4, 2.1, -0.07, 0.15);
  terrace(palette.grass, 0, 0, 15.65, 11.25, 2.1, 0, 0.1);
  terrace(palette.lawn, -4.15, 0.45, 5.9, 6.8, 1.25, 0.04, 0.06);
  terrace(palette.stone, 2.45, 2.7, 6.7, 4.3, 0.8, 0.12, 0.16);
  terrace(palette.gravel, 2.45, 2.7, 6.4, 4, 0.68, 0.145, 0.04);
  terrace(palette.plaster, 3.1, -2.65, 5.8, 4.0, 0.2, 0.2, 0.25);
  // Deliberately broad, curving paths, rather than disconnected display plinths.
  path(
    [
      [-7.15, 3.9],
      [-5.3, 4.45],
      [-2, 3.8],
      [-0.4, 2.6],
      [0.4, 0.7],
      [1.6, -0.8],
    ],
    0.83,
  );
  path(
    [
      [-4, -1.8],
      [-3, -2.9],
      [-0.7, -2.35],
      [0.5, -1.65],
    ],
    0.65,
  );
  path(
    [
      [5.4, 3.4],
      [6.35, 2],
      [6.5, -0.25],
      [5.9, -2.5],
    ],
    0.64,
  );
  // Terrace joints, shallow entry steps, and pale stone coping.
  for (let i = 0; i < 7; i += 1) {
    box(palette.stone, -0.1 + i * 0.86, 0.167, 2.7, 0.012, 0.008, 3.55);
  }
  box(palette.stone, 2.9, 0.09, -0.38, 2.1, 0.16, 0.4);
  box(palette.plaster, 2.9, 0.16, -0.6, 2.6, 0.17, 0.35);

  // Olive trees have crooked trunks and loose, silver-green umbrella canopies.
  function olive(x, z, size = 1, seed = 0) {
    cylinder(palette.bark, x, 0.73 * size, z, 0.085 * size, 1.5 * size);
    for (let i = 0; i < 4; i += 1) {
      const angle = i * 1.7 + seed;
      const dx = Math.cos(angle) * 0.48 * size;
      const dz = Math.sin(angle) * 0.4 * size;
      beam(
        palette.bark,
        new THREE.Vector3(x, 0.82 * size, z),
        new THREE.Vector3(x + dx, 1.75 * size, z + dz),
        0.065 * size,
      );
    }
    for (let i = 0; i < 11; i += 1) {
      const angle = i * 2.399 + seed;
      const radius = 0.25 + (i % 3) * 0.2;
      sphere(
        i % 3 ? palette.olive : palette.sage,
        x + Math.cos(angle) * radius * size,
        (1.8 + Math.sin(i * 1.6) * 0.22) * size,
        z + Math.sin(angle) * radius * size,
        (0.46 + (i % 2) * 0.1) * size,
        0.39 * size,
        0.42 * size,
        angle,
      );
    }
  }
  function cypress(x, z, height) {
    cylinder(palette.bark, x, height * 0.24, z, 0.065, height * 0.48);
    instance(
      organicSphere,
      palette.darkLeaf,
      x,
      height * 0.56,
      z,
      height * 0.16,
      height * 0.49,
      height * 0.15,
    );
    instance(
      organicSphere,
      palette.forest,
      x + 0.03,
      height * 0.78,
      z,
      height * 0.115,
      height * 0.28,
      height * 0.11,
    );
  }
  function shrub(x, z, radius = 0.3, mat = palette.olive) {
    instance(
      organicSphere,
      mat,
      x,
      radius * 0.67 + 0.04,
      z,
      radius,
      radius * 0.78,
      radius * 0.85,
      0,
      x + z,
    );
  }
  function flower(x, y, z, size = 0.1, mat = palette.petal, angle = 0) {
    for (let p = 0; p < 5; p += 1) {
      const a = angle + p * Math.PI * 0.4;
      instance(
        littleSphere,
        mat,
        x + Math.cos(a) * size * 0.55,
        y + Math.sin(p * 2) * size * 0.08,
        z + Math.sin(a) * size * 0.55,
        size * 0.66,
        size * 0.3,
        size * 0.5,
        0,
        -a,
      );
    }
    instance(
      littleSphere,
      palette.flowerHeart,
      x,
      y + size * 0.15,
      z,
      size * 0.29,
      size * 0.22,
      size * 0.29,
    );
  }
  function foliage(x, y, z, radius, count, seed = 0) {
    for (let i = 0; i < count; i += 1) {
      const a = i * 2.399 + seed;
      const r = radius * Math.sqrt((i + 0.5) / count);
      instance(
        leafSphere,
        i % 3 ? palette.olive : palette.leaf,
        x + Math.cos(a) * r,
        y + Math.sin(i * 1.8) * radius * 0.4,
        z + Math.sin(a) * r,
        radius * 0.31,
        radius * 0.17,
        radius * 0.48,
        0.3,
        a,
        0.3,
      );
    }
  }
  function flowerBed(x, z, length, angle = 0) {
    const count = Math.ceil(length / 0.25);
    for (let i = 0; i < count; i += 1) {
      const t = (i / Math.max(1, count - 1) - 0.5) * length;
      const px = x + Math.cos(angle) * t;
      const pz = z + Math.sin(angle) * t;
      shrub(px, pz, 0.19 + (i % 3) * 0.03, i % 2 ? palette.sage : palette.olive);
      if (i % 2 === 0) flower(px, 0.32, pz, 0.085, i % 4 ? palette.blush : palette.petal, i);
    }
  }
  olive(-6.7, -3.8, 1.12, 0.6);
  olive(-7, 2.7, 0.9, 2);
  olive(-0.7, -4.3, 1.14, 1);
  olive(6.7, 3.55, 1.02, 2.3);
  olive(6.7, -3.8, 1.1, 0.2);
  cypress(-6.2, -4.1, 2.85);
  cypress(-1.6, -4.7, 2.9);
  cypress(1, -4.8, 3.1);
  cypress(5.4, -4.85, 3.4);
  cypress(7.15, -1.2, 2.8);
  cypress(-7.1, -1.7, 2.4);
  // Clipped hedge runs hold the borders; individual mounds soften their ends.
  for (let i = 0; i < 20; i += 1) shrub(-6.25 + i * 0.51, -5.02, 0.34, palette.darkLeaf);
  for (let i = 0; i < 9; i += 1) shrub(-7.35, -2.8 + i * 0.57, 0.3, palette.darkLeaf);
  flowerBed(-5.1, 4.7, 3.4);
  flowerBed(-1.65, 0.2, 3.8, Math.PI / 2);
  flowerBed(6.05, 0.15, 2.9, Math.PI / 2);
  flowerBed(2.5, 5.05, 4.7);
  flowerBed(-3.6, -3.15, 3.5);

  // Wedding garden: an aisle, aligned white chairs, and a botanical double arch.
  terrace(palette.gravel, -4.15, -1.65, 3.45, 1.15, 0.4, 0.085, 0.04);
  path(
    [
      [-4.15, 3.65],
      [-4.15, 1.65],
      [-4.15, -1.7],
    ],
    0.8,
    palette.linen,
    0.072,
  );
  function chair(x, z, angle = 0, gold = false, baseY = 0.06) {
    const frame = gold ? palette.gold : palette.plaster;
    const convert = (dx, dy, dz, w, h, d, mat = frame) => {
      const px = x + dx * Math.cos(angle) + dz * Math.sin(angle);
      const pz = z - dx * Math.sin(angle) + dz * Math.cos(angle);
      box(mat, px, baseY + dy, pz, w, h, d, angle);
    };
    convert(0, 0.39, 0, 0.41, 0.075, 0.43, gold ? palette.linen : palette.plaster);
    for (const side of [-1, 1]) {
      convert(side * 0.17, 0.2, -0.16, 0.035, 0.39, 0.035);
      convert(side * 0.17, 0.2, 0.16, 0.035, 0.39, 0.035);
      convert(side * 0.17, 0.65, 0.17, 0.035, 0.5, 0.035);
    }
    convert(0, 0.86, 0.17, 0.36, 0.06, 0.04);
    if (gold) {
      convert(0, 0.65, 0.17, 0.028, 0.39, 0.028);
    } else {
      convert(0, 0.71, 0.17, 0.34, 0.12, 0.04);
    }
  }
  for (let row = 0; row < 4; row += 1) {
    for (const side of [-1, 1]) {
      for (let seat = 0; seat < 2; seat += 1) {
        chair(-4.15 + side * (0.83 + seat * 0.62), -0.15 + row * 0.79);
      }
    }
  }
  const archCenterX = -4.15;
  function arch(z, mat, radius = 1.26) {
    const points = [
      new THREE.Vector3(archCenterX - radius, 0.1, z),
      new THREE.Vector3(archCenterX - radius, 1.75, z),
    ];
    for (let i = 0; i <= 24; i += 1) {
      const a = Math.PI - (i / 24) * Math.PI;
      points.push(
        new THREE.Vector3(archCenterX + Math.cos(a) * radius, 1.75 + Math.sin(a) * 1.02, z),
      );
    }
    points.push(new THREE.Vector3(archCenterX + radius, 0.1, z));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    mesh(geometry(new THREE.TubeGeometry(curve, 70, 0.035, 7, false)), mat);
  }
  arch(-1.9, palette.gold);
  arch(-2.13, palette.gold);
  for (const side of [-1, 1]) {
    box(palette.stone, archCenterX + side * 1.26, 0.12, -2.01, 0.38, 0.18, 0.49);
    box(palette.linen, archCenterX + side * 1.19, 1.14, -2.13, 0.18, 2.1, 0.045, 0, side * 0.07);
  }
  for (let i = 0; i < 24; i += 1) {
    const a = 0.3 + (i / 23) * 2.6;
    const x = archCenterX + Math.cos(a) * 1.27;
    const y = 1.76 + Math.sin(a) * 1.02;
    if (i < 13 || i > 19) {
      foliage(x, y, -2.02, 0.23, 5, i);
      flower(x, y + 0.04, -1.8, 0.12 + (i % 3) * 0.016, i % 3 ? palette.petal : palette.blush, a);
    }
  }
  for (const [x, z] of [
    [-5.47, -1.76],
    [-2.83, -1.76],
    [-5.05, 3.25],
    [-3.25, 3.25],
  ]) {
    cylinder(palette.stone, x, 0.26, z, 0.23, 0.44);
    foliage(x, 0.61, z, 0.43, 13);
    for (let i = 0; i < 5; i += 1) {
      flower(
        x + Math.cos(i * 2.4) * 0.23,
        0.67,
        z + Math.sin(i * 2.4) * 0.23,
        0.12,
        i % 2 ? palette.petal : palette.blush,
        i,
      );
    }
  }
  // An intentional scatter confined to the aisle, never airborne confetti.
  for (let i = 0; i < 30; i += 1) {
    const z = -1.05 + (i / 30) * 4.25;
    const x = -4.15 + Math.sin(i * 2.399) * (0.25 + (i % 3) * 0.12);
    instance(
      littleSphere,
      i % 3 ? palette.petal : palette.blush,
      x,
      0.083,
      z,
      0.045,
      0.009,
      0.03,
      0,
      i,
    );
  }

  // Celebration terrace: a single generous table, dressed rather than decorated.
  const tableX = 2.65;
  const tableZ = 2.75;
  box(palette.oak, tableX, 0.91, tableZ, 4.65, 0.12, 1.32);
  box(palette.linen, tableX, 0.99, tableZ, 4.79, 0.07, 1.43);
  box(palette.linen, tableX, 0.76, tableZ - 0.72, 4.79, 0.43, 0.045);
  box(palette.linen, tableX, 0.76, tableZ + 0.72, 4.79, 0.43, 0.045);
  box(palette.linen, tableX - 2.39, 0.76, tableZ, 0.045, 0.43, 1.44);
  box(palette.linen, tableX + 2.39, 0.76, tableZ, 0.045, 0.43, 1.44);
  box(palette.sage, tableX, 1.031, tableZ, 4.45, 0.012, 0.28);
  for (const dx of [-1.7, 1.7]) {
    for (const dz of [-0.4, 0.4])
      box(palette.oak, tableX + dx, 0.49, tableZ + dz, 0.08, 0.73, 0.08);
  }
  for (let i = 0; i < 6; i += 1) {
    const x = tableX - 1.94 + i * 0.775;
    for (const side of [-1, 1]) {
      chair(x, tableZ + side * 1.11, side === 1 ? 0 : Math.PI, true, 0.16);
      const z = tableZ + side * 0.46;
      cylinder(palette.gold, x, 1.042, z, 0.19, 0.018);
      cylinder(palette.plaster, x, 1.058, z, 0.165, 0.02);
      cylinder(palette.linen, x, 1.073, z, 0.12, 0.012);
      box(palette.sage, x + 0.01, 1.089, z, 0.11, 0.022, 0.2, 0.12);
      box(palette.gold, x - 0.24, 1.051, z, 0.018, 0.014, 0.23);
      box(palette.gold, x + 0.24, 1.051, z, 0.018, 0.014, 0.23);
      cylinder(palette.gold, x + 0.21, 1.078, z - side * 0.19, 0.055, 0.016);
      cylinder(palette.gold, x + 0.21, 1.14, z - side * 0.19, 0.012, 0.11);
      sphere(palette.linen, x + 0.21, 1.22, z - side * 0.19, 0.055, 0.065, 0.055);
    }
  }
  chair(tableX - 2.75, tableZ, -Math.PI / 2, true, 0.16);
  chair(tableX + 2.75, tableZ, Math.PI / 2, true, 0.16);
  for (let i = 0; i < 17; i += 1) {
    const x = tableX - 1.9 + i * 0.235;
    foliage(x, 1.105, tableZ, 0.17, 4, i);
    if (i % 2 === 0)
      flower(
        x,
        1.18,
        tableZ + Math.sin(i) * 0.055,
        0.095,
        i % 4 ? palette.blush : palette.petal,
        i,
      );
  }
  for (const dx of [-1.5, -0.5, 0.5, 1.5]) {
    const x = tableX + dx;
    cylinder(palette.gold, x, 1.065, tableZ, 0.07, 0.035);
    cylinder(palette.gold, x, 1.2, tableZ, 0.025, 0.28);
    cylinder(palette.linen, x, 1.43, tableZ, 0.034, 0.22);
    instance(unitCone, palette.wick, x, 1.56, tableZ, 0.014, 0.04, 0.014);
  }
  // Low stone urns frame the dinner terrace, leaving clear circulation space.
  for (const x of [0.05, 5.3]) {
    cylinder(palette.stone, x, 0.31, 4.6, 0.25, 0.34);
    sphere(palette.stone, x, 0.53, 4.6, 0.33, 0.23, 0.33);
    foliage(x, 0.82, 4.6, 0.42, 15);
    flower(x, 0.98, 4.6, 0.15, palette.petal);
  }

  // Cape-inspired open pavilion: slim colonnade, high gables, exposed rafters.
  const pavilionX = 3.1;
  const frontZ = -0.9;
  const backZ = -4.35;
  const eaveY = 2.75;
  const ridgeY = 3.68;
  for (const x of [0.6, 5.6]) {
    for (const z of [frontZ, -2.62, backZ]) {
      box(palette.plaster, x, 0.35, z, 0.3, 0.3, 0.3);
      box(palette.oak, x, 1.55, z, 0.105, 2.4, 0.105);
      box(palette.gold, x, 2.66, z, 0.145, 0.1, 0.145);
      box(palette.plaster, x, 0.58, z, 0.16, 0.16, 0.16);
    }
    box(palette.plaster, x, eaveY, -2.62, 0.14, 0.16, 3.9);
  }
  box(palette.oak, pavilionX, ridgeY, -2.62, 0.105, 0.12, 3.95);
  for (let i = 0; i < 7; i += 1) {
    const z = -0.73 - i * 0.64;
    beam(
      palette.plaster,
      new THREE.Vector3(0.38, eaveY, z),
      new THREE.Vector3(pavilionX, ridgeY, z),
      0.09,
      0.11,
    );
    beam(
      palette.plaster,
      new THREE.Vector3(pavilionX, ridgeY, z),
      new THREE.Vector3(5.82, eaveY, z),
      0.09,
      0.11,
    );
    if (i === 0 || i === 6) {
      box(palette.plaster, pavilionX, eaveY, z, 5.45, 0.09, 0.09);
      beam(
        palette.oak,
        new THREE.Vector3(pavilionX, eaveY, z),
        new THREE.Vector3(pavilionX, ridgeY - 0.04, z),
        0.055,
      );
    }
  }
  // Fine longitudinal slats make a luminous roof without hiding the programme.
  for (const side of [-1, 1]) {
    for (let i = 1; i <= 4; i += 1) {
      const t = i / 4.6;
      box(
        palette.linen,
        pavilionX + side * t * 2.72,
        ridgeY - t * (ridgeY - eaveY) + 0.06,
        -2.65,
        0.095,
        0.045,
        4.0,
      );
    }
  }
  // The back wall and raised stage make this unmistakably an event venue.
  box(palette.plaster, pavilionX, 0.63, -4.43, 5.3, 0.85, 0.12);
  box(palette.stone, pavilionX, 0.3, -3.8, 3.5, 0.16, 1.04);
  box(palette.oak, pavilionX, 0.39, -3.8, 3.45, 0.035, 1.02);
  box(palette.oak, 3.65, 1.76, -4.27, 2.12, 1.3, 0.065);
  box(palette.forest, 3.65, 1.76, -4.22, 1.98, 1.16, 0.035);
  box(palette.gold, 3.65, 1.12, -4.21, 2.1, 0.035, 0.04);
  // A small, real lectern silhouette, with no text or invented client branding.
  box(palette.oak, 1.82, 0.95, -3.78, 0.34, 1.08, 0.32);
  box(palette.gold, 1.82, 0.43, -3.78, 0.57, 0.055, 0.48);
  const lecternTop = mesh(
    geometry(new THREE.BoxGeometry(0.62, 0.06, 0.48)),
    palette.oak,
    1.82,
    1.51,
    -3.78,
  );
  lecternTop.rotation.x = 0.15;
  beam(
    palette.forest,
    new THREE.Vector3(1.93, 1.55, -3.87),
    new THREE.Vector3(1.93, 1.77, -3.95),
    0.018,
  );
  for (let row = 0; row < 2; row += 1) {
    for (let seat = 0; seat < 5; seat += 1) {
      chair(1.32 + seat * 0.87, -2.63 + row * 0.86, 0, true, 0.23);
    }
  }
  // Linen tie-backs soften only the rear corners; the front remains open.
  for (const x of [0.65, 5.55]) {
    box(palette.linen, x, 1.52, -4.16, 0.23, 2.25, 0.065);
    box(palette.gold, x, 1.12, -4.11, 0.25, 0.045, 0.04);
    cylinder(palette.stone, x, 0.38, -0.59, 0.23, 0.35);
    foliage(x, 0.7, -0.59, 0.37, 12);
    flower(x, 0.84, -0.55, 0.13, palette.petal);
  }

  // Quiet stone water garden at the meeting of the three routes.
  cylinder(palette.stone, -0.2, 0.18, -0.2, 0.72, 0.29);
  cylinder(palette.edge, -0.2, 0.34, -0.2, 0.65, 0.075);
  cylinder(palette.water, -0.2, 0.383, -0.2, 0.58, 0.012);
  cylinder(palette.stone, -0.2, 0.55, -0.2, 0.095, 0.34);
  sphere(palette.stone, -0.2, 0.73, -0.2, 0.15, 0.09, 0.15);
  instance(unitRing, palette.sage, -0.2, 0.393, -0.2, 0.32, 0.32, 0.32, Math.PI / 2);
  for (let i = 0; i < 7; i += 1) {
    const angle = 0.3 + i * 0.73;
    shrub(-0.2 + Math.cos(angle) * 1.05, -0.2 + Math.sin(angle) * 1.05, 0.17, palette.sage);
  }
  // Low front wall and entry gate give the landscape a composed finished edge.
  box(palette.stone, -6.55, 0.23, 4.65, 1.3, 0.4, 0.2, -0.12);
  for (const x of [-7.15, -5.8]) {
    box(palette.plaster, x, 0.48, 4.5, 0.28, 0.88, 0.28);
    box(palette.stone, x, 0.95, 4.5, 0.36, 0.08, 0.36);
  }
  for (let i = 0; i < 6; i += 1) box(palette.gold, -7.03 + i * 0.22, 0.49, 4.5, 0.018, 0.67, 0.018);
  box(palette.gold, -6.48, 0.77, 4.5, 1.2, 0.025, 0.025);

  for (const batch of batches.values()) {
    const object = new THREE.InstancedMesh(batch.geometry, batch.material, batch.transforms.length);
    batch.transforms.forEach((transform, index) => object.setMatrixAt(index, transform));
    object.instanceMatrix.needsUpdate = true;
    object.castShadow = true;
    object.receiveShadow = true;
    object.computeBoundingSphere();
    group.add(object);
  }
  batches.clear();

  const ambient = new THREE.HemisphereLight('#F8F7E9', '#78856D', 2.25);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#FFF0D7', 3.1);
  sun.position.set(-8, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -13;
  sun.shadow.camera.right = 13;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 45;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#E6EEE8', 1.1);
  fill.position.set(9, 7, -8);
  scene.add(fill);
  const groundMaterial = new THREE.ShadowMaterial({ color: '#536754', opacity: 0.15 });
  materials.add(groundMaterial);
  const ground = new THREE.Mesh(geometry(new THREE.PlaneGeometry(160, 160)), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.88;
  ground.receiveShadow = true;
  scene.add(ground);

  const cameraPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(14.8, 13.6, 18.5),
      new THREE.Vector3(-11.3, 9.3, 12.6),
      new THREE.Vector3(10.7, 8.4, 13.8),
      new THREE.Vector3(11.7, 8.5, 9.8),
    ],
    false,
    'catmullrom',
    0.28,
  );
  const targetPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0, 0.75, 0),
      new THREE.Vector3(-3.95, 0.7, 0.45),
      new THREE.Vector3(2.45, 0.8, 2.65),
      new THREE.Vector3(3.0, 1.1, -2.25),
    ],
    false,
    'catmullrom',
    0.28,
  );
  const framing = [
    { height: 15.6, width: 21.2 },
    { height: 9.2, width: 10.8 },
    { height: 8.2, width: 10.8 },
    { height: 9.2, width: 12.2 },
  ];
  const lookTarget = new THREE.Vector3();
  let disposed = false;
  function renderState(progress, aspect) {
    if (disposed) return;
    const t = Number.isFinite(progress) ? THREE.MathUtils.clamp(progress, 0, 1) : 0;
    const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
    cameraPath.getPoint(t, camera.position);
    targetPath.getPoint(t, lookTarget);
    camera.lookAt(lookTarget);
    const section = Math.min(2, Math.floor(t * 3));
    const fraction = THREE.MathUtils.smoothstep(t * 3 - section, 0, 1);
    const height = THREE.MathUtils.lerp(
      framing[section].height,
      framing[section + 1].height,
      fraction,
    );
    const width = THREE.MathUtils.lerp(
      framing[section].width,
      framing[section + 1].width,
      fraction,
    );
    const halfHeight = Math.max(height, width / ratio) / 2;
    camera.left = -halfHeight * ratio;
    camera.right = halfHeight * ratio;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.traverse((object) => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const entry of objectMaterials) {
        if (!entry) continue;
        materials.add(entry);
        for (const value of Object.values(entry)) if (value?.isTexture) textures.add(value);
      }
    });
    sun.shadow.dispose();
    textures.forEach((value) => value.dispose());
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    scene.clear();
    geometries.clear();
    materials.clear();
    textures.clear();
  }
  renderState(0, 1.4);
  return { scene, camera, renderState, dispose };
}
