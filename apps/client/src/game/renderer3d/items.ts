import * as THREE from 'three';
import { Item, TILE_PX } from '@kitchen/core';
import { toon, withOutline } from './materials';
import { AssetLoader } from '../assets/AssetLoader';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

function getIngredientModelId(item: any): string {
  if (item.id === 'tomato') return item.state === 'chopped' ? 'tomato_sliced' : 'tomato';
  if (item.id === 'lettuce') return item.state === 'chopped' ? 'lettuce_chopped' : 'lettuce';
  if (item.id === 'meat') return item.state === 'cooked' ? 'meat_cooked' : (item.state === 'chopped' ? 'meat_sliced' : 'meat');
  if (item.id === 'cheese') return item.state === 'chopped' ? 'cheese_sliced' : 'cheese';
  if (item.id === 'potato') return item.state === 'chopped' ? 'potato_sliced' : 'potato';
  if (item.id === 'carrot') return item.state === 'chopped' ? 'carrot_sliced' : 'carrot';
  if (item.id === 'onion') return item.state === 'chopped' ? 'onion_sliced' : 'onion';
  if (item.id === 'mushroom') return item.state === 'chopped' ? 'mushroom_sliced' : 'mushroom';
  if (item.id === 'dough') return item.state === 'chopped' ? 'dough_chopped' : 'dough';
  if (item.id === 'pizza') return 'pizza';
  if (item.id === 'bun') return 'bun_bottom'; // simple fallback
  if (item.id === 'stew') return 'stew';
  if (item.id === 'burger') return 'burger';
  if (item.id === 'cheese_burger') return 'cheese_burger';
  if (item.id === 'steak_dinner') return 'steak_dinner';
  if (item.id === 'salad') return 'salad';
  
  return item.id;
}

function processLoadedModel(mesh: THREE.Object3D, state: string, id: string) {
  mesh.traverse(c => {
    if ((c as THREE.Mesh).isMesh) {
      const m = (c as THREE.Mesh);
      m.castShadow = false;
      m.receiveShadow = false;
      if (state === 'burnt' && m.material && (m.material as any).color) {
        m.material = (m.material as THREE.Material).clone();
        (m.material as any).color.setHex(0x2b1d16);
      }
    }
  });
}

function createGrillMarksDecoration(isBurnt: boolean): THREE.Group {
  const g = new THREE.Group();
  const markMat = toon(isBurnt ? 0x110b08 : 0x3b1f0e);
  for (const offsetZ of [-2.4, 0, 2.4]) {
    const barGeo = new RoundedBoxGeometry(TILE_PX * 0.24, 0.9, 1.2, 1, 0.3);
    const bar = new THREE.Mesh(barGeo, markMat);
    bar.position.set(0, 4.2, offsetZ);
    bar.rotation.y = Math.PI / 7;
    g.add(bar);
  }
  return g;
}

function createDirtyPlateSmudges(): THREE.Group {
  const g = new THREE.Group();
  const smudgeMat = toon(0x92400e);
  const crumbMat = toon(0xd97706);
  const sauceGeo = new THREE.CylinderGeometry(TILE_PX * 0.14, TILE_PX * 0.16, 0.6, 12);
  const sauce = new THREE.Mesh(sauceGeo, smudgeMat);
  sauce.position.set(-2.2, 2.4, 1.5);
  g.add(sauce);

  const sauce2Geo = new THREE.CylinderGeometry(TILE_PX * 0.09, TILE_PX * 0.10, 0.6, 10);
  const sauce2 = new THREE.Mesh(sauce2Geo, smudgeMat);
  sauce2.position.set(3.1, 2.4, -2.0);
  g.add(sauce2);

  for (const [cx, cz] of [[-4.0, -2.5], [2.5, 3.2], [0.8, -3.8]] as const) {
    const crumb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), crumbMat);
    crumb.position.set(cx, 2.7, cz);
    g.add(crumb);
  }
  return g;
}

