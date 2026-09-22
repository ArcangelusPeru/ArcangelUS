@echo off
echo Genera esta clave solo al activar Ventas por primera vez.
echo Conserva tu COMMERCE_KEY actual si ya tienes cuentas o ventas.
echo.
echo Copia la siguiente linea en COMMERCE_KEY y guarda una copia privada:
echo.
powershell.exe -NoProfile -Command "$taskKeyBytes=New-Object byte[] 32; $taskRng=[Security.Cryptography.RandomNumberGenerator]::Create(); $taskRng.GetBytes($taskKeyBytes); $taskRng.Dispose(); [Convert]::ToBase64String($taskKeyBytes)"
echo.
echo No subas esta clave a GitHub ni la compartas con clientes.
pause
