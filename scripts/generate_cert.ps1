$openssl = (Join-Path (Split-Path -Parent (Get-Command git).Path) "../mingw64/bin/openssl.exe")

# generate certificate and key
& $openssl req -config $PSScriptRoot/cert.config -new -x509 -sha256 -newkey rsa:2048 -nodes -keyout $PSScriptRoot/../key.pem -days 356 -out $PSScriptRoot/../cert.pem
