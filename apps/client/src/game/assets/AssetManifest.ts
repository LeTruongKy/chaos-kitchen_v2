export type AssetKind = 'item' | 'station' | 'character';

export interface AssetDef {
  file: string;
  kind: AssetKind;
  targetSize: { height?: number; width?: number; depth?: number };
  pivot: 'bottom' | 'center';
  rotateY?: number;
  tintable?: boolean;
  sizeInTiles?: boolean;
  resourcePath?: string;
  animationFiles?: Record<string, string>; // name -> file path
}

export const AssetManifest: Record<string, AssetDef> = {
  // Characters
  chef: {
    file: '/assets/chef/chef_model.fbx',
    kind: 'character',
    targetSize: { height: 2.2 },
    pivot: 'bottom',
    tintable: false,
    sizeInTiles: true
  },

  // Ingredients (Raw)
  tomato: { file: 'gltf/food_ingredient_tomato.gltf', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  lettuce: { file: 'gltf/food_ingredient_lettuce.gltf', kind: 'item', targetSize: { width: 0.50 }, pivot: 'bottom', sizeInTiles: true },
  meat: { file: 'gltf/food_ingredient_steak.gltf', kind: 'item', targetSize: { width: 0.52 }, pivot: 'bottom', sizeInTiles: true },
  cheese: { file: 'kenney/cheese.glb', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  bun: { file: 'gltf/food_ingredient_bun.gltf', kind: 'item', targetSize: { width: 0.54 }, pivot: 'bottom', sizeInTiles: true },
  bun_bottom: { file: 'gltf/food_ingredient_bun_bottom.gltf', kind: 'item', targetSize: { width: 0.54 }, pivot: 'bottom', sizeInTiles: true },
  bun_top: { file: 'gltf/food_ingredient_bun_top.gltf', kind: 'item', targetSize: { width: 0.54 }, pivot: 'bottom', sizeInTiles: true },
  potato: { file: 'gltf/food_ingredient_potato.gltf', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  carrot: { file: 'gltf/food_ingredient_carrot.gltf', kind: 'item', targetSize: { width: 0.50 }, pivot: 'bottom', sizeInTiles: true },
  onion: { file: 'gltf/food_ingredient_onion.gltf', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  mushroom: { file: 'kenney/mushroom.glb', kind: 'item', targetSize: { width: 0.42, height: 0.40, depth: 0.42 }, pivot: 'bottom', sizeInTiles: true },

  dough: { file: 'kenney/bread.glb', kind: 'item', targetSize: { width: 0.54 }, pivot: 'bottom', sizeInTiles: true },

  // Ingredients (Chopped/Sliced)
  dough_chopped: { file: 'kenney/bread.glb', kind: 'item', targetSize: { width: 0.54 }, pivot: 'bottom', sizeInTiles: true },
  tomato_sliced: { file: 'gltf/food_ingredient_tomato_slice.gltf', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  lettuce_chopped: { file: 'gltf/food_ingredient_lettuce_chopped.gltf', kind: 'item', targetSize: { width: 0.50 }, pivot: 'bottom', sizeInTiles: true },
  meat_sliced: { file: 'gltf/food_ingredient_burger_uncooked.gltf', kind: 'item', targetSize: { width: 0.42 }, pivot: 'bottom', sizeInTiles: true },
  cheese_sliced: { file: 'kenney/cheese-cut.glb', kind: 'item', targetSize: { width: 0.42, height: 0.34, depth: 0.42 }, pivot: 'bottom', sizeInTiles: true },
  potato_sliced: { file: 'gltf/food_ingredient_potato_chopped.gltf', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  carrot_sliced: { file: 'gltf/food_ingredient_carrot_chopped.gltf', kind: 'item', targetSize: { width: 0.50 }, pivot: 'bottom', sizeInTiles: true },
  onion_sliced: { file: 'gltf/food_ingredient_onion_chopped.gltf', kind: 'item', targetSize: { width: 0.48 }, pivot: 'bottom', sizeInTiles: true },
  mushroom_sliced: { file: 'kenney/mushroom-half.glb', kind: 'item', targetSize: { width: 0.38, height: 0.34, depth: 0.38 }, pivot: 'bottom', sizeInTiles: true },

  // Ingredients (Cooked)
  meat_cooked: { file: 'gltf/food_ingredient_burger_cooked.gltf', kind: 'item', targetSize: { width: 0.44 }, pivot: 'bottom', sizeInTiles: true },
  burger_cooked: { file: 'gltf/food_ingredient_burger_cooked.gltf', kind: 'item', targetSize: { width: 0.44 }, pivot: 'bottom', sizeInTiles: true },

  // Recipes (Finished items)
  burger: { file: 'kenney/burger.glb', kind: 'item', targetSize: { width: 0.56 }, pivot: 'bottom', sizeInTiles: true },
  cheese_burger: { file: 'kenney/burger-cheese.glb', kind: 'item', targetSize: { width: 0.56 }, pivot: 'bottom', sizeInTiles: true },
  burger_tomato: { file: 'kenney/burger-double.glb', kind: 'item', targetSize: { width: 0.58 }, pivot: 'bottom', sizeInTiles: true },
  steak_dinner: { file: 'gltf/food_dinner.gltf', kind: 'item', targetSize: { width: 0.60 }, pivot: 'bottom', sizeInTiles: true },
  salad: { file: 'kenney/salad.glb', kind: 'item', targetSize: { width: 0.58 }, pivot: 'bottom', sizeInTiles: true },
  stew: { file: 'gltf/stew_bowl.gltf', kind: 'item', targetSize: { width: 0.54 }, pivot: 'bottom', sizeInTiles: true },
  pizza: { file: 'kenney/pizza.glb', kind: 'item', targetSize: { width: 0.62 }, pivot: 'bottom', sizeInTiles: true },

  // Equipment
  plate: { file: 'gltf/plate.gltf', kind: 'item', targetSize: { width: 0.66 }, pivot: 'bottom', sizeInTiles: true },
  plate_dirty: { file: 'gltf/plate_dirty.gltf', kind: 'item', targetSize: { width: 0.66 }, pivot: 'bottom', sizeInTiles: true },
  pan: { file: 'gltf/pan_A.gltf', kind: 'item', targetSize: { width: 0.66 }, pivot: 'bottom', sizeInTiles: true },
  pot: { file: 'gltf/pot_large.gltf', kind: 'item', targetSize: { width: 0.66 }, pivot: 'bottom', sizeInTiles: true },
  extinguisher: { file: 'gltf/mustard.gltf', kind: 'item', targetSize: { height: 0.66 }, pivot: 'bottom', sizeInTiles: true },
  knife: { file: 'gltf/knife.gltf', kind: 'item', targetSize: { width: 0.34 }, pivot: 'bottom', sizeInTiles: true },
  ketchup: { file: 'gltf/ketchup.gltf', kind: 'item', targetSize: { height: 0.26 }, pivot: 'bottom', sizeInTiles: true },
  mustard: { file: 'gltf/mustard.gltf', kind: 'item', targetSize: { height: 0.26 }, pivot: 'bottom', sizeInTiles: true },
  menu_prop: { file: 'gltf/menu.gltf', kind: 'item', targetSize: { width: 0.26 }, pivot: 'bottom', sizeInTiles: true },

  // Stations
  station_counter: { file: 'gltf/kitchencounter_straight_A.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_counter_b: { file: 'gltf/kitchencounter_straight_B.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_counter_decorated: { file: 'gltf/kitchencounter_straight_A_decorated.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_sink: { file: 'gltf/kitchencounter_sink.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_stove: { file: 'gltf/stove_single.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_oven: { file: 'gltf/oven.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_trash: { file: 'gltf/crate.gltf', kind: 'station', targetSize: { width: 0.90, depth: 0.90 }, pivot: 'bottom', sizeInTiles: true },
  station_delivery: { file: 'gltf/wall_orderwindow_decorated.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  table: { file: 'gltf/table_round_A_small.gltf', kind: 'station', targetSize: { width: 1.05, height: 0.54, depth: 1.05 }, pivot: 'bottom', sizeInTiles: true },
  table_decorated: { file: 'gltf/table_round_A_small_decorated.gltf', kind: 'station', targetSize: { width: 1.05, height: 0.62, depth: 1.05 }, pivot: 'bottom', sizeInTiles: true },
  chair: { file: 'gltf/chair_A.gltf', kind: 'station', targetSize: { width: 0.58, height: 0.52, depth: 0.58 }, pivot: 'bottom', sizeInTiles: true },

  station_crate_tomato: { file: 'gltf/crate_tomatoes.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_lettuce: { file: 'gltf/crate_lettuce.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_meat: { file: 'gltf/crate_steak.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_bun: { file: 'gltf/crate_buns.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_dough: { file: 'gltf/crate_dough.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_potato: { file: 'gltf/crate_potatoes.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_onion: { file: 'gltf/crate_onions.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_mushroom: { file: 'gltf/crate_mushrooms.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_carrot: { file: 'gltf/crate_carrots.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  station_crate_cheese: { file: 'gltf/crate_cheese.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },

  station_chopping: { file: 'gltf/cuttingboard.gltf', kind: 'station', targetSize: { width: 0.84, depth: 0.72 }, pivot: 'bottom', sizeInTiles: true },
  station_dishrack: { file: 'gltf/dishrack.gltf', kind: 'station', targetSize: { width: 0.68, depth: 0.68 }, pivot: 'bottom', sizeInTiles: true },
  station_dishrack_plates: { file: 'gltf/dishrack_plates.gltf', kind: 'station', targetSize: { width: 0.68, depth: 0.68 }, pivot: 'bottom', sizeInTiles: true },

  // Scenery & Restaurant Props
  floor: { file: 'gltf/floor_kitchen.gltf', kind: 'station', targetSize: { width: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  wall: { file: 'gltf/wall.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  wall_window: { file: 'gltf/wall_window_closed.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  wall_decorated: { file: 'gltf/wall_decorated.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  wall_doorway: { file: 'gltf/wall_doorway.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  wall_half: { file: 'gltf/wall_half.gltf', kind: 'station', targetSize: { width: 1, height: 1, depth: 1 }, pivot: 'bottom', sizeInTiles: true },
  extractorhood: { file: 'gltf/extractorhood.gltf', kind: 'station', targetSize: { width: 0.96, height: 0.55, depth: 0.88 }, pivot: 'bottom', sizeInTiles: true },
  fridge_decorated: { file: 'gltf/fridge_A_decorated.gltf', kind: 'station', targetSize: { width: 0.92, height: 1.35, depth: 0.92 }, pivot: 'bottom', sizeInTiles: true },
  shelf_decorated: { file: 'gltf/shelf_papertowel_decorated.gltf', kind: 'station', targetSize: { width: 0.85, height: 0.45, depth: 0.35 }, pivot: 'bottom', sizeInTiles: true },
};
