# -*- coding: utf-8 -*-
"""
CHAOS KITCHEN — PHẦN 3: HỆ THỐNG BÀN BẾP, THIẾT BỊ & THÙNG NGUYÊN LIỆU CHUẨN OVERCOOKED! (`part3_stations_and_crates.py`)
Implements Part 4 of the Overcooked Technical Specification (1x1 Tile = 64x64, Counter Surface Height Z = 0.625m):
1. `gltf/kitchencounter_straight_A.gltf`, `kitchencounter_straight_B.gltf`, `kitchencounter_straight_A_decorated.gltf`
   - Warm honey-wood countertop (`#e8b878`) with raised 4-sided grid frame border (`#c88a4b`) so adjacent tiles show crisp 1x1 borders.
   - Recessed caramel-brown cabinet body (`0.92 x 0.92`, `#9e582f`), dark plinth (`#5c3118`), grooved door & cream/brass knob.
2. `gltf/crate_tomatoes.gltf`, `crate_lettuce.gltf`, `crate_steak.gltf`, `crate_buns.gltf`, `crate_potatoes.gltf`,
   `crate_onions.gltf`, `crate_carrots.gltf`, `crate_cheese.gltf`
   - Golden-oak slatted wooden crate (`#d48c46`) with corner posts (`#9e582f`), top Cream Plaque (`#fff5d6`), and
     bold 3D Relief Ingredient Icon on the lid just like Overcooked!
3. `gltf/cuttingboard.gltf` — Wheat-cream rounded board (`#f5deb3`) with juice groove & Chunky Chef Cleaver on the right side.
4. `gltf/stove_single.gltf` & `gltf/oven.gltf` — Brushed inox & warm red body, matte-black circular burner grate with cross-prongs & glowing flame, glowing amber oven glass (`emission=1.5`).
5. `gltf/kitchencounter_sink.gltf`, `gltf/dishrack.gltf`, `gltf/dishrack_plates.gltf` — Bluish-silver inox (`#9eb3c2`), left deep water basin (`#00a8ff`), right ribbed drainboard, U-shaped gooseneck faucet.
6. `gltf/crate.gltf` (Hollow Trash Bin with bag folds) & `gltf/wall_orderwindow_decorated.gltf` (Conveyor Delivery with 2 big white arrows & red-white bumpers).
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

# Unified 1x1 station height = 0.625m (40.0 units in Three.js when 1.0m = 64 units)
COUNTER_Z = 0.625


# ==============================================================================
# 1. OVERCOOKED 1x1 KITCHEN COUNTERS (`kitchencounter_straight_A.gltf` & `B.gltf`)
# ==============================================================================
def _build_overcooked_counter_base(top_hex: int = 0xC98A4B, border_hex: int = 0x9C622B, is_metal_top: bool = False):
    m_plinth = mat_toon_clay("Mat_CounterPlinth", 0x3B1C0A, roughness=0.82)
    m_body = mat_toon_clay("Mat_CounterBody", 0x6E3B1B, roughness=0.80)
    m_trim = mat_toon_clay("Mat_CounterTrim", 0x4A250E, roughness=0.82)
    m_knob = mat_toon_clay("Mat_CounterKnob", 0xEAD2A8, roughness=0.78)
    if is_metal_top:
        m_top = mat_toon_metal("Mat_CounterTopSteel", top_hex, roughness=0.40, metallic=0.25)
        m_border = mat_toon_metal("Mat_CounterBorderSteel", border_hex, roughness=0.40, metallic=0.25)
        m_inlay = mat_toon_metal("Mat_CounterInlaySteel", 0xB8C7D6, roughness=0.40, metallic=0.25)
    else:
        m_top = mat_toon_clay("Mat_CounterTopWood", top_hex, roughness=0.80)
        m_border = mat_toon_clay("Mat_CounterBorderWood", border_hex, roughness=0.80)
        m_inlay = mat_toon_clay("Mat_CounterInnerHoney", 0xD49758, roughness=0.80)

    objs = [
        # 1. Recessed dark espresso plinth at bottom (`0.88 x 0.88`, `Z = 0..0.07m`)
        make_box("CounterPlinth", size=(0.88, 0.88, 0.07), loc=(0, 0, 0.035), mat=m_plinth, bevel=0.010),
        # 2. Recessed Chestnut-Brown cabinet body (`0.92 x 0.92`, `Z = 0.07..0.52m`, `#6e3b1b`)
        make_box("CounterCabinetBody", size=(0.92, 0.92, 0.46), loc=(0, 0, 0.295), mat=m_body, bevel=0.018, bulge=0.02),
    ]

    # 3. Front (`-Y`) & Back Recessed Drawer Panels
    for side_y in (-1, 1):
        objs.append(
            make_box(
                f"CounterDrawerFrameY_{side_y}",
                size=(0.76, 0.030, 0.30),
                loc=(0, side_y * 0.455, 0.30),
                mat=m_trim,
                bevel=0.008,
            )
        )
        objs.append(
            make_box(
                f"CounterDrawerInsetY_{side_y}",
                size=(0.68, 0.034, 0.22),
                loc=(0, side_y * 0.462, 0.30),
                mat=m_body,
                bevel=0.006,
            )
        )
    # Chunky round Overcooked drawer knob on front (`-Y`)
    objs.append(
        make_uv_sphere(
            "CounterFrontKnob",
            radius=0.036,
            loc=(0, -0.485, 0.31),
            scale=(1.0, 0.75, 1.0),
            mat=m_knob,
        )
    )

    # 4. Exact 1.00m x 1.00m Thick Rounded Honey-Oak Countertop (`#c98a4b`, `Z = 0.52..0.620m`)
    objs.append(
        make_box(
            "CounterTopSlab",
            size=(0.96, 0.96, 0.100),
            loc=(0, 0, 0.570),
            mat=m_top,
            bevel=0.018,
        )
    )
    # 5. Warm golden honey butcher-block panel on top (`#d49758`) so white plates pop with high contrast!
    objs.append(
        make_box(
            "CounterTopInnerPanel",
            size=(0.82, 0.82, 0.014),
            loc=(0, 0, 0.618),
            mat=m_inlay,
            bevel=0.005,
        )
    )
    # 6. Raised 4-Sided Outer Frame Rim (`#9c622b`, `1.00m x 1.00m`) so adjacent 1x1 tiles show crisp grid boundaries
    rim_t = 0.052
    rim_h = 0.108
    rim_z = 0.571
    objs.extend([
        make_box("CounterRimFront", size=(1.00, rim_t, rim_h), loc=(0, -0.50 + rim_t * 0.5, rim_z), mat=m_border, bevel=0.010),
        make_box("CounterRimBack",  size=(1.00, rim_t, rim_h), loc=(0,  0.50 - rim_t * 0.5, rim_z), mat=m_border, bevel=0.010),
        make_box("CounterRimLeft",  size=(rim_t, 1.00, rim_h), loc=(-0.50 + rim_t * 0.5, 0, rim_z), mat=m_border, bevel=0.010),
        make_box("CounterRimRight", size=(rim_t, 1.00, rim_h), loc=( 0.50 - rim_t * 0.5, 0, rim_z), mat=m_border, bevel=0.010),
    ])

    return objs


def build_counters():
    # Counter A (Warm Honey Oak Top `#c98a4b` with Deep Oak Frame `#9c622b` & Chestnut Body `#6e3b1b`)
    reset_scene()
    objs_a = _build_overcooked_counter_base(0xC98A4B, 0x9C622B, is_metal_top=False)
    export_gltf_or_glb(objs_a, "gltf/kitchencounter_straight_A.gltf", "counter.glb")

    # Counter B (Matching Warm Honey Oak Top)
    reset_scene()
    objs_b = _build_overcooked_counter_base(0xC98A4B, 0x9C622B, is_metal_top=False)
    export_gltf_or_glb(objs_b, "gltf/kitchencounter_straight_B.gltf")

    # Decorated Counter
    reset_scene()
    objs_dec = _build_overcooked_counter_base(0xC98A4B, 0x9C622B, is_metal_top=False)
    export_gltf_or_glb(objs_dec, "gltf/kitchencounter_straight_A_decorated.gltf")


# ==============================================================================
# 2. OVERCOOKED SLATTED WOODEN CRATES WITH TOP CREAM PLAQUE & 3D RELIEF ICON
# ==============================================================================
def _build_overcooked_crate_body():
    """
    Part 4.2 Spec: Slatted golden-oak wooden crate (`#d48c46`) with thick corner posts (`#9e582f`),
    real gaps between horizontal planks (`#5c3118` core), and a flat wooden top lid (`Z = 0.625m`)
    featuring a recessed Cream Plaque (`#fff5d6`) for the 3D ingredient relief icon.
    """
    m_plank = mat_toon_clay("Mat_CratePlankGold", PALETTE["wood_oak"], roughness=0.78)
    m_plank_alt = mat_toon_clay("Mat_CratePlankLight", PALETTE["wood_top_light"], roughness=0.78)
    m_post = mat_toon_clay("Mat_CratePostBrown", PALETTE["wood_amber"], roughness=0.80)
    m_gap = mat_toon_clay("Mat_CrateDarkCore", PALETTE["wood_espresso"], roughness=0.85)
    m_plaque = mat_toon_clay("Mat_CrateCreamPlaque", PALETTE["crate_plaque"], roughness=0.74)

    objs = [
        # Recessed dark interior core so real gaps between slats show deep shadow
        make_box("CrateShadowCore", size=(0.88, 0.88, 0.56), loc=(0, 0, 0.29), mat=m_gap, bevel=0.010),
    ]

    # 4 Chunky Corner Posts (`1.00m x 1.00m` outer bounds, `Z = 0..0.625m`)
    for px in (-0.435, 0.435):
        for py in (-0.435, 0.435):
            objs.append(
                make_box(
                    f"CrateCornerPost_{px}_{py}",
                    size=(0.13, 0.13, COUNTER_Z),
                    loc=(px, py, COUNTER_Z * 0.5),
                    mat=m_post,
                    bevel=0.016,
                )
            )

    # 3 Tiers of Horizontal Wooden Slats on all 4 sides with visible dark gaps
    for tier_idx, sz in enumerate([0.11, 0.31, 0.51]):
        s_mat = m_plank if tier_idx % 2 == 0 else m_plank_alt
        out_r = 0.478 if tier_idx == 1 else 0.468  # subtle barrel bulge on middle slat
        for side in (-1, 1):
            objs.append(make_box(f"CrateSlatFB_{tier_idx}_{side}", size=(0.94, 0.05, 0.145), loc=(0, side * out_r, sz), mat=s_mat, bevel=0.012))
            objs.append(make_box(f"CrateSlatLR_{tier_idx}_{side}", size=(0.05, 0.94, 0.145), loc=(side * out_r, 0, sz), mat=s_mat, bevel=0.012))

    # Top Wooden Lid Frame (`Z = 0.56..0.625m`)
    rim_w = 0.13
    objs.extend([
        make_box("CrateLidFrameF", size=(1.00, rim_w, 0.065), loc=(0, -0.50 + rim_w * 0.5, COUNTER_Z - 0.0325), mat=m_plank, bevel=0.014),
        make_box("CrateLidFrameB", size=(1.00, rim_w, 0.065), loc=(0,  0.50 - rim_w * 0.5, COUNTER_Z - 0.0325), mat=m_plank, bevel=0.014),
        make_box("CrateLidFrameL", size=(rim_w, 1.00, 0.065), loc=(-0.50 + rim_w * 0.5, 0, COUNTER_Z - 0.0325), mat=m_plank, bevel=0.014),
        make_box("CrateLidFrameR", size=(rim_w, 1.00, 0.065), loc=( 0.50 - rim_w * 0.5, 0, COUNTER_Z - 0.0325), mat=m_plank, bevel=0.014),
    ])

    # Recessed Cream Sign Plaque (`#fff5d6`) in the center of the top lid + circular brown frame ring
    objs.append(make_box("CrateTopCreamPlaque", size=(0.76, 0.76, 0.035), loc=(0, 0, COUNTER_Z - 0.018), mat=m_plaque, bevel=0.010))
    objs.append(
        make_torus(
            "CratePlaqueRing",
            major_radius=0.31,
            minor_radius=0.022,
            loc=(0, 0, COUNTER_Z + 0.002),
            scale=(1.0, 1.0, 0.45),
            mat=m_post,
        )
    )
    return objs


def _add_crate_top_3d_icon(objs, kind: str):
    """Sculpts a bold, unmistakable 3D relief icon of the ingredient on the crate's top cream plaque (`Z = 0.63m`)."""
    z0 = COUNTER_Z + 0.012
    if kind == "tomato":
        m_red = mat_toon_clay("Mat_IconTomatoRed", PALETTE["tomato_red"], roughness=0.72)
        m_green = mat_toon_clay("Mat_IconTomatoGreen", PALETTE["stem_green"], roughness=0.76)
        tom = make_uv_sphere("IconTomatoBody", radius=0.22, loc=(0, 0.02, z0 + 0.01), scale=(1.05, 1.0, 0.42), mat=m_red)
        bmesh_organic_lobes(tom, lobes=5, lobe_amp=0.05, dimple_top=0.15, dimple_bottom=0.04)
        objs.append(tom)
        for i in range(5):
            ang = (2.0 * math.pi * i) / 5.0 - math.pi / 2
            objs.append(
                make_box(
                    f"IconTomLeaf_{i}",
                    size=(0.045, 0.13, 0.025),
                    loc=(math.cos(ang) * 0.07, 0.02 + math.sin(ang) * 0.07, z0 + 0.088),
                    rot=(0, 0, ang + math.pi / 2),
                    mat=m_green,
                    bevel=0.006,
                )
            )
    elif kind == "lettuce":
        m_out = mat_toon_clay("Mat_IconLetOut", PALETTE["lettuce_outer"], roughness=0.76)
        m_mid = mat_toon_clay("Mat_IconLetMid", PALETTE["lettuce_mid"], roughness=0.76)
        m_in = mat_toon_clay("Mat_IconLetIn", PALETTE["lettuce_inner"], roughness=0.76)
        objs.append(make_uv_sphere("IconLettuceOuter", radius=0.23, loc=(0, 0, z0 + 0.01), scale=(1.05, 1.0, 0.38), mat=m_out))
        for i in range(6):
            ang = (2.0 * math.pi * i) / 6.0
            objs.append(
                make_uv_sphere(
                    f"IconLettuceLeaf_{i}",
                    radius=0.11,
                    loc=(math.cos(ang) * 0.11, math.sin(ang) * 0.11, z0 + 0.045),
                    scale=(1.2, 0.85, 0.45),
                    rot=(0, 0, ang),
                    mat=m_mid,
                )
            )
        objs.append(make_uv_sphere("IconLettuceHeart", radius=0.12, loc=(0, 0, z0 + 0.065), scale=(1.0, 1.0, 0.45), mat=m_in))
    elif kind == "steak":
        m_meat = mat_toon_clay("Mat_IconSteakMeat", PALETTE["meat_raw"], roughness=0.74)
        m_fat = mat_toon_clay("Mat_IconSteakFat", PALETTE["meat_fat"], roughness=0.76)
        m_bone = mat_toon_clay("Mat_IconSteakBone", PALETTE["meat_bone"], roughness=0.72)
        objs.append(make_box("IconSteakOuterFat", size=(0.44, 0.32, 0.055), loc=(0, 0, z0 + 0.022), rot=(0, 0, 0.25), mat=m_fat, bevel=0.020, bulge=0.14))
        objs.append(make_box("IconSteakInnerMeat", size=(0.37, 0.26, 0.064), loc=(0, 0, z0 + 0.028), rot=(0, 0, 0.25), mat=m_meat, bevel=0.016, bulge=0.12))
        objs.append(make_cylinder("IconSteakRoundBone", radius=0.052, depth=0.072, loc=(0.07, -0.02, z0 + 0.032), mat=m_bone, bevel=0.008))
        objs.append(make_box("IconSteakMarble1", size=(0.18, 0.024, 0.068), loc=(-0.06, 0.03, z0 + 0.030), rot=(0, 0, -0.35), mat=m_fat, bevel=0.005))
    elif kind == "bun":
        m_bun = mat_toon_clay("Mat_IconBunGold", PALETTE["bun_golden"], roughness=0.76)
        m_crumb = mat_toon_clay("Mat_IconBunCrumb", PALETTE["bun_crumb"], roughness=0.80)
        m_seed = mat_toon_clay("Mat_IconBunSeed", PALETTE["sesame_seed"], roughness=0.74)
        objs.append(make_cylinder("IconBunRim", radius=0.22, depth=0.045, loc=(0, 0, z0 + 0.02), mat=m_crumb, bevel=0.012))
        objs.append(make_uv_sphere("IconBunDome", radius=0.205, loc=(0, 0, z0 + 0.035), scale=(1.0, 1.0, 0.46), mat=m_bun))
        for i in range(6):
            ang = (2.0 * math.pi * i) / 6.0
            objs.append(
                make_uv_sphere(
                    f"IconBunSeed_{i}",
                    radius=0.022,
                    loc=(math.cos(ang) * 0.10, math.sin(ang) * 0.10, z0 + 0.115),
                    scale=(1.4, 0.75, 0.45),
                    rot=(0, 0, ang),
                    mat=m_seed,
                )
            )
    elif kind == "potato":
        m_pot = mat_toon_clay("Mat_IconPotatoTan", PALETTE["potato_tan"], roughness=0.80)
        m_eye = mat_toon_clay("Mat_IconPotatoEye", PALETTE["potato_eye"], roughness=0.82)
        objs.append(make_uv_sphere("IconPotatoBody", radius=0.19, loc=(0, 0, z0 + 0.02), scale=(1.28, 0.88, 0.45), rot=(0, 0, 0.3), mat=m_pot))
        for i, (ex, ey) in enumerate([(-0.08, 0.03), (0.07, -0.04), (0.02, 0.06)]):
            objs.append(make_uv_sphere(f"IconPotatoEye_{i}", radius=0.022, loc=(ex, ey, z0 + 0.095), scale=(1.2, 0.9, 0.4), mat=m_eye))
    elif kind == "onion":
        m_on = mat_toon_clay("Mat_IconOnionGold", PALETTE["onion_gold"], roughness=0.76)
        m_gr = mat_toon_clay("Mat_IconOnionGreen", PALETTE["stem_green"], roughness=0.76)
        objs.append(make_uv_sphere("IconOnionBulb", radius=0.20, loc=(0, 0.03, z0 + 0.02), scale=(1.05, 1.0, 0.44), mat=m_on))
        objs.append(make_box("IconOnionSprout", size=(0.055, 0.14, 0.045), loc=(0, -0.17, z0 + 0.035), mat=m_gr, bevel=0.010))
    elif kind == "carrot":
        m_car = mat_toon_clay("Mat_IconCarrotOrange", PALETTE["carrot_orange"], roughness=0.76)
        m_gr = mat_toon_clay("Mat_IconCarrotGreen", PALETTE["stem_green"], roughness=0.76)
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.11, radius2=0.025, depth=0.40, location=(0.03, 0.03, z0 + 0.045), rotation=(math.radians(90), 0, math.radians(-45)))
        c_cone = bpy.context.active_object
        c_cone.name = "IconCarrotCone"
        c_cone.scale = (1.0, 0.55, 1.0)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        add_bevel(c_cone, width=0.008, segments=3)
        assign_material(c_cone, m_car)
        objs.append(c_cone)
        objs.append(make_box("IconCarrotLeaf1", size=(0.05, 0.13, 0.035), loc=(-0.13, -0.13, z0 + 0.045), rot=(0, 0, math.radians(45)), mat=m_gr, bevel=0.008))
    elif kind == "cheese":
        m_ch = mat_toon_clay("Mat_IconCheeseYellow", PALETTE["cheese_yellow"], roughness=0.74)
        m_rind = mat_toon_clay("Mat_IconCheeseRind", PALETTE["cheese_rind"], roughness=0.78)
        objs.append(make_box("IconCheeseWedge", size=(0.38, 0.30, 0.065), loc=(0, 0, z0 + 0.028), rot=(0, 0, 0.2), mat=m_ch, bevel=0.014, taper_top=-0.15))
        for i, (hx, hy) in enumerate([(-0.08, 0.04), (0.07, -0.03), (-0.02, -0.06)]):
            objs.append(make_cylinder(f"IconCheeseHole_{i}", radius=0.038, depth=0.072, loc=(hx, hy, z0 + 0.032), mat=m_rind, bevel=0.005))
    elif kind == "mushroom":
        m_cap = mat_toon_clay("Mat_IconMushCap", PALETTE["mushroom_cap"], roughness=0.76)
        m_stem = mat_toon_clay("Mat_IconMushStem", PALETTE["mushroom_stem"], roughness=0.78)
        objs.append(make_box("IconMushStem", size=(0.12, 0.16, 0.055), loc=(0, 0.09, z0 + 0.024), mat=m_stem, bevel=0.014, bulge=0.14))
        objs.append(make_uv_sphere("IconMushCap", radius=0.19, loc=(0, -0.04, z0 + 0.028), scale=(1.15, 0.88, 0.42), mat=m_cap))
    elif kind == "dough":
        m_dough = mat_toon_clay("Mat_IconDoughBall", PALETTE["dough_cream"], roughness=0.78)
        m_pin = mat_toon_clay("Mat_IconRollingPin", PALETTE["wood_oak"], roughness=0.76)
        objs.append(make_uv_sphere("IconDoughMound", radius=0.20, loc=(0, 0, z0 + 0.022), scale=(1.12, 0.96, 0.42), mat=m_dough))
        objs.append(make_cylinder("IconRollingPin", radius=0.032, depth=0.38, loc=(0.04, -0.08, z0 + 0.052), rot=(0, math.radians(90), math.radians(28)), mat=m_pin, bevel=0.006))


