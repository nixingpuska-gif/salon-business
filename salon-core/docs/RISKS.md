# Risks

- Real provider credentials missing (level: high) - owner: team - mitigation: provision secrets, configure webhooks, disable mocks, run real smoke.
- Mocks hide integration defects (level: high) - owner: team - mitigation: real E2E run for at least one tenant/channel and verify queues/DB.
- No unit tests in salon-core (level: medium) - owner: team - mitigation: add unit tests for normalization, idempotency, quiet hours, time zones.
- AGPLv3 license compliance for cal.com and erxes (level: medium) - owner: product/legal - mitigation: legal review and distribution compliance plan.
- Data localization (152-FZ) requirement (level: medium) - owner: product/legal - mitigation: RU hosting, data flow audit, security review.
- Deprecated erxes-integrations repo (level: medium) - owner: team - mitigation: migrate to erxes/integrations or archive and update docs.
