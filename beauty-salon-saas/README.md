# Beauty Salon SaaS Platform

**Масштабируемая SaaS-платформа для салонов красоты с AI-агентами**

## 🎯 Executive Summary

- 🏢 **Масштаб**: 10,000 салонов (tenants)
- 👥 **Пользователи**: ~100,000 мастеров
- 📨 **Нагрузка**: 20M сообщений/день (пик)
- 🤖 **AI-автономность Level 1**: 80% запросов клиентов без человека
- 🤖 **AI-автономность Level 2**: **100% управление платформой AI**
- 🌐 **Каналы**: Telegram, WhatsApp, Instagram, VK, MAX
- 📊 **Функции**: 130+ функций

## 🚀 Tech Stack

### Backend Services
- **Booking Service**: Laravel 10 (multi-tenant-bookings-saas fork)
- **Messaging Hub**: Chatwoot + custom adapters
- **AI Orchestrator**: CrewAI (Python 3.11+) [TBD]
- **Calendar Service**: Cal.com fork (Node.js 20+) [standalone monorepo]
- **Queue Manager**: BullMQ (Node.js 20+) [TBD]

### Database & Cache
- **Primary DB**: Supabase (PostgreSQL 15+ with RLS)
- **Cache**: Redis 7+ Cluster
- **Search**: MeiliSearch (optional)

### Frontend
- **Admin Panel**: Next.js 14+ (App Router)
- **Mobile Apps**: React Native (Expo)
- **UI**: Custom design system + shadcn/ui

## 📁 Project Structure

```
beauty-salon-saas/
├── apps/
│   ├── booking-api/         # Laravel booking service
│   ├── messaging-hub/       # Chatwoot fork + adapters
│   ├── calendar-service/    # Cal.com fork (standalone monorepo, managed separately)
│   ├── ai-orchestrator/     # CrewAI agents (Python) [TBD]
│   ├── queue-manager/       # BullMQ workers [TBD]
│   ├── admin-panel/         # Next.js admin [TBD]
│   └── mobile-apps/         # React Native apps [TBD]
├── packages/
│   ├── database/            # Shared DB schemas
│   ├── types/               # TypeScript types
│   ├── ui/                  # UI components
│   └── utils/               # Shared utilities
├── infrastructure/
│   ├── kubernetes/          # K8s manifests
│   ├── terraform/           # IaC
│   └── docker/              # Dockerfiles
└── docs/
    ├── architecture/        # ADRs, diagrams
    ├── api/                 # API docs
    └── deployment/          # Deployment guides
```

## 🏗️ Open-Source Reuse (60%+)

- [multi-tenant-bookings-saas](https://github.com/Mostafa-H25/multi-tenant-bookings-saas) - Booking system (40%)
- [Chatwoot](https://github.com/chatwoot/chatwoot) - Omnichannel (60%)
- [CrewAI](https://github.com/crewAIInc/crewAI) - AI agents (100%)
- [Cal.com](https://github.com/calcom/cal.com) - Scheduling (70%)
- [BullMQ](https://github.com/taskforcesh/bullmq) - Queues (100%)
- [Supabase](https://github.com/supabase/supabase) - Database (80%)

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- PHP 8.2+
- PostgreSQL 15+
- Redis 7+
- Docker & Kubernetes (for production)

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd beauty-salon-saas
```

2. Install dependencies
```bash
npm install
```

3. Setup environment
```bash
cp .env.example .env
# Edit .env with your configurations
```

4. Setup database
```bash
# Create Supabase project
# Run migrations (TBD)
```

5. Start development servers
```bash
npm run dev
```

## 📊 Roadmap

### Week 1: Core Infrastructure
- [x] Day 1-2: Setup & Foundations
- [ ] Day 3-4: Core Booking System
- [ ] Day 5: Calendar Integration
- [ ] Day 6-7: Messaging Foundation

### Week 2: AI, Channels, MVP
- [ ] Day 8: AI Agents
- [ ] Day 9: Additional Channels (VK, MAX)
- [ ] Day 10-11: Queues & Rate Limiting
- [ ] Day 12-13: Core Features
- [ ] Day 14: Admin Panel & Testing

## 🤖 AI Agents

### Level 1: Salon → Client (80% autonomous)
- **Booking Agent**: Appointments management
- **Support Agent**: Customer support
- **Marketing Agent**: Retention campaigns

### Level 2: Platform → Owner (100% autonomous)
- **Platform Manager**: Tenant management, onboarding
- **Billing Agent**: Invoicing, payments, suspensions
- **L2 Support**: Technical issues, optimization
- **Analytics Agent**: Real-time dashboard, reports

## 🔐 Security

- **Tenant Isolation**: RLS (Row-Level Security)
- **Authentication**: Supabase Auth (JWT)
- **Data Protection**: Encrypted secrets, PII masking
- **Rate Limiting**: 3 levels (client/tenant/channel)

## 📈 Scaling Strategy

- **Phase 1** (0-1k tenants): Single DB + Redis
- **Phase 2** (1k-5k tenants): DB replicas + Redis Cluster
- **Phase 3** (5k-10k tenants): Citus extension + auto-scaling

## 📚 Documentation

- [Architecture Plan](../multi-agent-system/.claude/plans/sharded-marinating-balloon.md)
- [ADRs](./docs/architecture/) - Coming soon
- [API Documentation](./docs/api/) - Coming soon
- [Deployment Guide](./docs/deployment/) - Coming soon

## 🤝 Contributing

This project is managed by a multi-agent system:
- Product Manager
- Architect
- UX/Visual Designers
- Frontend/Backend Developers
- Tester
- Validator

See [multi-agent-system](../multi-agent-system/) for details.

## 📝 License

TBD

## 📧 Contact

TBD

---

**Built with ❤️ using 60%+ open-source code and 100% AI automation**
