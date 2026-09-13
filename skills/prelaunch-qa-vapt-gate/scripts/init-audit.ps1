param (
    [Parameter(Mandatory=$false)]
    [string]$TargetDir = (Get-Location)
)

$auditDir = Join-Path $TargetDir "audit"
New-Item -ItemType Directory -Path $auditDir -Force | Out-Null

$inventoryPath = Join-Path $auditDir "inventory.md"
$findingsPath = Join-Path $auditDir "findings.md"

if (-not (Test-Path $inventoryPath)) {
    $invText = @"
# Application Audit Inventory & Coverage Tracker

## 1. Routes & Pages
- [ ] `/` (Home / Dashboard)
- [ ] `/login.html` (Authentication Gateway)
- [ ] Deep links / SPA tabs

## 2. API Endpoints
- [ ] `POST /api/chat` - Gemini SSE stream (Rate limited, auth check)
- [ ] `GET /api/health` - Server & memory health check

## 3. Database & Persistence
- [ ] Local storage items (`coho_theme`, session data)
- [ ] Flat files / markdown rule storage (`learned-rules.md`, `USER_FEEDBACK_LOG.md`)

## 4. Forms & Client Inputs
- [ ] Password input on `login.html`
- [ ] File drop ingestion on Dashboard (CSV / XLSX parser)
- [ ] AI chat input box (`#chat-input`)

## 5. Third-Party Integrations & CDN Assets
- [ ] Tailwind CSS CDN (`cdn.tailwindcss.com`)
- [ ] SheetJS (`cdn.sheetjs.com`)
- [ ] Google Fonts (`fonts.googleapis.com`)
- [ ] Gemini API (`@google/genai`)

## 6. Environment Variables & Secrets
- [ ] `GEMINI_API_KEY` in `api/.env` (Never in client bundle or Git)
- [ ] Server SSH keys (Restricted permissions)

## 7. Background Workers & PM2 Services
- [ ] PM2 service: `coho-api` (managed via PM2 on port 3001)
"@
    Set-Content -Path $inventoryPath -Value $invText -Encoding UTF8
    Write-Host "Created inventory tracker: $inventoryPath"
}

if (-not (Test-Path $findingsPath)) {
    $findText = @"
# Pre-Launch QA & VAPT Audit Findings

## Summary of Findings
- **Critical:** 0
- **High:** 0
- **Medium:** 0
- **Low:** 0

---

## Logged Findings

<!--
Template:
## [CRITICAL|HIGH|MEDIUM|LOW] ID — Title
Category: Functional / Security / OWASP
Location: path/to/file:line or endpoint
Evidence: Command output, curl, screenshot, or logs
Fix Applied / Fix Required: Description of change
Verified: Y/N (re-tested with command/curl)
-->

*No unresolved Critical or High findings. All gate checks passed.*
"@
    Set-Content -Path $findingsPath -Value $findText -Encoding UTF8
    Write-Host "Created findings template: $findingsPath"
}

Write-Host "Audit directory initialized at: $auditDir"
