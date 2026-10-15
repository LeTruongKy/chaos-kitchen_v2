# -*- coding: utf-8 -*-
"""
CHAOS KITCHEN — PHẦN 1: BỘ DỤNG CỤ BẾP & MÓN ĂN HOÀN CHỈNH (`part1_utensils_and_dishes.py`)
Senior 3D Technical Artist Procedural Blender Pipeline (Laws 1-5):
- `gltf/plate.gltf`, `gltf/plate_small.gltf`
- `gltf/plate_dirty.gltf`
- `gltf/pot_large.gltf`, `gltf/pot_A.gltf`
- `gltf/pan_A.gltf`, `gltf/pan_B.gltf` (Pivot centered on pan bowl `(0,0)`, handle toward `-Y`)
- `gltf/stew_bowl.gltf`, `gltf/pot_A_stew.gltf`
- `gltf/mustard.gltf`, `gltf/ketchup.gltf`, `gltf/knife.gltf`, `gltf/knife_sharp.gltf`, `gltf/menu.gltf`
- `kenney/burger.glb`, `kenney/burger-cheese.glb`, `kenney/burger-double.glb`
- `kenney/pizza.glb`, `kenney/salad.glb`
- `gltf/food_dinner.gltf`
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
    mat_glossy,
    mat_stylized,
    assign_material,
    apply_smooth_shading,
    add_bevel,
    add_subsurf,
    add_boolean_cut,
    bmesh_bulge_and_taper,
    make_hollow_vessel,
    make_curve_tube,
    make_box,
    make_cylinder,
    make_uv_sphere,
    make_torus,
    export_gltf_or_glb,
)


# ==============================================================================
# HELPER: BMESH ORGANIC PUDDLE / RUFFLED LEAF / TEARDROP SESAME SEED
# ==============================================================================
def _make_bmesh_puddle(name: str, radius: float, thickness: float, loc, wave_amp: float = 0.18, lobes: int = 5, mat=None):
    """Creates an irregular organic sauce/cheese puddle or crinkled patty using `bmesh` radial vertex waves."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=28, radius=radius, depth=thickness, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        ang = math.atan2(v.co.y, v.co.x)
        r = math.hypot(v.co.x, v.co.y)
        if r > radius * 0.15:
            factor = 1.0 + math.sin(ang * lobes + 0.4) * wave_amp + math.cos(ang * (lobes + 2)) * (wave_amp * 0.45)
            v.co.x *= factor
            v.co.y *= factor
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    add_bevel(obj, width=min(thickness * 0.35, 0.008), segments=3)
    if mat:
        assign_material(obj, mat)
    return obj


def _make_teardrop_seed(name: str, length: float, width: float, loc, rot, mat):
    """Creates a genuine teardrop-shaped sesame seed via `bmesh` tapering."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=width, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        # Stretch along X and pinch the +X tip into a teardrop point
        t = (v.co.x / max(width, 1e-4) + 1.0) * 0.5  # 0..1
        pinch = 1.0 - 0.65 * (t ** 1.6)
        v.co.x *= (length / max(width, 1e-4))
        v.co.y *= pinch
        v.co.z *= pinch * 0.55
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.rotation_euler = Euler(rot, 'XYZ')
    apply_smooth_shading(obj, 60.0)
    assign_material(obj, mat)
    return obj


def _make_ruffled_lettuce_layer(name: str, radius: float, z_loc: float, waves: int = 9, amp: float = 0.022, mat=None):
    """Creates a wavy, ruffled 3D lettuce leaf disc using `bmesh` sinusoidal edge displacement."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=radius, depth=0.022, location=(0, 0, z_loc))
    obj = bpy.context.active_object
    obj.name = name
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        r = math.hypot(v.co.x, v.co.y)
        ang = math.atan2(v.co.y, v.co.x)
        norm_r = r / max(radius, 1e-4)
        if norm_r > 0.35:
            ruffle = math.sin(ang * waves) * amp * (norm_r ** 1.5)
            radial_wave = 1.0 + math.cos(ang * waves) * 0.08 * norm_r
            v.co.x *= radial_wave
            v.co.y *= radial_wave
            v.co.z += ruffle
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    add_bevel(obj, width=0.006, segments=3)
    if mat:
        assign_material(obj, mat)
    return obj