def build_all_crates():
    # 1. Overcooked Trash Bin (`gltf/crate.gltf` & `trashcan.glb`)
    reset_scene()
    m_bin = mat_toon_clay("Mat_TrashBinBody", PALETTE["trash_green"], roughness=0.78)
    m_rim = mat_toon_clay("Mat_TrashBinRim", PALETTE["trash_rim"], roughness=0.74)
    m_dark = mat_toon_clay("Mat_TrashBinHole", 0x111317, roughness=0.90)
    m_bag = mat_toon_clay("Mat_TrashBagFold", 0x22262B, roughness=0.65)

    # Outer tapered bin walls + deep dark hollow interior cavity
    objs_trash = [
        make_box("TrashBaseFloor", size=(0.74, 0.74, 0.08), loc=(0, 0, 0.04), mat=m_dark, bevel=0.012),
    ]
    wall_t = 0.09
    for side in (-1, 1):
        objs_trash.append(make_box(f"TrashWallFB_{side}", size=(0.82, wall_t, 0.56), loc=(0, side * (0.41 - wall_t * 0.5), 0.28), mat=m_bin, bevel=0.016, bulge=0.05))
        objs_trash.append(make_box(f"TrashWallLR_{side}", size=(wall_t, 0.82, 0.56), loc=(side * (0.41 - wall_t * 0.5), 0, 0.28), mat=m_bin, bevel=0.016, bulge=0.05))
        # Thick contrasting top lip (`#a3b18a`)
        objs_trash.append(make_box(f"TrashRimFB_{side}", size=(0.88, 0.11, 0.065), loc=(0, side * 0.39, 0.58), mat=m_rim, bevel=0.014))
        objs_trash.append(make_box(f"TrashRimLR_{side}", size=(0.11, 0.88, 0.065), loc=(side * 0.39, 0, 0.58), mat=m_rim, bevel=0.014))

    # Ruffled dark plastic liner bag folds around inner rim
    for i in range(8):
        ang = (2.0 * math.pi * i) / 8.0
        objs_trash.append(
            make_uv_sphere(
                f"TrashBagLobe_{i}",
                radius=0.065,
                loc=(math.cos(ang) * 0.31, math.sin(ang) * 0.31, 0.55),
                scale=(1.2, 0.85, 0.55),
                rot=(0, 0, ang),
                mat=m_bag,
            )
        )
    export_gltf_or_glb(objs_trash, "gltf/crate.gltf", "trashcan.glb")

    # 2. All 10 Ingredient Crates with Slatted Golden-Oak Body, Cream Plaque & Bold 3D Relief Icon
    crate_defs = [
        ("gltf/crate_tomatoes.gltf",  "tomato"),
        ("gltf/crate_lettuce.gltf",   "lettuce"),
        ("gltf/crate_steak.gltf",     "steak"),
        ("gltf/crate_buns.gltf",      "bun"),
        ("gltf/crate_potatoes.gltf",  "potato"),
        ("gltf/crate_onions.gltf",    "onion"),
        ("gltf/crate_carrots.gltf",   "carrot"),
        ("gltf/crate_cheese.gltf",    "cheese"),
        ("gltf/crate_mushrooms.gltf", "mushroom"),
        ("gltf/crate_dough.gltf",     "dough"),
    ]
    for rel_path, kind in crate_defs:
        reset_scene()
        objs = _build_overcooked_crate_body()
        _add_crate_top_3d_icon(objs, kind)
        export_gltf_or_glb(objs, rel_path)


