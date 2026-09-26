import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const projectsDuration = new Trend('projects_list_duration');

// Test configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },     // Ramp up to 50 users
    { duration: '2m', target: 100 },    // Hold at 100 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms
    errors: ['rate<0.1'],                            // Error rate < 10%
    login_duration: ['p(95)<800'],
    projects_list_duration: ['p(95)<500'],
  },
};

// Test data
const testUser = {
  email: `loadtest_${__VU}_${__ITER}@scalix.dev`,
  password: 'LoadTest123!',
  name: `Load Test User ${__VU}`,
};

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // 2. Register
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      email: `loadtest_${__VU}_${__ITER}_${Date.now()}@scalix.dev`,
      password: 'LoadTest123!',
      name: `Load Tester ${__VU}`,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token;
  if (registerRes.status === 201) {
    token = registerRes.json('data.token');
  } else {
    errorRate.add(1);
    return;
  }

  // 3. Login
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: `loadtest_${__VU}_${__ITER}_${Date.now()}@scalix.dev`,
      password: 'LoadTest123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginDuration.add(Date.now() - loginStart);

  // 4. Get profile
  const profileRes = http.get(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
  });

  // 5. Create organization
  const orgRes = http.post(
    `${BASE_URL}/api/organizations`,
    JSON.stringify({ name: `Load Test Org ${__VU}_${__ITER}_${Date.now()}` }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  let orgId;
  if (orgRes.status === 201) {
    orgId = orgRes.json('data.id');
  } else {
    errorRate.add(1);
    sleep(1);
    return;
  }

  // 6. List projects
  const projStart = Date.now();
  const projRes = http.get(
    `${BASE_URL}/api/organizations/${orgId}/projects`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  projectsDuration.add(Date.now() - projStart);
  check(projRes, {
    'projects list status is 200': (r) => r.status === 200,
  });

  // 7. Create project
  const createProjRes = http.post(
    `${BASE_URL}/api/organizations/${orgId}/projects`,
    JSON.stringify({
      name: `Load Test Project ${Date.now()}`,
      description: 'Created during load test',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (createProjRes.status === 201) {
    const projectId = createProjRes.json('data.id');

    // 8. Create task
    http.post(
      `${BASE_URL}/api/organizations/${orgId}/tasks`,
      JSON.stringify({
        title: `Load Test Task ${Date.now()}`,
        projectId: projectId,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  errorRate.add(0);
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(
      {
        metrics: {
          http_req_duration_p50: data.metrics.http_req_duration.values['p(50)'],
          http_req_duration_p95: data.metrics.http_req_duration.values['p(95)'],
          http_req_duration_p99: data.metrics.http_req_duration.values['p(99)'],
          http_reqs: data.metrics.http_reqs.values.count,
          http_reqs_per_sec: data.metrics.http_reqs.values.rate,
          error_rate: data.metrics.errors ? data.metrics.errors.values.rate : 0,
        },
      },
      null,
      2
    ),
  };
}