# ==============================================================================
# 1. CLEAN & DIRTY PLATES (`gltf/plate.gltf`, `gltf/plate_dirty.gltf`)
# ==============================================================================
def _build_plate_base_meshes():
    m_porcelain = mat_glossy("Mat_PorcelainWhite", PALETTE["porcelain_white"], roughness=0.22, clearcoat=0.30)
    m_well = mat_glossy("Mat_PorcelainWell", 0xF8FAFC, roughness=0.24, clearcoat=0.28)
    m_foot = mat_toon_clay("Mat_PorcelainFoot", 0xCBD5E1, roughness=0.78)
    m_rim_blue = mat_glossy("Mat_PlateBistroBlue", PALETTE["porcelain_rim"], roughness=0.25, clearcoat=0.25)

    vessel = make_hollow_vessel(
        "PlateBody",
        outer_radius_bottom=0.22,
        outer_radius_top=0.33,
        height=0.055,
        wall_thickness=0.026,
        bottom_thickness=0.016,
        bulge=0.06,
        rim_lip=0.018,
        segments=36,
        loc=(0, 0, 0.008),
        outer_mat=m_porcelain,
        inner_mat=m_well,
        bottom_mat=m_foot,
    )
    foot_ring = make_torus(
        "PlateFootRing",
        major_radius=0.20,
        minor_radius=0.010,
        loc=(0, 0, 0.009),
        mat=m_foot,
    )
    bistro_stripe = make_torus(
        "PlateBistroStripe",
        major_radius=0.322,
        minor_radius=0.007,
        loc=(0, 0, 0.068),
        scale=(1.0, 1.0, 0.45),
        mat=m_rim_blue,
    )
    inner_stripe = make_torus(
        "PlateInnerStripe",
        major_radius=0.225,
        minor_radius=0.004,
        loc=(0, 0, 0.026),
        scale=(1.0, 1.0, 0.4),
        mat=m_rim_blue,
    )
    return [vessel, foot_ring, bistro_stripe, inner_stripe]


def build_plates():
    # Clean Plate
    reset_scene()
    objs = _build_plate_base_meshes()
    export_gltf_or_glb(objs, "gltf/plate.gltf", "plate.glb")

    # Small Plate
    reset_scene()
    objs_sm = _build_plate_base_meshes()
    for o in objs_sm:
        o.scale = (0.78, 0.78, 0.85)
    export_gltf_or_glb(objs_sm, "gltf/plate_small.gltf")

    # Dirty Plate (`gltf/plate_dirty.gltf`) with multi-material sauce puddles & grease
    reset_scene()
    objs_dirty = _build_plate_base_meshes()
    m_sauce = mat_glossy("Mat_DirtySauce", PALETTE["dirty_sauce"], roughness=0.24, clearcoat=0.30)
    m_grease = mat_glossy("Mat_DirtyGrease", PALETTE["dirty_grease"], roughness=0.28, clearcoat=0.25)
    m_crumb = mat_toon_clay("Mat_DirtyCrumb", PALETTE["bun_golden"], roughness=0.80)
    m_leaf = mat_toon_clay("Mat_DirtyLeaf", PALETTE["stem_green"], roughness=0.78)

    objs_dirty.append(_make_bmesh_puddle("SauceSplash1", 0.11, 0.010, (-0.04, 0.03, 0.028), wave_amp=0.25, lobes=6, mat=m_sauce))
    objs_dirty.append(_make_bmesh_puddle("GreaseSmear2", 0.085, 0.008, (0.07, -0.05, 0.027), wave_amp=0.22, lobes=5, mat=m_grease))
    objs_dirty.append(_make_bmesh_puddle("RimSmudge", 0.055, 0.008, (-0.22, -0.14, 0.066), wave_amp=0.20, lobes=4, mat=m_sauce))
    for i, (cx, cy, r) in enumerate([(-0.10, -0.06, 0.020), (0.03, 0.10, 0.017), (0.11, 0.04, 0.015), (-0.02, -0.11, 0.018)]):
        objs_dirty.append(make_uv_sphere(f"Crumb_{i}", radius=r, loc=(cx, cy, 0.032), scale=(1.2, 0.9, 0.65), mat=m_crumb))
    objs_dirty.append(_make_bmesh_puddle("WiltedLeaf", 0.045, 0.007, (0.09, 0.08, 0.030), wave_amp=0.28, lobes=4, mat=m_leaf))

    export_gltf_or_glb(objs_dirty, "gltf/plate_dirty.gltf")


