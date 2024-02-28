$openssl = (Join-Path (Split-Path -Parent (Get-Command git).Path) "../mingw64/bin/openssl.exe")

# generate certificate and key
& $openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -sha256 -days 356 -out cert.pem
