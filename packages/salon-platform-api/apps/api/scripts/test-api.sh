#!/bin/bash

# Salon Platform API Integration Tests
# Usage: ./scripts/test-api.sh

BASE_URL="${API_URL:-http://localhost:3000/api/v1}"
TENANT_ID="${TENANT_ID:-370bbc13-1d21-448a-9f2e-3c43ee91aa04}"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        SALON PLATFORM API INTEGRATION TESTS               ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  Base URL: $BASE_URL"
echo "║  Tenant:   $TENANT_ID"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0

# Helper function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"
  
  if [ -z "$TOKEN" ] && [ "$endpoint" != "/auth/login" ]; then
    echo "⚠️  Skipping $name - no token"
    return
  fi
  
  local auth_header=""
  if [ -n "$TOKEN" ]; then
    auth_header="-H \"Authorization: Bearer $TOKEN\""
  fi
  
  local response
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data" 2>/dev/null)
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data" 2>/dev/null)
  fi
  
  local status_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$status_code" = "$expected_status" ]; then
    echo "✅ $name (HTTP $status_code)"
    ((PASSED++))
  else
    echo "❌ $name - Expected $expected_status, got $status_code"
    echo "   Response: $(echo "$body" | head -c 200)"
    ((FAILED++))
  fi
}

# ============ AUTH TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 AUTHENTICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@beautysalon.ru\",\"password\":\"admin123\",\"tenantId\":\"$TENANT_ID\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.tokens.accessToken')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "✅ Login successful"
  ((PASSED++))
else
  echo "❌ Login failed"
  echo "   Response: $LOGIN_RESPONSE"
  ((FAILED++))
  exit 1
fi

# Invalid login
INVALID_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"wrong@email.com\",\"password\":\"wrong\",\"tenantId\":\"$TENANT_ID\"}")

if [ "$INVALID_LOGIN" = "401" ]; then
  echo "✅ Invalid login rejected (401)"
  ((PASSED++))
else
  echo "❌ Invalid login should return 401, got $INVALID_LOGIN"
  ((FAILED++))
fi

# ============ TENANTS TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏢 TENANTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Get tenant by ID" "GET" "/tenants/$TENANT_ID" "" "200"
test_endpoint "Get tenant by slug" "GET" "/tenants/slug/beauty-salon-demo" "" "200"

# ============ BRANCHES TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏪 BRANCHES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "List branches" "GET" "/branches" "" "200"

# Get branch ID from list
BRANCH_ID=$(curl -s "$BASE_URL/branches" -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
if [ -n "$BRANCH_ID" ] && [ "$BRANCH_ID" != "null" ]; then
  test_endpoint "Get branch by ID" "GET" "/branches/$BRANCH_ID" "" "200"
fi

# ============ EMPLOYEES TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👥 EMPLOYEES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "List employees" "GET" "/employees" "" "200"

EMPLOYEE_ID=$(curl -s "$BASE_URL/employees" -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
if [ -n "$EMPLOYEE_ID" ] && [ "$EMPLOYEE_ID" != "null" ]; then
  test_endpoint "Get employee by ID" "GET" "/employees/$EMPLOYEE_ID" "" "200"
fi

# ============ SERVICES TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💇 SERVICES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "List services" "GET" "/services" "" "200"
test_endpoint "List service categories" "GET" "/services/categories/list" "" "200"

SERVICE_ID=$(curl -s "$BASE_URL/services" -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')
if [ -n "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ]; then
  test_endpoint "Get service by ID" "GET" "/services/$SERVICE_ID" "" "200"
fi

# ============ CLIENTS TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👤 CLIENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Search clients" "GET" "/clients/search?query=" "" "200"

# Create client
NEW_CLIENT=$(curl -s -X POST "$BASE_URL/clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"tenantId\":\"$TENANT_ID\",\"name\":\"Test Client\",\"phone\":\"+79999999999\",\"email\":\"test@test.com\"}")

CLIENT_ID=$(echo "$NEW_CLIENT" | jq -r '.id')
if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
  echo "✅ Create client"
  ((PASSED++))
  test_endpoint "Get client by ID" "GET" "/clients/$CLIENT_ID" "" "200"
else
  echo "❌ Create client failed"
  ((FAILED++))
fi

# ============ BOOKING TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 BOOKING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$EMPLOYEE_ID" ] && [ -n "$SERVICE_ID" ]; then
  test_endpoint "Get available slots" "GET" "/booking/slots?employeeId=$EMPLOYEE_ID&serviceId=$SERVICE_ID&date=2025-12-20" "" "200"
fi

# ============ PAYMENTS TESTS ============
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💳 PAYMENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Get payment settings" "GET" "/payments/settings/$TENANT_ID" "" "200"
test_endpoint "Get payments by tenant" "GET" "/payments/tenant/$TENANT_ID" "" "200"

# ============ SUMMARY ============
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                           ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  ✅ Passed: $PASSED"
echo "║  ❌ Failed: $FAILED"
echo "║  Total:    $((PASSED + FAILED))"
echo "╚═══════════════════════════════════════════════════════════╝"

if [ $FAILED -gt 0 ]; then
  exit 1
fi