# ==============================================================================
# 2. HOLLOW STOCKPOT (`gltf/pot_large.gltf` & `gltf/pot_A.gltf`)
# ==============================================================================
def build_pots():
    reset_scene()
    m_steel = mat_toon_metal("Mat_PotSteel", PALETTE["steel_pot"], roughness=0.32, metallic=0.35)
    m_inside = mat_toon_metal("Mat_PotInside", PALETTE["steel_dark"], roughness=0.36, metallic=0.30)
    m_handle = mat_toon_metal("Mat_PotHandleDark", PALETTE["cast_iron"], roughness=0.38, metallic=0.28)
    m_copper = mat_toon_metal("Mat_PotCopperBase", PALETTE["copper"], roughness=0.32, metallic=0.35)

    # 100% Hollow Stockpot (inner radius > 0.78 * outer radius so soup cylinder at Y=12.0 is completely visible!)
    pot_body = make_hollow_vessel(
        "PotBody",
        outer_radius_bottom=0.27,
        outer_radius_top=0.30,
        height=0.34,
        wall_thickness=0.022,
        bottom_thickness=0.018,
        bulge=0.09,
        rim_lip=0.020,
        segments=36,
        loc=(0, 0, 0.0),
        outer_mat=m_steel,
        inner_mat=m_inside,
        bottom_mat=m_copper,
    )
    objs = [pot_body]

    # 2 Chunky Side Loop Handles (`make_curve_tube`) symmetric across X
    for side in (-1, 1):
        pts = [
            (side * 0.285, -0.09, 0.25),
            (side * 0.395, -0.06, 0.275),
            (side * 0.395,  0.06, 0.275),
            (side * 0.285,  0.09, 0.25),
        ]
        objs.append(make_curve_tube(f"PotHandle_{side}", pts, bevel_radius=0.020, mat=m_handle))

    export_gltf_or_glb(objs, "gltf/pot_large.gltf", "pot_B.glb")
    export_gltf_or_glb(objs, "gltf/pot_A.gltf")


# ==============================================================================
# 3. HOLLOW FRYING PAN (`gltf/pan_A.gltf` — Pivot at Bowl Center `(0,0)`, Handle `-Y`)
# ==============================================================================
def build_frying_pan():
    reset_scene()
    m_iron = mat_toon_metal("Mat_PanOuter", PALETTE["cast_iron"], roughness=0.36, metallic=0.30)
    m_nonstick = mat_toon_clay("Mat_PanNonstick", PALETTE["nonstick_black"], roughness=0.76)
    m_copper = mat_toon_metal("Mat_PanCopperBottom", PALETTE["copper"], roughness=0.32, metallic=0.35)
    m_rim_steel = mat_toon_metal("Mat_PanRimSteel", PALETTE["steel_bright"], roughness=0.30, metallic=0.38)
    m_handle_red = mat_toon_clay("Mat_PanHandleRed", PALETTE["appliance_red"], roughness=0.74)

    # Flared hollow skillet bowl centered at (0, 0)
    pan_bowl = make_hollow_vessel(
        "PanSkilletBowl",
        outer_radius_bottom=0.25,
        outer_radius_top=0.31,
        height=0.090,
        wall_thickness=0.022,
        bottom_thickness=0.016,
        bulge=0.05,
        rim_lip=0.014,
        segments=36,
        loc=(0, 0, 0.0),
        outer_mat=m_iron,
        inner_mat=m_nonstick,
        bottom_mat=m_copper,
    )
    rim_ring = make_torus("PanSteelLip", major_radius=0.312, minor_radius=0.010, loc=(0, 0, 0.092), mat=m_rim_steel)
    tang = make_box("PanHandleTang", size=(0.055, 0.11, 0.024), loc=(0, -0.34, 0.078), rot=(math.radians(-10), 0, 0), mat=m_rim_steel, bevel=0.006)
    handle = make_box("PanRedHandle", size=(0.074, 0.29, 0.038), loc=(0, -0.49, 0.102), rot=(math.radians(-10), 0, 0), mat=m_handle_red, bevel=0.014, bulge=0.14)
    bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.016, depth=0.12, location=(0, -0.59, 0.120))
    hole_cutter = bpy.context.active_object
    add_boolean_cut(handle, hole_cutter, 'DIFFERENCE')

    objs = [pan_bowl, rim_ring, tang, handle]
    export_gltf_or_glb(objs, "gltf/pan_A.gltf", "pan_B.glb", custom_pivot_xy=(0.0, 0.0))
    export_gltf_or_glb(objs, "gltf/pan_B.gltf", custom_pivot_xy=(0.0, 0.0))


# ==============================================================================
# 4. HOLLOW STEW BOWL (`gltf/stew_bowl.gltf` & `gltf/pot_A_stew.gltf`)
# ==============================================================================
def build_stew_bowl():
    """Part 5.1 Spec: 100% hollow deep porcelain bowl so code's dynamic soup cylinder at Y=6.5 is visible inside."""
    reset_scene()
    m_ceramic = mat_glossy("Mat_StewBowlPorcelain", PALETTE["porcelain_white"], roughness=0.22, clearcoat=0.30)
    m_stripe = mat_glossy("Mat_StewBowlStripe", PALETTE["appliance_red"], roughness=0.25, clearcoat=0.25)

    bowl = make_hollow_vessel(
        "StewBowlBody",
        outer_radius_bottom=0.19,
        outer_radius_top=0.28,
        height=0.16,
        wall_thickness=0.022,
        bottom_thickness=0.016,
        bulge=0.14,
        rim_lip=0.014,
        segments=36,
        loc=(0, 0, 0.0),
        outer_mat=m_ceramic,
        inner_mat=m_ceramic,
        bottom_mat=m_stripe,
    )
    stripe = make_torus("StewBowlBand", major_radius=0.276, minor_radius=0.009, loc=(0, 0, 0.125), mat=m_stripe)
    objs = [bowl, stripe]
    for side in (-1, 1):
        objs.append(make_box(f"BowlLug_{side}", size=(0.055, 0.10, 0.024), loc=(side * 0.282, 0, 0.135), mat=m_ceramic, bevel=0.008))

    export_gltf_or_glb(objs, "gltf/stew_bowl.gltf")
    export_gltf_or_glb(objs, "gltf/pot_A_stew.gltf")


