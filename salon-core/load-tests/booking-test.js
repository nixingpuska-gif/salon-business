import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    errors: ['rate<0.1'],             // Custom error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_KEY = __ENV.ADMIN_API_TOKEN || 'test-token';

export default function () {
  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Create booking
  const bookingPayload = JSON.stringify({
    eventTypeId: 123,
    start: new Date(Date.now() + 86400000).toISOString(),
    idempotencyKey: `test-${Date.now()}-${__VU}-${__ITER}`,
    responses: {
      name: `Test User ${__VU}`,
      email: `test${__VU}@example.com`,
      timeZone: 'Europe/Moscow',
    },
  });

  const bookingRes = http.post(
    `${BASE_URL}/integrations/calcom/bookings`,
    bookingPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  check(bookingRes, {
    'booking status is 200 or 409': (r) => r.status === 200 || r.status === 409,
    'booking response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(2);

  // Test 3: Create contact
  const contactPayload = JSON.stringify({
    primaryPhone: `+7999${String(__VU).padStart(7, '0')}`,
    firstName: `User${__VU}`,
    lastName: 'Test',
  });

  const contactRes = http.post(
    `${BASE_URL}/integrations/erxes/contacts`,
    contactPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  check(contactRes, {
    'contact status is 200': (r) => r.status === 200,
    'contact response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(2);
}
