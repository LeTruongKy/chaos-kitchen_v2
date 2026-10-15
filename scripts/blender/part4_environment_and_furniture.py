# -*- coding: utf-8 -*-
"""
CHAOS KITCHEN — PHẦN 4: MÔI TRƯỜNG NHÀ HÀNG, TƯỜNG GẠCH MEN, CỬA VÒM & BÀN GHẾ BISTRO (`part4_environment_and_furniture.py`)
Senior 3D Technical Artist Procedural Blender Pipeline (Laws 1-5):
- `gltf/floor_kitchen.gltf`, `gltf/floor_kitchen_small.gltf`
- `gltf/wall.gltf`, `gltf/wall_decorated.gltf`
- `gltf/wall_window_closed.gltf`
- `gltf/wall_doorway.gltf`, `gltf/doorway.gltf`
- `gltf/wall_half.gltf`, `gltf/Separator_wall.gltf`, `gltf/column.gltf`
- `gltf/table_round_A_small.gltf`, `gltf/table_round_A_small_decorated.gltf` (Turned pedestal + `bmesh` draped wavy checkered tablecloth!)
- `gltf/chair_A.gltf` (Tapered wooden legs, curved backrest, plump `bmesh` tufted red cushion)
- `gltf/extractorhood.gltf`, `gltf/fridge_A_decorated.gltf`, `gltf/shelf_papertowel_decorated.gltf`
"""

import os
import sys
import math
import bpy
import bmesh
from mathutils import Vector, Euler

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from blender_utils import (
    PALETTE,
    reset_scene,
    mat_toon_clay,
    mat_toon_metal,
    mat_stylized,
    mat_checkered_cloth,
    assign_material,
    apply_smooth_shading,
    add_bevel,
    bmesh_bulge_and_taper,
    make_curve_tube,
    make_box,
    make_cylinder,
    make_uv_sphere,
    make_torus,
    export_gltf_or_glb,
)


# ==============================================================================
# 1. RESTAURANT FLOORS (`floor_kitchen.gltf`, `floor_kitchen_small.gltf`)
# ==============================================================================
def build_floors():
    reset_scene()
    m_grout = mat_toon_clay("Mat_FloorGrout", PALETTE["tile_grout"], roughness=0.85)
    m_light = mat_toon_clay("Mat_FloorTileLight", PALETTE["tile_slate_light"], roughness=0.76)
    m_dark = mat_toon_clay("Mat_FloorTileDark", PALETTE["tile_slate_dark"], roughness=0.78)

    objs = [make_box("FloorGroutBed", size=(1.0, 1.0, 0.04), loc=(0, 0, 0.02), mat=m_grout, bevel=0.005)]
    coords = [(-0.245, -0.245), (0.245, -0.245), (-0.245, 0.245), (0.245, 0.245)]
    for idx, (tx, ty) in enumerate(coords):
        t_mat = m_light if idx in (0, 3) else m_dark
        objs.append(make_box(f"KitchenTile_{idx}", size=(0.465, 0.465, 0.032), loc=(tx, ty, 0.042), mat=t_mat, bevel=0.014))

    export_gltf_or_glb(objs, "gltf/floor_kitchen.gltf")
    export_gltf_or_glb(objs, "gltf/floor_kitchen_small.gltf")


