# -*- coding: utf-8 -*-
"""
CHAOS KITCHEN — OVERCOOKED! SOFT MATTE CLAY & BMESH PROCEDURAL ENGINE (`blender_utils.py`)
Implements Parts 2, 4, 5 of the Overcooked Technical Specification:
1. Soft Stylized Matte Clay / Vinyl PBR (`roughness=0.78, metalness=0.0`), Brushed Inox (`roughness=0.32, metalness=0.35`),
   Glossy Porcelain / Broth (`roughness=0.22, clearcoat=0.30`), and Emissive Glow (`emission_strength=1.5`).
2. `bmesh` Vertex/Edge/Face Sculpting: `apply_stylized_bulge`, `bmesh_organic_lobes`, `make_hollow_vessel`,
   `make_curve_tube`, and 3-4 segment Weighted Bevels (`profile=0.5`).
3. Multi-Slot Materials (`polygon.material_index`) on single meshes.
4. Exact Bottom-Center Origin (`cx, cy, min_z -> 0, 0, 0`) and Front facing `-Y` (`+Z` in Three.js).
"""

import os
import math
import bpy
import bmesh
from mathutils import Vector, Euler, Matrix

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUBLIC_MODELS_DIR = os.path.join(PROJECT_ROOT, "apps", "client", "public", "models")
PUBLIC_ASSETS_MODELS_DIR = os.path.join(PROJECT_ROOT, "apps", "client", "public", "assets", "models")
PUBLIC_QUAT_DIR = os.path.join(PROJECT_ROOT, "apps", "client", "public", "assets", "quat")

