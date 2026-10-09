import * as T from 'three';
import { CATALOG } from './furniture-catalog.js';
import { createFurniture, disposeFurniture } from './furniture.js';

let pending;
export function furnitureThumbnails() {
  if (pending) return pending;
  pending = Promise.resolve().then(async () => {
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(160,110);renderer.setPixelRatio(1);renderer.toneMapping=T.ACESFilmicToneMapping;
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-2,2,1.375,-1.375,.1,40);
    scene.add(new T.HemisphereLight('#fff4dd','#8c8a83',2.5));
    const sun=new T.DirectionalLight('#fff1d5',3);sun.position.set(-4,7,5);scene.add(sun);
    const result={};
    try {
      for (const spec of CATALOG) {
        const model=createFurniture(spec.kind,'default',{lights:false});scene.add(model);
        const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
        const scale=2.5/Math.max(size.x,size.y,size.z);model.scale.setScalar(scale);model.position.copy(center).multiplyScalar(-scale);
        camera.position.set(5,4,6);camera.lookAt(0,0,0);renderer.render(scene,camera);
        result[spec.kind]=renderer.domElement.toDataURL('image/png');disposeFurniture(model);
        // Release the main thread between catalog items on slower devices.
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      return result;
    } finally { renderer.dispose();renderer.forceContextLoss(); }
  }).catch(error=>{pending=undefined;throw error;});
  return pending;
}