# ==============================================================================
# 2. WALLS, WINDOW, ARCHED DOORWAY & HALF-WALLS
# ==============================================================================
def _build_subway_tiled_wall_base():
    m_plaster = mat_toon_clay("Mat_WallWarmCream", 0xDECBB1, roughness=0.80)
    m_wainscot = mat_toon_clay("Mat_WallWainscotOak", 0xC98A4B, roughness=0.80)
    m_wood_dark = mat_toon_clay("Mat_WallTrimWalnut", 0x522910, roughness=0.82)
    m_wood_oak = mat_toon_clay("Mat_WallChairRail", 0x9C622B, roughness=0.80)

    # Clean, smooth Overcooked perimeter wall without protruding outer brick steps that cause camera moiré
    objs = [
        # Upper cream plaster wall (`Z = 0.36..0.94m`)
        make_box("WallUpperCream", size=(1.0, 0.22, 0.58), loc=(0, 0, 0.65), mat=m_plaster, bevel=0.012),
        # Lower warm honey wainscoting panel (`Z = 0.08..0.36m`)
        make_box("WallLowerWainscot", size=(1.0, 0.23, 0.28), loc=(0, 0, 0.22), mat=m_wainscot, bevel=0.010),
        # Baseboard plinth (`Z = 0..0.08m`)
        make_box("WallBaseboard", size=(1.0, 0.25, 0.08), loc=(0, 0, 0.04), mat=m_wood_dark, bevel=0.008),
        # Middle Chair Rail (`Z = 0.34..0.39m`)
        make_box("WallChairRail", size=(1.0, 0.25, 0.05), loc=(0, 0, 0.365), mat=m_wood_oak, bevel=0.008),
        # Smooth Top Crown Molding Cap (`Z = 0.93..1.00m`)
        make_box("WallCrownCap", size=(1.0, 0.26, 0.07), loc=(0, 0, 0.965), mat=m_wood_dark, bevel=0.010),
    ]
    return objs


