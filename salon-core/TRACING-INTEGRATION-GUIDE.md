# Distributed Tracing Integration Guide

## 🔍 Jaeger Tracing Setup

### Overview

Distributed tracing позволяет отслеживать requests через все микросервисы и понимать:
- Где происходят bottlenecks
- Какие операции занимают больше всего времени
- Как requests проходят через систему
- Где происходят ошибки

### Installation

```bash
# Install Jaeger
./scripts/6-install-jaeger.sh

# Verify
kubectl get pods -n tracing
```

### Access Jaeger UI

```bash
kubectl port-forward -n tracing svc/jaeger-query 16686:16686
# Open http://localhost:16686
```

## 📦 Application Integration

### 1. Install Dependencies

```bash
npm install @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-jaeger
```

### 2. Create Tracing Configuration

Create `src/tracing.ts`:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger-collector.tracing.svc.cluster.local:14268/api/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'salon-core',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```

### 3. Initialize in Application

Update `src/index.ts`:

```typescript
// IMPORTANT: Import tracing FIRST, before any other imports
import './tracing';

import { createApp } from './app';
// ... rest of imports

const app = createApp();
// ... rest of code
```

### 4. Add Custom Spans

For custom instrumentation:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('salon-core');

async function createBooking(data: BookingData) {
  const span = tracer.startSpan('createBooking');

  try {
    span.setAttribute('booking.salon_id', data.salonId);
    span.setAttribute('booking.client_id', data.clientId);

    // Your business logic
    const booking = await bookingService.create(data);

    span.setStatus({ code: SpanStatusCode.OK });
    return booking;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### 5. Update Dockerfile

Add environment variable:

```dockerfile
ENV JAEGER_ENDPOINT=http://jaeger-collector.tracing.svc.cluster.local:14268/api/traces
```

### 6. Update Helm Values

Add to `helm/salon-core/values.yaml`:

```yaml
env:
  - name: JAEGER_ENDPOINT
    value: "http://jaeger-collector.tracing.svc.cluster.local:14268/api/traces"
  - name: APP_VERSION
    value: "{{ .Chart.AppVersion }}"
```

## 🎯 Best Practices

### 1. Span Naming

```typescript
// Good - descriptive and hierarchical
tracer.startSpan('booking.create');
tracer.startSpan('database.query.bookings');
tracer.startSpan('external.api.calcom');

// Bad - too generic
tracer.startSpan('operation');
tracer.startSpan('query');
```

### 2. Add Meaningful Attributes

```typescript
span.setAttribute('http.method', 'POST');
span.setAttribute('http.url', '/api/bookings');
span.setAttribute('http.status_code', 201);
span.setAttribute('user.id', userId);
span.setAttribute('salon.id', salonId);
```

### 3. Record Errors

```typescript
try {
  // operation
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
}
```

### 4. Use Context Propagation

```typescript
import { context, propagation } from '@opentelemetry/api';

// Extract context from incoming request
const ctx = propagation.extract(context.active(), req.headers);

// Use context for outgoing requests
context.with(ctx, () => {
  // Make HTTP call - context will be propagated
  axios.get('http://external-service/api');
});
```

## 📊 Querying Traces

### In Jaeger UI

1. **Service**: Select `salon-core`
2. **Operation**: Select specific operation or `all`
3. **Tags**: Filter by attributes
   - `http.status_code=500` - Find errors
   - `salon.id=123` - Find traces for specific salon
4. **Lookback**: Select time range

### Common Queries

**Find slow requests:**
- Min Duration: 1s
- Limit: 100

**Find errors:**
- Tags: `error=true`
- Or: `http.status_code>=500`

**Find specific booking:**
- Tags: `booking.id=abc123`

## 🔧 Troubleshooting

### Traces not appearing

```bash
# Check Jaeger is running
kubectl get pods -n tracing

# Check application logs
kubectl logs -n production -l app=salon-core | grep -i jaeger

# Test collector endpoint
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://jaeger-collector.tracing.svc.cluster.local:14268/api/traces
```

### High overhead

```typescript
// Reduce sampling rate
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  // Sample 10% of traces
  sampler: new TraceIdRatioBasedSampler(0.1),
  // ... rest of config
});
```

## 📈 Performance Impact

- **CPU overhead**: ~1-2%
- **Memory overhead**: ~50-100MB
- **Latency overhead**: <1ms per span

For production with 10,000 salons:
- Use sampling (10-20%)
- Limit span attributes
- Use batch exporter