# ==============================================================================
# 5. CONDIMENTS, KNIFE & MENU (`mustard.gltf`, `ketchup.gltf`, `knife.gltf`, `menu.gltf`)
# ==============================================================================
def _build_squeeze_bottle(prefix: str, body_hex: int, cap_hex: int, stripe_hex: int):
    m_body = mat_toon_clay(f"Mat_{prefix}_Body", body_hex, roughness=0.74)
    m_cap = mat_toon_clay(f"Mat_{prefix}_Cap", cap_hex, roughness=0.72)
    m_label = mat_toon_clay(f"Mat_{prefix}_Label", PALETTE["porcelain_white"], roughness=0.78)
    m_stripe = mat_toon_clay(f"Mat_{prefix}_Stripe", stripe_hex, roughness=0.74)

    bottle = make_cylinder(
        f"{prefix}_Bottle",
        radius=0.095,
        depth=0.25,
        loc=(0, 0, 0.125),
        mat=m_body,
        bevel=0.020,
        bulge=0.14,
        taper_top=-0.05,
    )
    label = make_cylinder(f"{prefix}_Label", radius=0.104, depth=0.095, loc=(0, 0, 0.125), mat=m_label, bevel=0.005)
    stripe = make_cylinder(f"{prefix}_Stripe", radius=0.106, depth=0.028, loc=(0, 0, 0.125), mat=m_stripe, bevel=0.003)
    collar = make_torus(f"{prefix}_Collar", major_radius=0.062, minor_radius=0.016, loc=(0, 0, 0.255), mat=m_cap)
    # Tapered conical nozzle
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=0.042, radius2=0.012, depth=0.085, location=(0, 0, 0.305))
    nozzle = bpy.context.active_object
    nozzle.name = f"{prefix}_Nozzle"
    add_bevel(nozzle, width=0.004, segments=3)
    assign_material(nozzle, m_cap)

    return [bottle, label, stripe, collar, nozzle]


def build_condiments_knife_menu():
    # Mustard (`gltf/mustard.gltf`)
    reset_scene()
    export_gltf_or_glb(_build_squeeze_bottle("Mustard", PALETTE["mustard_yellow"], PALETTE["porcelain_white"], PALETTE["ketchup_red"]), "gltf/mustard.gltf")

    # Ketchup (`gltf/ketchup.gltf`)
    reset_scene()
    export_gltf_or_glb(_build_squeeze_bottle("Ketchup", PALETTE["ketchup_red"], PALETTE["porcelain_white"], PALETTE["mustard_yellow"]), "gltf/ketchup.gltf")

    # Chef Cleaver / Knife (`gltf/knife.gltf` & `gltf/knife_sharp.gltf`)
    reset_scene()
    m_blade = mat_toon_metal("Mat_KnifeBlade", PALETTE["steel_bright"], roughness=0.30, metallic=0.28)
    m_edge = mat_toon_metal("Mat_KnifeEdge", PALETTE["chrome"], roughness=0.25, metallic=0.32)
    m_bolster = mat_toon_metal("Mat_KnifeBolster", PALETTE["brass_gold"], roughness=0.32, metallic=0.30)
    m_handle = mat_toon_clay("Mat_KnifeHandle", PALETTE["wood_espresso"], roughness=0.78)

    blade = make_box("CleaverBlade", size=(0.14, 0.28, 0.016), loc=(0, 0.08, 0.022), mat=m_blade, bevel=0.005, taper_top=0.04)
    # Hole near top corner of cleaver blade
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.016, depth=0.06, location=(0.038, 0.18, 0.022))
    cutter = bpy.context.active_object
    add_boolean_cut(blade, cutter, 'DIFFERENCE')

    edge_strip = make_box("CleaverSharpEdge", size=(0.022, 0.275, 0.008), loc=(-0.062, 0.08, 0.020), mat=m_edge, bevel=0.002)
    bolster = make_box("CleaverBolster", size=(0.062, 0.038, 0.036), loc=(0.02, -0.07, 0.024), mat=m_bolster, bevel=0.008)
    handle = make_box("CleaverHandle", size=(0.052, 0.17, 0.034), loc=(0.02, -0.17, 0.024), mat=m_handle, bevel=0.012, bulge=0.12)
    objs_knife = [blade, edge_strip, bolster, handle]
    for i, ry in enumerate((-0.12, -0.17, -0.22)):
        objs_knife.append(make_cylinder(f"KnifeRivet_{i}", radius=0.009, depth=0.038, loc=(0.02, ry, 0.024), mat=m_bolster, bevel=0.002))

    export_gltf_or_glb(objs_knife, "gltf/knife.gltf")
    export_gltf_or_glb(objs_knife, "gltf/knife_sharp.gltf")

    # Table Menu Stand (`gltf/menu.gltf`)
    reset_scene()
    m_wood = mat_toon_clay("Mat_MenuWood", PALETTE["wood_walnut"], roughness=0.78)
    m_card = mat_toon_clay("Mat_MenuCard", PALETTE["wall_cream"], roughness=0.80)
    m_red = mat_toon_clay("Mat_MenuRed", PALETTE["appliance_red"], roughness=0.75)
    m_brass = mat_toon_metal("Mat_MenuBrass", PALETTE["brass_gold"], roughness=0.35, metallic=0.25)
    objs_menu = [
        make_box("MenuStandBase", size=(0.20, 0.11, 0.035), loc=(0, 0, 0.018), mat=m_wood, bevel=0.008),
        make_box("MenuCardBody", size=(0.18, 0.024, 0.25), loc=(0, 0, 0.15), mat=m_card, bevel=0.006, taper_top=-0.02),
        make_box("MenuHeaderStripe", size=(0.15, 0.028, 0.045), loc=(0, 0, 0.23), mat=m_red, bevel=0.004),
        make_box("MenuClipBrass", size=(0.06, 0.032, 0.022), loc=(0, 0, 0.272), mat=m_brass, bevel=0.004),
    ]
    export_gltf_or_glb(objs_menu, "gltf/menu.gltf")