def build_walls_and_doorways():
    # 1. Standard Wall (`gltf/wall.gltf`)
    reset_scene()
    export_gltf_or_glb(_build_subway_tiled_wall_base(), "gltf/wall.gltf")

    # 2. Decorated Wall (`gltf/wall_decorated.gltf`) with Spice Shelf, Jars & Copper Skillet
    reset_scene()
    objs_dec = _build_subway_tiled_wall_base()
    m_wood = mat_toon_clay("Mat_WallShelfOak", PALETTE["wood_oak"], roughness=0.80)
    m_copper = mat_toon_metal("Mat_WallSkilletCopper", PALETTE["copper"], roughness=0.40, metallic=0.25)
    m_red = mat_toon_clay("Mat_WallJarRed", PALETTE["tomato_red"], roughness=0.80)
    m_green = mat_toon_clay("Mat_WallJarGreen", PALETTE["lettuce_outer"], roughness=0.80)
    m_yellow = mat_toon_clay("Mat_WallJarYellow", PALETTE["cheese_yellow"], roughness=0.80)
    for side in (-1, 1):
        y_s = side * 0.16
        objs_dec.append(make_box(f"WallShelf_{side}", size=(0.74, 0.12, 0.04), loc=(0, y_s, 0.70), mat=m_wood, bevel=0.008))
        objs_dec.append(make_cylinder(f"SpiceJar1_{side}", radius=0.048, depth=0.11, loc=(-0.20, y_s, 0.775), mat=m_red, bevel=0.010, bulge=0.14))
        objs_dec.append(make_cylinder(f"SpiceJar2_{side}", radius=0.048, depth=0.12, loc=( 0.00, y_s, 0.780), mat=m_green, bevel=0.010, bulge=0.14))
        objs_dec.append(make_cylinder(f"SpiceJar3_{side}", radius=0.048, depth=0.10, loc=( 0.20, y_s, 0.770), mat=m_yellow, bevel=0.010, bulge=0.14))
        objs_dec.append(make_cylinder(f"HangingMiniPan_{side}", radius=0.095, depth=0.028, loc=(0, side * 0.135, 0.52), rot=(math.radians(90), 0, 0), mat=m_copper, bevel=0.006))
    export_gltf_or_glb(objs_dec, "gltf/wall_decorated.gltf")

    # 3. Window Wall (`gltf/wall_window_closed.gltf`) with Mullions, Awning & Flower Planter Box
    reset_scene()
    m_plaster = mat_toon_clay("Mat_WallWarmCream", 0xDECBB1, roughness=0.80)
    m_wood_dark = mat_toon_clay("Mat_WallTrimWalnut", 0x522910, roughness=0.82)
    m_wood_oak = mat_toon_clay("Mat_WallChairRail", 0x9C622B, roughness=0.80)
    m_glass = mat_toon_clay("Mat_WindowSkyGlass", 0x7BA7BC, roughness=0.55)
    m_bush = mat_toon_clay("Mat_WindowGreenery", PALETTE["lettuce_outer"], roughness=0.80)
    m_flower = mat_toon_clay("Mat_WindowBlossom", PALETTE["tomato_red"], roughness=0.80)

    objs_win = [
        make_box("WinLowerWall", size=(1.0, 0.22, 0.36), loc=(0, 0, 0.18), mat=m_plaster, bevel=0.012),
        make_box("WinBaseboard", size=(1.0, 0.25, 0.08), loc=(0, 0, 0.04), mat=m_wood_dark, bevel=0.008),
        make_box("WinPillarL", size=(0.18, 0.22, 0.56), loc=(-0.41, 0, 0.64), mat=m_plaster, bevel=0.012),
        make_box("WinPillarR", size=(0.18, 0.22, 0.56), loc=( 0.41, 0, 0.64), mat=m_plaster, bevel=0.012),
        make_box("WinCrown", size=(1.0, 0.26, 0.08), loc=(0, 0, 0.96), mat=m_wood_dark, bevel=0.010),
        make_box("WinSill", size=(0.82, 0.30, 0.05), loc=(0, 0, 0.36), mat=m_wood_oak, bevel=0.010),
        make_box("WinGlassPane", size=(0.66, 0.06, 0.52), loc=(0, 0, 0.64), mat=m_glass, bevel=0.005),
        make_box("WinMullionV", size=(0.042, 0.12, 0.52), loc=(0, 0, 0.64), mat=m_wood_dark, bevel=0.006),
        make_box("WinMullionH", size=(0.66, 0.12, 0.042), loc=(0, 0, 0.64), mat=m_wood_dark, bevel=0.006),
    ]
    for side in (-1, 1):
        y_box = side * 0.17
        objs_win.append(make_box(f"PlanterBox_{side}", size=(0.62, 0.11, 0.09), loc=(0, y_box, 0.31), mat=m_wood_dark, bevel=0.010, taper_top=0.08))
        for bx in (-0.18, 0.0, 0.18):
            objs_win.append(make_uv_sphere(f"PlanterBush_{side}_{bx}", radius=0.068, loc=(bx, y_box, 0.37), scale=(1.2, 0.9, 0.8), mat=m_bush))
            objs_win.append(make_uv_sphere(f"PlanterFlower_{side}_{bx}", radius=0.030, loc=(bx, y_box + side * 0.03, 0.41), mat=m_flower))
    export_gltf_or_glb(objs_win, "gltf/wall_window_closed.gltf")

    # 4. Bistro Arched Doorway (`gltf/wall_doorway.gltf` & `gltf/doorway.gltf`)
    reset_scene()
    m_brick_a = mat_toon_clay("Mat_WallBrickA", PALETTE["wall_brick"], roughness=0.80)
    m_brick_b = mat_toon_clay("Mat_WallBrickB", PALETTE["wall_brick_dark"], roughness=0.82)
    objs_door = [
        make_box("DoorPillarL", size=(0.22, 0.23, 0.96), loc=(-0.39, 0, 0.48), mat=m_plaster, bevel=0.012),
        make_box("DoorPillarR", size=(0.22, 0.23, 0.96), loc=( 0.39, 0, 0.48), mat=m_plaster, bevel=0.012),
        make_box("DoorBaseL", size=(0.24, 0.26, 0.08), loc=(-0.39, 0, 0.04), mat=m_wood_dark, bevel=0.010),
        make_box("DoorBaseR", size=(0.24, 0.26, 0.08), loc=( 0.39, 0, 0.04), mat=m_wood_dark, bevel=0.010),
        make_box("DoorJambL", size=(0.045, 0.25, 0.82), loc=(-0.27, 0, 0.43), mat=m_wood_oak, bevel=0.008),
        make_box("DoorJambR", size=(0.045, 0.25, 0.82), loc=( 0.27, 0, 0.43), mat=m_wood_oak, bevel=0.008),
        make_box("DoorHeaderBeam", size=(1.0, 0.26, 0.12), loc=(0, 0, 0.94), mat=m_wood_dark, bevel=0.012),
    ]
    for i, bx in enumerate((-0.20, -0.10, 0.0, 0.10, 0.20)):
        objs_door.append(
            make_box(
                f"DoorArchKeystone_{i}",
                size=(0.088, 0.25, 0.11 if i == 2 else 0.09),
                loc=(bx, 0, 0.86 + (1.0 - abs(bx) * 2.0) * 0.03),
                mat=m_brick_a if i % 2 == 0 else m_brick_b,
                bevel=0.008,
            )
        )
    export_gltf_or_glb(objs_door, "gltf/wall_doorway.gltf")
    export_gltf_or_glb(objs_door, "gltf/doorway.gltf")

    # 5. Half-Wall Partition & Column (`wall_half.gltf`, `Separator_wall.gltf`, `column.gltf`)
    reset_scene()
    objs_half = [
        make_box("HalfWallBase", size=(1.0, 0.26, 0.08), loc=(0, 0, 0.04), mat=m_wood_dark, bevel=0.010),
        make_box("HalfWallBody", size=(0.98, 0.23, 0.38), loc=(0, 0, 0.26), mat=m_brick_a, bevel=0.014, bulge=0.03),
        make_box("HalfWallTopShelf", size=(1.0, 0.28, 0.065), loc=(0, 0, 0.48), mat=m_wood_oak, bevel=0.012),
    ]
    export_gltf_or_glb(objs_half, "gltf/wall_half.gltf")
    export_gltf_or_glb(objs_half, "gltf/Separator_wall.gltf")

    reset_scene()
    objs_col = [
        make_box("ColPlinth", size=(0.34, 0.34, 0.11), loc=(0, 0, 0.055), mat=m_wood_dark, bevel=0.012),
        make_box("ColShaft", size=(0.28, 0.28, 0.82), loc=(0, 0, 0.50), mat=m_plaster, bevel=0.016, bulge=0.03),
        make_box("ColCapital", size=(0.34, 0.34, 0.09), loc=(0, 0, 0.955), mat=m_wood_dark, bevel=0.012),
    ]
    export_gltf_or_glb(objs_col, "gltf/column.gltf")