function createSoupSurfaceDetails(soupColor: number, count: number): THREE.Group {
  const g = new THREE.Group();
  const liquidGeo = new THREE.CylinderGeometry(TILE_PX * 0.23, TILE_PX * 0.21, 2.4, 24);
  const liquid = new THREE.Mesh(liquidGeo, toon(soupColor, { roughness: 0.22 }));
  liquid.position.y = 12.0;
  g.add(liquid);

  // Inner lighter broth swirl ring
  const swirlGeo = new THREE.RingGeometry(TILE_PX * 0.10, TILE_PX * 0.19, 18);
  swirlGeo.rotateX(-Math.PI / 2);
  const swirlMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const swirl = new THREE.Mesh(swirlGeo, swirlMat);
  swirl.position.y = 13.3;
  g.add(swirl);

  // Floating 3D diced vegetable chunks & herb garnish based on ingredient count
  const chunkColors = [soupColor, 0x22c55e, 0xfef08a];
  const chunkOffsets: [number, number][] = [
    [-4.2, -2.5],
    [3.8, 2.2],
    [-1.5, 4.4],
    [4.0, -3.2],
  ];
  const visibleChunks = Math.min(chunkOffsets.length, Math.max(1, count + 1));
  for (let i = 0; i < visibleChunks; i++) {
    const [cx, cz] = chunkOffsets[i]!;
    const chunkGeo = new RoundedBoxGeometry(2.6, 1.6, 2.6, 1, 0.4);
    const chunk = new THREE.Mesh(chunkGeo, toon(chunkColors[i % chunkColors.length]!));
    chunk.position.set(cx, 13.4, cz);
    chunk.rotation.y = i * 0.9;
    g.add(chunk);
  }
  return g;
}

function createFireExtinguisherModel(): THREE.Group {
  const g = new THREE.Group();
  // Red steel cylinder body
  const tankGeo = new THREE.CylinderGeometry(TILE_PX * 0.14, TILE_PX * 0.14, TILE_PX * 0.44, 16);
  const tank = new THREE.Mesh(tankGeo, toon(0xdc2626));
  tank.position.y = TILE_PX * 0.22;
  tank.castShadow = true;
  g.add(withOutline(tank));

  // Rounded dome shoulder
  const domeGeo = new THREE.SphereGeometry(TILE_PX * 0.14, 16, 10);
  const dome = new THREE.Mesh(domeGeo, toon(0xdc2626));
  dome.position.y = TILE_PX * 0.43;
  g.add(dome);

  // White safety label band
  const bandGeo = new THREE.CylinderGeometry(TILE_PX * 0.144, TILE_PX * 0.144, TILE_PX * 0.14, 16);
  const band = new THREE.Mesh(bandGeo, toon(0xf8fafc));
  band.position.y = TILE_PX * 0.24;
  g.add(band);

  // Silver valve & pressure gauge neck
  const neckGeo = new THREE.CylinderGeometry(TILE_PX * 0.045, TILE_PX * 0.055, TILE_PX * 0.10, 12);
  const neck = new THREE.Mesh(neckGeo, toon(0xcbd5e1));
  neck.position.y = TILE_PX * 0.56;
  g.add(withOutline(neck));

  // Top squeeze lever handle
  const leverGeo = new THREE.BoxGeometry(TILE_PX * 0.16, TILE_PX * 0.035, TILE_PX * 0.05);
  const lever = new THREE.Mesh(leverGeo, toon(0x1e293b));
  lever.position.set(-TILE_PX * 0.04, TILE_PX * 0.61, 0);
  lever.rotation.z = 0.22;
  g.add(lever);

  // Black discharge hose & horn nozzle
  const nozzleGeo = new THREE.ConeGeometry(TILE_PX * 0.055, TILE_PX * 0.18, 12);
  const nozzle = new THREE.Mesh(nozzleGeo, toon(0x1e293b));
  nozzle.position.set(TILE_PX * 0.14, TILE_PX * 0.46, 0);
  nozzle.rotation.z = -Math.PI / 2.6;
  g.add(withOutline(nozzle));

  return g;
}

