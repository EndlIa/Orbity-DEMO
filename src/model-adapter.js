// Host-side bridge for pinned examples; this is not a conformance claim.
export function createModelInstance(factory) {
  const root = factory();
  if (!root?.isObject3D) throw new TypeError('Model factory must return a Three.js Object3D');
  let disposed = false, elapsed = 0;
  return {
    root,
    tick(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new TypeError('dt must be finite and nonnegative');
      if (disposed) return;
      elapsed += dt;
      if (!disposed && typeof root.userData?.tick === 'function') root.userData.tick(dt, elapsed);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      const geometries = new Set(), materials = new Set(), textures = new Set();
      root.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!material) continue;
          materials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
        }
      });
      textures.forEach(texture => texture.dispose());
      materials.forEach(material => material.dispose());
      geometries.forEach(geometry => geometry.dispose());
    }
  };
}