# ==============================================================================
# 1. OVERCOOKED! OFFICIAL COLOR PALETTE
# ==============================================================================
PALETTE = {
    # Architecture & Warm Woods (Mid-Tone Albedo Cap — zero glare, white plates pop!)
    "wall_cream":        0xE2D2B8,
    "wall_tile_white":   0xDCE2E6,
    "wall_tile_accent":  0xC4CED4,
    "wall_brick":        0xC88A4B,
    "wall_brick_dark":   0x9C622B,
    "wood_top_light":    0xC98A4B,   # Countertop Warm Honey Oak (#c98a4b)
    "wood_top_border":   0x9C622B,   # Countertop Deep Oak Border (#9c622b)
    "wood_light":        0xC98A4B,
    "wood_oak":          0xC47D38,   # Crate golden-oak slats
    "wood_amber":        0x6E3B1B,   # Counter cabinet Chestnut Brown (#6e3b1b)
    "wood_walnut":       0x522910,
    "wood_espresso":     0x3B1C0A,   # Plinth & dark wood accents
    "board_cream":       0xE6D0A8,   # Cutting board warm wheat
    "crate_plaque":      0xEAD2A8,   # Crate top warm biscuit plaque (non-glaring)
    "tile_slate_light":  0xE0C389,   # Warm Overcooked butter-gold floor tile
    "tile_slate_dark":   0xCFA86B,   # Warm Overcooked amber-gold floor tile
    "tile_grout":        0x8C673A,
    # Metals & Appliances
    "steel_bright":      0xCBD5E1,
    "steel_sink":        0x94A8B8,   # Brushed bluish-silver sink & stove inox
    "steel_pot":         0xA4B4C0,   # Stockpot brushed silver
    "steel_mid":         0x8496A8,
    "steel_dark":        0x475569,
    "cast_iron":         0x22262B,   # Matte black burner grate & pan exterior
    "nonstick_black":    0x262B30,   # Pan inner cooking surface
    "chrome":            0xD8E2EC,
    "brass_gold":        0xD98A16,
    "copper":            0xC86D14,
    "appliance_red":     0xC8432B,   # Overcooked warm red stove body
    "appliance_cream":   0xE6D2A8,
    "trash_green":       0x4A6B53,   # Overcooked olive-green/slate trash bin
    "trash_rim":         0x8F9E77,
    "water_blue":        0x0096E6,
    "water_deep":        0x0277B8,
    "ember_orange":      0xFF3814,
    "ember_yellow":      0xFF7700,
    # Saturated Soft Matte Clay Food Palette
    "tomato_red":        0xE02438,
    "tomato_flesh":      0xF26B83,
    "tomato_gel":        0xC41224,
    "tomato_seed":       0xF2D45C,
    "stem_green":        0x2B9348,
    "lettuce_outer":     0x2B9348,
    "lettuce_mid":       0x4CA97A,
    "lettuce_inner":     0x84C4A0,
    "lettuce_core":      0xD8E8C8,
    "cheese_yellow":     0xF2B705,
    "cheese_rind":       0xD97904,
    "meat_raw":          0xCC1D2A,   # Vibrant raw steak/burger crimson red
    "meat_fat":          0xF2E4D5,
    "meat_bone":         0xF5EFE6,
    "meat_cooked":       0x592512,   # Rich seared dark-brown cooked patty
    "meat_sear":         0x240D04,
    "bun_golden":        0xE0821D,
    "bun_top_crust":     0xC86220,
    "bun_crumb":         0xF0D5A0,
    "dough_cream":       0xEBD9B4,
    "sesame_seed":       0xF2E29E,
    "carrot_orange":     0xEB7500,
    "carrot_core":       0xF2B238,
    "potato_tan":        0xC9905E,
    "potato_skin":       0xB87E4F,
    "potato_inside":     0xEFE0A3,
    "potato_eye":        0x73461F,
    "onion_skin":        0xD4842A,   # Golden-Bronze Onion Skin (#d4842a) matching crate icon!
    "onion_dark":        0x9C5A18,   # Deep Golden-Brown Onion Root/Rib (#9c5a18)
    "onion_gold":        0xD4842A,
    "onion_white":       0xF5EBD6,   # Warm Cream Chopped Onion Inner Rings (#f5ebd6)
    "mushroom_cap":      0xC89666,
    "mushroom_stem":     0xEADBC0,
    "mushroom_gill":     0x63443A,
    "mustard_yellow":    0xF2B007,
    "ketchup_red":       0xCC0828,
    "porcelain_white":   0xF2EFE9,
    "porcelain_rim":     0x5898E6,
    "dirty_sauce":       0x9E2A2B,
    "dirty_grease":      0xB5830E,
    "burlap_tan":        0xA98467,
    "tablecloth_red":    0xD93440,
    "tablecloth_cream":  0xEFE6D8,
    "foliage_green":     0x2D6A4F,
    "terracotta":        0xE07A5F,
    # Overcooked Character Portrait Palette (`media_1792040394445_cc347219.png`)
    "skin_peach":        0xFFCAA6,
    "skin_nose":         0xA85844,
    "skin_blush":        0xF28482,
    "chef_white":        0xF2F6FA,
    "chef_hat_white":    0xFFFFFF,
    "chef_shirt_red":    0xD93829,
    "chef_scarf_red":    0xC9181E,
    "chef_hair_brown":   0x3B2010,
    "chef_face_dark":    0x14141F,
    "chef_mouth_dark":   0x2B1111,
    "chef_tongue_pink":  0xC86458,
    "chef_pants_navy":   0x1D3557,
}


def srgb_to_linear(c: float) -> float:
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgba(hex_val: int, alpha: float = 1.0):
    r = srgb_to_linear(((hex_val >> 16) & 0xFF) / 255.0)
    g = srgb_to_linear(((hex_val >> 8) & 0xFF) / 255.0)
    b = srgb_to_linear((hex_val & 0xFF) / 255.0)
    return (r, g, b, alpha)


def setup_toon_scene():
    scene = bpy.context.scene
    try:
        scene.view_settings.view_transform = 'Standard'
    except Exception:
        pass
    try:
        scene.view_settings.look = 'Medium High Contrast'
    except Exception:
        pass


def reset_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablock in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
        bpy.data.actions,
    ):
        for item in list(datablock):
            datablock.remove(item)
    setup_toon_scene()