# ==============================================================================
# 3. DINING TABLE WITH LOW-POLY DRAPED CHECKERED TABLECLOTH & CHAIR (`table_round_A_small.gltf`, `chair_A.gltf`)
# ==============================================================================
def _build_bistro_table_meshes(decorated: bool = False):
    m_wood = mat_toon_clay("Mat_BistroTableWalnut", PALETTE["wood_walnut"], roughness=0.80)
    m_brass = mat_toon_metal("Mat_BistroTableBrass", PALETTE["brass_gold"], roughness=0.40, metallic=0.25)
    m_cloth_red = mat_toon_clay("Mat_BistroClothRed", 0xD93440, roughness=0.80)
    m_cloth_white = mat_toon_clay("Mat_BistroClothCream", 0xEBE0D0, roughness=0.80)

    # 1. Wide stable base + 4 curved claw feet + brass collar + turned pedestal column
    base_disc = make_cylinder("TableBaseDisc", radius=0.28, depth=0.044, vertices=18, loc=(0, 0, 0.022), mat=m_wood, bevel=0.010, taper_top=-0.08)
    brass_ring = make_torus("TableBrassCollar", major_radius=0.092, minor_radius=0.020, loc=(0, 0, 0.054), mat=m_brass)
    pedestal = make_cylinder("TableTurnedColumn", radius=0.078, depth=0.39, vertices=16, loc=(0, 0, 0.245), mat=m_wood, bevel=0.008, bulge=0.22, taper_top=-0.06)
    wood_under = make_cylinder("TableWoodUnderTop", radius=0.44, depth=0.036, vertices=20, loc=(0, 0, 0.440), mat=m_wood, bevel=0.008)

    # 2. Single-Mesh Subdivided Round Tablecloth (`radius = 0.48m`) with Wavy Skirt & Checkered Red/White Faces!
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=7, y_subdivisions=7, size=0.96, location=(0, 0, 0.506))
    cloth_top = bpy.context.active_object
    cloth_top.name = "TableCheckeredClothTop"
    bm = bmesh.new()
    bm.from_mesh(cloth_top.data)
    # Clamp outer vertices to a clean circle of radius 0.475m
    for v in bm.verts:
        r = math.hypot(v.co.x, v.co.y)
        if r > 0.472:
            scale_r = 0.472 / r
            v.co.x *= scale_r
            v.co.y *= scale_r
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(cloth_top.data)
    bm.free()
    cloth_top.data.materials.append(m_cloth_red)
    cloth_top.data.materials.append(m_cloth_white)
    for poly in cloth_top.data.polygons:
        ix = int(math.floor((poly.center.x + 0.52) / 0.137))
        iy = int(math.floor((poly.center.y + 0.52) / 0.137))
        poly.material_index = (ix + iy) % 2
    apply_smooth_shading(cloth_top)

    # Wavy Draped Skirt Ring around the tablecloth edge
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=0.476, depth=0.076, location=(0, 0, 0.470), end_fill_type='NOTHING')
    skirt = bpy.context.active_object
    skirt.name = "TableDrapedCheckeredSkirt"
    bm = bmesh.new()
    bm.from_mesh(skirt.data)
    for v in bm.verts:
        ang = math.atan2(v.co.y, v.co.x)
        if v.co.z < 0.0:
            fold = math.sin(ang * 10.0) * 0.020
            v.co.x *= 1.0 + fold * 0.85
            v.co.y *= 1.0 + fold * 0.85
            v.co.z += math.cos(ang * 10.0) * 0.010
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(skirt.data)
    bm.free()
    skirt.data.materials.append(m_cloth_red)
    skirt.data.materials.append(m_cloth_white)
    for idx, poly in enumerate(skirt.data.polygons):
        poly.material_index = idx % 2
    apply_smooth_shading(skirt)

    objs = [base_disc, brass_ring, pedestal, wood_under, cloth_top, skirt]
    objs.append(make_torus("TableClothRimCord", major_radius=0.472, minor_radius=0.015, loc=(0, 0, 0.504), mat=m_cloth_red))

    # 4 Carved wooden feet radiating from base
    for i in range(4):
        ang = (math.pi * 0.5) * i + math.pi * 0.25
        objs.append(
            make_box(
                f"TableClawFoot_{i}",
                size=(0.16, 0.072, 0.044),
                loc=(math.cos(ang) * 0.24, math.sin(ang) * 0.24, 0.022),
                rot=(0, 0, ang),
                mat=m_wood,
                bevel=0.010,
                bulge=0.10,
            )
        )

    if decorated:
        m_vase = mat_toon_clay("Mat_TableVaseBlue", PALETTE["porcelain_rim"], roughness=0.72)
        m_rose = mat_toon_clay("Mat_TableRoseRed", PALETTE["tomato_red"], roughness=0.74)
        objs.append(make_cylinder("TableCenterVase", radius=0.046, depth=0.095, loc=(-0.09, 0.09, 0.558), mat=m_vase, bevel=0.008, bulge=0.20))
        objs.append(make_uv_sphere("TableCenterFlower", radius=0.040, loc=(-0.09, 0.09, 0.620), mat=m_rose))

    return objs