# ==============================================================================
# 3. CUTTING BOARD WITH CHUNKY 1.5X CHEF CLEAVER (`gltf/cuttingboard.gltf`)
# ==============================================================================
def build_cutting_board_and_dishracks():
    reset_scene()
    m_board = mat_toon_clay("Mat_BoardWheatCream", 0xFFF3D1, roughness=0.74)
    m_border = mat_toon_clay("Mat_BoardWalnutRim", 0x6B3410, roughness=0.78)
    m_groove = mat_toon_clay("Mat_BoardGroove", 0x8C4A1C, roughness=0.80)
    m_blade = mat_toon_metal("Mat_BoardCleaverBlade", 0xEEF4FA, roughness=0.26, metallic=0.42)
    m_spine = mat_toon_metal("Mat_BoardCleaverSpine", 0x64748B, roughness=0.34, metallic=0.38)
    m_handle = mat_toon_clay("Mat_BoardCleaverHandle", 0xC9181E, roughness=0.74)
    m_rivet = mat_toon_clay("Mat_BoardCleaverRivet", 0xFFFFFF, roughness=0.68)

    objs = [
        # Contrasting dark walnut outer base frame (`0.82m x 0.64m x 0.056m`) so the cutting board pops off the counter!
        make_box("CuttingBoardWalnutFrame", size=(0.82, 0.64, 0.056), loc=(0, 0, 0.028), mat=m_border, bevel=0.018),
        # Thick rounded wheat-cream cutting surface (`0.74m x 0.56m x 0.072m`)
        make_box("CuttingBoardSlab", size=(0.74, 0.56, 0.072), loc=(0, 0, 0.038), mat=m_board, bevel=0.016),
    ]
    # Perimeter juice groove trenches
    for side in (-1, 1):
        objs.append(make_box(f"BoardGrooveX_{side}", size=(0.56, 0.018, 0.010), loc=(-0.06, side * 0.22, 0.073), mat=m_groove, bevel=0.002))
        objs.append(make_box(f"BoardGrooveY_{side}", size=(0.018, 0.44, 0.010), loc=(-0.06 + side * 0.27, 0, 0.073), mat=m_groove, bevel=0.002))

    # Chunky Overcooked Chef Cleaver enlarged by 1.5x (`0.22m x 0.36m`) on the right side (`+X`) of the board!
    objs.append(make_box("BoardCleaverBlade", size=(0.22, 0.35, 0.024), loc=(0.22, -0.05, 0.088), rot=(0, 0, math.radians(-12)), mat=m_blade, bevel=0.006))
    objs.append(make_box("BoardCleaverSpine", size=(0.036, 0.35, 0.028), loc=(0.30, -0.035, 0.091), rot=(0, 0, math.radians(-12)), mat=m_spine, bevel=0.005))
    objs.append(make_box("BoardCleaverHandle", size=(0.082, 0.23, 0.048), loc=(0.265, 0.21, 0.096), rot=(0, 0, math.radians(-12)), mat=m_handle, bevel=0.014, bulge=0.16))
    objs.append(make_cylinder("BoardCleaverRivet1", radius=0.018, depth=0.054, loc=(0.256, 0.165, 0.096), mat=m_rivet, bevel=0.004))
    objs.append(make_cylinder("BoardCleaverRivet2", radius=0.018, depth=0.054, loc=(0.272, 0.245, 0.096), mat=m_rivet, bevel=0.004))

    export_gltf_or_glb(objs, "gltf/cuttingboard.gltf", "cutting-board.glb")

    # Dishracks (`gltf/dishrack.gltf` & `gltf/dishrack_plates.gltf`)
    m_tray = mat_toon_metal("Mat_DishrackInox", PALETTE["steel_sink"], roughness=0.34, metallic=0.35)
    m_wire = mat_toon_metal("Mat_DishrackWire", PALETTE["steel_bright"], roughness=0.30, metallic=0.38)
    m_plate = mat_glossy("Mat_DishrackPlatePorcelain", PALETTE["porcelain_white"], roughness=0.22, clearcoat=0.30)
    m_rim = mat_toon_clay("Mat_DishrackPlateRim", PALETTE["porcelain_rim"], roughness=0.70)

    for has_plates, out_name in [(False, "gltf/dishrack.gltf"), (True, "gltf/dishrack_plates.gltf")]:
        reset_scene()
        rack_objs = [
            make_box("RackInoxBase", size=(0.66, 0.56, 0.042), loc=(0, 0, 0.021), mat=m_tray, bevel=0.012),
            make_box("RackRailF", size=(0.62, 0.03, 0.10), loc=(0, -0.24, 0.075), mat=m_wire, bevel=0.008),
            make_box("RackRailB", size=(0.62, 0.03, 0.10), loc=(0,  0.24, 0.075), mat=m_wire, bevel=0.008),
        ]
        for rx in (-0.22, -0.11, 0.0, 0.11, 0.22):
            pts = [(rx, -0.23, 0.04), (rx, -0.14, 0.15), (rx, 0.14, 0.15), (rx, 0.23, 0.04)]
            rack_objs.append(make_curve_tube(f"RackSlotWire_{rx}", pts, bevel_radius=0.010, mat=m_wire))

        if has_plates:
            for i, px in enumerate((-0.165, -0.055, 0.055, 0.165)):
                rack_objs.append(
                    make_cylinder(
                        f"RackCleanPlate_{i}",
                        radius=0.19,
                        depth=0.032,
                        loc=(px, 0, 0.20),
                        rot=(0, math.radians(78), 0),
                        mat=m_plate,
                        bevel=0.008,
                    )
                )
                rack_objs.append(
                    make_torus(
                        f"RackCleanPlateRim_{i}",
                        major_radius=0.175,
                        minor_radius=0.008,
                        loc=(px, 0, 0.20),
                        rot=(0, math.radians(78), 0),
                        mat=m_rim,
                    )
                )
        export_gltf_or_glb(rack_objs, out_name)