# ==============================================================================
# 2. OVERCOOKED SOFT MATTE CLAY / INOX / GLOSSY PBR MATERIAL SYSTEM
# ==============================================================================
def mat_toon_clay(name: str, hex_color: int, roughness: float = 0.80, emission_strength: float = 0.0):
    """
    Part 1 Spec: Soft Stylized Matte Clay / Vinyl material (`roughness=0.80, metalness=0.05`).
    Zero self-emission washout so shadows, bevels, and crevices render with rich 3D depth.
    """
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new(type="ShaderNodeBsdfPrincipled")

    rgba = hex_to_rgba(hex_color, 1.0)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = max(0.75, roughness)
    bsdf.inputs["Metallic"].default_value = 0.05
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.18
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.0
    if emission_strength > 0.0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = rgba
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    else:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (0.0, 0.0, 0.0, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 0.0
    return mat


def mat_toon_metal(name: str, hex_color: int, roughness: float = 0.40, metallic: float = 0.25):
    """Part 1 Spec: Brushed Inox / Stainless Steel / Cast Iron (`roughness=0.40, metalness=0.25`)."""
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new(type="ShaderNodeBsdfPrincipled")

    rgba = hex_to_rgba(hex_color, 1.0)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.35
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (0.0, 0.0, 0.0, 1.0)
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = 0.0
    return mat


def mat_glossy(name: str, hex_color: int, roughness: float = 0.22, clearcoat: float = 0.30):
    """Part 1 Spec: White Porcelain Plates, Soup Broth, Tomato Sauce (`roughness=0.22, clearcoat=0.30`)."""
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new(type="ShaderNodeBsdfPrincipled")

    rgba = hex_to_rgba(hex_color, 1.0)
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = clearcoat
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.50
    return mat


def mat_stylized(
    name: str,
    hex_color: int,
    roughness: float = 0.78,
    metallic: float = 0.0,
    emission_hex: int = None,
    emission_strength: float = 0.0,
):
    if metallic >= 0.15:
        return mat_toon_metal(name, hex_color, roughness=roughness, metallic=metallic)
    mat = mat_toon_clay(name, hex_color, roughness=roughness, emission_strength=emission_strength)
    if emission_hex is not None and emission_strength > 0.0:
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = hex_to_rgba(emission_hex, 1.0)
        if bsdf and "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def mat_checkered_cloth(
    name: str = "TableclothCheckered",
    hex_a: int = 0xE63946,
    hex_b: int = 0xFFF8F0,
    scale: float = 10.0,
):
    return mat_toon_clay(name, hex_a, roughness=0.80)


