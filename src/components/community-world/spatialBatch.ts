import * as T from 'three';

type BatchFlags = Pick<T.Mesh, 'castShadow' | 'receiveShadow' | 'renderOrder'> & { layers: number };

/**
 * Merge nearby static, direct children while retaining independent frustum bounds.
 * Large ground/road surfaces share spanning batches with their complete geometry:
 * clipping would introduce seams and lose offscreen shadow casters. Three.js can
 * cull each resulting mesh independently for the view camera and shadow camera.
 * Groups, transparent surfaces and annotated/pickable meshes are left untouched.
 */
export function mergeSpatialStatic(root: T.Group, merge: (group: T.Group) => void, cellSize = 32) {
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw new RangeError('cellSize must be positive and finite');

  const cells = new Map<string, { group: T.Group; flags: BatchFlags }>();
  const bounds = new T.Box3(), center = new T.Vector3(), size = new T.Vector3();

  for (const child of [...root.children]) {
    if (!(child instanceof T.Mesh) || child.constructor !== T.Mesh || Array.isArray(child.material)
      || child.material.transparent || !child.visible || !child.frustumCulled
      || Object.keys(child.userData).length) continue;

    if (child.matrixAutoUpdate) child.updateMatrix();
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    if (!child.geometry.boundingBox || child.geometry.boundingBox.isEmpty()) continue;
    bounds.copy(child.geometry.boundingBox).applyMatrix4(child.matrix);
    bounds.getSize(size);
    bounds.getCenter(center);

    const flags: BatchFlags = {
      castShadow: child.castShadow,
      receiveShadow: child.receiveShadow,
      renderOrder: child.renderOrder,
      layers: child.layers.mask,
    };
    const location = size.x > cellSize || size.z > cellSize
      ? 'spanning' : `${Math.floor(center.x / cellSize)}:${Math.floor(center.z / cellSize)}`;
    const key = [location, Number(flags.castShadow), Number(flags.receiveShadow), flags.renderOrder, flags.layers].join(':');
    let cell = cells.get(key);
    if (!cell) {
      const group = new T.Group();
      group.name = `static-cell:${key}`;
      group.renderOrder = root.renderOrder;
      root.add(group);
      cell = { group, flags };
      cells.set(key, cell);
    }
    // The cell is an identity transform directly under the original parent.
    // Moving this child into it preserves local and world placement, even when
    // the root itself is translated, rotated or non-uniformly scaled.
    cell.group.add(child);
  }

  for (const { group, flags } of cells.values()) {
    merge(group);
    group.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      object.castShadow = flags.castShadow;
      object.receiveShadow = flags.receiveShadow;
      object.renderOrder = flags.renderOrder;
      object.layers.mask = flags.layers;
      object.geometry.computeBoundingBox();
      object.geometry.computeBoundingSphere();
    });
  }
}
