param(
    [Parameter(Mandatory, Position = 0, ValueFromRemainingArguments)]
    [string[]]$Expression
)

$configPath = Join-Path $PSScriptRoot '..\.secret.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json | Select-Object -ExpandProperty main
$body = @{
    expression = $Expression -join ' '
    shard = $config.shard
} | ConvertTo-Json -Compress
$uri = '{0}://{1}:{2}/api/user/console' -f $config.protocol, $config.hostname, $config.port

Invoke-RestMethod -Method Post -Uri $uri -Headers @{ 'X-Token' = $config.token } -ContentType 'application/json' -Body $body