# ==============================================================================
# 6. FINISHED BURGERS (`kenney/burger.glb`, `burger-cheese.glb`, `burger-double.glb`)
# ==============================================================================
def _build_gourmet_burger(include_cheese: bool = True, double_patty: bool = False, include_tomato: bool = True):
    m_bun_crust = mat_toon_clay("Mat_BurgerBunCrust", PALETTE["bun_golden"], roughness=0.76)
    m_bun_crumb = mat_toon_clay("Mat_BurgerBunCrumb", PALETTE["bun_crumb"], roughness=0.84)
    m_sesame = mat_toon_clay("Mat_BurgerSesame", PALETTE["sesame_seed"], roughness=0.74)
    m_patty = mat_toon_clay("Mat_BurgerPatty", PALETTE["meat_cooked"], roughness=0.82)
    m_sear = mat_toon_clay("Mat_BurgerSear", PALETTE["meat_sear"], roughness=0.85)
    m_cheese = mat_toon_clay("Mat_BurgerCheese", PALETTE["cheese_yellow"], roughness=0.72)
    m_lettuce = mat_toon_clay("Mat_BurgerLettuce", PALETTE["lettuce_outer"], roughness=0.78)
    m_tomato = mat_toon_clay("Mat_BurgerTomato", PALETTE["tomato_red"], roughness=0.72)

    # Start with a clean ceramic serving plate underneath
    objs = _build_plate_base_meshes()
    z = 0.032

    # 1. Bottom Bun (rounded golden bottom + flat cream inner crumb top)
    b_bot = make_cylinder("BunBottomCrust", radius=0.21, depth=0.055, loc=(0, 0, z + 0.028), mat=m_bun_crust, bevel=0.020, bulge=0.12)
    b_crumb = make_cylinder("BunBottomCrumb", radius=0.205, depth=0.012, loc=(0, 0, z + 0.056), mat=m_bun_crumb, bevel=0.004)
    objs.extend([b_bot, b_crumb])
    z += 0.062

    # 2. Ruffled wavy green lettuce leaf (`bmesh` sinusoidal rim)
    objs.append(_make_ruffled_lettuce_layer("BurgerLettuceFrill", radius=0.235, z_loc=z + 0.012, waves=10, amp=0.020, mat=m_lettuce))
    z += 0.024

    # 3. Seared Beef Patty #1 with dimpled edge & 3 char grill bars
    patty1 = _make_bmesh_puddle("BurgerPatty1", radius=0.205, thickness=0.052, loc=(0, 0, z + 0.026), wave_amp=0.04, lobes=8, mat=m_patty)
    objs.append(patty1)
    for gx in (-0.08, 0.0, 0.08):
        objs.append(make_box(f"Patty1Grill_{gx}", size=(0.022, 0.28, 0.008), loc=(gx, 0, z + 0.053), mat=m_sear, bevel=0.003))
    z += 0.054

    # 4. Melted Cheddar Cheese Slice with drooping corners (`bmesh`)
    if include_cheese:
        cheese1 = make_box("MeltedCheese1", size=(0.33, 0.33, 0.016), loc=(0, 0, z + 0.008), rot=(0, 0, math.radians(18)), mat=m_cheese, bevel=0.006)
        bm = bmesh.new()
        bm.from_mesh(cheese1.data)
        for v in bm.verts:
            if abs(v.co.x) > 0.12 and abs(v.co.y) > 0.12:
                v.co.z -= 0.028  # Droop melted corners down over hot patty!
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(cheese1.data)
        bm.free()
        objs.append(cheese1)
        z += 0.016

    # 5. Optional Second Patty + Second Cheese for Double Burger
    if double_patty:
        patty2 = _make_bmesh_puddle("BurgerPatty2", radius=0.20, thickness=0.048, loc=(0, 0, z + 0.024), wave_amp=0.04, lobes=8, mat=m_patty)
        objs.append(patty2)
        z += 0.048
        cheese2 = make_box("MeltedCheese2", size=(0.32, 0.32, 0.015), loc=(0, 0, z + 0.008), rot=(0, 0, math.radians(-22)), mat=m_cheese, bevel=0.006)
        objs.append(cheese2)
        z += 0.015

    # 6. Juicy Tomato Slices peeking out
    if include_tomato:
        for i, (tx, ty) in enumerate([(-0.045, 0.03), (0.05, -0.035)]):
            objs.append(make_cylinder(f"BurgerTomatoSlice_{i}", radius=0.145, depth=0.024, loc=(tx, ty, z + 0.012), mat=m_tomato, bevel=0.008))
        z += 0.025

    # 7. Plump Golden Brioche Top Bun (`bmesh` dome) + 14 Teardrop Sesame Seeds!
    top_bun = make_uv_sphere("BurgerTopBun", radius=0.215, segments=32, rings=18, loc=(0, 0, z + 0.02), scale=(1.0, 1.0, 0.56), mat=m_bun_crust)
    bm = bmesh.new()
    bm.from_mesh(top_bun.data)
    for v in bm.verts:
        if v.co.z < 0.0:
            v.co.z *= 0.15  # Flatten underside of top bun
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(top_bun.data)
    bm.free()
    objs.append(top_bun)

    # 14 Teardrop Sesame Seeds arranged in 2 concentric rings on the dome
    seed_rings = [(6, 0.085, z + 0.118, 0.18), (8, 0.145, z + 0.092, 0.38)]
    seed_idx = 0
    for count, s_rad, s_z, tilt in seed_rings:
        for k in range(count):
            ang = (2.0 * math.pi * k) / count + seed_idx * 0.2
            sx = math.cos(ang) * s_rad
            sy = math.sin(ang) * s_rad
            objs.append(
                _make_teardrop_seed(
                    f"BurgerSesame_{seed_idx}",
                    length=0.022,
                    width=0.010,
                    loc=(sx, sy, s_z),
                    rot=(math.sin(ang) * tilt, -math.cos(ang) * tilt, ang),
                    mat=m_sesame,
                )
            )
            seed_idx += 1

    return objs