# ==============================================================================
# 4. OVERCOOKED GAS STOVE (`stove_single.gltf`) & GLOWING OVEN (`oven.gltf`)
# ==============================================================================
def build_stove_and_oven():
    # 1. Stove (`gltf/stove_single.gltf`) — Matches `media_1792040383870_712756a4.png`
    reset_scene()
    m_red = mat_toon_clay("Mat_StoveRedBody", PALETTE["appliance_red"], roughness=0.72)
    m_inox = mat_toon_metal("Mat_StoveInox", PALETTE["steel_sink"], roughness=0.32, metallic=0.35)
    m_iron = mat_toon_metal("Mat_StoveGrateBlack", PALETTE["cast_iron"], roughness=0.42, metallic=0.25)
    m_flame = mat_stylized("Mat_StoveFlameGlow", PALETTE["ember_orange"], roughness=0.40, emission_hex=PALETTE["ember_orange"], emission_strength=1.5)
    m_dark = mat_toon_clay("Mat_StoveDarkWell", 0x181A1F, roughness=0.85)

    objs_stove = [
        make_box("StovePlinth", size=(0.90, 0.90, 0.06), loc=(0, 0, 0.03), mat=m_iron, bevel=0.010),
        make_box("StoveRedBody", size=(0.96, 0.96, 0.48), loc=(0, 0, 0.29), mat=m_red, bevel=0.022, bulge=0.03),
        make_box("StoveInoxTop", size=(1.00, 1.00, 0.095), loc=(0, 0, 0.5775), mat=m_inox, bevel=0.020),
        make_cylinder("StoveBurnerWell", radius=0.37, depth=0.02, loc=(0, 0, 0.618), mat=m_dark, bevel=0.005),
        # Glowing gas burner ring in center
        make_torus("StoveGasFlameRing", major_radius=0.16, minor_radius=0.022, loc=(0, 0, 0.622), mat=m_flame),
        # Matte-black circular burner grate ring + 6 radial cross-prongs (`media_1792040383870_712756a4.png`)
        make_torus("StoveCastIronRing", major_radius=0.33, minor_radius=0.026, loc=(0, 0, 0.630), scale=(1.0, 1.0, 0.65), mat=m_iron),
        make_torus("StoveCastIronInner", major_radius=0.12, minor_radius=0.018, loc=(0, 0, 0.630), scale=(1.0, 1.0, 0.65), mat=m_iron),
    ]
    for i in range(6):
        ang = (math.pi * i) / 3.0 + math.radians(15)
        objs_stove.append(
            make_box(
                f"StoveGrateProng_{i}",
                size=(0.26, 0.038, 0.024),
                loc=(math.cos(ang) * 0.22, math.sin(ang) * 0.22, 0.632),
                rot=(0, 0, ang),
                mat=m_iron,
                bevel=0.006,
            )
        )
    # Front control knobs (`-Y`)
    for kx in (-0.26, 0.26):
        objs_stove.append(make_cylinder(f"StoveDial_{kx}", radius=0.042, depth=0.035, loc=(kx, -0.49, 0.42), rot=(math.radians(90), 0, 0), mat=m_iron, bevel=0.008))
    objs_stove.append(make_box("StoveFrontRecess", size=(0.64, 0.03, 0.20), loc=(0, -0.48, 0.22), mat=m_dark, bevel=0.008))

    export_gltf_or_glb(objs_stove, "gltf/stove_single.gltf", "kitchenStove.glb")

    # 2. Oven (`gltf/oven.gltf`) — Hollow baking cavity at Z=0.18m (Y=12.0 in Three.js) + Honey-Oak top + Oven_Window glow
    reset_scene()
    m_oven_body = mat_toon_metal("Mat_OvenInoxBody", PALETTE["steel_sink"], roughness=0.40, metallic=0.25)
    m_oven_top = mat_toon_clay("Mat_OvenWarmTop", 0xC98A4B, roughness=0.80)
    m_oven_border = mat_toon_clay("Mat_OvenWarmBorder", 0x9C622B, roughness=0.80)
    m_oven_glass = mat_stylized("Mat_Oven_Window", 0xFF7700, roughness=0.30, emission_hex=0xFF7700, emission_strength=1.35)
    m_oven_handle = mat_toon_metal("Mat_OvenSteelHandle", PALETTE["steel_bright"], roughness=0.40, metallic=0.25)
    m_oven_dial = mat_toon_clay("Mat_OvenRedDial", PALETTE["appliance_red"], roughness=0.80)

    oven_body = make_box("OvenInoxBody", size=(0.94, 0.94, 0.48), loc=(0, 0, 0.29), mat=m_oven_body, bevel=0.020)
    # Carve deep front baking chamber (Z = 0.14..0.38m -> Y = 9..24 in Three.js) so Pizza at Y = 12.0 sits visibly inside the oven!
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.18, 0.25))
    oven_cutter = bpy.context.active_object
    oven_cutter.scale = (0.68, 0.68, 0.24)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_boolean_cut(oven_body, oven_cutter, 'DIFFERENCE')

    objs_oven = [
        make_box("OvenPlinth", size=(0.90, 0.90, 0.06), loc=(0, 0, 0.03), mat=m_oven_body, bevel=0.010),
        oven_body,
        # Warm Honey-Oak framed top worktop at `Z = 0.625m`
        make_box("OvenWorktopSlab", size=(0.96, 0.96, 0.095), loc=(0, 0, 0.5775), mat=m_oven_top, bevel=0.018),
        make_box("OvenRimFront", size=(1.00, 0.05, 0.10), loc=(0, -0.475, 0.575), mat=m_oven_border, bevel=0.010),
        make_box("OvenRimBack",  size=(1.00, 0.05, 0.10), loc=(0,  0.475, 0.575), mat=m_oven_border, bevel=0.010),
        make_box("OvenRimLeft",  size=(0.05, 1.00, 0.10), loc=(-0.475, 0, 0.575), mat=m_oven_border, bevel=0.010),
        make_box("OvenRimRight", size=(0.05, 1.00, 0.10), loc=( 0.475, 0, 0.575), mat=m_oven_border, bevel=0.010),
        # Glowing amber interior baking deck (`Z = 0.14m`) & back wall inside the oven cavity
        make_box("OvenChamberGlowFloor", size=(0.64, 0.60, 0.02), loc=(0, -0.15, 0.145), mat=m_oven_glass, bevel=0.004),
        make_box("OvenChamberGlowBack", size=(0.64, 0.02, 0.21), loc=(0, 0.13, 0.25), mat=m_oven_glass, bevel=0.004),
        # Lower open oven door lip & tubular stainless handle (`-Y`)
        make_box("OvenDoorLowerLip", size=(0.76, 0.04, 0.05), loc=(0, -0.475, 0.125), mat=m_oven_handle, bevel=0.008),
        make_cylinder("OvenDoorBar", radius=0.018, depth=0.64, loc=(0, -0.52, 0.13), rot=(0, math.radians(90), 0), mat=m_oven_handle, bevel=0.004),
    ]
    for kx in (-0.28, -0.10, 0.10, 0.28):
        objs_oven.append(make_cylinder(f"OvenControlKnob_{kx}", radius=0.034, depth=0.032, loc=(kx, -0.485, 0.45), rot=(math.radians(90), 0, 0), mat=m_oven_dial, bevel=0.006))

    export_gltf_or_glb(objs_oven, "gltf/oven.gltf")