def build_tables_and_chairs():
    reset_scene()
    export_gltf_or_glb(_build_bistro_table_meshes(decorated=False), "gltf/table_round_A_small.gltf", "table.glb")

    reset_scene()
    export_gltf_or_glb(_build_bistro_table_meshes(decorated=True), "gltf/table_round_A_small_decorated.gltf")

    # Bistro Cushioned Dining Chair (`gltf/chair_A.gltf`) — Enlarged chunky proportions (`0.46m x 0.46m`) for Chibi NPCs!
    reset_scene()
    m_wood = mat_toon_clay("Mat_ChairOakWood", PALETTE["wood_oak"], roughness=0.76)
    m_dark = mat_toon_clay("Mat_ChairWalnutTrim", PALETTE["wood_walnut"], roughness=0.78)
    m_cushion = mat_toon_clay("Mat_ChairRedCushion", 0xE63946, roughness=0.74)
    m_button = mat_toon_clay("Mat_ChairGoldButton", PALETTE["brass_gold"], roughness=0.72)

    objs_chair = [
        # 4 Tapered Wooden Legs + Side Stretcher Bars
        make_cylinder("ChairLegFL", radius=0.038, depth=0.26, loc=(-0.18, -0.18, 0.13), mat=m_wood, bevel=0.007, taper_top=0.14),
        make_cylinder("ChairLegFR", radius=0.038, depth=0.26, loc=( 0.18, -0.18, 0.13), mat=m_wood, bevel=0.007, taper_top=0.14),
        make_cylinder("ChairLegBL", radius=0.038, depth=0.48, loc=(-0.18,  0.18, 0.24), mat=m_wood, bevel=0.007, bulge=0.05),
        make_cylinder("ChairLegBR", radius=0.038, depth=0.48, loc=( 0.18,  0.18, 0.24), mat=m_wood, bevel=0.007, bulge=0.05),
        make_box("ChairStretcherL", size=(0.030, 0.34, 0.030), loc=(-0.18, 0, 0.105), mat=m_dark, bevel=0.006),
        make_box("ChairStretcherR", size=(0.030, 0.34, 0.030), loc=( 0.18, 0, 0.105), mat=m_dark, bevel=0.006),
        # Wide Wooden Seat Frame + Plump Bulged Red Velvet Cushion (`bmesh` bulge)
        make_box("ChairSeatFrame", size=(0.46, 0.46, 0.048), loc=(0, 0, 0.26), mat=m_wood, bevel=0.014),
        make_box("ChairPlumpCushion", size=(0.43, 0.43, 0.068), loc=(0, 0, 0.308), mat=m_cushion, bevel=0.024, bulge=0.16),
        # 2 Tufted Gold Buttons on cushion
        make_uv_sphere("ChairTuft1", radius=0.020, loc=(-0.075, -0.02, 0.344), scale=(1.0, 1.0, 0.45), mat=m_button),
        make_uv_sphere("ChairTuft2", radius=0.020, loc=( 0.075, -0.02, 0.344), scale=(1.0, 1.0, 0.45), mat=m_button),
        # Curved Bistro Backrest Rail (`make_curve_tube`) + 2 Vertical Spindle Slats
        make_curve_tube("ChairCurvedBackTop", [(-0.19, 0.18, 0.46), (-0.09, 0.205, 0.48), (0.09, 0.205, 0.48), (0.19, 0.18, 0.46)], bevel_radius=0.028, mat=m_wood),
        make_box("ChairSpindle1", size=(0.038, 0.026, 0.15), loc=(-0.075, 0.19, 0.385), mat=m_dark, bevel=0.006),
        make_box("ChairSpindle2", size=(0.038, 0.026, 0.15), loc=( 0.075, 0.19, 0.385), mat=m_dark, bevel=0.006),
    ]
    export_gltf_or_glb(objs_chair, "gltf/chair_A.gltf", "chair.glb")