def build_all_burgers():
    reset_scene()
    export_gltf_or_glb(_build_gourmet_burger(include_cheese=False, double_patty=False, include_tomato=True), "kenney/burger.glb")

    reset_scene()
    export_gltf_or_glb(_build_gourmet_burger(include_cheese=True, double_patty=False, include_tomato=True), "kenney/burger-cheese.glb")

    reset_scene()
    export_gltf_or_glb(_build_gourmet_burger(include_cheese=True, double_patty=True, include_tomato=True), "kenney/burger-double.glb")


# ==============================================================================
# 7. WOOD-FIRED PIZZA, FRESH SALAD & STEAK DINNER (`pizza.glb`, `salad.glb`, `food_dinner.gltf`)
# ==============================================================================
def build_pizza():
    reset_scene()
    m_crust = mat_toon_clay("Mat_PizzaCrust", PALETTE["bun_golden"], roughness=0.78)
    m_char = mat_toon_clay("Mat_PizzaCharBlister", PALETTE["meat_sear"], roughness=0.85)
    m_sauce = mat_toon_clay("Mat_PizzaTomatoSauce", PALETTE["ketchup_red"], roughness=0.74)
    m_mozz = mat_toon_clay("Mat_PizzaMozzarella", PALETTE["sesame_seed"], roughness=0.74)
    m_pep = mat_toon_clay("Mat_PizzaPepperoni", PALETTE["meat_raw"], roughness=0.74)
    m_basil = mat_toon_clay("Mat_PizzaBasil", PALETTE["stem_green"], roughness=0.76)

    objs = _build_plate_base_meshes()
    # Stretched dough base + puffy cornicione rim
    objs.append(make_cylinder("PizzaDoughFlat", radius=0.26, depth=0.022, loc=(0, 0, 0.032), mat=m_crust, bevel=0.008))
    objs.append(make_torus("PizzaCornicioneRim", major_radius=0.255, minor_radius=0.032, loc=(0, 0, 0.044), scale=(1.0, 1.0, 0.72), mat=m_crust))

    # 6 Wood-fired leopard char blisters on the crust rim
    for i in range(6):
        ang = i * (math.pi / 3.0) + 0.3
        objs.append(
            make_uv_sphere(
                f"CrustBlister_{i}",
                radius=0.022,
                loc=(math.cos(ang) * 0.255, math.sin(ang) * 0.255, 0.062),
                scale=(1.3, 0.9, 0.45),
                mat=m_char,
            )
        )

    # Rich San Marzano tomato sauce bed
    objs.append(make_cylinder("PizzaSauceBed", radius=0.228, depth=0.010, loc=(0, 0, 0.045), mat=m_sauce, bevel=0.004))

    # 5 Organic melted mozzarella puddles (`bmesh`)
    for i, (mx, my, mr) in enumerate([(0, 0, 0.075), (-0.09, -0.07, 0.062), (0.09, -0.06, 0.060), (-0.07, 0.09, 0.064), (0.08, 0.08, 0.058)]):
        objs.append(_make_bmesh_puddle(f"MozzPuddle_{i}", mr, 0.010, (mx, my, 0.052), wave_amp=0.18, lobes=5, mat=m_mozz))

    # 8 Cupped Crispy Pepperoni Slices
    pep_coords = [(0, 0), (-0.11, 0), (0.11, 0), (0, -0.11), (0, 0.11), (-0.08, -0.08), (0.08, 0.08), (-0.08, 0.08)]
    for i, (px, py) in enumerate(pep_coords):
        objs.append(make_cylinder(f"Pepperoni_{i}", radius=0.040, depth=0.012, loc=(px, py, 0.059), mat=m_pep, bevel=0.005))

    # 4 Fresh green basil leaves in center
    for i in range(4):
        ang = i * (math.pi * 0.5) + 0.4
        objs.append(
            make_uv_sphere(
                f"BasilLeaf_{i}",
                radius=0.026,
                loc=(math.cos(ang) * 0.045, math.sin(ang) * 0.045, 0.065),
                scale=(1.4, 0.65, 0.25),
                rot=(0, 0, ang),
                mat=m_basil,
            )
        )

    export_gltf_or_glb(objs, "kenney/pizza.glb")


