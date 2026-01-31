# Integration Map

## Sources of truth
- Booking & availability: Cal.com
- CRM, contacts, campaigns: erxes
- Tenancy mapping and orchestration: salon-core (+ tenant config file for per-salon bot tokens)

## Entity mapping
- tenant_id (salon-core) ↔ brand_id (erxes) ↔ team_id (cal.com) via tenant config
- client_id (salon-core) ↔ contact_id (erxes)
- appointment_id (salon-core) ↔ booking_id (cal.com)
- message_id (salon-core) ↔ conversation_id (erxes)

## Flow: booking
1) Inbound message → salon-core webhook
2) salon-core resolves tenant & client
3) salon-core calls Cal.com API to create booking
4) salon-core syncs contact + note into erxes
5) salon-core enqueues confirmation via channel sender

## Flow: inbound CRM message
1) Channel → salon-core webhook
2) salon-core upserts client in erxes
3) salon-core inserts message via erxes widgetsInsertMessage (creates conversation if missing)

## Flow: campaigns
1) erxes campaign triggers → salon-core
2) salon-core rate-limits & queues send
3) sender delivers via channel provider
