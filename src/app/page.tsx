'use client';

import { AppPageShell } from '@/components/app-page-shell';
import { PageHeader } from '@/components/page-header';
import { SessionList } from '@/components/session-list';
import { StartSessionForm } from '@/components/start-session-form';

export default function HomePage() {
  return (
    <AppPageShell className="animate-fade-in">
      <div className="space-y-10">
        <PageHeader
          kicker="Painel"
          title="Sessões"
          description="Gerencie conexões WhatsApp por tenant. Inicie uma nova sessão ou abra uma existente para conversar."
          actions={<StartSessionForm />}
        />
        <SessionList />
      </div>
    </AppPageShell>
  );
}
