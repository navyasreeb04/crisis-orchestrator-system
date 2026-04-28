const statusStyles = {
  created: 'bg-slate-200 text-slate-700',
  analyzing: 'bg-amber-100 text-amber-800',
  searching: 'bg-orange-100 text-orange-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  in_transit: 'bg-sky-100 text-sky-800',
  resolved: 'bg-lime-100 text-lime-800',
};

export default function StatusBadge({ status }) {
  const classes = statusStyles[status] || 'bg-stone-200 text-stone-700';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classes}`}>
      {String(status || 'unknown').replace('_', ' ')}
    </span>
  );
}
