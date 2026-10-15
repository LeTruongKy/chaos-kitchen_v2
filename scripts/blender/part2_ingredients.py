# -*- coding: utf-8 -*-
"""
CHAOS KITCHEN — PHẦN 2: TOÀN BỘ 21 NGUYÊN LIỆU SỐNG, THÁI LÁT & NẤU CHÍN (`part2_ingredients.py`)
Senior 3D Technical Artist Procedural Blender Pipeline (Laws 1-5):
- `gltf/food_ingredient_tomato.gltf`, `gltf/food_ingredient_tomato_slice.gltf`
- `gltf/food_ingredient_lettuce.gltf`, `gltf/food_ingredient_lettuce_chopped.gltf`
- `gltf/food_ingredient_steak.gltf`
- `gltf/food_ingredient_burger_uncooked.gltf`, `gltf/food_ingredient_burger_cooked.gltf`
- `gltf/food_ingredient_bun.gltf`, `gltf/food_ingredient_bun_bottom.gltf`, `gltf/food_ingredient_bun_top.gltf`
- `gltf/food_ingredient_onion.gltf`, `gltf/food_ingredient_onion_chopped.gltf`
- `gltf/food_ingredient_potato.gltf`, `gltf/food_ingredient_potato_chopped.gltf`
- `gltf/food_ingredient_carrot.gltf`, `gltf/food_ingredient_carrot_chopped.gltf`
- `kenney/cheese.glb`, `kenney/cheese-cut.glb`
- `kenney/mushroom.glb`, `kenney/mushroom-half.glb`, `kenney/bread.glb`
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
    assign_material,
    apply_smooth_shading,
    add_bevel,
    add_boolean_cut,
    bmesh_bulge_and_taper,
    bmesh_organic_lobes,
    make_curve_tube,
    make_box,
    make_cylinder,
    make_uv_sphere,
    make_torus,
    export_gltf_or_glb,
)
from part1_utensils_and_dishes import _make_teardrop_seed, _make_bmesh_puddle, _make_ruffled_lettuce_layer


# ==============================================================================
# 1. TOMATO RAW & SLICED (`food_ingredient_tomato.gltf`, `food_ingredient_tomato_slice.gltf`)
# ==============================================================================
def build_tomato():
    # --- RAW TOMATO ---
    reset_scene()
    m_red = mat_toon_clay("Mat_TomRawRed", PALETTE["tomato_red"], roughness=0.72)
    m_stem = mat_toon_clay("Mat_TomRawStem", PALETTE["stem_green"], roughness=0.78)

    # 6-lobed plump tomato body with depressed crown (`bmesh_organic_lobes`)
    body = make_uv_sphere("TomatoBody", radius=0.22, segments=36, rings=24, loc=(0, 0, 0.19), scale=(1.04, 1.04, 0.86), mat=m_red)
    bmesh_organic_lobes(body, lobes=6, lobe_amp=0.065, dimple_top=0.24, dimple_bottom=0.10)
    objs = [body]

    # 5 Curved Calyx Sepals hugging the top crown via `bmesh` arch deformation
    for i in range(5):
        ang = (2.0 * math.pi * i) / 5.0
        sepal = make_box(
            f"TomatoSepal_{i}",
            size=(0.13, 0.036, 0.016),
            loc=(math.cos(ang) * 0.075, math.sin(ang) * 0.075, 0.335),
            rot=(0, math.radians(16), ang),
            mat=m_stem,
            bevel=0.005,
        )
        bm = bmesh.new()
        bm.from_mesh(sepal.data)
        for v in bm.verts:
            if v.co.x > 0:
                v.co.y *= 0.45
                v.co.z -= (v.co.x ** 2) * 1.2
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(sepal.data)
        bm.free()
        objs.append(sepal)

    # Curved vine stem in the center
    stem_pts = [(0, 0, 0.32), (0.01, 0.01, 0.365), (0.035, 0.02, 0.405)]
    objs.append(make_curve_tube("TomatoVineStem", stem_pts, bevel_radius=0.016, mat=m_stem))

    export_gltf_or_glb(objs, "gltf/food_ingredient_tomato.gltf", "tomato.glb")

    # --- SLICED TOMATO (`food_ingredient_tomato_slice.gltf`) ---
    reset_scene()
    m_flesh = mat_toon_clay("Mat_TomSliceFlesh", PALETTE["tomato_flesh"], roughness=0.76)
    m_gel = mat_toon_clay("Mat_TomSliceGel", PALETTE["tomato_gel"], roughness=0.72)
    m_seed = mat_toon_clay("Mat_TomSliceSeed", PALETTE["tomato_seed"], roughness=0.74)

    objs_slice = []
    for s_idx, (sx, sy, sz, rot_z) in enumerate([(-0.03, -0.02, 0.022, 0.0), (0.04, 0.03, 0.062, 0.55)]):
        # Outer dark-red skin ring + inner pink-red flesh disc
        objs_slice.append(make_torus(f"TomSkinRing_{s_idx}", major_radius=0.185, minor_radius=0.022, loc=(sx, sy, sz), scale=(1.0, 1.0, 0.9), mat=m_red))
        objs_slice.append(make_cylinder(f"TomFleshDisc_{s_idx}", radius=0.182, depth=0.034, loc=(sx, sy, sz), mat=m_flesh, bevel=0.006))

        # 4 Recessed locule seed chambers + 8 yellow teardrop seeds
        for c_i in range(4):
            ang = (math.pi * 0.5) * c_i + rot_z
            cx = sx + math.cos(ang) * 0.095
            cy = sy + math.sin(ang) * 0.095
            objs_slice.append(
                make_uv_sphere(
                    f"TomLocule_{s_idx}_{c_i}",
                    radius=0.048,
                    loc=(cx, cy, sz + 0.014),
                    scale=(1.25, 0.78, 0.25),
                    rot=(0, 0, ang),
                    mat=m_gel,
                )
            )
            for k in (-1, 1):
                s_ang = ang + k * 0.24
                objs_slice.append(
                    _make_teardrop_seed(
                        f"TomSeed_{s_idx}_{c_i}_{k}",
                        length=0.020,
                        width=0.010,
                        loc=(sx + math.cos(s_ang) * 0.098, sy + math.sin(s_ang) * 0.098, sz + 0.021),
                        rot=(0, 0, s_ang + math.pi),
                        mat=m_seed,
                    )
                )

    export_gltf_or_glb(objs_slice, "gltf/food_ingredient_tomato_slice.gltf")


# ==============================================================================
# 2. LETTUCE WHOLE & CHOPPED (`food_ingredient_lettuce.gltf`, `food_ingredient_lettuce_chopped.gltf`)
# ==============================================================================
def build_lettuce():
    # --- WHOLE CABBAGE / LETTUCE HEAD ---
    reset_scene()
    m_core = mat_toon_clay("Mat_LetCoreWhite", PALETTE["lettuce_core"], roughness=0.78)
    m_inner = mat_toon_clay("Mat_LetInnerGreen", PALETTE["lettuce_inner"], roughness=0.76)
    m_outer = mat_toon_clay("Mat_LetOuterGreen", PALETTE["lettuce_outer"], roughness=0.78)
    m_deep = mat_toon_clay("Mat_LetDeepGreen", PALETTE["stem_green"], roughness=0.80)

    # White stalk base at bottom
    stalk = make_cylinder("LettuceStalkBase", radius=0.085, depth=0.045, loc=(0, 0, 0.022), mat=m_core, bevel=0.010, taper_top=0.15)
    # Plump inner heart (`bmesh_organic_lobes`)
    heart = make_uv_sphere("LettuceInnerHeart", radius=0.175, segments=28, rings=20, loc=(0, 0, 0.19), scale=(1.0, 1.0, 0.92), mat=m_inner)
    bmesh_organic_lobes(heart, lobes=5, lobe_amp=0.06, dimple_top=0.08, dimple_bottom=0.05)
    objs = [stalk, heart]

    # 8 Overlapping Ruffled Leaf Cups (`bmesh` sinusoidal rim displacement) in 2 concentric tiers
    tiers = [
        (4, 0.195, 0.20, 0.25, m_outer),
        (4, 0.215, 0.18, 0.65, m_deep),
    ]
    leaf_idx = 0
    for count, rad, z_c, phase, mat in tiers:
        for i in range(count):
            ang = (2.0 * math.pi * i) / count + phase
            lx = math.cos(ang) * 0.042
            ly = math.sin(ang) * 0.042
            leaf = make_uv_sphere(
                f"LettuceCupLeaf_{leaf_idx}",
                radius=rad,
                segments=24,
                rings=16,
                loc=(lx, ly, z_c),
                scale=(1.05, 0.62, 0.90),
                rot=(0.22, 0.0, ang + math.pi * 0.5),
                mat=mat,
            )
            bm = bmesh.new()
            bm.from_mesh(leaf.data)
            for v in bm.verts:
                a = math.atan2(v.co.y, v.co.x)
                if v.co.z > 0.02:
                    v.co.x *= 1.0 + math.sin(a * 7.0) * 0.08
                    v.co.y *= 1.0 + math.cos(a * 7.0) * 0.08
                    v.co.z += math.sin(a * 6.0) * 0.015
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(leaf.data)
            bm.free()
            objs.append(leaf)
            leaf_idx += 1

    export_gltf_or_glb(objs, "gltf/food_ingredient_lettuce.gltf", "lettuce.glb")

    # --- CHOPPED LETTUCE (`food_ingredient_lettuce_chopped.gltf`) ---
    reset_scene()
    objs_chop = [
        _make_ruffled_lettuce_layer("ChoppedLettuceBase", radius=0.20, z_loc=0.018, waves=9, amp=0.018, mat=m_outer),
        _make_ruffled_lettuce_layer("ChoppedLettuceMid", radius=0.16, z_loc=0.038, waves=8, amp=0.016, mat=m_inner),
    ]
    for i in range(7):
        ang = (2.0 * math.pi * i) / 7.0
        r = 0.075 if i < 5 else 0.025
        mat = m_inner if i % 2 == 0 else m_outer
        strip = make_box(
            f"LettuceShred_{i}",
            size=(0.15, 0.048, 0.018),
            loc=(math.cos(ang) * r, math.sin(ang) * r, 0.052 + (i % 3) * 0.012),
            rot=(0.18, -0.14, ang * 1.3),
            mat=mat,
            bevel=0.005,
            bulge=0.18,
        )
        objs_chop.append(strip)
        # White crisp rib mid-vein on shred
        objs_chop.append(
            make_box(
                f"LettuceRib_{i}",
                size=(0.11, 0.014, 0.020),
                loc=(math.cos(ang) * r, math.sin(ang) * r, 0.054 + (i % 3) * 0.012),
                rot=(0.18, -0.14, ang * 1.3),
                mat=m_core,
                bevel=0.003,
            )
        )

    export_gltf_or_glb(objs_chop, "gltf/food_ingredient_lettuce_chopped.gltf")


# ==============================================================================
# 3. RAW STEAK & BURGER PATTIES (`food_ingredient_steak.gltf`, `burger_uncooked`, `burger_cooked`)
# ==============================================================================
def build_steak_and_patties():
    # --- RAW RIBEYE / BONE-IN STEAK (`food_ingredient_steak.gltf`) ---
    reset_scene()
    m_raw = mat_toon_clay("Mat_SteakRawRed", 0xD91E2B, roughness=0.72)
    m_fat = mat_toon_clay("Mat_SteakFatCap", 0xFFF5EB, roughness=0.76)
    m_bone = mat_toon_clay("Mat_SteakBone", 0xFFFFFF, roughness=0.72)
    m_marrow = mat_toon_clay("Mat_SteakMarrow", 0xFF758F, roughness=0.78)

    # Primary crimson red meat slab sculpted asymmetrically via `bmesh` (slot 0 primary mesh!)
    meat_core = _make_bmesh_puddle("SteakRedCore", radius=0.205, thickness=0.072, loc=(-0.010, 0.004, 0.038), wave_amp=0.14, lobes=3, mat=m_raw)
    meat_core.scale = (1.22, 0.86, 1.0)
    # Outer cream fat cap rim seated slightly lower around the perimeter so it never covers the top crimson surface
    fat_rim = _make_bmesh_puddle("SteakFatCapRim", radius=0.222, thickness=0.056, loc=(0, 0, 0.028), wave_amp=0.14, lobes=3, mat=m_fat)
    fat_rim.scale = (1.24, 0.88, 1.0)

    # Round white bone cylinder in the steak + marrow center
    bone_ring = make_cylinder("SteakRoundBone", radius=0.046, depth=0.078, loc=(0.095, -0.028, 0.040), mat=m_bone, bevel=0.008)
    marrow_dot = make_cylinder("SteakBoneMarrow", radius=0.022, depth=0.082, loc=(0.095, -0.028, 0.041), mat=m_marrow, bevel=0.004)

    # Crisp white marbling fat veins across the crimson steak surface
    marbling_specs = [
        (-0.08,  0.04, 0.14, 0.012,  28),
        (-0.02,  0.02, 0.15, 0.011, -18),
        (-0.09, -0.04, 0.12, 0.012,  42),
        ( 0.01,  0.07, 0.10, 0.010, -35),
    ]
    objs_steak = [meat_core, fat_rim, bone_ring, marrow_dot]
    for i, (mx, my, mlen, mwid, mang) in enumerate(marbling_specs):
        objs_steak.append(
            make_box(
                f"SteakMarbling_{i}",
                size=(mlen, mwid, 0.008),
                loc=(mx, my, 0.074),
                rot=(0, 0, math.radians(mang)),
                mat=m_fat,
                bevel=0.002,
                bulge=0.12,
            )
        )

    export_gltf_or_glb(objs_steak, "gltf/food_ingredient_steak.gltf", "meat_patty.glb")

    # --- UNCOOKED BURGER PATTY (`food_ingredient_burger_uncooked.gltf`) ---
    reset_scene()
    patty_raw = _make_bmesh_puddle("RawBurgerPatty", radius=0.205, thickness=0.068, loc=(0, 0, 0.034), wave_amp=0.05, lobes=9, mat=m_raw)
    objs_raw_patty = [patty_raw]
    # 8 Minced white fat flecks embedded across the raw crimson burger patty
    for i in range(8):
        ang = (2.0 * math.pi * i) / 8.0 + 0.3
        r = 0.058 if i % 2 == 0 else 0.122
        objs_raw_patty.append(
            make_box(
                f"MincedFatFleck_{i}",
                size=(0.026, 0.016, 0.008),
                loc=(math.cos(ang) * r, math.sin(ang) * r, 0.067),
                rot=(0, 0, ang * 1.7),
                mat=m_fat,
                bevel=0.003,
            )
        )
    export_gltf_or_glb(objs_raw_patty, "gltf/food_ingredient_burger_uncooked.gltf")

    # --- COOKED BURGER PATTY (`food_ingredient_burger_cooked.gltf`) ---
    reset_scene()
    m_cooked = mat_toon_clay("Mat_PattyCookedBrown", 0x592512, roughness=0.78)
    m_sear = mat_toon_clay("Mat_PattyGrillSear", 0x240D04, roughness=0.84)

    patty_cooked = _make_bmesh_puddle("CookedBurgerPatty", radius=0.205, thickness=0.068, loc=(0, 0, 0.034), wave_amp=0.05, lobes=9, mat=m_cooked)
    objs_cooked_patty = [patty_cooked]
    # 4 Parallel Charred Grill Marks across the top surface
    for i, gx in enumerate((-0.105, -0.035, 0.035, 0.105)):
        length = 0.28 if abs(gx) < 0.08 else 0.22
        objs_cooked_patty.append(
            make_box(
                f"PattyGrillMark_{i}",
                size=(0.022, length, 0.010),
                loc=(gx, 0, 0.067),
                rot=(0, 0, math.radians(15)),
                mat=m_sear,
                bevel=0.003,
            )
        )
    export_gltf_or_glb(objs_cooked_patty, "gltf/food_ingredient_burger_cooked.gltf")


# ==============================================================================
# 4. SWISS CHEESE WEDGE & SLICES (`kenney/cheese.glb`, `kenney/cheese-cut.glb`)
# ==============================================================================
def build_cheese():
    # --- SWISS CHEESE TRIANGULAR WEDGE WITH BOOLEAN HOLES (`kenney/cheese.glb`) ---
    reset_scene()
    m_cheese = mat_toon_clay("Mat_SwissCheeseYellow", PALETTE["cheese_yellow"], roughness=0.74)
    m_rind = mat_toon_clay("Mat_SwissCheeseRind", PALETTE["cheese_rind"], roughness=0.78)

    # Build a triangular prism wedge via `bmesh`
    mesh = bpy.data.meshes.new("CheeseWedge_Mesh")
    wedge = bpy.data.objects.new("CheeseWedge", mesh)
    bpy.context.collection.objects.link(wedge)

    bm = bmesh.new()
    # Triangle vertices in XY: Nose at (-0.22, 0), Back corners at (0.18, -0.18) and (0.18, 0.18)
    coords_bot = [(-0.22, 0.0, 0.0), (0.18, -0.18, 0.0), (0.18, 0.18, 0.0)]
    coords_top = [(-0.22, 0.0, 0.16), (0.18, -0.18, 0.16), (0.18, 0.18, 0.16)]
    v_bot = [bm.verts.new(c) for c in coords_bot]
    v_top = [bm.verts.new(c) for c in coords_top]
    bm.faces.new((v_bot[0], v_bot[2], v_bot[1]))
    bm.faces.new((v_top[0], v_top[1], v_top[2]))
    for i in range(3):
        j = (i + 1) % 3
        bm.faces.new((v_bot[i], v_bot[j], v_top[j], v_top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    add_bevel(wedge, width=0.018, segments=3)
    bpy.ops.object.select_all(action='DESELECT')
    wedge.select_set(True)
    bpy.context.view_layer.objects.active = wedge
    bpy.ops.object.modifier_apply(modifier="ChibiBevel")
    assign_material(wedge, m_cheese)

    # Boolean Difference 6 Swiss cheese holes along the top & sides!
    hole_locs = [
        (-0.04,  0.03, 0.16, 0.046),
        ( 0.09, -0.06, 0.16, 0.052),
        ( 0.06,  0.12, 0.09, 0.044),
        (-0.06, -0.08, 0.08, 0.042),
        ( 0.11,  0.04, 0.16, 0.038),
        (-0.12,  0.00, 0.15, 0.034),
    ]
    for i, (hx, hy, hz, hr) in enumerate(hole_locs):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=12, radius=hr, location=(hx, hy, hz))
        cutter = bpy.context.active_object
        add_boolean_cut(wedge, cutter, 'DIFFERENCE')

    # Back wax rind strip on the curved/flat back edge
    rind = make_box("CheeseWaxRind", size=(0.026, 0.35, 0.152), loc=(0.182, 0.0, 0.08), mat=m_rind, bevel=0.008)
    export_gltf_or_glb([wedge, rind], "kenney/cheese.glb")

    # --- SLICED SWISS CHEESE (`kenney/cheese-cut.glb`) ---
    reset_scene()
    slices = []
    for s_i, (sx, sy, sz, ang) in enumerate([(-0.02, -0.02, 0.014, 8.0), (0.03, 0.02, 0.038, -16.0)]):
        sl = make_box(
            f"SwissSlice_{s_i}",
            size=(0.30, 0.30, 0.024),
            loc=(sx, sy, sz),
            rot=(0, 0, math.radians(ang)),
            mat=m_cheese,
            bevel=0.006,
        )
        bpy.ops.object.select_all(action='DESELECT')
        sl.select_set(True)
        bpy.context.view_layer.objects.active = sl
        bpy.ops.object.modifier_apply(modifier="ChibiBevel")
        for h_i, (hx, hy, hr) in enumerate([(-0.06, 0.05, 0.036), (0.07, -0.04, 0.042), (0.05, 0.08, 0.030)]):
            bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=hr, depth=0.08, location=(sx + hx, sy + hy, sz))
            cutter = bpy.context.active_object
            add_boolean_cut(sl, cutter, 'DIFFERENCE')
        slices.append(sl)

    export_gltf_or_glb(slices, "kenney/cheese-cut.glb")


# ==============================================================================
# 5. BURGER BUNS (`food_ingredient_bun.gltf`, `bun_bottom.gltf`, `bun_top.gltf`)
# ==============================================================================
def _build_bun_bottom_meshes(z_base: float = 0.0):
    m_crust = mat_toon_clay("Mat_BunGoldenCrust", PALETTE["bun_golden"], roughness=0.76)
    m_crumb = mat_toon_clay("Mat_BunCreamCrumb", PALETTE["bun_crumb"], roughness=0.84)
    bot_crust = make_cylinder("BunBotCrust", radius=0.21, depth=0.065, loc=(0, 0, z_base + 0.0325), mat=m_crust, bevel=0.022, bulge=0.14)
    bot_crumb = make_cylinder("BunBotCrumb", radius=0.204, depth=0.015, loc=(0, 0, z_base + 0.066), mat=m_crumb, bevel=0.005)
    return [bot_crust, bot_crumb]


def _build_bun_top_meshes(z_base: float = 0.0):
    m_crust = mat_toon_clay("Mat_BunGoldenCrust", PALETTE["bun_golden"], roughness=0.76)
    m_crumb = mat_toon_clay("Mat_BunCreamCrumb", PALETTE["bun_crumb"], roughness=0.84)
    m_sesame = mat_toon_clay("Mat_BunSesameSeed", PALETTE["sesame_seed"], roughness=0.74)

    crumb_under = make_cylinder("BunTopCrumbUnder", radius=0.205, depth=0.014, loc=(0, 0, z_base + 0.007), mat=m_crumb, bevel=0.005)
    dome = make_uv_sphere("BunTopDome", radius=0.218, segments=32, rings=20, loc=(0, 0, z_base + 0.022), scale=(1.0, 1.0, 0.58), mat=m_crust)
    bm = bmesh.new()
    bm.from_mesh(dome.data)
    for v in bm.verts:
        if v.co.z < 0.0:
            v.co.z *= 0.12
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(dome.data)
    bm.free()

    objs = [crumb_under, dome]
    # 14 Teardrop Sesame Seeds distributed across the dome
    seed_rings = [(6, 0.085, z_base + 0.124, 0.18), (8, 0.148, z_base + 0.096, 0.38)]
    s_idx = 0
    for count, s_rad, s_z, tilt in seed_rings:
        for k in range(count):
            ang = (2.0 * math.pi * k) / count + s_idx * 0.22
            objs.append(
                _make_teardrop_seed(
                    f"BunTopSesame_{s_idx}",
                    length=0.024,
                    width=0.011,
                    loc=(math.cos(ang) * s_rad, math.sin(ang) * s_rad, s_z),
                    rot=(math.sin(ang) * tilt, -math.cos(ang) * tilt, ang),
                    mat=m_sesame,
                )
            )
            s_idx += 1
    return objs


def build_buns():
    reset_scene()
    export_gltf_or_glb(_build_bun_bottom_meshes(0.0), "gltf/food_ingredient_bun_bottom.gltf")

    reset_scene()
    export_gltf_or_glb(_build_bun_top_meshes(0.0), "gltf/food_ingredient_bun_top.gltf")

    reset_scene()
    objs_full = _build_bun_bottom_meshes(0.0) + _build_bun_top_meshes(0.072)
    export_gltf_or_glb(objs_full, "gltf/food_ingredient_bun.gltf", "bread.glb")


# ==============================================================================
# 6. ONION, POTATO, CARROT, MUSHROOM & DOUGH
# ==============================================================================
def build_onion():
    reset_scene()
    m_skin = mat_toon_clay("Mat_OnionGoldSkin", 0xD4842A, roughness=0.80)
    m_dark = mat_toon_clay("Mat_OnionDarkRib", 0x9C5A18, roughness=0.82)
    m_white = mat_toon_clay("Mat_OnionCreamFlesh", 0xF5EBD6, roughness=0.80)
    m_shoot = mat_toon_clay("Mat_OnionGreenShoot", PALETTE["stem_green"], roughness=0.80)

    # Ribbed golden-bronze onion bulb with tapered neck (`bmesh_organic_lobes`)
    bulb = make_uv_sphere("OnionBulb", radius=0.20, segments=28, rings=18, loc=(0, 0, 0.17), scale=(1.02, 1.02, 0.90), mat=m_skin)
    bmesh_organic_lobes(bulb, lobes=8, lobe_amp=0.04, dimple_top=-0.22, dimple_bottom=0.08)
    root_pad = make_cylinder("OnionRootCrown", radius=0.055, depth=0.022, loc=(0, 0, 0.012), mat=m_dark, bevel=0.005)
    objs = [bulb, root_pad]

    # 3 Curved green sprout shoots emerging from the top neck
    for i, (dx, dy) in enumerate([(0.0, 0.0), (0.03, 0.02), (-0.03, -0.015)]):
        pts = [(0, 0, 0.34), (dx * 0.6, dy * 0.6, 0.40), (dx * 1.4, dy * 1.4, 0.45)]
        objs.append(make_curve_tube(f"OnionSprout_{i}", pts, bevel_radius=0.014, mat=m_shoot))

    export_gltf_or_glb(objs, "gltf/food_ingredient_onion.gltf", "onion.glb")

    # Chopped Onion Rings (`food_ingredient_onion_chopped.gltf`) — Golden-brown outer skin rim + Warm Cream inner rings
    reset_scene()
    objs_rings = []
    ring_specs = [
        (0.00, 0.00, 0.018, 0.16, 0.11, 0.00),
        (0.02, 0.01, 0.040, 0.13, 0.08, 0.25),
        (-0.03, -0.02, 0.058, 0.10, 0.055, -0.20),
    ]
    for i, (rx, ry, rz, r_out, r_in, tilt) in enumerate(ring_specs):
        objs_rings.append(make_torus(f"OnionOuterGold_{i}", major_radius=r_out, minor_radius=0.018, loc=(rx, ry, rz), rot=(tilt * 0.3, 0, 0), mat=m_skin))
        objs_rings.append(make_torus(f"OnionInnerCream_{i}", major_radius=r_out - 0.016, minor_radius=0.017, loc=(rx, ry, rz), rot=(tilt * 0.3, 0, 0), mat=m_white))
        objs_rings.append(make_torus(f"OnionCoreRing_{i}", major_radius=r_in, minor_radius=0.015, loc=(rx, ry, rz), rot=(tilt * 0.3, 0, 0), mat=m_white))

    export_gltf_or_glb(objs_rings, "gltf/food_ingredient_onion_chopped.gltf")


def build_potato():
    reset_scene()
    m_skin = mat_toon_clay("Mat_PotatoSkinTan", PALETTE["potato_tan"], roughness=0.82)
    m_eye = mat_toon_clay("Mat_PotatoEyeBrown", PALETTE["potato_eye"], roughness=0.85)
    m_flesh = mat_toon_clay("Mat_PotatoFleshYellow", PALETTE["potato_inside"], roughness=0.78)

    tuber = make_uv_sphere("PotatoTuber", radius=0.19, segments=28, rings=20, loc=(0, 0, 0.13), scale=(1.28, 0.88, 0.72), mat=m_skin)
    bmesh_organic_lobes(tuber, lobes=3, lobe_amp=0.05, dimple_top=0.04, dimple_bottom=0.04, asymmetry=0.08)
    objs = [tuber]

    # 7 Potato Eye Dimples around the tuber
    eye_coords = [
        ( 0.12,  0.06, 0.20),
        (-0.10,  0.08, 0.19),
        ( 0.03, -0.11, 0.18),
        (-0.14, -0.05, 0.16),
        ( 0.16, -0.04, 0.15),
        ( 0.00,  0.02, 0.25),
        (-0.05, -0.02, 0.24),
    ]
    for i, (ex, ey, ez) in enumerate(eye_coords):
        objs.append(make_uv_sphere(f"PotatoEye_{i}", radius=0.016, loc=(ex, ey, ez), scale=(1.3, 0.8, 0.45), mat=m_eye))

    export_gltf_or_glb(objs, "gltf/food_ingredient_potato.gltf")

    # Chopped Potato Sticks / Fries (`food_ingredient_potato_chopped.gltf`)
    reset_scene()
    objs_fries = []
    fry_layout = [
        (-0.08, 0.0, 0.020,  10),
        ( 0.00, 0.0, 0.020,  -6),
        ( 0.08, 0.0, 0.020,  14),
        (-0.05, 0.0, 0.054, -22),
        ( 0.04, 0.0, 0.054,  18),
        (-0.01, 0.0, 0.086,  -8),
        ( 0.05, 0.02, 0.086, 28),
    ]
    for i, (fx, fy, fz, ang_deg) in enumerate(fry_layout):
        fry = make_box(
            f"PotatoFryStick_{i}",
            size=(0.044, 0.30, 0.038),
            loc=(fx, fy, fz),
            rot=(0, 0, math.radians(ang_deg)),
            mat=m_flesh,
            bevel=0.008,
        )
        # Golden skin tip at one end of each fry
        skin_cap = make_box(
            f"PotatoFrySkinTip_{i}",
            size=(0.045, 0.032, 0.039),
            loc=(fx - math.sin(math.radians(ang_deg)) * 0.135, fy + math.cos(math.radians(ang_deg)) * 0.135, fz),
            rot=(0, 0, math.radians(ang_deg)),
            mat=m_skin,
            bevel=0.006,
        )
        objs_fries.extend([fry, skin_cap])

    export_gltf_or_glb(objs_fries, "gltf/food_ingredient_potato_chopped.gltf")


def build_carrot():
    reset_scene()
    m_orange = mat_toon_clay("Mat_CarrotOrange", PALETTE["carrot_orange"], roughness=0.76)
    m_core = mat_toon_clay("Mat_CarrotLightCore", PALETTE["carrot_core"], roughness=0.76)
    m_ridge = mat_toon_clay("Mat_CarrotRidge", PALETTE["bun_top_crust"], roughness=0.80)
    m_leaf = mat_toon_clay("Mat_CarrotLeafyTop", PALETTE["stem_green"], roughness=0.76)

    # Tapered conical root sculpted via `bmesh` lying at a slight angle
    bpy.ops.mesh.primitive_cone_add(vertices=28, radius1=0.082, radius2=0.018, depth=0.36, location=(0, -0.02, 0.082), rotation=(math.radians(80), 0, 0))
    root = bpy.context.active_object
    root.name = "CarrotRootBody"
    add_bevel(root, width=0.010, segments=3)
    assign_material(root, m_orange)
    objs = [root]

    # 4 Horizontal growth ring grooves along the carrot body
    for i, (ry, rad) in enumerate([(-0.08, 0.072), (-0.01, 0.060), (0.06, 0.046), (0.12, 0.034)]):
        objs.append(
            make_torus(
                f"CarrotGrowthRing_{i}",
                major_radius=rad,
                minor_radius=0.006,
                loc=(0, ry, 0.082 - ry * 0.16),
                rot=(math.radians(80), 0, 0),
                mat=m_ridge,
            )
        )

    # 5 Leafy green fronds fanning out from the crown
    for i in range(5):
        ang = (2.0 * math.pi * i) / 5.0
        pts = [
            (0, -0.19, 0.11),
            (math.cos(ang) * 0.04, -0.25, 0.13 + math.sin(ang) * 0.03),
            (math.cos(ang) * 0.08, -0.31, 0.16 + math.sin(ang) * 0.05),
        ]
        objs.append(make_curve_tube(f"CarrotFrond_{i}", pts, bevel_radius=0.014, mat=m_leaf))

    export_gltf_or_glb(objs, "gltf/food_ingredient_carrot.gltf")

    # Chopped Carrot Coins (`food_ingredient_carrot_chopped.gltf`) with inner xylem core ring!
    reset_scene()
    objs_coins = []
    coin_coords = [
        (-0.08, -0.05, 0.018, 0.082),
        ( 0.08, -0.04, 0.018, 0.078),
        ( 0.00,  0.07, 0.018, 0.080),
        (-0.03,  0.00, 0.048, 0.076),
        ( 0.05,  0.03, 0.048, 0.072),
    ]
    for i, (cx, cy, cz, crad) in enumerate(coin_coords):
        objs_coins.append(make_cylinder(f"CarrotCoinOuter_{i}", radius=crad, depth=0.030, loc=(cx, cy, cz), mat=m_orange, bevel=0.006))
        objs_coins.append(make_cylinder(f"CarrotCoinCore_{i}", radius=crad * 0.48, depth=0.033, loc=(cx, cy, cz), mat=m_core, bevel=0.004))

    export_gltf_or_glb(objs_coins, "gltf/food_ingredient_carrot_chopped.gltf")


def build_mushroom_and_dough():
    # --- WHOLE MUSHROOM (`kenney/mushroom.glb`) ---
    reset_scene()
    m_cap = mat_toon_clay("Mat_MushCapBrown", PALETTE["mushroom_cap"], roughness=0.76)
    m_gill = mat_toon_clay("Mat_MushGillDark", PALETTE["mushroom_gill"], roughness=0.84)
    m_stem = mat_toon_clay("Mat_MushStemCream", PALETTE["mushroom_stem"], roughness=0.78)
    m_spot = mat_toon_clay("Mat_MushSpotCream", PALETTE["wall_cream"], roughness=0.76)

    # Plump bulbous stem (`bmesh_bulge_and_taper`)
    stem = make_cylinder("MushroomStem", radius=0.085, depth=0.20, loc=(0, 0, 0.10), mat=m_stem, bevel=0.018, bulge=0.18, taper_top=-0.12)
    # Dark gill underside disc
    gills = make_cylinder("MushroomGillUnder", radius=0.185, depth=0.025, loc=(0, 0, 0.185), mat=m_gill, bevel=0.006)
    # Plump dome cap (`bmesh` flattened underside)
    cap = make_uv_sphere("MushroomCap", radius=0.215, segments=32, rings=20, loc=(0, 0, 0.20), scale=(1.0, 1.0, 0.68), mat=m_cap)
    bm = bmesh.new()
    bm.from_mesh(cap.data)
    for v in bm.verts:
        if v.co.z < 0.0:
            v.co.z *= 0.20
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(cap.data)
    bm.free()

    objs_mush = [stem, gills, cap]
    # 5 Cute cream spots on top of the mushroom cap
    for i, (sx, sy, sz, sr) in enumerate([(0, 0, 0.34, 0.032), (0.09, 0.06, 0.30, 0.025), (-0.09, 0.05, 0.30, 0.026), (0.06, -0.09, 0.29, 0.024), (-0.07, -0.08, 0.29, 0.024)]):
        objs_mush.append(make_uv_sphere(f"MushroomSpot_{i}", radius=sr, loc=(sx, sy, sz), scale=(1.1, 1.1, 0.38), mat=m_spot))

    export_gltf_or_glb(objs_mush, "kenney/mushroom.glb")

    # --- SLICED MUSHROOM (`kenney/mushroom-half.glb`) ---
    reset_scene()
    objs_half = []
    for i, (ox, oy, oz, ang) in enumerate([(-0.03, -0.02, 0.018, 12.0), (0.04, 0.03, 0.048, -24.0)]):
        # Outer brown cap crescent + inner cream cap + stem slice + gill strips
        objs_half.append(make_cylinder(f"MushSliceCapRim_{i}", radius=0.145, depth=0.026, loc=(ox, oy + 0.04, oz), mat=m_cap, bevel=0.006))
        objs_half.append(make_cylinder(f"MushSliceCapIn_{i}", radius=0.122, depth=0.028, loc=(ox, oy + 0.035, oz), mat=m_stem, bevel=0.005))
        objs_half.append(make_box(f"MushSliceGills_{i}", size=(0.20, 0.035, 0.030), loc=(ox, oy - 0.01, oz), mat=m_gill, bevel=0.005))
        objs_half.append(make_box(f"MushSliceStem_{i}", size=(0.095, 0.14, 0.028), loc=(ox, oy - 0.07, oz), mat=m_stem, bevel=0.008, bulge=0.12))

    export_gltf_or_glb(objs_half, "kenney/mushroom-half.glb")

    # --- ARTISANAL DOUGH / BREAD (`kenney/bread.glb`) ---
    reset_scene()
    m_dough = mat_toon_clay("Mat_ArtisanDough", PALETTE["dough_cream"], roughness=0.80)
    m_crust = mat_toon_clay("Mat_ArtisanBakedCrust", PALETTE["bun_golden"], roughness=0.78)
    m_flour = mat_toon_clay("Mat_ArtisanFlourDust", PALETTE["porcelain_white"], roughness=0.86)

    loaf = make_uv_sphere("DoughBoule", radius=0.22, segments=32, rings=20, loc=(0, 0, 0.10), scale=(1.12, 0.92, 0.56), mat=m_dough)
    bmesh_organic_lobes(loaf, lobes=4, lobe_amp=0.03, dimple_top=-0.04, dimple_bottom=0.08)
    objs_dough = [loaf]
    # 3 Golden-brown scored baker's slashes across top + flour dusting patches
    for i, dy in enumerate((-0.065, 0.0, 0.065)):
        objs_dough.append(
            make_box(
                f"DoughScoreSlash_{i}",
                size=(0.22, 0.024, 0.018),
                loc=(0, dy, 0.215),
                rot=(0, 0, math.radians(18)),
                mat=m_crust,
                bevel=0.005,
                bulge=0.20,
            )
        )
    objs_dough.append(_make_bmesh_puddle("FlourDustRing", radius=0.23, thickness=0.010, loc=(0, 0, 0.006), wave_amp=0.14, lobes=7, mat=m_flour))

    export_gltf_or_glb(objs_dough, "kenney/bread.glb")


def generate_all():
    print("\n=== [PHẦN 2] Building All 21 Raw, Sliced & Cooked Ingredients with Micro-Details ===")
    build_tomato()
    build_lettuce()
    build_steak_and_patties()
    build_cheese()
    build_buns()
    build_onion()
    build_potato()
    build_carrot()
    build_mushroom_and_dough()


if __name__ == "__main__":
    generate_all()
