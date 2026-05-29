---
title: 'Three.js 粒子系统入门'
slug: 'threejs-particles'
date: '2026-05-20'
category: '开发'
tags: ['Three.js', 'WebGL', '3D']
cover: ''
summary: '使用 Three.js 创建粒子效果是 Web 3D 开发中最有趣的部分之一。'
published: true
---

使用 Three.js 创建粒子效果是 Web 3D 开发中最有趣的部分之一。本文将带你从零开始构建一个完整的粒子系统。

## 什么是粒子系统？

粒子系统是一种图形技术，用于模拟大量小物体的行为。在 Three.js 中，我们使用 `Points` 和 `BufferGeometry` 来高效渲染粒子。

## 基础实现

```javascript
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(count * 3);

for (let i = 0; i < count; i++) {
  positions[i * 3] = Math.random() * 100 - 50;
  positions[i * 3 + 1] = Math.random() * 100 - 50;
  positions[i * 3 + 2] = Math.random() * 100 - 50;
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({ size: 0.5, color: 0xffffff });
const particles = new THREE.Points(geometry, material);
scene.add(particles);
```

## 添加动画

通过在 `requestAnimationFrame` 循环中更新粒子位置，我们可以创建各种动态效果。

## 优化技巧

- 使用 `BufferGeometry` 而非 `Geometry`
- 控制粒子数量，移动端使用更少的粒子
- 使用 `AdditiveBlending` 增强视觉效果
- 在离开视口时暂停渲染