function generateProceduralFallback(item: Item): THREE.Group {
  const group = new THREE.Group();
  
  if (item.type === 'ingredient') {
    const ingGeo = new RoundedBoxGeometry(TILE_PX * 0.48, TILE_PX * 0.48, TILE_PX * 0.48, 2, 0.05);
    let colorHex = 0xffffff;
    if (item.id === 'tomato') colorHex = 0xe02438;
    if (item.id === 'lettuce') colorHex = 0x2b9348;
    if (item.id === 'onion') colorHex = 0xd4842a;
    if (item.id === 'mushroom') colorHex = 0x8b4513;
    if (item.id === 'bun') colorHex = 0xffcc88;
    if (item.id === 'meat') colorHex = 0x883333;
    if (item.id === 'dough') colorHex = 0xf5deb3;
    if (item.id === 'cheese') colorHex = 0xffd700;
    if (item.id === 'pizza') colorHex = item.state === 'burnt' ? 0x111111 : (item.state === 'cooked' ? 0xd2691e : 0xffcc88);
    
    if (item.state === 'chopped') ingGeo.scale(0.85, 0.45, 0.85);
    if (item.state === 'cooked') colorHex = 0x552211;
    if (item.state === 'burnt') colorHex = 0x111111;

    const mesh = new THREE.Mesh(ingGeo, toon(colorHex));
    mesh.castShadow = true;
    group.add(withOutline(mesh));
  } else if (item.type === 'plate') {
    const plateGeo = new THREE.CylinderGeometry(TILE_PX * 0.36, TILE_PX * 0.28, TILE_PX * 0.05, 16);
    const plate = new THREE.Mesh(plateGeo, toon(item.dirty ? 0xddccaa : 0xffffff));
    plate.castShadow = true;
    group.add(withOutline(plate));
    
    if (item.contents && item.contents.length > 0) {
      let stackY = TILE_PX * 0.05;
      for (const content of item.contents) {
        const contentModel = generateProceduralFallback(content);
        contentModel.position.y = stackY;
        group.add(contentModel);
        stackY += TILE_PX * 0.12;
      }
    }
  } else if (item.type === 'tool') {
    if (item.tool === 'pan') {
      const panBase = new THREE.Mesh(new THREE.CylinderGeometry(TILE_PX * 0.33, TILE_PX * 0.28, TILE_PX * 0.1, 16), toon(0x888888));
      const handle = new THREE.Mesh(new THREE.BoxGeometry(TILE_PX * 0.05, TILE_PX * 0.05, TILE_PX * 0.4), toon(0x333333));
      handle.position.set(0, 0, TILE_PX * 0.4);
      group.add(withOutline(panBase));
      group.add(handle);
      if (item.contents && item.contents.length > 0) {
        for (const c of item.contents) {
          const contentModel = generateProceduralFallback(c);
          contentModel.position.y = TILE_PX * 0.1;
          group.add(contentModel);
        }
      }
    } else if (item.tool === 'pot') {
      const potBase = new THREE.Mesh(new THREE.CylinderGeometry(TILE_PX * 0.33, TILE_PX * 0.33, TILE_PX * 0.4, 16), toon(0x999999));
      group.add(withOutline(potBase));
      if (item.contents && (item.contents as any).length > 0) {
        const liquid = new THREE.Mesh(new THREE.CylinderGeometry(TILE_PX * 0.30, TILE_PX * 0.30, TILE_PX * 0.02, 16), toon(0xaa3333));
        liquid.position.y = TILE_PX * 0.15;
        group.add(liquid);
      }
    } else if (item.tool === 'extinguisher') {
      const exGeo = new THREE.CylinderGeometry(TILE_PX * 0.18, TILE_PX * 0.18, TILE_PX * 0.56, 16);
      const ex = new THREE.Mesh(exGeo, toon(0xff0000));
      group.add(withOutline(ex));
    }
  }
  return group;
}

