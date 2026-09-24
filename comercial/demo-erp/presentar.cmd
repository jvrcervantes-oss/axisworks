@echo off
rem Demo del ERP (intranet v4 de Lawang) para ensenar a un prospecto por videollamada.
rem Doble clic. Regenera dist\ desde la v4 de hoy, la sirve en 127.0.0.1:8977 y abre
rem Edge en InPrivate (sin sesiones, autocompletados ni marcadores a la vista).
rem Datos inventados y red cerrada: nada de lo que se haga aqui toca la base real.
rem Puerto propio a proposito: distinto de los previews de Lawang (8899), para que
rem el navegador no tenga guardada una sesion real de ese origen.
rem Para cerrar: Ctrl+C en esta ventana.
cd /d "%~dp0"
python build.py || (echo. & echo El build ha fallado: no se presenta. & pause & exit /b 1)
start "" msedge --inprivate "http://127.0.0.1:8977/"
python -m http.server 8977 --bind 127.0.0.1 --directory dist
