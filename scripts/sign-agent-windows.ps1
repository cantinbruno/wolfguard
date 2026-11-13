[CmdletBinding()]
param(
    [string]$CertificateThumbprint = $env:WOLFGUARD_SIGNING_CERT_THUMBPRINT,
    [uri]$TimestampServer = 'http://timestamp.digicert.com',
    [switch]$Check
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$executable = Join-Path $repositoryRoot 'app/downloads/WolfGuard-Agent-Windows.exe'

function Assert-TrustedSignature([string]$Path, [string]$ExpectedThumbprint = '') {
    $signature = Get-AuthenticodeSignature -LiteralPath $Path
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate) {
        throw "Signature Authenticode Windows non valide : $($signature.Status). Un certificat de signature de code reconnu est necessaire."
    }
    if ($ExpectedThumbprint -and $signature.SignerCertificate.Thumbprint -ne $ExpectedThumbprint) {
        throw 'Le signataire ne correspond pas au certificat choisi.'
    }
    if (-not $signature.TimeStamperCertificate) {
        throw 'Horodatage de la signature absent. Aucun fichier ne sera publie.'
    }
    return $signature
}

if ($Check) {
    $result = Assert-TrustedSignature $executable
    [pscustomobject]@{ Status = $result.Status; Publisher = $result.SignerCertificate.Subject; Timestamped = $true }
    return
}

# Never create a self-signed certificate or modify the machine's trusted roots.
$thumbprint = ($CertificateThumbprint -replace '\s', '').ToUpperInvariant()
if ($thumbprint -notmatch '^[A-F0-9]{40}$') {
    throw 'Certificat Authenticode manquant. Installer un certificat de signature de code reconnu, puis fournir -CertificateThumbprint ou WOLFGUARD_SIGNING_CERT_THUMBPRINT.'
}
if ($TimestampServer.Scheme -notin @('http', 'https') -or $TimestampServer.UserInfo -or $TimestampServer.Fragment) {
    throw 'Adresse du service d horodatage invalide.'
}
$certificates = @(Get-ChildItem Cert:\CurrentUser\My,Cert:\LocalMachine\My -CodeSigningCert | Where-Object { $_.Thumbprint -eq $thumbprint -and $_.HasPrivateKey })
if ($certificates.Count -ne 1) { throw 'Certificat de signature et cle privee introuvables ou ambigus dans les magasins Windows.' }
$certificate = $certificates[0]
if ($certificate.NotBefore -gt (Get-Date) -or $certificate.NotAfter -le (Get-Date)) { throw 'Le certificat de signature est hors de sa periode de validite.' }
$chain = New-Object Security.Cryptography.X509Certificates.X509Chain
try {
    $chain.ChainPolicy.RevocationMode = 'Online'
    $chain.ChainPolicy.UrlRetrievalTimeout = [TimeSpan]::FromSeconds(15)
    if (-not $chain.Build($certificate)) { throw 'La chaine du certificat n est pas approuvee par Windows. Aucune autorite ne sera ajoutee automatiquement.' }
} finally { $chain.Dispose() }

Push-Location -LiteralPath $repositoryRoot
$signingDirectory = $null
try {
    & node scripts/build-web.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Compilation impossible avant signature.' }
    $temporaryRoot = [IO.Path]::GetFullPath((Join-Path $repositoryRoot '.cache'))
    if ((Get-Item -LiteralPath $temporaryRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Lien temporaire interdit.' }
    $signingDirectory = [IO.Path]::GetFullPath((Join-Path $temporaryRoot ('authenticode-' + [guid]::NewGuid().ToString('N'))))
    if ((Split-Path -Parent $signingDirectory) -ne $temporaryRoot) { throw 'Dossier temporaire de signature invalide.' }
    New-Item -ItemType Directory -Path $signingDirectory | Out-Null
    $candidate = Join-Path $signingDirectory 'WolfGuard-Agent-Windows.exe'
    Copy-Item -LiteralPath $executable -Destination $candidate
    $null = Set-AuthenticodeSignature -LiteralPath $candidate -Certificate $certificate -HashAlgorithm SHA256 -IncludeChain NotRoot -TimestampServer $TimestampServer.AbsoluteUri
    $result = Assert-TrustedSignature $candidate $thumbprint
    # Change the published executable only after Windows has verified the signer.
    Copy-Item -LiteralPath $candidate -Destination $executable -Force
    $manifestPath = Join-Path $repositoryRoot 'agent/windows-build.json'
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $manifest.exeSha256 = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash.ToLowerInvariant()
    [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 8) + "`n", (New-Object Text.UTF8Encoding($false)))
    # Rebuild ZIPs, release checksums and docs from the signed binary.
    & node scripts/build-web.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Reconstruction des paquets signes impossible.' }
    $null = Assert-TrustedSignature $executable $thumbprint
    $null = Assert-TrustedSignature (Join-Path $repositoryRoot 'docs/downloads/WolfGuard-Agent-Windows.exe') $thumbprint
    & node scripts/check-publication.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Controle de publication refuse. Ne pas publier ces fichiers.' }
    [pscustomobject]@{ Status = 'Valid'; Publisher = $result.SignerCertificate.Subject; Timestamped = $true; Publication = 'Paquets reconstruits ; commit et push Git restent a effectuer.' }
} finally {
    if ($signingDirectory -and (Test-Path -LiteralPath $signingDirectory)) {
        $resolved = [IO.Path]::GetFullPath($signingDirectory)
        if ((Split-Path -Parent $resolved) -ne $temporaryRoot -or (Split-Path -Leaf $resolved) -notmatch '^authenticode-[a-f0-9]{32}$') { throw 'Nettoyage temporaire refuse.' }
        if ((Get-Item -LiteralPath $resolved).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Lien temporaire interdit.' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
    Pop-Location
}