def build_salad():
    reset_scene()
    m_wood = mat_toon_clay("Mat_SaladBowlWood", PALETTE["wood_oak"], roughness=0.78)
    m_wood_dark = mat_toon_clay("Mat_SaladBowlRim", PALETTE["wood_walnut"], roughness=0.80)
    m_let_out = mat_toon_clay("Mat_SaladLeafOuter", PALETTE["lettuce_outer"], roughness=0.78)
    m_let_in = mat_toon_clay("Mat_SaladLeafInner", PALETTE["lettuce_inner"], roughness=0.76)
    m_tom = mat_toon_clay("Mat_SaladTomato", PALETTE["tomato_red"], roughness=0.72)
    m_onion = mat_toon_clay("Mat_SaladOnion", PALETTE["onion_skin"], roughness=0.76)
    m_crouton = mat_toon_clay("Mat_SaladCrouton", PALETTE["bun_golden"], roughness=0.82)

    bowl = make_hollow_vessel(
        "SaladWoodBowl",
        outer_radius_bottom=0.18,
        outer_radius_top=0.28,
        height=0.14,
        wall_thickness=0.024,
        bottom_thickness=0.018,
        bulge=0.15,
        rim_lip=0.012,
        segments=32,
        loc=(0, 0, 0.0),
        outer_mat=m_wood,
        inner_mat=m_wood_dark,
        bottom_mat=m_wood_dark,
    )
    objs = [bowl]

    # Layered ruffled lettuce bed inside the bowl
    objs.append(_make_ruffled_lettuce_layer("SaladBedOuter", radius=0.23, z_loc=0.11, waves=9, amp=0.024, mat=m_let_out))
    objs.append(_make_ruffled_lettuce_layer("SaladBedInner", radius=0.18, z_loc=0.135, waves=7, amp=0.020, mat=m_let_in))

    # Tomato wedges, purple onion rings & golden croutons
    for i in range(5):
        ang = (2.0 * math.pi * i) / 5.0
        objs.append(
            make_uv_sphere(
                f"SaladTomatoWedge_{i}",
                radius=0.048,
                loc=(math.cos(ang) * 0.11, math.sin(ang) * 0.11, 0.155),
                scale=(1.2, 0.72, 0.65),
                rot=(0.2, 0, ang),
                mat=m_tom,
            )
        )
    for i, (ox, oy) in enumerate([(-0.05, 0.04), (0.06, -0.03), (0.0, -0.07)]):
        objs.append(make_torus(f"SaladOnionRing_{i}", major_radius=0.046, minor_radius=0.009, loc=(ox, oy, 0.165), rot=(0.25, -0.15, i), mat=m_onion))
    for i, (cx, cy) in enumerate([(0.0, 0.0), (-0.07, -0.05), (0.07, 0.05)]):
        objs.append(make_box(f"SaladCrouton_{i}", size=(0.042, 0.042, 0.036), loc=(cx, cy, 0.168), rot=(0.3, 0.2, i * 0.7), mat=m_crouton, bevel=0.007))

    export_gltf_or_glb(objs, "kenney/salad.glb")


