param([string]$hash, [string]$out, [int]$w = 1600, [int]$h = 900)
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$page = (Resolve-Path "$PSScriptRoot\shot.html").Path.Replace("\", "/")
$ud = Join-Path $env:TEMP ("hrd_cp_" + [guid]::NewGuid().ToString("N"))
$p = Start-Process -FilePath $chrome -ArgumentList @("--headless=new","--disable-gpu","--hide-scrollbars","--no-first-run","--user-data-dir=`"$ud`"","--window-size=$w,$h","--virtual-time-budget=1500","--screenshot=`"$out`"","`"file:///$page#$hash`"") -PassThru -Wait -WindowStyle Hidden
Start-Sleep -Milliseconds 300
Remove-Item -Recurse -Force $ud -ErrorAction SilentlyContinue
