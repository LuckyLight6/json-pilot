/**
 * Starter document for the empty state. Deliberately contains a stringified
 * JSON value (`payload`) so Nested String Fold is discoverable straight away.
 */
export const SAMPLE_DOCUMENT = JSON.stringify(
  {
    service: 'checkout',
    version: 3,
    enabled: true,
    endpoints: ['/cart', '/orders', '/orders/{id}'],
    limits: { requestsPerMinute: 600, burst: 50 },
    lastEvent: {
      id: 'evt_8f21',
      receivedAt: '2026-07-26T09:14:03Z',
      payload: '{"orderId":"A-1093","total":42.5,"items":[{"sku":"TEA-01","qty":2}]}',
    },
  },
  null,
  2,
)