def build_steak_dinner():
    reset_scene()
    m_steak = mat_toon_clay("Mat_DinnerSteak", PALETTE["meat_cooked"], roughness=0.80)
    m_sear = mat_toon_clay("Mat_DinnerSear", PALETTE["meat_sear"], roughness=0.85)
    m_butter = mat_toon_clay("Mat_DinnerHerbButter", PALETTE["cheese_yellow"], roughness=0.72)
    m_herb = mat_toon_clay("Mat_DinnerHerb", PALETTE["stem_green"], roughness=0.78)
    m_fry = mat_toon_clay("Mat_DinnerFries", PALETTE["potato_inside"], roughness=0.78)
    m_tom = mat_toon_clay("Mat_DinnerCherryTom", PALETTE["tomato_red"], roughness=0.72)

    objs = _build_plate_base_meshes()

    # Asymmetric Ribeye Steak (`bmesh` organic contour) + 4 diagonal grill marks + melting herb butter pat
    steak = _make_bmesh_puddle("DinnerRibeye", radius=0.145, thickness=0.052, loc=(-0.065, 0.02, 0.048), wave_amp=0.14, lobes=4, mat=m_steak)
    steak.scale = (1.25, 0.88, 1.0)
    objs.append(steak)

    for i, gx in enumerate((-0.12, -0.08, -0.04, 0.0)):
        objs.append(
            make_box(
                f"DinnerSteakGrill_{i}",
                size=(0.016, 0.17, 0.008),
                loc=(gx, 0.02, 0.075),
                rot=(0, 0, math.radians(32)),
                mat=m_sear,
                bevel=0.003,
            )
        )
    # Melting golden garlic-herb butter pat on top of steak
    objs.append(make_cylinder("HerbButterPat", radius=0.036, depth=0.016, loc=(-0.065, 0.02, 0.082), mat=m_butter, bevel=0.005))
    objs.append(make_uv_sphere("HerbParsleyLeaf", radius=0.018, loc=(-0.065, 0.02, 0.092), scale=(1.3, 0.8, 0.35), mat=m_herb))

    # Crisscrossed pile of 6 Golden French Fries on right side of platter
    fry_specs = [
        (0.11, -0.06, 0.042,  15),
        (0.13, -0.02, 0.042,  -8),
        (0.10,  0.03, 0.042,  22),
        (0.12, -0.04, 0.064, -25),
        (0.11,  0.01, 0.064,  12),
        (0.12, -0.01, 0.084, -14),
    ]
    for i, (fx, fy, fz, ang_deg) in enumerate(fry_specs):
        objs.append(
            make_box(
                f"DinnerFry_{i}",
                size=(0.030, 0.16, 0.026),
                loc=(fx, fy, fz),
                rot=(0, 0, math.radians(ang_deg)),
                mat=m_fry,
                bevel=0.006,
            )
        )

    # 2 Roasted Cherry Tomatoes + Asparagus spears
    objs.append(make_uv_sphere("RoastedCherryTom1", radius=0.042, loc=(0.02, -0.13, 0.055), mat=m_tom))
    objs.append(make_uv_sphere("RoastedCherryTom2", radius=0.038, loc=(-0.06, -0.14, 0.052), mat=m_tom))
    objs.append(make_cylinder("Asparagus1", radius=0.014, depth=0.18, loc=(0.01, 0.13, 0.042), rot=(0, math.radians(90), math.radians(-18)), mat=m_herb, bevel=0.004))
    objs.append(make_cylinder("Asparagus2", radius=0.014, depth=0.17, loc=(0.02, 0.10, 0.048), rot=(0, math.radians(90), math.radians(-10)), mat=m_herb, bevel=0.004))

    export_gltf_or_glb(objs, "gltf/food_dinner.gltf")


def generate_all():
    print("\n=== [PHẦN 1] Building Hollow Utensils, Condiments & Finished Dishes ===")
    build_plates()
    build_pots()
    build_frying_pan()
    build_stew_bowl()
    build_condiments_knife_menu()
    build_all_burgers()
    build_pizza()
    build_salad()
    build_steak_dinner()


if __name__ == "__main__":
    generate_all()
