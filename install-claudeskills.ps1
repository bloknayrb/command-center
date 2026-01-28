$ErrorActionPreference = 'Stop'

# URL of the GitHub ZIP
$u = 'https://github.com/forrestchang/andrej-karpathy-skills/archive/6c8ac84738926a40bfd0f6f2e8d2a45983fc9e09.zip'

# Create a temporary working directory
$tmp = New-Item -ItemType Directory -Path (Join-Path $env:TEMP ('ghdl-' + [guid]::NewGuid()))

# Download ZIP
$zip = Join-Path $tmp 'repo.zip'
Invoke-WebRequest -Uri $u -OutFile $zip

# Extract ZIP
Expand-Archive -Path $zip -DestinationPath $tmp

# Locate the skills folder inside the extracted repo
$src = Join-Path $tmp 'andrej-karpathy-skills-6c8ac84738926a40bfd0f6f2e8d2a45983fc9e09\.claude\skills'

# Ensure .claude directory exists
New-Item -ItemType Directory -Force -Path '.claude' | Out-Null

# Remove existing skills folder if present
if (Test-Path '.claude\skills') {
    Remove-Item -Recurse -Force '.claude\skills'
}

# Copy new skills folder
Copy-Item -Recurse -Force $src '.claude'

Write-Host "Claude skills installed successfully."