# ==============================================================================
# 5. OVERCOOKED KITCHEN SINK (`gltf/kitchencounter_sink.gltf`) & DELIVERY CONVEYOR
# ==============================================================================
def build_sink_and_delivery():
    # 1. Sink (`gltf/kitchencounter_sink.gltf`) — Left deep water basin + Right ribbed drainboard + Gooseneck Faucet
    reset_scene()
    m_inox = mat_toon_metal("Mat_SinkInox", PALETTE["steel_sink"], roughness=0.32, metallic=0.35)
    m_inox_dark = mat_toon_metal("Mat_SinkBasinInox", PALETTE["steel_dark"], roughness=0.35, metallic=0.35)
    m_cabinet = mat_toon_clay("Mat_SinkCabinet", PALETTE["wood_amber"], roughness=0.78)
    m_plinth = mat_toon_clay("Mat_SinkPlinth", PALETTE["wood_espresso"], roughness=0.82)
    m_water = mat_glossy("Mat_SinkWater", PALETTE["water_blue"], roughness=0.18, clearcoat=0.45)
    m_foam = mat_toon_clay("Mat_SinkFoam", PALETTE["porcelain_white"], roughness=0.70)
    m_chrome = mat_toon_metal("Mat_SinkFaucetChrome", PALETTE["chrome"], roughness=0.25, metallic=0.45)

    # Start with full 1.00m x 1.00m x 0.625m counter block and Boolean-carve the left basin (`X < 0`)
    top_deck = make_box("SinkInoxDeck", size=(1.00, 1.00, 0.12), loc=(0, 0, 0.565), mat=m_inox, bevel=0.020)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.21, -0.03, 0.585))
    basin_cutter = bpy.context.active_object
    basin_cutter.scale = (0.44, 0.72, 0.14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_boolean_cut(top_deck, basin_cutter, 'DIFFERENCE')

    objs_sink = [
        make_box("SinkPlinth", size=(0.88, 0.88, 0.07), loc=(0, 0, 0.035), mat=m_plinth, bevel=0.010),
        make_box("SinkCabinet", size=(0.92, 0.92, 0.45), loc=(0, 0, 0.29), mat=m_cabinet, bevel=0.018),
        top_deck,
        # Deep inner basin lining & crystal-blue water on the left side (`X = -0.21`)
        make_box("SinkBasinBottom", size=(0.44, 0.72, 0.025), loc=(-0.21, -0.03, 0.51), mat=m_inox_dark, bevel=0.006),
        make_box("SinkWaterPool", size=(0.42, 0.70, 0.035), loc=(-0.21, -0.03, 0.545), mat=m_water, bevel=0.008),
    ]
    # Soap foam bubbles floating on the water
    for i, (bx, by, br) in enumerate([(-0.26, -0.12, 0.048), (-0.15, 0.08, 0.042), (-0.22, 0.16, 0.036), (-0.14, -0.18, 0.038)]):
        objs_sink.append(make_uv_sphere(f"SinkBubble_{i}", radius=br, loc=(bx, by, 0.568), scale=(1.1, 1.0, 0.55), mat=m_foam))

    # Right half (`X = +0.22`): Ribbed stainless steel drainboard (6 parallel ridges)
    for i in range(6):
        ry = -0.28 + i * 0.11
        objs_sink.append(make_box(f"SinkDrainRib_{i}", size=(0.38, 0.032, 0.018), loc=(0.22, ry, 0.628), mat=m_inox_dark, bevel=0.006))

    # Curved U-Shaped Gooseneck Faucet at back (`Y = 0.38`, max height `0.86m < 1.0m`)
    faucet_pts = [
        (-0.18, 0.38, 0.62),
        (-0.18, 0.38, 0.78),
        (-0.18, 0.25, 0.85),
        (-0.18, 0.10, 0.75),
    ]
    objs_sink.append(make_curve_tube("SinkGooseneckFaucet", faucet_pts, bevel_radius=0.022, mat=m_chrome))
    objs_sink.append(make_cylinder("SinkValveL", radius=0.028, depth=0.045, loc=(-0.32, 0.38, 0.64), mat=m_chrome, bevel=0.006))
    objs_sink.append(make_cylinder("SinkValveR", radius=0.028, depth=0.045, loc=(-0.04, 0.38, 0.64), mat=m_chrome, bevel=0.006))

    export_gltf_or_glb(objs_sink, "gltf/kitchencounter_sink.gltf", "kitchenSink.glb")

    # 2. Delivery Conveyor Station (`gltf/wall_orderwindow_decorated.gltf` & `gltf/wall_order.gltf`)
    # Matches `media_1792040335123_01abbfa0.png` (Conveyor bed + 2 big white directional arrows + red/white bumpers + bell)
    reset_scene()
    m_conv_body = mat_toon_metal("Mat_DeliveryInox", PALETTE["steel_sink"], roughness=0.34, metallic=0.35)
    m_belt = mat_toon_clay("Mat_DeliveryBelt", 0x262B30, roughness=0.82)
    m_arrow = mat_toon_clay("Mat_DeliveryArrowWhite", PALETTE["porcelain_white"], roughness=0.70)
    m_red_s = mat_toon_clay("Mat_DeliveryBumperRed", PALETTE["tablecloth_red"], roughness=0.74)
    m_brass = mat_toon_metal("Mat_DeliveryServiceBell", PALETTE["brass_gold"], roughness=0.28, metallic=0.40)

    objs_deliv = [
        make_box("DeliveryBaseBody", size=(0.96, 0.96, 0.54), loc=(0, 0, 0.27), mat=m_conv_body, bevel=0.020),
        make_box("DeliveryTopFrame", size=(1.00, 1.00, 0.085), loc=(0, 0, 0.5825), mat=m_conv_body, bevel=0.018),
        make_box("DeliveryConveyorBed", size=(0.74, 0.84, 0.025), loc=(0, 0, 0.618), mat=m_belt, bevel=0.008),
    ]
    # Red & White Striped Side Bumpers on Left & Right edges
    for side_x in (-0.43, 0.43):
        for seg in range(4):
            sy = -0.36 + seg * 0.24
            objs_deliv.append(
                make_box(
                    f"DeliveryStripe_{side_x}_{seg}",
                    size=(0.11, 0.22, 0.032),
                    loc=(side_x, sy, 0.625),
                    mat=m_red_s if seg % 2 == 0 else m_arrow,
                    bevel=0.006,
                )
            )
    # 2 Large White Directional Arrow Triangles on the conveyor belt (`media_1792040335123_01abbfa0.png`)
    for ay in (-0.16, 0.16):
        bpy.ops.mesh.primitive_cone_add(vertices=3, radius1=0.18, radius2=0.0, depth=0.022, location=(0, ay, 0.632), rotation=(0, 0, 0))
        arr = bpy.context.active_object
        arr.name = f"DeliveryArrow_{ay}"
        arr.scale = (1.0, 0.85, 1.0)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        add_bevel(arr, width=0.004, segments=2)
        assign_material(arr, m_arrow)
        objs_deliv.append(arr)

    # Golden Service Bell on corner
    objs_deliv.append(make_uv_sphere("DeliveryBellDome", radius=0.065, loc=(0.36, -0.36, 0.635), scale=(1.0, 1.0, 0.75), mat=m_brass))

    export_gltf_or_glb(objs_deliv, "gltf/wall_orderwindow_decorated.gltf")
    export_gltf_or_glb(objs_deliv, "gltf/wall_order.gltf")


def generate_all():
    print("\n=== [PHẦN 3] Building Overcooked 1x1 Counters, Top-Icon Crates, Sink, Stove, Oven & Delivery ===")
    build_counters()
    build_all_crates()
    build_cutting_board_and_dishracks()
    build_stove_and_oven()
    build_sink_and_delivery()


if __name__ == "__main__":
    generate_all()
