import * as THREE from 'three';

export function createStarfield(count = 3000, spread = 1400) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const stride = index * 3;

    positions[stride] = (Math.random() - 0.5) * spread;
    positions[stride + 1] = (Math.random() - 0.5) * spread;
    positions[stride + 2] = (Math.random() - 0.5) * spread;

    color.setHSL(0.55 + Math.random() * 0.1, 0.25, 0.75 + Math.random() * 0.2);
    colors[stride] = color.r;
    colors[stride + 1] = color.g;
    colors[stride + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    vertexColors: true
  });

  return new THREE.Points(geometry, material);
}
