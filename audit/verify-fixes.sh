SSH_CMD="ssh -p 2363 bong@34.142.222.26"
PROD_URL="https://rev.arnoldgutib.pro"
AUTH_TOKEN="c3f89002f28c39474375003faf4f51cccce5a77b515696194ba280c3b5ee4f10"

echo "========================================================"
echo "🎯 STARTING COMPREHENSIVE RE-AUDIT VERIFICATION SUITE"
echo "========================================================"

echo ""
echo "--- [1/12] Testing AUTH-001 (Chat API Authentication Gate) ---"
CODE_NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"ping"}')
echo "AUTH-001 No Auth Header HTTP Status: $CODE_NO_AUTH (Expected: 401)"

CODE_BAD_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_secret_token" \
  -d '{"message":"ping"}')
echo "AUTH-001 Bad Auth Header HTTP Status: $CODE_BAD_AUTH (Expected: 401)"

AUTH_SUCCESS_OUTPUT=$(curl -s -X POST "$PROD_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"message":"Say pong in one word"}' | head -n 4)
echo "AUTH-001 Valid Token SSE stream excerpt: $AUTH_SUCCESS_OUTPUT"

echo ""
echo "--- [2/12] Testing AUTH-002 (Plaintext Password in Frontend) ---"
PW_MATCHES=$($SSH_CMD "grep -rn 'coho@2026' /var/www/coho.arnoldgutib.pro/login.html" || true)
if [ -z "$PW_MATCHES" ]; then
  echo "AUTH-002: PASS - Plaintext password comment removed from login.html"
else
  echo "AUTH-002: FAIL - Plaintext password still found: $PW_MATCHES"
fi
$SSH_CMD "grep -rn 'coho_auth_token' /var/www/coho.arnoldgutib.pro/login.html" || true

echo ""
echo "--- [3/12] Testing INJ-001 (Git Shell Injection to Safe execFile) ---"
$SSH_CMD "grep -rn 'execFile(\"git\"' /opt/coho-app/api/server.js" || true
$SSH_CMD "grep -rn 'safeMessage' /opt/coho-app/api/server.js" || true

echo ""
echo "--- [4/12] Testing XSS-001 (DOM-based XSS Sanitization) ---"
$SSH_CMD "grep -rn 'escapeHTML(str)' /var/www/coho.arnoldgutib.pro/assets/app.js" || true
$SSH_CMD "grep -c 'this.escapeHTML(' /var/www/coho.arnoldgutib.pro/assets/app.js" || true

echo ""
echo "--- [5/12] Testing SEC-HDR-001 (Nginx Security Headers on Static Assets) ---"
STATIC_HEADERS=$(curl -sI "$PROD_URL/assets/app.js")
echo "$STATIC_HEADERS" | grep -iE 'strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|content-security-policy'

echo ""
echo "--- [6/12] Testing ERR-001 (Express Body Parser Error Handling) ---"
MALFORMED_OUTPUT=$(curl -s -i -X POST "$PROD_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  --data-raw '{"malformed_json: missing_brace')
echo "$MALFORMED_OUTPUT" | head -n 12

echo ""
echo "--- [7/12] Testing A11Y-001 (Accessible Select Labels) ---"
$SSH_CMD "grep -rn 'aria-label=.*Select.*' /var/www/coho.arnoldgutib.pro/index.html"

echo ""
echo "--- [8/12] Testing A11Y-002 (WAI-ARIA Tablist, Tab, and Tabpanel) ---"
$SSH_CMD "grep -rn 'role=\"tablist\"' /var/www/coho.arnoldgutib.pro/index.html"
$SSH_CMD "grep -rn 'role=\"tab\"' /var/www/coho.arnoldgutib.pro/index.html"
$SSH_CMD "grep -rn 'role=\"tabpanel\"' /var/www/coho.arnoldgutib.pro/index.html"
$SSH_CMD "grep -rn 'aria-selected' /var/www/coho.arnoldgutib.pro/assets/app.js"

echo ""
echo "--- [9/12] Testing DEP-001 (Outdated/Vulnerable Dependencies) ---"
$SSH_CMD "cd /opt/coho-app/api && npm audit"

echo ""
echo "--- [10/12] Testing INFO-001 (X-Powered-By Header Suppression) ---"
HEALTH_HEADERS=$(curl -sI "$PROD_URL/api/health")
if echo "$HEALTH_HEADERS" | grep -i 'x-powered-by'; then
  echo "INFO-001: FAIL - x-powered-by header present"
else
  echo "INFO-001: PASS - x-powered-by header suppressed"
fi

echo ""
echo "--- [11/12] Testing A11Y-003 (Export Dropdown ARIA Semantics) ---"
$SSH_CMD "grep -rn 'aria-haspopup=\"menu\"' /var/www/coho.arnoldgutib.pro/index.html"
$SSH_CMD "grep -rn 'role=\"menuitem\"' /var/www/coho.arnoldgutib.pro/index.html"
$SSH_CMD "grep -rn 'aria-expanded' /var/www/coho.arnoldgutib.pro/assets/app.js"

echo ""
echo "--- [12/12] Testing PERF-001 (Subresource Integrity on Third-Party CDN) ---"
$SSH_CMD "grep -rn 'xlsx.*integrity=' /var/www/coho.arnoldgutib.pro/index.html"

echo ""
echo "========================================================"
echo "🏁 RE-AUDIT VERIFICATION COMPLETED"
echo "========================================================"
