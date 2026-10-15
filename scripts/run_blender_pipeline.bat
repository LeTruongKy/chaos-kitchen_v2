@echo off
chcp 65001 >nul
echo ============================================================================
echo   CHAOS KITCHEN — ONE-CLICK BLENDER 3D ASSET ^& ANIMATION GENERATOR
echo ============================================================================

set "BLENDER_EXE="

:: 1. Check if blender is in PATH
where blender >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "BLENDER_EXE=blender"
    goto :found
)

:: 2. Check standard Program Files installations (Blender 3.6 - 4.4)
for /d %%D in ("C:\Users\FS-0470\Downloads\blender-5.4.0-alpha+main.6bff2767edae-windows.amd64-release\blender-5.4.0-alpha+main.6bff2767edae-windows.amd64-release*") do (
    if exist "%%~fD\blender.exe" set "BLENDER_EXE=%%~fD\blender.exe"
)
if defined BLENDER_EXE goto :found

for /d %%D in ("D:\Program Files\Blender Foundation\Blender*") do (
    if exist "%%~fD\blender.exe" set "BLENDER_EXE=%%~fD\blender.exe"
)
if defined BLENDER_EXE goto :found

:: 3. Check Steam installations
if exist "C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe" (
    set "BLENDER_EXE=C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe"
    goto :found
)
if exist "D:\SteamLibrary\steamapps\common\Blender\blender.exe" (
    set "BLENDER_EXE=D:\SteamLibrary\steamapps\common\Blender\blender.exe"
    goto :found
)

echo [!] Khong tim thay blender.exe tu dong trong PATH hoac Program Files.
set /p BLENDER_EXE="Nhap duong dan day du toi file blender.exe (VD: C:\Blender\blender.exe): "

:found
echo [+] Su dung Blender tai: "%BLENDER_EXE%"
echo [+] Dang chay scripts/blender/generate_all_3d.py ...
"%BLENDER_EXE%" --background --python "%~dp0blender\generate_all_3d.py"
echo.
echo [HOAN TAT] Toan bo model 3D va animation da duoc cap nhat vao apps/client/public!
pause
