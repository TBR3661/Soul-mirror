#!/bin/bash
# test-subscription-endpoints.sh
# Local testing script for subscription and store endpoints

# Configuration
WORKER_URL="${WORKER_URL:-http://localhost:8787}"
BEARER_TOKEN="${BEARER_TOKEN:-test-bearer-token}"

echo "================================================"
echo "Testing Soul Mirror Relay - Subscription System"
echo "================================================"
echo "Worker URL: $WORKER_URL"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_passed=0
test_failed=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4
    local auth=$5
    
    echo -n "Testing: $name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s "$url")
    else
        if [ -n "$auth" ]; then
            response=$(curl -s -X POST "$url" \
                -H "Authorization: Bearer $auth" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -X POST "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    fi
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASS${NC}"
        test_passed=$((test_passed + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Response: $response"
        test_failed=$((test_failed + 1))
        return 1
    fi
}

echo "1. BILLING ENDPOINTS"
echo "-------------------"
test_endpoint "Monthly subscription link" "${WORKER_URL}/billing/link?tier=monthly"
test_endpoint "Quarterly subscription link" "${WORKER_URL}/billing/link?tier=quarterly"
test_endpoint "Yearly subscription link" "${WORKER_URL}/billing/link?tier=yearly"
echo ""

echo "2. STORE ENDPOINTS"
echo "------------------"
test_endpoint "Store EBOOK link" "${WORKER_URL}/store/link?sku=EBOOK"
test_endpoint "Store COURSE link" "${WORKER_URL}/store/link?sku=COURSE"
echo ""

echo "3. ENTITLEMENT CHECKS"
echo "--------------------"
test_endpoint "Check new user (should have no access)" "${WORKER_URL}/entitlements/check?user_id=test_user_001"
echo ""

echo "4. ENTITLEMENT GRANTS (Admin)"
echo "-----------------------------"
test_endpoint "Grant monthly subscription" \
    "${WORKER_URL}/entitlements/grant" \
    "POST" \
    '{"user_id":"test_user_001","type":"subscription","tier":"monthly","expires_at":"2025-12-31T23:59:59Z"}' \
    "$BEARER_TOKEN"

test_endpoint "Grant EBOOK purchase" \
    "${WORKER_URL}/entitlements/grant" \
    "POST" \
    '{"user_id":"test_user_002","type":"purchase","sku":"EBOOK"}' \
    "$BEARER_TOKEN"
echo ""

echo "5. VERIFY ENTITLEMENTS"
echo "---------------------"
test_endpoint "Check user after subscription grant" "${WORKER_URL}/entitlements/check?user_id=test_user_001"
test_endpoint "Check user after purchase grant" "${WORKER_URL}/entitlements/check?user_id=test_user_002"
echo ""

echo "6. ERROR HANDLING"
echo "----------------"
echo -n "Testing: Invalid tier (should fail gracefully) ... "
response=$(curl -s "${WORKER_URL}/billing/link?tier=invalid")
if echo "$response" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ PASS${NC}"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    test_failed=$((test_failed + 1))
fi

echo -n "Testing: Missing tier parameter (should fail) ... "
response=$(curl -s "${WORKER_URL}/billing/link")
if echo "$response" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ PASS${NC}"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    test_failed=$((test_failed + 1))
fi

echo -n "Testing: Invalid SKU format (should fail) ... "
response=$(curl -s "${WORKER_URL}/store/link?sku=INVALID@SKU")
if echo "$response" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ PASS${NC}"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    test_failed=$((test_failed + 1))
fi

echo -n "Testing: Missing auth for grant (should fail) ... "
response=$(curl -s -X POST "${WORKER_URL}/entitlements/grant" \
    -H "Content-Type: application/json" \
    -d '{"user_id":"test","type":"subscription","tier":"monthly"}')
if echo "$response" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ PASS${NC}"
    test_passed=$((test_passed + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    test_failed=$((test_failed + 1))
fi

echo ""
echo "================================================"
echo "TEST SUMMARY"
echo "================================================"
echo -e "Passed: ${GREEN}${test_passed}${NC}"
echo -e "Failed: ${RED}${test_failed}${NC}"
echo "Total:  $((test_passed + test_failed))"
echo ""

if [ $test_failed -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check configuration.${NC}"
    exit 1
fi
