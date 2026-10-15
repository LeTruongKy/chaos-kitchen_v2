# -*- coding: utf-8 -*-
"""
CHAOS KITCHEN — PHẦN 5: NHÂN VẬT ĐẦU BẾP & KHÁCH HÀNG CHIBI CHUẨN OVERCOOKED! (`part5_characters_and_animations.py`)
Implements Part 3 of the Overcooked Technical Specification (100% faithful to `media_1792040394445_cc347219.png` & `media_1792040383870_712756a4.png`):
1. Anatomical Structure:
   - Bell/Pear-shaped plump torso (`Shirt` material for player tinting) + 2 tiny hemisphere feet (`Black`).
   - Double-Breasted White Apron (`WhiteApron` `#f2f6fa`) with waist strap and 4 black buttons (`Face` `#14141f`) in 2 vertical rows.
   - Neckerchief (`Red` / `Band` `#c9181e`) with rolled collar, plump central knot, and 2 teardrop tails.
   - Wide Chibi Head (`Skin` `#ffcaa6`) with Big Bulbous Nose (`Nose` `#a85844`), wide-set dot eyes (`Face`),
     Big Grinning Mouth (`MouthInside` `#2b1111`) with 6 rounded white teeth (`Teeth` `#ffffff`) and pink tongue (`Tongue`),
     and chunky C-shaped ears.
   - Sculpted Wavy Hair (`Hair` `#3b2010`) with sweeping forelock curl & sideburns.
   - Tilted Puffy Chef Hat (`Hat` `#ffffff`) with headband and 8-lobed pleated cloud crown.
   - Floating Cupped Hands (`Skin`) with distinct thumbs.
2. Armature (`CharacterArmature`) with `Hips`, `Abdomen`, `Torso`, `Neck`, `Head`, `ShoulderL/R`, `UpperArmL/R`,
   `LowerArmL/R`, `FistR`, `UpperLegL/R`, `LowerLegL/R` & rigid/smooth vertex group weights.
3. 10 Baked NLA Animation Clips (`CharacterArmature|Idle`, `Walk`, `Run`, `Walk_Carry`, `Run_Carry`, `PickUp`,
   `Punch`, `Victory`, `Death`, `SitDown`).
4. Exports all 8 character/customer `.glb` models into `apps/client/public/assets/quat/*.glb` + `assets/models/chef.glb`.
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
    PUBLIC_ASSETS_MODELS_DIR,
    PUBLIC_QUAT_DIR,
    reset_scene,
    mat_toon_clay,
    assign_material,
    apply_smooth_shading,
    add_bevel,
    bmesh_bulge_and_taper,
    make_curve_tube,
    make_box,
    make_cylinder,
    make_uv_sphere,
    make_torus,
)


def _tag_vgroup(obj, bone_name: str):
    obj["rig_bone"] = bone_name
    return obj


def _build_overcooked_character_meshes(variant: str = "chef_hat"):
    """
    Constructs the Overcooked Chibi Chef or Customer mesh parts with exact material names
    (`Shirt`, `WhiteApron`, `Hat`, `Skin`, `Nose`, `Face`, `MouthInside`, `Teeth`, `Tongue`, `Hair`, `Red`, `Black`)
    and `"rig_bone"` tags for 100% clean skeletal binding.
    ONLY Chef variants (`chef_hat`, `chef_male`, `chef_female`, `pirate_male`) wear the Chef Hat & White Apron!
    Customer NPCs (`casual_male`, `casual_female`, `suit_male`, `kimono_female`) have NO chef hat and NO apron,
    featuring distinct 3D hairstyles and collars instead!
    """
    is_chef = variant in ("chef_hat", "chef_male", "chef_female", "pirate_male")
    is_customer = not is_chef
    is_cat = (variant == "kimono_female")
    is_female = (variant in ("chef_female", "casual_female"))
    is_pirate = (variant == "pirate_male")
    is_master = (variant == "suit_male")
    is_bearded = (variant == "chef_male")

    skin_hex = 0x8D5524 if is_master else (0xF48C24 if is_cat else PALETTE["skin_peach"])
    nose_hex = 0x5A3214 if is_master else (0xFF758F if is_cat else PALETTE["skin_nose"])
    if variant == "casual_female":
        hair_hex = 0xF4A226  # Sunny golden-blonde bun hair
    elif variant == "casual_male":
        hair_hex = 0x4A2810  # Warm chestnut-brown parted hair
    elif is_master:
        hair_hex = 0x181C24  # Sleek dark-ebony parted hair
    elif is_female:
        hair_hex = 0xD94E28  # Auburn red hair
    elif is_cat:
        hair_hex = 0xF48C24
    else:
        hair_hex = PALETTE["chef_hair_brown"]

    scarf_hex = 0x2B9348 if is_female else PALETTE["chef_scarf_red"]

    m_skin = mat_toon_clay("Skin", skin_hex, roughness=0.76)
    m_nose = mat_toon_clay("Nose", nose_hex, roughness=0.72)
    m_face = mat_toon_clay("Face", PALETTE["chef_face_dark"], roughness=0.65)
    m_mouth = mat_toon_clay("MouthInside", PALETTE["chef_mouth_dark"], roughness=0.88)
    m_teeth = mat_toon_clay("Teeth", 0xFFFFFF, roughness=0.45)
    m_tongue = mat_toon_clay("Tongue", PALETTE["chef_tongue_pink"], roughness=0.76)
    m_hat = mat_toon_clay("Hat", PALETTE["chef_hat_white"], roughness=0.76)
    m_apron = mat_toon_clay("WhiteApron", PALETTE["chef_white"], roughness=0.76)
    m_shirt = mat_toon_clay("Shirt", PALETTE["chef_shirt_red"], roughness=0.78)
    m_scarf = mat_toon_clay("Red", scarf_hex, roughness=0.74)
    m_hair = mat_toon_clay("Hair", hair_hex, roughness=0.78)
    m_shoe = mat_toon_clay("Black", 0x232730, roughness=0.80)
    m_ear_in = mat_toon_clay("EarInner", 0xD99572 if not is_master else 0x5A321E, roughness=0.80)
    m_cream = mat_toon_clay("Beige", 0xFFF3E0, roughness=0.76)
    m_ribbon = mat_toon_clay("PinkRibbon", 0xEC4899, roughness=0.72)

    objs = []

    # --------------------------------------------------------------------------
    # 1. STUBBY HEMISPHERE SHOES (`LowerLegL`, `LowerLegR`)
    # --------------------------------------------------------------------------
    for side, bname in [(-1, "LowerLegL"), (1, "LowerLegR")]:
        shoe = make_uv_sphere(
            f"Shoe_{side}",
            radius=0.095,
            loc=(side * 0.13, -0.03, 0.055),
            scale=(0.95, 1.35, 0.62),
            mat=m_shoe,
        )
        objs.append(_tag_vgroup(shoe, bname))

    # --------------------------------------------------------------------------
    # 2. BELL / PEAR-SHAPED PLUMP TORSO (`Torso`)
    # --------------------------------------------------------------------------
    torso = make_uv_sphere(
        "BellTorso",
        radius=0.33,
        segments=22,
        rings=14,
        loc=(0, 0, 0.34),
        scale=(1.04, 0.94, 0.92),
        mat=m_shirt,
    )
    bm = bmesh.new()
    bm.from_mesh(torso.data)
    for v in bm.verts:
        tz = max(0.0, min(1.0, (v.co.z + 0.30) / 0.60))
        belly_flare = 1.12 - 0.34 * (tz ** 1.35) + 0.10 * math.sin(tz * math.pi)
        v.co.x *= belly_flare
        v.co.y *= belly_flare
        if v.co.z < -0.20:
            v.co.z = -0.20 + (v.co.z + 0.20) * 0.35
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(torso.data)
    bm.free()
    objs.append(_tag_vgroup(torso, "Torso"))

    # --------------------------------------------------------------------------
    # 3. CHEF APRON & NECKERCHIEF (CHEF ONLY) OR CUSTOMER OUTFIT DETAILS
    # --------------------------------------------------------------------------
    if is_chef:
        apron = make_uv_sphere(
            "DoubleBreastedApron",
            radius=0.342,
            segments=22,
            rings=14,
            loc=(-0.015, -0.025, 0.335),
            scale=(0.98, 0.92, 0.89),
            mat=m_apron,
        )
        bm = bmesh.new()
        bm.from_mesh(apron.data)
        for v in bm.verts:
            tz = (v.co.z + 0.28) / 0.56
            belly_flare = 1.12 - 0.34 * (max(0.0, tz) ** 1.35) + 0.10 * math.sin(max(0.0, min(1.0, tz)) * math.pi)
            v.co.x *= belly_flare
            v.co.y *= belly_flare
            if v.co.y > 0.05:
                v.co.y = 0.05
            if v.co.x > 0.09 and v.co.y < 0.0:
                v.co.x = 0.09
            if v.co.z < -0.20:
                v.co.z = -0.20
            if v.co.z > 0.22:
                v.co.z = 0.22
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(apron.data)
        bm.free()
        objs.append(_tag_vgroup(apron, "Torso"))

        waist_strap = make_torus(
            "ApronWaistStrap",
            major_radius=0.335,
            minor_radius=0.022,
            loc=(0, -0.01, 0.23),
            scale=(1.04, 0.95, 0.65),
            mat=m_apron,
        )
        objs.append(_tag_vgroup(waist_strap, "Torso"))

        button_coords = [
            (-0.145, -0.325, 0.38),
            (-0.015, -0.340, 0.37),
            (-0.155, -0.338, 0.23),
            (-0.015, -0.352, 0.22),
        ]
        for i, (bx, by, bz) in enumerate(button_coords):
            btn = make_uv_sphere(
                f"ApronButton_{i}",
                radius=0.024,
                loc=(bx, by, bz),
                scale=(1.0, 0.55, 1.0),
                mat=m_face,
            )
            objs.append(_tag_vgroup(btn, "Torso"))

        neck_band = make_torus(
            "NeckerchiefCollar",
            major_radius=0.225,
            minor_radius=0.032,
            loc=(0, -0.01, 0.575),
            scale=(1.05, 0.96, 0.72),
            mat=m_scarf,
        )
        objs.append(_tag_vgroup(neck_band, "Torso"))

        knot = make_uv_sphere(
            "NeckerchiefKnot",
            radius=0.052,
            loc=(-0.03, -0.245, 0.545),
            scale=(1.05, 0.85, 0.95),
            mat=m_scarf,
        )
        objs.append(_tag_vgroup(knot, "Torso"))

        for side, tx, ty, tz, rz in [
            ("L", -0.11, -0.285, 0.485, math.radians(-38)),
            ("R",  0.04, -0.295, 0.475, math.radians(28)),
        ]:
            tail = make_uv_sphere(
                f"NeckerchiefTail_{side}",
                radius=0.048,
                loc=(tx, ty, tz),
                scale=(0.68, 0.45, 1.65),
                rot=(math.radians(22), 0, rz),
                mat=m_scarf,
            )
            objs.append(_tag_vgroup(tail, "Torso"))
    else:
        # Customer NPC outfit details (NO apron, NO chef neckerchief!)
        if is_master:
            # Suit customer: crisp white dress shirt V-bib & red silk necktie
            shirt_bib = make_uv_sphere("SuitWhiteBib", radius=0.14, loc=(0, -0.26, 0.46), scale=(0.85, 0.45, 1.25), mat=m_teeth)
            tie_knot = make_uv_sphere("SuitTieKnot", radius=0.038, loc=(0, -0.29, 0.53), scale=(1.0, 0.7, 0.9), mat=m_scarf)
            tie_blade = make_box("SuitTieBlade", size=(0.058, 0.028, 0.20), loc=(0, -0.32, 0.41), rot=(math.radians(12), 0, 0), mat=m_scarf, bevel=0.008)
            objs.extend([_tag_vgroup(shirt_bib, "Torso"), _tag_vgroup(tie_knot, "Torso"), _tag_vgroup(tie_blade, "Torso")])
        elif is_cat:
            # Kimono / Cat customer: festive red obi sash around waist
            obi = make_torus("KimonoObiSash", major_radius=0.33, minor_radius=0.038, loc=(0, 0, 0.28), scale=(1.05, 0.95, 1.15), mat=m_scarf)
            objs.append(_tag_vgroup(obi, "Torso"))
        else:
            # Casual male / female customer: neat white polo/blouse collar ring
            collar = make_torus("CasualCollarRing", major_radius=0.22, minor_radius=0.028, loc=(0, -0.01, 0.575), scale=(1.04, 0.95, 0.65), mat=m_cream)
            objs.append(_tag_vgroup(collar, "Torso"))

    # --------------------------------------------------------------------------
    # 5. FLOATING CUPPED HANDS (`LowerArmL`, `FistR`)
    # --------------------------------------------------------------------------
    for side, bname in [(-1, "LowerArmL"), (1, "FistR")]:
        palm = make_uv_sphere(
            f"FloatingHandPalm_{side}",
            radius=0.095,
            loc=(side * 0.43, -0.10, 0.34),
            scale=(0.68, 0.95, 1.18),
            rot=(math.radians(18), side * math.radians(-14), 0),
            mat=m_skin,
        )
        thumb = make_uv_sphere(
            f"FloatingHandThumb_{side}",
            radius=0.042,
            loc=(side * 0.37, -0.15, 0.37),
            scale=(0.75, 1.35, 0.75),
            rot=(math.radians(-25), 0, side * math.radians(28)),
            mat=m_skin,
        )
        objs.append(_tag_vgroup(palm, bname))
        objs.append(_tag_vgroup(thumb, bname))

    # --------------------------------------------------------------------------
    # 6. WIDE CHIBI HEAD, BIG NOSE, WIDE-SET EYES, 6-TOOTH GRIN & EARS (`Head`)
    # --------------------------------------------------------------------------
    head = make_uv_sphere(
        "ChibiHead",
        radius=0.31,
        segments=24,
        rings=16,
        loc=(0, 0, 0.85),
        scale=(1.12, 0.94, 0.86),
        mat=m_skin,
    )
    bm = bmesh.new()
    bm.from_mesh(head.data)
    for v in bm.verts:
        if v.co.z < 0.0:
            cheek = 1.0 + 0.08 * math.sin(min(1.0, abs(v.co.z) / 0.25) * math.pi)
            v.co.x *= cheek
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(head.data)
    bm.free()
    objs.append(_tag_vgroup(head, "Head"))

    # Chunky C-shaped Ears (`Head`)
    for side in (-1, 1):
        if is_cat:
            bpy.ops.mesh.primitive_cone_add(
                vertices=12,
                radius1=0.095,
                radius2=0.015,
                depth=0.18,
                location=(side * 0.24, -0.02, 1.08),
                rotation=(0, side * math.radians(22), 0),
            )
            cat_ear = bpy.context.active_object
            cat_ear.name = f"CatEar_{side}"
            add_bevel(cat_ear, width=0.008, segments=2)
            assign_material(cat_ear, m_skin)
            objs.append(_tag_vgroup(cat_ear, "Head"))
        else:
            ear = make_uv_sphere(
                f"ChefEar_{side}",
                radius=0.088,
                loc=(side * 0.34, 0.01, 0.83),
                scale=(0.55, 0.72, 0.95),
                mat=m_skin,
            )
            ear_in = make_uv_sphere(
                f"ChefEarInner_{side}",
                radius=0.052,
                loc=(side * 0.365, -0.015, 0.83),
                scale=(0.45, 0.65, 0.80),
                mat=m_ear_in,
            )
            objs.append(_tag_vgroup(ear, "Head"))
            objs.append(_tag_vgroup(ear_in, "Head"))

    # Big Bulbous Nose right between the eyes
    nose = make_uv_sphere(
        "ChefBigNose",
        radius=0.072,
        loc=(0.01, -0.30, 0.855),
        scale=(1.05, 0.92, 0.90),
        mat=m_nose,
    )
    objs.append(_tag_vgroup(nose, "Head"))

    # Wide-Set Glossy Dark Dot Eyes (`Face` `#14141f`)
    for side in (-1, 1):
        eye = make_uv_sphere(
            f"ChefEye_{side}",
            radius=0.034,
            loc=(side * 0.155, -0.275, 0.875),
            scale=(1.0, 0.55, 1.0),
            mat=m_face,
        )
        objs.append(_tag_vgroup(eye, "Head"))

    if is_pirate:
        patch = make_uv_sphere("PirateEyepatch", radius=0.055, loc=(-0.155, -0.282, 0.875), scale=(1.1, 0.5, 1.0), mat=m_shoe)
        strap = make_torus("PirateStrap", major_radius=0.315, minor_radius=0.012, loc=(0, 0, 0.89), rot=(0, math.radians(12), 0), scale=(1.12, 0.95, 1.0), mat=m_shoe)
        objs.extend([_tag_vgroup(patch, "Head"), _tag_vgroup(strap, "Head")])

    if is_cat:
        for side in (-1, 1):
            muzzle = make_uv_sphere(f"CatMuzzle_{side}", radius=0.068, loc=(side * 0.06, -0.285, 0.80), scale=(1.1, 0.7, 0.8), mat=m_cream)
            objs.append(_tag_vgroup(muzzle, "Head"))

    # Big Joyful Grinning Mouth (`MouthInside` + 6 Rounded White Teeth + Pink Tongue)
    mouth_bg = make_uv_sphere(
        "GrinMouthCavity",
        radius=0.175,
        loc=(0, -0.255, 0.755),
        scale=(1.12, 0.45, 0.56),
        rot=(math.radians(8), 0, 0),
        mat=m_mouth,
    )
    bm = bmesh.new()
    bm.from_mesh(mouth_bg.data)
    for v in bm.verts:
        if v.co.z > 0.02:
            v.co.z = 0.02 + (v.co.z - 0.02) * 0.25
        v.co.z += (v.co.x ** 2) * 1.15
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mouth_bg.data)
    bm.free()
    objs.append(_tag_vgroup(mouth_bg, "Head"))

    tooth_angles = [-0.46, -0.27, -0.09, 0.09, 0.27, 0.46]
    for i, tang in enumerate(tooth_angles):
        tx = math.sin(tang) * 0.185
        ty = -0.292 + (1.0 - math.cos(tang)) * 0.075
        tz = 0.768 + (tx ** 2) * 0.85
        tooth = make_box(
            f"SmileTooth_{i}",
            size=(0.052, 0.032, 0.048),
            loc=(tx, ty, tz),
            rot=(0, 0, -tang * 0.85),
            mat=m_teeth,
            bevel=0.010,
        )
        objs.append(_tag_vgroup(tooth, "Head"))

    tongue = make_uv_sphere(
        "SmileTongue",
        radius=0.085,
        loc=(0, -0.278, 0.708),
        scale=(1.15, 0.55, 0.38),
        mat=m_tongue,
    )
    objs.append(_tag_vgroup(tongue, "Head"))

    if is_bearded:
        for side in (-1, 1):
            stache = make_uv_sphere(
                f"ChefMustache_{side}",
                radius=0.068,
                loc=(side * 0.075, -0.295, 0.805),
                scale=(1.35, 0.65, 0.55),
                rot=(0, 0, side * math.radians(-18)),
                mat=m_hair,
            )
            objs.append(_tag_vgroup(stache, "Head"))

    # --------------------------------------------------------------------------
    # 7. SCULPTED 3D HAIRSTYLES (`Head`) — DISTINCT FOR CUSTOMERS & CHEFS
    # --------------------------------------------------------------------------
    if not is_cat:
        # Full voluminous 3D hair dome covering top and back of head
        hair_cap = make_uv_sphere(
            "HairCapBack",
            radius=0.328,
            loc=(0, 0.022, 0.905),
            scale=(1.13, 0.98, 0.88),
            mat=m_hair,
        )
        objs.append(_tag_vgroup(hair_cap, "Head"))

        # Sideburns framing the cheeks
        for side in (-1, 1):
            sb_z = 0.82 if is_female else 0.86
            sb_len = 1.48 if is_female else 1.15
            sideburn = make_uv_sphere(
                f"HairSideburn_{side}",
                radius=0.095,
                loc=(side * 0.295, -0.10, sb_z),
                scale=(0.58, 0.88, sb_len),
                rot=(math.radians(10), 0, 0),
                mat=m_hair,
            )
            objs.append(_tag_vgroup(sideburn, "Head"))

        # Sweeping front bangs / forelock curl
        bang_left = make_uv_sphere(
            "HairBangSweepL",
            radius=0.140,
            loc=(-0.10, -0.225, 0.995),
            scale=(1.45, 0.85, 0.72),
            rot=(math.radians(15), math.radians(-12), math.radians(-10)),
            mat=m_hair,
        )
        bang_curl = make_uv_sphere(
            "HairForelockCurl",
            radius=0.120,
            loc=(0.075, -0.255, 0.975),
            scale=(1.18, 0.88, 0.82),
            rot=(math.radians(20), math.radians(18), math.radians(15)),
            mat=m_hair,
        )
        bang_right = make_uv_sphere(
            "HairBangRight",
            radius=0.110,
            loc=(0.21, -0.195, 0.985),
            scale=(1.08, 0.85, 0.75),
            mat=m_hair,
        )
        objs.extend([
            _tag_vgroup(bang_left, "Head"),
            _tag_vgroup(bang_curl, "Head"),
            _tag_vgroup(bang_right, "Head"),
        ])

        # Extra 3D hairstyle volume for Customer NPCs (since they do NOT wear chef hats!)
        if variant == "casual_female":
            # Cute high round golden-blonde bun + pink ribbon band on top of head!
            top_bun = make_uv_sphere("CustomerHairBun", radius=0.165, loc=(0, 0.08, 1.16), scale=(1.05, 1.05, 0.92), mat=m_hair)
            bun_band = make_torus("CustomerBunRibbon", major_radius=0.135, minor_radius=0.026, loc=(0, 0.08, 1.09), mat=m_ribbon)
            objs.extend([_tag_vgroup(top_bun, "Head"), _tag_vgroup(bun_band, "Head")])
        elif variant == "casual_male":
            # Bouncy side-parted pompadour wave on top of head
            quiff = make_uv_sphere("CustomerQuiffWave", radius=0.175, loc=(-0.04, -0.06, 1.08), scale=(1.35, 1.05, 0.68), rot=(math.radians(-10), math.radians(14), 0), mat=m_hair)
            objs.append(_tag_vgroup(quiff, "Head"))
        elif is_master:
            # Sleek gentleman side-parted top hair wave
            sleek_top = make_uv_sphere("CustomerSuitHairTop", radius=0.18, loc=(0.03, -0.02, 1.06), scale=(1.38, 1.08, 0.58), rot=(0, math.radians(-10), 0), mat=m_hair)
            objs.append(_tag_vgroup(sleek_top, "Head"))

    # --------------------------------------------------------------------------
    # 8. TILTED PUFFY 8-LOBED PLEATED CHEF HAT (`Head`) — STRICTLY CHEF ONLY!
    # --------------------------------------------------------------------------
    if is_chef:
        tilt_mat = Euler((math.radians(-5), math.radians(-8), 0), 'XYZ').to_matrix()
        hat_origin = Vector((-0.02, 0.01, 1.06))

        def _place_on_hat(local_pos):
            return tuple(hat_origin + (tilt_mat @ Vector(local_pos)))

        band = make_cylinder(
            "ChefHatHeadband",
            radius=0.255,
            depth=0.17,
            vertices=22,
            loc=_place_on_hat((0, 0, 0.075)),
            rot=(math.radians(-5), math.radians(-8), 0),
            mat=m_hat,
            bevel=0.012,
            bulge=0.04,
        )
        objs.append(_tag_vgroup(band, "Head"))

        crown_core = make_uv_sphere(
            "ChefHatCrownCore",
            radius=0.28,
            loc=_place_on_hat((0, 0, 0.25)),
            scale=(1.08, 1.08, 0.78),
            rot=(math.radians(-5), math.radians(-8), 0),
            mat=m_hat,
        )
        objs.append(_tag_vgroup(crown_core, "Head"))

        for i in range(8):
            ang = (2.0 * math.pi * i) / 8.0
            lx = math.cos(ang) * 0.165
            ly = math.sin(ang) * 0.165
            lobe = make_uv_sphere(
                f"ChefHatPleatLobe_{i}",
                radius=0.175,
                loc=_place_on_hat((lx, ly, 0.255)),
                scale=(0.95, 0.95, 1.05),
                rot=(math.radians(-5), math.radians(-8), ang),
                mat=m_hat,
            )
            objs.append(_tag_vgroup(lobe, "Head"))

    return objs


def _create_character_armature_and_bind(mesh_objs):
    """
    Creates `CharacterArmature` with the exact bone names expected by `Chef.ts` and `quatClips.ts`,
    joins `mesh_objs` into a single `SkinnedMesh`, and assigns 100% clean vertex weights from `"rig_bone"`.
    """
    arm_data = bpy.data.armatures.new("CharacterArmatureData")
    arm_obj = bpy.data.objects.new("CharacterArmature", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    eb = arm_data.edit_bones

    def _add_bone(name, head_co, tail_co, parent_name=None):
        b = eb.new(name)
        b.head = Vector(head_co)
        b.tail = Vector(tail_co)
        if parent_name and parent_name in eb:
            b.parent = eb[parent_name]
        return b

    _add_bone("Hips",      (0, 0, 0.18), (0, 0, 0.28), None)
    _add_bone("Abdomen",   (0, 0, 0.28), (0, 0, 0.38), "Hips")
    _add_bone("Torso",     (0, 0, 0.38), (0, 0, 0.56), "Abdomen")
    _add_bone("Neck",      (0, 0, 0.56), (0, 0, 0.64), "Torso")
    _add_bone("Head",      (0, 0, 0.64), (0, 0, 1.15), "Neck")

    _add_bone("ShoulderL", (-0.18, 0, 0.50), (-0.28, 0, 0.48), "Torso")
    _add_bone("UpperArmL", (-0.28, 0, 0.48), (-0.38, -0.04, 0.40), "ShoulderL")
    _add_bone("LowerArmL", (-0.38, -0.04, 0.40), (-0.44, -0.12, 0.33), "UpperArmL")

    _add_bone("ShoulderR", ( 0.18, 0, 0.50), ( 0.28, 0, 0.48), "Torso")
    _add_bone("UpperArmR", ( 0.28, 0, 0.48), ( 0.38, -0.04, 0.40), "ShoulderR")
    _add_bone("LowerArmR", ( 0.38, -0.04, 0.40), ( 0.43, -0.10, 0.34), "UpperArmR")
    _add_bone("FistR",     ( 0.43, -0.10, 0.34), ( 0.45, -0.18, 0.32), "LowerArmR")

    _add_bone("UpperLegL", (-0.13, 0, 0.18), (-0.13, 0, 0.10), "Hips")
    _add_bone("LowerLegL", (-0.13, 0, 0.10), (-0.13, -0.05, 0.02), "UpperLegL")

    _add_bone("UpperLegR", ( 0.13, 0, 0.18), ( 0.13, 0, 0.10), "Hips")
    _add_bone("LowerLegR", ( 0.13, 0, 0.10), ( 0.13, -0.05, 0.02), "UpperLegR")

    bpy.ops.object.mode_set(mode='OBJECT')

    # Apply modifiers & transforms on each part and assign its vertex group before joining
    for o in mesh_objs:
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for mod in list(o.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except Exception:
                pass
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bname = o.get("rig_bone", "Torso")
        vg = o.vertex_groups.new(name=bname)
        vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        o.select_set(False)

    # Join all mesh parts into a single SkinnedMesh
    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objs[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "OvercookedChefMesh"

    # Ensure all armature bones exist as vertex groups
    for b in arm_data.bones:
        if b.name not in joined.vertex_groups:
            joined.vertex_groups.new(name=b.name)

    joined.parent = arm_obj
    arm_mod = joined.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = arm_obj

    return arm_obj, joined


def _bake_10_overcooked_animations(arm_obj):
    """
    Part 3.3 Spec: Creates all 10 bouncy Overcooked animations and pushes them to NLA Tracks
    with exact `CharacterArmature|<ClipName>` naming.
    """
    scene = bpy.context.scene
    scene.render.fps = 24
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'XYZ'

    def _reset_pose():
        for pb in arm_obj.pose.bones:
            pb.location = (0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
            pb.scale = (1, 1, 1)

    def _key_bones(frame, rot_map):
        scene.frame_set(frame)
        _reset_pose()
        for bname, rot_deg in rot_map.items():
            if bname in arm_obj.pose.bones:
                pb = arm_obj.pose.bones[bname]
                pb.rotation_euler = Euler(
                    (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2])),
                    'XYZ',
                )
        for pb in arm_obj.pose.bones:
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    clips_spec = [
        # 1. Idle (28 frames ~ 1.15s): Cheerful rhythmic breathing & head tilt
        (
            "CharacterArmature|Idle",
            [
                (1,  {"Torso": (2, 0, -2), "Head": (-2, 4, 3),  "UpperArmL": (8, 0, -6),  "UpperArmR": (-8, 0, 6)}),
                (14, {"Torso": (-2, 0, 2), "Head": (3, -4, -3), "UpperArmL": (-8, 0, -2), "UpperArmR": (8, 0, 2)}),
                (28, {"Torso": (2, 0, -2), "Head": (-2, 4, 3),  "UpperArmL": (8, 0, -6),  "UpperArmR": (-8, 0, 6)}),
            ],
        ),
        # 2. Walk (18 frames ~ 0.75s): Joyful waddle side-to-side, arms swinging
        (
            "CharacterArmature|Walk",
            [
                (1,  {"Torso": (5, -6, -6), "Head": (-3, 5, 5),  "UpperArmL": (28, 0, 0),  "UpperArmR": (-28, 0, 0), "LowerLegL": (-25, 0, 0), "LowerLegR": (25, 0, 0)}),
                (9,  {"Torso": (5,  6,  6), "Head": (-3, -5, -5), "UpperArmL": (-28, 0, 0), "UpperArmR": (28, 0, 0),  "LowerLegL": (25, 0, 0),  "LowerLegR": (-25, 0, 0)}),
                (18, {"Torso": (5, -6, -6), "Head": (-3, 5, 5),  "UpperArmL": (28, 0, 0),  "UpperArmR": (-28, 0, 0), "LowerLegL": (-25, 0, 0), "LowerLegR": (25, 0, 0)}),
            ],
        ),
        # 3. Run (12 frames ~ 0.50s): Pitched forward 14 deg, rapid arm/foot hustle
        (
            "CharacterArmature|Run",
            [
                (1,  {"Torso": (14, -10, -8), "Head": (-10, 8, 6),  "UpperArmL": (48, 0, 0),  "UpperArmR": (-48, 0, 0), "LowerLegL": (-38, 0, 0), "LowerLegR": (38, 0, 0)}),
                (6,  {"Torso": (14,  10,  8), "Head": (-10, -8, -6), "UpperArmL": (-48, 0, 0), "UpperArmR": (48, 0, 0),  "LowerLegL": (38, 0, 0),  "LowerLegR": (-38, 0, 0)}),
                (12, {"Torso": (14, -10, -8), "Head": (-10, 8, 6),  "UpperArmL": (48, 0, 0),  "UpperArmR": (-48, 0, 0), "LowerLegL": (-38, 0, 0), "LowerLegR": (38, 0, 0)}),
            ],
        ),
        # 4. Walk_Carry (18 frames): Both hands raised forward holding pot/plate
        (
            "CharacterArmature|Walk_Carry",
            [
                (1,  {"Torso": (4, -4, -4), "Head": (-2, 3, 3),  "UpperArmL": (-55, 18, 0), "LowerArmL": (-25, 0, 0), "UpperArmR": (-55, -18, 0), "LowerArmR": (-25, 0, 0), "LowerLegL": (-22, 0, 0), "LowerLegR": (22, 0, 0)}),
                (9,  {"Torso": (4,  4,  4), "Head": (-2, -3, -3), "UpperArmL": (-52, 18, 0), "LowerArmL": (-28, 0, 0), "UpperArmR": (-52, -18, 0), "LowerArmR": (-28, 0, 0), "LowerLegL": (22, 0, 0),  "LowerLegR": (-22, 0, 0)}),
                (18, {"Torso": (4, -4, -4), "Head": (-2, 3, 3),  "UpperArmL": (-55, 18, 0), "LowerArmL": (-25, 0, 0), "UpperArmR": (-55, -18, 0), "LowerArmR": (-25, 0, 0), "LowerLegL": (-22, 0, 0), "LowerLegR": (22, 0, 0)}),
            ],
        ),
        # 5. Run_Carry (12 frames): Fast hustle while carrying item forward
        (
            "CharacterArmature|Run_Carry",
            [
                (1,  {"Torso": (10, -6, -6), "Head": (-6, 5, 4),  "UpperArmL": (-60, 20, 0), "LowerArmL": (-30, 0, 0), "UpperArmR": (-60, -20, 0), "LowerArmR": (-30, 0, 0), "LowerLegL": (-34, 0, 0), "LowerLegR": (34, 0, 0)}),
                (6,  {"Torso": (10,  6,  6), "Head": (-6, -5, -4), "UpperArmL": (-56, 20, 0), "LowerArmL": (-34, 0, 0), "UpperArmR": (-56, -20, 0), "LowerArmR": (-34, 0, 0), "LowerLegL": (34, 0, 0),  "LowerLegR": (-34, 0, 0)}),
                (12, {"Torso": (10, -6, -6), "Head": (-6, 5, 4),  "UpperArmL": (-60, 20, 0), "LowerArmL": (-30, 0, 0), "UpperArmR": (-60, -20, 0), "LowerArmR": (-30, 0, 0), "LowerLegL": (-34, 0, 0), "LowerLegR": (34, 0, 0)}),
            ],
        ),
        # 6. PickUp (10 frames ~ 0.40s): Rapid chopping / washing motion
        (
            "CharacterArmature|PickUp",
            [
                (1,  {"Torso": (8, 0, 0),  "Head": (8, 0, 0),  "UpperArmR": (-75, 0, 0), "LowerArmR": (-35, 0, 0), "UpperArmL": (-35, 15, 0)}),
                (5,  {"Torso": (14, 0, 0), "Head": (12, 0, 0), "UpperArmR": (-20, 0, 0), "LowerArmR": (-10, 0, 0), "UpperArmL": (-35, 15, 0)}),
                (10, {"Torso": (8, 0, 0),  "Head": (8, 0, 0),  "UpperArmR": (-75, 0, 0), "LowerArmR": (-35, 0, 0), "UpperArmL": (-35, 15, 0)}),
            ],
        ),
        # 7. Punch (10 frames): Two-handed forward throw push
        (
            "CharacterArmature|Punch",
            [
                (1,  {"Torso": (-8, 0, 0), "UpperArmL": (-30, 0, 0), "UpperArmR": (-30, 0, 0)}),
                (5,  {"Torso": (18, 0, 0), "UpperArmL": (-85, 0, 0), "UpperArmR": (-85, 0, 0)}),
                (10, {"Torso": (0, 0, 0),  "UpperArmL": (0, 0, 0),   "UpperArmR": (0, 0, 0)}),
            ],
        ),
        # 8. Victory (28 frames): Cheerful jump & V-arms celebration
        (
            "CharacterArmature|Victory",
            [
                (1,  {"Torso": (0, 0, 0),   "Head": (0, 0, 0),    "UpperArmL": (-135, 0, -25), "UpperArmR": (-135, 0, 25)}),
                (14, {"Torso": (-8, 0, 8),  "Head": (-10, 8, -6), "UpperArmL": (-155, 0, -35), "UpperArmR": (-155, 0, 35)}),
                (28, {"Torso": (0, 0, -8),  "Head": (-5, -8, 6),  "UpperArmL": (-135, 0, -25), "UpperArmR": (-135, 0, 25)}),
            ],
        ),
        # 9. Death (20 frames): Hands on head in kitchen fire panic!
        (
            "CharacterArmature|Death",
            [
                (1,  {"Torso": (6, -12, -10), "Head": (8, 15, 10),   "UpperArmL": (-110, 25, 0), "UpperArmR": (-110, -25, 0)}),
                (10, {"Torso": (6,  12,  10), "Head": (8, -15, -10), "UpperArmL": (-110, 25, 0), "UpperArmR": (-110, -25, 0)}),
                (20, {"Torso": (6, -12, -10), "Head": (8, 15, 10),   "UpperArmL": (-110, 25, 0), "UpperArmR": (-110, -25, 0)}),
            ],
        ),
        # 10. SitDown (16 frames): Neat seated posture for Customer NPCs at tables
        (
            "CharacterArmature|SitDown",
            [
                (1,  {"Torso": (0, 0, 0),  "UpperArmL": (0, 0, 0),   "UpperArmR": (0, 0, 0),   "UpperLegL": (0, 0, 0),   "UpperLegR": (0, 0, 0)}),
                (16, {"Torso": (-4, 0, 0), "UpperArmL": (-35, 10, 0), "UpperArmR": (-35, -10, 0), "UpperLegL": (-75, 0, 0), "UpperLegR": (-75, 0, 0)}),
            ],
        ),
    ]

    if not arm_obj.animation_data:
        arm_obj.animation_data_create()

    for clip_name, keyframes in clips_spec:
        act = bpy.data.actions.new(name=clip_name)
        arm_obj.animation_data.action = act
        for frame, rot_map in keyframes:
            _key_bones(frame, rot_map)

        track = arm_obj.animation_data.nla_tracks.new()
        track.name = clip_name
        strip = track.strips.new(clip_name, keyframes[0][0], act)
        strip.name = clip_name

    arm_obj.animation_data.action = None
    bpy.ops.object.mode_set(mode='OBJECT')


def generate_all():
    print("\n=== [PHẦN 5] Building Overcooked Chibi Chefs & Customers (.glb) + 10 Animations ===")
    os.makedirs(PUBLIC_QUAT_DIR, exist_ok=True)
    os.makedirs(PUBLIC_ASSETS_MODELS_DIR, exist_ok=True)

    variants = [
        "chef_hat",
        "chef_male",
        "chef_female",
        "kimono_female",
        "pirate_male",
        "suit_male",
        "casual_male",
        "casual_female",
    ]

    for variant in variants:
        reset_scene()
        mesh_parts = _build_overcooked_character_meshes(variant)
        arm_obj, joined_mesh = _create_character_armature_and_bind(mesh_parts)
        _bake_10_overcooked_animations(arm_obj)

        bpy.ops.object.select_all(action='DESELECT')
        arm_obj.select_set(True)
        joined_mesh.select_set(True)
        bpy.context.view_layer.objects.active = arm_obj

        out_glb = os.path.join(PUBLIC_QUAT_DIR, f"{variant}.glb")
        bpy.ops.export_scene.gltf(
            filepath=out_glb,
            export_format='GLB',
            use_selection=True,
            export_yup=True,
            export_apply=False,
            export_animations=True,
            export_nla_strips=True,
        )
        print(f"  [OK] Exported Overcooked Character -> assets/quat/{variant}.glb")

        if variant == "chef_hat":
            chef_glb = os.path.join(PUBLIC_ASSETS_MODELS_DIR, "chef.glb")
            bpy.ops.export_scene.gltf(
                filepath=chef_glb,
                export_format='GLB',
                use_selection=True,
                export_yup=True,
                export_apply=False,
                export_animations=True,
                export_nla_strips=True,
            )
            print("  [OK] Mirrored -> assets/models/chef.glb")


if __name__ == "__main__":
    generate_all()