def assign_material(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def apply_smooth_shading(obj, auto_smooth_deg: float = 52.0):
    if obj.type != 'MESH' or not obj.data:
        return
    for poly in obj.data.polygons:
        poly.use_smooth = True


# ==============================================================================
# 3. BMESH GEOMETRIC DEFORMERS (`apply_stylized_bulge`, `bmesh_organic_lobes`, etc.)
# ==============================================================================
def add_bevel(obj, width: float = 0.025, segments: int = 3):
    mod = obj.modifiers.new(name="ChunkyBevel", type='BEVEL')
    mod.width = width
    mod.segments = max(3, segments)
    mod.profile = 0.5
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(30.0)
    apply_smooth_shading(obj)
    return mod


def add_subsurf(obj, levels: int = 2):
    mod = obj.modifiers.new(name="Subsurf", type='SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    apply_smooth_shading(obj)
    return mod


def add_boolean_cut(target_obj, cutter_obj, operation: str = 'DIFFERENCE'):
    bpy.context.view_layer.objects.active = target_obj
    mod = target_obj.modifiers.new(name="BoolCut", type='BOOLEAN')
    mod.operation = operation
    mod.object = cutter_obj
    try:
        mod.solver = 'EXACT'
    except Exception:
        pass
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except Exception:
        pass
    bpy.data.objects.remove(cutter_obj, do_unlink=True)
    apply_smooth_shading(target_obj)


def apply_stylized_bulge(obj, factor: float = 0.12, taper_top: float = 0.0):
    """Part 2 Spec: Applies cartoon barrel bulge & top flare/taper via `bmesh`."""
    return bmesh_bulge_and_taper(obj, bulge=factor, taper_top=taper_top)


def bmesh_bulge_and_taper(obj, bulge: float = 0.10, taper_top: float = 0.0, taper_bottom: float = 0.0):
    if obj.type != 'MESH' or not obj.data:
        return obj
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    if not bm.verts:
        bm.free()
        return obj

    zs = [v.co.z for v in bm.verts]
    min_z, max_z = min(zs), max(zs)
    span_z = max(max_z - min_z, 1e-4)

    for v in bm.verts:
        t = (v.co.z - min_z) / span_z  # 0.0 at bottom -> 1.0 at top
        belly = math.sin(t * math.pi) * bulge
        taper = taper_bottom * (1.0 - t) + taper_top * t
        factor = max(0.15, 1.0 + belly + taper)
        v.co.x *= factor
        v.co.y *= factor

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


def bmesh_organic_lobes(
    obj,
    lobes: int = 6,
    lobe_amp: float = 0.06,
    dimple_top: float = 0.18,
    dimple_bottom: float = 0.08,
    asymmetry: float = 0.0,
):
    if obj.type != 'MESH' or not obj.data:
        return obj
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    if not bm.verts:
        bm.free()
        return obj

    zs = [v.co.z for v in bm.verts]
    min_z, max_z = min(zs), max(zs)
    span_z = max(max_z - min_z, 1e-4)
    radii = [math.hypot(v.co.x, v.co.y) for v in bm.verts]
    max_r = max(max(radii), 1e-4)

    for v in bm.verts:
        t = (v.co.z - min_z) / span_z
        r = math.hypot(v.co.x, v.co.y)
        nr = r / max_r
        ang = math.atan2(v.co.y, v.co.x)

        wave = 1.0 + math.cos(ang * lobes) * lobe_amp * math.sin(t * math.pi)
        if asymmetry != 0.0:
            wave += math.sin(ang * 2.0 + t * 2.5) * asymmetry * 0.5
        v.co.x *= wave
        v.co.y *= wave

        if t > 0.65 and nr < 0.65:
            crown_Push = ((1.0 - (nr / 0.65) ** 2) * ((t - 0.65) / 0.35))
            v.co.z -= crown_Push * dimple_top * span_z
        elif t < 0.35 and nr < 0.55:
            base_push = ((1.0 - (nr / 0.55) ** 2) * ((0.35 - t) / 0.35))
            v.co.z += base_push * dimple_bottom * span_z

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    return obj


def make_hollow_vessel(
    name: str,
    outer_radius_bottom: float,
    outer_radius_top: float,
    height: float,
    wall_thickness: float = 0.025,
    bottom_thickness: float = 0.020,
    bulge: float = 0.08,
    rim_lip: float = 0.016,
    segments: int = 36,
    loc=(0, 0, 0),
    outer_mat=None,
    inner_mat=None,
    bottom_mat=None,
):
    """
    Part 5 Spec: Builds a 100% genuinely HOLLOW 3D vessel (pot, pan, bowl, deep plate)
    with deep interior cavity (`inner_radius > 0.75 * outer_radius`) so dynamic soup liquid
    at `Y = 12.0` or `Y = 6.5` is completely visible inside the open rim.
    """
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = Vector(loc)

    bm = bmesh.new()
    r_ob = outer_radius_bottom
    r_ot = outer_radius_top
    r_om = ((r_ob + r_ot) * 0.5) * (1.0 + bulge)
    r_it = max(0.04, r_ot - wall_thickness)
    r_im = max(0.04, r_om - wall_thickness)
    r_ib = max(0.04, r_ob - wall_thickness)

    profile = [
        (0.0, 0.0),
        (r_ob * 0.75, 0.0),
        (r_ob, bottom_thickness * 0.35),
        (r_om, height * 0.45),
        (r_ot, height * 0.88),
        (r_ot + rim_lip, height * 0.96),
        (r_ot + rim_lip * 0.45, height),
        (r_it, height),
        (r_it, height * 0.88),
        (r_im, height * 0.45),
        (r_ib, bottom_thickness),
        (0.0, bottom_thickness),
    ]

    rings = []
    for rad, z in profile:
        ring_verts = []
        for s in range(segments):
            ang = (2.0 * math.pi * s) / segments
            ring_verts.append(bm.verts.new((rad * math.cos(ang), rad * math.sin(ang), z)))
        rings.append(ring_verts)

    bm.verts.ensure_lookup_table()
    for r_i in range(len(rings) - 1):
        ring_a = rings[r_i]
        ring_b = rings[r_i + 1]
        for s in range(segments):
            s_next = (s + 1) % segments
            v1, v2, v3, v4 = ring_a[s], ring_a[s_next], ring_b[s_next], ring_b[s]
            try:
                f = bm.faces.new((v1, v2, v3, v4))
                if r_i <= 1:
                    f.material_index = 2 if bottom_mat else 0
                elif r_i >= 7:
                    f.material_index = 1 if inner_mat else 0
                else:
                    f.material_index = 0
            except ValueError:
                pass

    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    if outer_mat:
        obj.data.materials.append(outer_mat)
    if inner_mat:
        obj.data.materials.append(inner_mat)
    elif outer_mat:
        obj.data.materials.append(outer_mat)
    if bottom_mat:
        obj.data.materials.append(bottom_mat)
    elif outer_mat:
        obj.data.materials.append(outer_mat)

    add_bevel(obj, width=0.006, segments=3)
    return obj


def make_curve_tube(name: str, points, bevel_radius: float = 0.02, resolution: int = 12, mat=None, closed: bool = False):
    curve_data = bpy.data.curves.new(name=f"{name}_Curve", type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.resolution_u = resolution
    curve_data.bevel_depth = bevel_radius
    curve_data.bevel_resolution = 6
    curve_data.use_fill_caps = True

    spline = curve_data.splines.new('NURBS')
    spline.points.add(len(points) - 1)
    for i, pt in enumerate(points):
        spline.points[i].co = (pt[0], pt[1], pt[2], 1.0)
    spline.use_endpoint_u = not closed
    spline.use_cyclic_u = closed
    spline.order_u = min(4, len(points))

    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    apply_smooth_shading(obj)
    if mat:
        assign_material(obj, mat)
    return obj


# ==============================================================================
# 4. BMESH-ENHANCED PRIMITIVE BUILDERS
# ==============================================================================
def make_box(
    name: str,
    size=(1, 1, 1),
    loc=(0, 0, 0),
    rot=(0, 0, 0),
    mat=None,
    bevel: float = 0.02,
    segments: int = 2,
    bulge: float = 0.0,
    taper_top: float = 0.0,
):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if abs(bulge) > 1e-4 or abs(taper_top) > 1e-4:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=1, use_grid_fill=True)
        bm.to_mesh(obj.data)
        bm.free()
        bmesh_bulge_and_taper(obj, bulge=bulge, taper_top=taper_top)

    if bevel > 0:
        add_bevel(obj, width=bevel, segments=min(segments, 2))
    else:
        apply_smooth_shading(obj)
    if mat:
        assign_material(obj, mat)
    return obj


def make_cylinder(
    name: str,
    radius: float = 0.5,
    depth: float = 1.0,
    vertices: int = 18,
    loc=(0, 0, 0),
    rot=(0, 0, 0),
    mat=None,
    bevel: float = 0.015,
    bulge: float = 0.0,
    taper_top: float = 0.0,
):
    bpy.ops.mesh.primitive_cylinder_add(vertices=min(vertices, 20), radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name

    if abs(bulge) > 1e-4 or abs(taper_top) > 1e-4:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        side_edges = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > depth * 0.4]
        if side_edges:
            bmesh.ops.subdivide_edges(bm, edges=side_edges, cuts=2)
        bm.to_mesh(obj.data)
        bm.free()
        bmesh_bulge_and_taper(obj, bulge=bulge, taper_top=taper_top)

    if bevel > 0:
        add_bevel(obj, width=bevel, segments=2)
    apply_smooth_shading(obj)
    if mat:
        assign_material(obj, mat)
    return obj


def make_uv_sphere(
    name: str,
    radius: float = 0.5,
    segments: int = 16,
    rings: int = 10,
    loc=(0, 0, 0),
    scale=(1, 1, 1),
    rot=(0, 0, 0),
    mat=None,
):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=min(segments, 18), ring_count=min(rings, 12), radius=radius, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_smooth_shading(obj, 60.0)
    if mat:
        assign_material(obj, mat)
    return obj


def make_torus(
    name: str,
    major_radius: float = 0.4,
    minor_radius: float = 0.1,
    major_seg: int = 20,
    minor_seg: int = 8,
    loc=(0, 0, 0),
    rot=(0, 0, 0),
    scale=(1, 1, 1),
    mat=None,
):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=min(major_seg, 22),
        minor_segments=min(minor_seg, 10),
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_smooth_shading(obj, 60.0)
    if mat:
        assign_material(obj, mat)
    return obj


# ==============================================================================
# 5. ORIGIN NORMALIZATION (`min_z = 0`), SINGLE-MESH JOIN & BINARY GLB EXPORT
# ==============================================================================
def _get_valid_meshes(objs):
    valid = []
    for o in objs:
        if o is None:
            continue
        try:
            if o.name in bpy.data.objects and o.type == 'MESH':
                valid.append(o)
        except ReferenceError:
            continue
    return valid


def finalize_and_align_bottom(objs, custom_pivot_xy=None):
    bpy.ops.object.select_all(action='DESELECT')
    mesh_objs = _get_valid_meshes(objs)
    if not mesh_objs:
        return []

    for o in mesh_objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for mod in list(o.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except Exception:
                pass
        try:
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        except Exception:
            pass
        o.select_set(False)

    # Join all static meshes into a SINGLE multi-material Mesh to eliminate draw-call explosion!
    if len(mesh_objs) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in mesh_objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = mesh_objs[0]
        try:
            bpy.ops.object.join()
            mesh_objs = [bpy.context.view_layer.objects.active]
        except Exception:
            mesh_objs = _get_valid_meshes(objs)

    if isinstance(objs, list):
        objs[:] = mesh_objs

    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    min_z = float('inf')

    for o in mesh_objs:
        for v in o.data.vertices:
            co = o.matrix_world @ v.co
            if co.x < min_x: min_x = co.x
            if co.x > max_x: max_x = co.x
            if co.y < min_y: min_y = co.y
            if co.y > max_y: max_y = co.y
            if co.z < min_z: min_z = co.z

    if min_z == float('inf'):
        return mesh_objs

    cx = custom_pivot_xy[0] if custom_pivot_xy is not None else 0.5 * (min_x + max_x)
    cy = custom_pivot_xy[1] if custom_pivot_xy is not None else 0.5 * (min_y + max_y)
    shift = Vector((-cx, -cy, -min_z))

    for o in mesh_objs:
        o.location += shift
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        try:
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        except Exception:
            pass
        o.select_set(False)
    return mesh_objs


def _export_atomic_glb_to_path(target_path: str, use_selection: bool = True, animations: bool = False):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    base_no_ext = os.path.splitext(target_path)[0]
    stale_bin = base_no_ext + ".bin"
    if os.path.exists(stale_bin):
        try:
            os.remove(stale_bin)
        except Exception:
            pass

    if target_path.lower().endswith(".glb"):
        bpy.ops.export_scene.gltf(
            filepath=target_path,
            export_format='GLB',
            use_selection=use_selection,
            export_yup=True,
            export_apply=not animations,
            export_animations=animations,
        )
    else:
        temp_glb = base_no_ext + "__tmp.glb"
        bpy.ops.export_scene.gltf(
            filepath=temp_glb,
            export_format='GLB',
            use_selection=use_selection,
            export_yup=True,
            export_apply=not animations,
            export_animations=animations,
        )
        if os.path.exists(temp_glb):
            if os.path.exists(target_path):
                os.remove(target_path)
            os.replace(temp_glb, target_path)


def export_gltf_or_glb(objs, rel_path: str, also_assets_model_name: str = None, custom_pivot_xy=None):
    final_objs = finalize_and_align_bottom(objs, custom_pivot_xy=custom_pivot_xy)

    bpy.ops.object.select_all(action='DESELECT')
    for o in final_objs:
        try:
            if o and o.name in bpy.data.objects:
                o.select_set(True)
                bpy.context.view_layer.objects.active = o
        except ReferenceError:
            continue

    out_path = os.path.join(PUBLIC_MODELS_DIR, rel_path)
    _export_atomic_glb_to_path(out_path, use_selection=True, animations=False)
    print(f"  [OK] Exported -> {rel_path}")

    if also_assets_model_name:
        alt_path = os.path.join(PUBLIC_ASSETS_MODELS_DIR, also_assets_model_name)
        _export_atomic_glb_to_path(alt_path, use_selection=True, animations=False)
        print(f"  [OK] Mirrored -> assets/models/{also_assets_model_name}")
