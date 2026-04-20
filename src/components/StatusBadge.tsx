import { STATUS_CONFIG } from '../constants';

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status] ?? {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs border whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {status || '—'}
    </span>
  );
}
