import type { ReactNode } from 'react';

export function PageHead({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h2>{title}</h2>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {children}
    </header>
  );
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
