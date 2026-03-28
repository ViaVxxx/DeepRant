@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "PROJECT_ROOT=%%~fI"

set "VCVARSALL=%VCVARSALL_PATH%"
if not defined VCVARSALL if exist "D:\Visual Studio\18\Community\VC\Auxiliary\Build\vcvarsall.bat" set "VCVARSALL=D:\Visual Studio\18\Community\VC\Auxiliary\Build\vcvarsall.bat"
if not defined VCVARSALL if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" set "VCVARSALL=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat"
if not defined VCVARSALL if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" set "VCVARSALL=C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat"
if not defined VCVARSALL if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvarsall.bat" set "VCVARSALL=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvarsall.bat"

if not defined VCVARSALL (
  echo 未找到 vcvarsall.bat，请先安装 Visual Studio C++ 构建工具，或设置环境变量 VCVARSALL_PATH。
  exit /b 1
)

call "%VCVARSALL%" x64 || exit /b 1
call "%PROJECT_ROOT%\node_modules\.bin\tauri.cmd" %*
