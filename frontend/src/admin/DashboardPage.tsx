import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { adminApi } from '../api/endpoints.js';
import { apiErrorMessage } from '../api/client.js';
import { Loading, ErrorState } from '../components/States.js';
import { GridIcon, LayersIcon, GaugeIcon, InboxIcon, ArrowRight } from '../components/icons.js';

function StatCard({
  label,
  value,
  to,
  icon,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  to: string;
  icon: ReactNode;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <Link to={to} className="card card-hover group relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl2 ${tone}`}>
          {icon}
        </span>
        <ArrowRight
          size={18}
          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-accent"
        />
      </div>
      <div className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
        {label}
        {highlight && value > 0 && (
          <span className="chip bg-ng-soft text-ng">needs review</span>
        )}
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminApi.dashboard,
  });

  return (
    <div>
      <div className="mb-1 eyebrow">Overview</div>
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Dashboard</h1>

      {isLoading && <Loading />}
      {error && <ErrorState message={apiErrorMessage(error)} />}
      {data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Categories"
            value={data.categories}
            to="/admin/content"
            tone="bg-accent-soft text-accent"
            icon={<GridIcon size={20} />}
          />
          <StatCard
            label="Failure types"
            value={data.failureTypes}
            to="/admin/content"
            tone="bg-slate-100 text-slate-600"
            icon={<LayersIcon size={20} />}
          />
          <StatCard
            label="Root causes"
            value={data.rootCauses}
            to="/admin/content"
            tone="bg-ok-soft text-ok"
            icon={<GaugeIcon size={20} />}
          />
          <StatCard
            label="Pending suggestions"
            value={data.pendingSuggestions}
            to="/admin/suggestions"
            tone="bg-ng-soft text-ng"
            icon={<InboxIcon size={20} />}
            highlight
          />
        </div>
      )}
    </div>
  );
}
