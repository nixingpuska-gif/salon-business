$ErrorActionPreference = "Stop"

$baseUrl = if ($env:SALON_CORE_URL) { $env:SALON_CORE_URL } else { "http://localhost:8080" }
$tenantId = if ($env:TENANT_ID) { $env:TENANT_ID } else { "default" }
$channel = if ($env:CHANNEL) { $env:CHANNEL } else { "telegram" }
$to = if ($env:TO) { $env:TO } else { "123456789" }
$healthToken = $env:HEALTH_TOKEN

$log = {
  param([string]$message)
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $message)
}

& $log "Smoke (no DB) start: $baseUrl tenant=$tenantId"

& $log "Health check"
$headers = @{}
if ($healthToken) { $headers["x-health-token"] = $healthToken }
Invoke-RestMethod -Method Get -Uri "$baseUrl/health" -Headers $headers | Out-Null

& $log "Voice upload (base64)"
$voiceContent = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("test voice content"))
$voicePayload = @{
  tenantId = $tenantId
  fileBase64 = $voiceContent
  filename = "voice.txt"
  contentType = "text/plain"
} | ConvertTo-Json
$voiceResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/voice/upload" -ContentType "application/json" -Body $voicePayload
$fileId = $voiceResp.fileId
if (-not $fileId) { throw "voice upload failed: no fileId" }

& $log "Voice intent (mock STT recommended)"
$intentPayload = @{
  tenantId = $tenantId
  fileId = $fileId
  text = "записаться на услугу service:svc-cut 2026-01-27T09:00:00Z"
} | ConvertTo-Json
$intentResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/voice/intent" -ContentType "application/json" -Body $intentPayload
if (-not $intentResp.intent) { throw "voice intent failed" }

& $log "Inventory intake (items in JSON)"
$intakePayload = @{
  tenantId = $tenantId
  items = @(
    @{ sku = "shampoo"; name = "Shampoo"; qty = 2; unit = "pcs" },
    @{ sku = "mask"; name = "Mask"; qty = 1; unit = "pcs" }
  )
} | ConvertTo-Json
$intakeResp = Invoke-RestMethod -Method Post -Uri "$baseUrl/inventory/intake" -ContentType "application/json" -Body $intakePayload
$draftId = $intakeResp.draftId
if (-not $draftId) { throw "intake failed: no draftId" }

& $log "Inventory confirm"
$confirmPayload = @{
  tenantId = $tenantId
  draftId = $draftId
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/inventory/intake/confirm" -ContentType "application/json" -Body $confirmPayload | Out-Null

& $log "Inventory consume"
$consumePayload = @{
  tenantId = $tenantId
  bookingId = "booking-smoke-1"
  items = @(
    @{ sku = "shampoo"; name = "Shampoo"; qty = 1; unit = "pcs" }
  )
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/inventory/consume" -ContentType "application/json" -Body $consumePayload | Out-Null

& $log "Inventory reconcile"
$reconcilePayload = @{
  tenantId = $tenantId
  items = @(
    @{ sku = "shampoo"; qtyPhysical = 5 },
    @{ sku = "mask"; qtyPhysical = 3 }
  )
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/inventory/reconcile" -ContentType "application/json" -Body $reconcilePayload | Out-Null

& $log "Feedback request (enqueue send optional)"
$feedbackReq = @{
  tenantId = $tenantId
  bookingId = "booking-smoke-1"
  channel = $channel
  to = $to
  message = "Оцените качество услуги"
  idempotencyKey = "fb-req-$([Guid]::NewGuid().ToString())"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/feedback/request" -ContentType "application/json" -Body $feedbackReq | Out-Null

& $log "Feedback submit"
$feedbackSubmit = @{
  tenantId = $tenantId
  bookingId = "booking-smoke-1"
  rating = 5
  comment = "Все отлично"
  staffId = "staff-1"
  serviceId = "svc-cut"
  channel = $channel
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$baseUrl/feedback/submit" -ContentType "application/json" -Body $feedbackSubmit | Out-Null

& $log "KPI summary"
$kpiSummary = Invoke-RestMethod -Method Get -Uri "$baseUrl/kpi/summary?tenantId=$tenantId&period=day"
if (-not $kpiSummary.metrics) { throw "kpi summary failed" }

& $log "KPI staff"
$kpiStaff = Invoke-RestMethod -Method Get -Uri "$baseUrl/kpi/staff/staff-1?tenantId=$tenantId&period=day"
if (-not $kpiStaff.metrics) { throw "kpi staff failed" }

& $log "Smoke (no DB) OK"
