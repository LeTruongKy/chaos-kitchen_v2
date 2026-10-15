# -*- coding: utf-8 -*-
"""
Wrapper entry point that runs the full modular Blender 3D overhaul suite in `scripts/blender/generate_all_3d.py`.
"""
import os
import sys

BLENDER_SUITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "blender")
if BLENDER_SUITE_DIR not in sys.path:
    sys.path.insert(0, BLENDER_SUITE_DIR)

from generate_all_3d import main

if __name__ == "__main__":
    main()