function createDoughModel(item: Extract<Item, { type: 'ingredient' }>): THREE.Group {
  const g = new THREE.Group();
  if (item.state === 'raw') {
    // Plump creamy-white round pizza dough ball
    const ballGeo = new THREE.SphereGeometry(TILE_PX * 0.21, 16, 12);
    ballGeo.scale(1.0, 0.65, 1.0);
    const ball = new THREE.Mesh(ballGeo, toon(0xffffff));
    ball.position.y = TILE_PX * 0.13;
    ball.castShadow = true;
    g.add(withOutline(ball));

    // Light golden flour dimple on top
    const topGeo = new THREE.CylinderGeometry(TILE_PX * 0.08, TILE_PX * 0.10, 1.2, 12);
    const top = new THREE.Mesh(topGeo, toon(0xfef08a));
    top.position.y = TILE_PX * 0.25;
    g.add(top);
  } else {
    // Flat rolled-out round pizza crust with raised rim
    const baseGeo = new THREE.CylinderGeometry(TILE_PX * 0.27, TILE_PX * 0.27, 2.6, 20);
    const base = new THREE.Mesh(baseGeo, toon(0xfef3c7));
    base.position.y = 1.4;
    base.castShadow = true;
    g.add(withOutline(base));

    const rimGeo = new THREE.TorusGeometry(TILE_PX * 0.25, 2.2, 10, 24);
    rimGeo.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, toon(0xfde68a));
    rim.position.y = 2.6;
    g.add(rim);

    if (item.contents && item.contents.length > 0) {
      const hasTomato = item.contents.some((c: any) => c.id === 'tomato');
      const hasCheese = item.contents.some((c: any) => c.id === 'cheese');
      if (hasTomato) {
        const sauceGeo = new THREE.CylinderGeometry(TILE_PX * 0.21, TILE_PX * 0.21, 1.2, 18);
        const sauce = new THREE.Mesh(sauceGeo, toon(0xef4444));
        sauce.position.y = 3.0;
        g.add(sauce);
      }
      if (hasCheese) {
        const cheeseGeo = new THREE.CylinderGeometry(TILE_PX * 0.17, TILE_PX * 0.17, 1.4, 16);
        const cheese = new THREE.Mesh(cheeseGeo, toon(0xfacc15));
        cheese.position.y = hasTomato ? 3.8 : 3.0;
        g.add(cheese);
      }
    }
  }
  return g;
}