# ==============================================================================
# 4. KITCHEN DECOR PROPS (`extractorhood.gltf`, `fridge_A_decorated.gltf`, `shelf_papertowel_decorated.gltf`)
# ==============================================================================
def build_decor_props():
    # Extractor Hood
    reset_scene()
    m_steel = mat_toon_metal("Mat_HoodSteel", PALETTE["steel_bright"], roughness=0.34, metallic=0.26)
    m_dark = mat_toon_metal("Mat_HoodBaffle", PALETTE["steel_dark"], roughness=0.38, metallic=0.24)
    objs_hood = [
        make_box("HoodCanopy", size=(0.96, 0.88, 0.16), loc=(0, 0, 0.08), mat=m_steel, bevel=0.022, taper_top=-0.12),
        make_box("HoodFlue", size=(0.46, 0.42, 0.38), loc=(0, 0.14, 0.34), mat=m_steel, bevel=0.016),
        make_box("HoodFilterSlot", size=(0.78, 0.68, 0.025), loc=(0, 0, 0.015), mat=m_dark, bevel=0.006),
    ]
    export_gltf_or_glb(objs_hood, "gltf/extractorhood.gltf")

    # Retro Chibi Fridge (`fridge_A_decorated.gltf`)
    reset_scene()
    m_cream = mat_toon_clay("Mat_FridgeCream", PALETTE["wall_cream"], roughness=0.74)
    m_red = mat_toon_clay("Mat_FridgeRedMagnet", PALETTE["appliance_red"], roughness=0.74)
    m_note = mat_toon_clay("Mat_FridgeStickyNote", PALETTE["cheese_yellow"], roughness=0.78)
    objs_fridge = [
        make_box("FridgePlinth", size=(0.82, 0.80, 0.08), loc=(0, 0, 0.04), mat=m_dark, bevel=0.010),
        make_box("FridgeBody", size=(0.90, 0.86, 1.26), loc=(0, 0, 0.69), mat=m_cream, bevel=0.038, bulge=0.04),
        make_box("FridgeFreezerDoor", size=(0.84, 0.045, 0.34), loc=(0, -0.435, 1.11), mat=m_cream, bevel=0.020),
        make_box("FridgeMainDoor", size=(0.84, 0.045, 0.78), loc=(0, -0.435, 0.51), mat=m_cream, bevel=0.020),
        make_curve_tube("FridgeHandleTop", [(0.30, -0.45, 1.18), (0.30, -0.50, 1.14), (0.30, -0.50, 1.04), (0.30, -0.45, 1.00)], bevel_radius=0.014, mat=m_steel),
        make_curve_tube("FridgeHandleBot", [(0.30, -0.45, 0.80), (0.30, -0.50, 0.74), (0.30, -0.50, 0.58), (0.30, -0.45, 0.52)], bevel_radius=0.014, mat=m_steel),
        make_box("FridgeSticky1", size=(0.11, 0.015, 0.11), loc=(-0.16, -0.46, 0.76), rot=(0, 0.12, 0), mat=m_note, bevel=0.003),
        make_cylinder("FridgeMagnet1", radius=0.028, depth=0.02, loc=(-0.16, -0.465, 0.80), rot=(math.radians(90), 0, 0), mat=m_red, bevel=0.004),
    ]
    export_gltf_or_glb(objs_fridge, "gltf/fridge_A_decorated.gltf")

    # Wall Shelf & Paper Towel Roll (`shelf_papertowel_decorated.gltf`)
    reset_scene()
    m_wood = mat_toon_clay("Mat_ShelfOak", PALETTE["wood_oak"], roughness=0.76)
    m_paper = mat_toon_clay("Mat_PaperRollWhite", PALETTE["porcelain_white"], roughness=0.82)
    objs_shelf = [
        make_box("ShelfPlank", size=(0.84, 0.30, 0.045), loc=(0, 0, 0.24), mat=m_wood, bevel=0.010),
        make_cylinder("PaperTowelRoll", radius=0.075, depth=0.38, loc=(0, 0, 0.10), rot=(0, math.radians(90), 0), mat=m_paper, bevel=0.012),
        make_cylinder("ShelfSpiceA", radius=0.055, depth=0.14, loc=(-0.22, 0, 0.33), mat=m_red, bevel=0.010, bulge=0.14),
        make_cylinder("ShelfSpiceB", radius=0.055, depth=0.15, loc=( 0.00, 0, 0.335), mat=m_note, bevel=0.010, bulge=0.14),
    ]
    export_gltf_or_glb(objs_shelf, "gltf/shelf_papertowel_decorated.gltf")


def generate_all():
    print("\n=== [PHẦN 4] Building Restaurant Environment, Subway Tile Walls, Arched Doorways & Bistro Tables ===")
    build_floors()
    build_walls_and_doorways()
    build_tables_and_chairs()
    build_decor_props()


if __name__ == "__main__":
    generate_all()
