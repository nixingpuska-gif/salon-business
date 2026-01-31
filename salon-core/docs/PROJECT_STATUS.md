# Project Status
Date: 2026-01-27
Completion: 90% (confidence: medium)
Current stage: S1 Real test readiness (local complete)
Next stage: S2 Real test execution (real providers)
Stage counter since last audit: 3/5

Goals
- Configure real secrets and disable mocks for at least one tenant/channel
- Run end-to-end real tests across inbound -> booking -> CRM -> outbound
- Validate voice, inventory, and feedback flows with real services

Blockers
- Missing real provider credentials (channels, Cal.com, erxes)
- Cal.com webhook not configured for tenant(s)
- Tenant config incomplete (brandId, integrationIds, tokens, webhook secrets)
- STT/OCR endpoints not configured for real runs
- Production DB readiness not verified (migrations + rollups)

Risks
- See docs/RISKS.md

Notes
- Local DB bootstrap and KPI rollups are working in docker (mock mode).
- Best-on-market proof slice documented (see docs/BEST_ON_MARKET_PROOF.md).
- salon-core docs and roadmap are current as of 2026-01-27.
- erxes-integrations repo is deprecated upstream; avoid new work there.
- Local modifications exist in erxes and cal.com; track and upstream as needed.