export function createItemModel(item: Item): THREE.Group {
  const group = new THREE.Group();
  
  if (window.location.search.includes('items=procedural')) {
    return generateProceduralFallback(item);
  }

  const loader = AssetLoader.getInstance();
  
  if (item.type === 'ingredient') {
    if (item.id === 'dough') {
      group.add(createDoughModel(item));
      group.userData.itemState = JSON.stringify(item);
      return group;
    }
    const assetId = getIngredientModelId(item);
    const syncAsset = loader.getAssetSync(assetId);
    if (syncAsset) {
      processLoadedModel(syncAsset.scene, item.state, item.id);
      group.add(syncAsset.scene);
      if (item.id === 'meat' && (item.state === 'cooked' || item.state === 'burnt')) {
        group.add(createGrillMarksDecoration(item.state === 'burnt'));
      }
    } else {
      const fallback = generateProceduralFallback(item);
      group.add(fallback);
      loader.loadAsset(assetId).then(glb => {
        group.remove(fallback);
        if (glb) {
          processLoadedModel(glb.scene, item.state, item.id);
          group.add(glb.scene);
          if (item.id === 'meat' && (item.state === 'cooked' || item.state === 'burnt')) {
            group.add(createGrillMarksDecoration(item.state === 'burnt'));
          }
        } else {
          group.add(fallback);
        }
      });
    }
  } 
  else if (item.type === 'plate') {
    const plateAsset = item.dirty ? 'plate_dirty' : 'plate';
    const syncAsset = loader.getAssetSync(plateAsset);
    if (syncAsset) {
      processLoadedModel(syncAsset.scene, '', 'plate');
      group.add(syncAsset.scene);
      if (item.dirty) {
        group.add(createDirtyPlateSmudges());
      }
    } else {
      const fallback = generateProceduralFallback(item);
      group.add(fallback);
      loader.loadAsset(plateAsset).then(glb => {
        group.remove(fallback);
        if (glb) {
          processLoadedModel(glb.scene, '', 'plate');
          group.add(glb.scene);
          if (item.dirty) {
            group.add(createDirtyPlateSmudges());
          }
        } else {
          group.add(fallback);
        }
      });
    }
      // Stack contents
      if (item.contents && item.contents.length > 0) {
        const hasBun = item.contents.some((c: any) => c.id === 'bun');
        const hasCheese = item.contents.some((c: any) => c.id === 'cheese');
        const hasMeat = item.contents.some((c: any) => c.id === 'meat' && c.state === 'cooked');
        const isCheeseBurger = hasBun && hasMeat && hasCheese && item.contents.length === 3;
        const isBurger = hasBun && item.contents.length > 1;
        const isSteakDinner = !hasBun && hasMeat &&
                              item.contents.some((c: any) => c.id === 'tomato' && c.state === 'chopped') &&
                              item.contents.length === 2;
        const isMushroomSteak = !hasBun && hasMeat &&
                                item.contents.some((c: any) => c.id === 'mushroom' && c.state === 'chopped') &&
                                item.contents.length === 2;

        if (isCheeseBurger) {
          const cbSync = loader.getAssetSync('cheese_burger');
          if (cbSync) {
            cbSync.scene.position.y = 3.0;
            group.add(cbSync.scene);
          } else {
            loader.loadAsset('cheese_burger').then(cbGlb => {
              if (cbGlb) {
                cbGlb.scene.position.y = 3.0;
                group.add(cbGlb.scene);
              }
            });
          }
        } else if (isSteakDinner || isMushroomSteak) {
          const sdSync = loader.getAssetSync('steak_dinner');
          if (sdSync) {
            sdSync.scene.position.y = 2.5;
            group.add(sdSync.scene);
          } else {
            loader.loadAsset('steak_dinner').then(sdGlb => {
              if (sdGlb) {
                sdGlb.scene.position.y = 2.5;
                group.add(sdGlb.scene);
              }
            });
          }
          if (isMushroomSteak) {
            const mushSync = loader.getAssetSync('mushroom_sliced');
            if (mushSync) {
              mushSync.scene.position.set(0, 7.0, 0);
              group.add(mushSync.scene);
            }
          }
        } else if (isBurger) {
          // Burger stacking: bottom bun -> fillings -> top bun
          let currentY = 3.0;

          const bSync = loader.getAssetSync('bun_bottom');
          if (bSync) {
            bSync.scene.position.y = 3.0;
            processLoadedModel(bSync.scene, '', 'bun');
            group.add(bSync.scene);
          } else {
            loader.loadAsset('bun_bottom').then(bGlb => {
              if (bGlb) {
                bGlb.scene.position.y = 3.0;
                processLoadedModel(bGlb.scene, '', 'bun');
                group.add(bGlb.scene);
              }
            });
          }
          currentY += 3.5;

          const fillings = item.contents.filter((c: any) => c.id !== 'bun');
          for (const filling of fillings) {
            const fillY = currentY;
            currentY += 3.5;
            const contentModel = createItemModel(filling);
            contentModel.position.y = fillY;
            group.add(contentModel);
          }

          const topY = currentY;
          const tSync = loader.getAssetSync('bun_top');
          if (tSync) {
            tSync.scene.position.y = topY;
            processLoadedModel(tSync.scene, '', 'bun');
            group.add(tSync.scene);
          } else {
            loader.loadAsset('bun_top').then(tGlb => {
              if (tGlb) {
                tGlb.scene.position.y = topY;
                processLoadedModel(tGlb.scene, '', 'bun');
                group.add(tGlb.scene);
              }
            });
          }
        } else {
          const pizzaItem = item.contents.find((c: any) => c.id === 'pizza');
          const soupItem = item.contents.find((c: any) => c.id && c.id.startsWith('soup_'));
          const hasLettuceAndTomato =
            item.contents.some((c: any) => c.id === 'lettuce' && c.state === 'chopped') &&
            item.contents.some((c: any) => c.id === 'tomato' && c.state === 'chopped');
          const isSalad = hasLettuceAndTomato && item.contents.length === 2;
          const isCheeseSalad =
            hasLettuceAndTomato &&
            item.contents.some((c: any) => c.id === 'cheese' && c.state === 'chopped') &&
            item.contents.length === 3;

          if (pizzaItem) {
            const pizzaModel = createItemModel(pizzaItem);
            pizzaModel.position.y = 3.0;
            group.add(pizzaModel);
          } else if (isSalad || isCheeseSalad) {
            const sSync = loader.getAssetSync('salad');
            if (sSync) {
              sSync.scene.position.y = 3.0;
              group.add(sSync.scene);
            } else {
              loader.loadAsset('salad').then(sGlb => {
                if (sGlb) {
                  sGlb.scene.position.y = 3.0;
                  group.add(sGlb.scene);
                }
              });
            }
            if (isCheeseSalad) {
              const chSync = loader.getAssetSync('cheese_sliced');
              if (chSync) {
                chSync.scene.position.set(0, 7.5, 0);
                group.add(chSync.scene);
              }
            }
          } else if (soupItem) {
            let soupColor = 0xd32f2f;
            if (soupItem.id === 'soup_onion') soupColor = 0xdfb15b;
            if (soupItem.id === 'soup_mushroom') soupColor = 0x6d4c41;
            const stewSync = loader.getAssetSync('stew');
            if (stewSync) {
              stewSync.scene.position.y = 2.5;
              group.add(stewSync.scene);
            }
            const liquid = new THREE.Mesh(
              new THREE.CylinderGeometry(TILE_PX * 0.19, TILE_PX * 0.16, 2.2, 20),
              toon(soupColor, { roughness: 0.22 })
            );
            liquid.position.y = 6.5;
            group.add(liquid);
          } else {
            // Regular stacking (individual ingredients)
            let currentY = 3.0;
            for (const c of item.contents) {
              const fillY = currentY;
              currentY += 3.5;
              const contentModel = createItemModel(c);
              contentModel.position.y = fillY;
              group.add(contentModel);
            }
          }
        }
      }
  }
  else if (item.type === 'tool') {
    if (item.tool === 'extinguisher') {
      group.add(createFireExtinguisherModel());
      group.userData.itemState = JSON.stringify(item);
      return group;
    }
    const assetId = item.tool;
    const syncAsset = assetId ? loader.getAssetSync(assetId) : null;
    if (syncAsset) {
      processLoadedModel(syncAsset.scene, '', item.tool || '');
      if (item.tool === 'pan') {
        syncAsset.scene.position.z = 0;
      }
      group.add(syncAsset.scene);
      if (item.contents && item.contents.length > 0) {
        if (item.tool === 'pan') {
          for (const c of item.contents) {
            const contentModel = createItemModel(c);
            contentModel.position.set(0, 3.2, 0);
            contentModel.scale.setScalar(0.84);
            group.add(contentModel);
          }
        } else if (item.tool === 'pot') {
          let soupColor = 0xd32f2f;
          const firstContent = item.contents[0] as any;
          const firstId = firstContent?.id;
          if (firstId === 'onion' || firstId === 'soup_onion') soupColor = 0xdfb15b;
          if (firstId === 'mushroom' || firstId === 'soup_mushroom') soupColor = 0x6d4c41;
          group.add(createSoupSurfaceDetails(soupColor, item.contents.length));
        }
      }
    } else {
      const fallback = generateProceduralFallback(item);
      group.add(fallback);
      if (assetId) {
        loader.loadAsset(assetId).then(glb => {
          group.remove(fallback);
          if (glb) {
            processLoadedModel(glb.scene, '', item.tool || '');
            if (item.tool === 'pan') {
              glb.scene.position.z = 0;
            }
            group.add(glb.scene);
            if (item.contents && item.contents.length > 0) {
              if (item.tool === 'pan') {
                for (const c of item.contents) {
                  const contentModel = createItemModel(c);
                  contentModel.position.set(0, 3.2, 0);
                  contentModel.scale.setScalar(0.84);
                  group.add(contentModel);
                }
              } else if (item.tool === 'pot') {
                let soupColor = 0xd32f2f;
                const firstContent = item.contents[0] as any;
                const firstId = firstContent?.id;
                if (firstId === 'onion' || firstId === 'soup_onion') soupColor = 0xdfb15b;
                if (firstId === 'mushroom' || firstId === 'soup_mushroom') soupColor = 0x6d4c41;
                group.add(createSoupSurfaceDetails(soupColor, item.contents.length));
              }
            }
          } else {
            group.add(fallback);
          }
        });
      }
    }
  }
  
  group.userData.itemState = JSON.stringify(item);
  return group;
}

export function updateItemModel(group: THREE.Group, item: Item) {
  const newState = JSON.stringify(item);
  if (group.userData.itemState === newState) return;
  
  if (item.type === 'ingredient') {
    const oldItem = JSON.parse(group.userData.itemState || '{}');
    if (oldItem.id === item.id && oldItem.state !== item.state) {
      // Rebuild completely for state changes to swap model assets (e.g. raw to chopped)
    }
  }
  
  // For anything else (adding to plate, etc), we rebuild for now
  while(group.children.length > 0){ 
      const child = group.children[0];
      if (child) group.remove(child);
  }
  
  const newModel = createItemModel(item);
  group.add(newModel);
  group.userData.itemState = newState;
}
