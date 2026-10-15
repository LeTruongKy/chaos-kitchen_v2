"""
Chaos Kitchen — Master 3D Asset & Animation Pipeline Runner
===========================================================
Tuân thủ tuyệt đối 5 Luật Thiết Kế Hình Học (bmesh Deformation, Micro-Details
& Multi-Material, Toon Clay Shader, Technical Alignment, 5 Modular Scripts):
  - Phần 1: part1_utensils_and_dishes.py     (Dụng cụ nấu nướng & Món ăn hoàn chỉnh)
  - Phần 2: part2_ingredients.py             (21 Nguyên liệu thô, thái lát & nấu chín)
  - Phần 3: part3_stations_and_crates.py     (Bàn bếp, thiết bị & thùng nguyên liệu)
  - Phần 4: part4_environment_and_furniture.py (Không gian nhà hàng, tường, cửa vòm & bàn ghế)
  - Phần 5: part5_characters_and_animations.py (Nhân vật đầu bếp Chibi & 10 Animation)

Usage:
  blender --background --python scripts/blender/generate_all_3d.py
"""
import os
import sys
import glob

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from blender_utils import PUBLIC_MODELS_DIR
import part1_utensils_and_dishes
import part2_ingredients
import part3_stations_and_crates
import part4_environment_and_furniture
import part5_characters_and_animations


def cleanup_legacy_sidecars():
    """Remove stale .bin and tex_Mat_*.png files so GLTFLoader always reads fresh self-contained binaries."""
    gltf_dir = os.path.join(PUBLIC_MODELS_DIR, "gltf")
    removed = 0
    for pattern in ("*.bin", "tex_Mat_*.png"):
        for path in glob.glob(os.path.join(gltf_dir, pattern)):
            try:
                os.remove(path)
                removed += 1
            except OSError:
                pass
    if removed:
        print(f"  [CLEANUP] Removed {removed} legacy .bin / texture sidecar files in {gltf_dir}")


def main():
    print("=" * 76)
    print("  CHAOS KITCHEN — SENIOR 3D TECH ARTIST BMESH PIPELINE (OVERCOOKED STYLE)")
    print("=" * 76)
    cleanup_legacy_sidecars()
    part1_utensils_and_dishes.generate_all()
    part2_ingredients.generate_all()
    part3_stations_and_crates.generate_all()
    part4_environment_and_furniture.generate_all()
    part5_characters_and_animations.generate_all()
    cleanup_legacy_sidecars()
    print("=" * 76)
    print("  ALL 5 PARTS GENERATED & EXPORTED SUCCESSFULLY!")
    print("=" * 76)


if __name__ == "__main__":
    main()
