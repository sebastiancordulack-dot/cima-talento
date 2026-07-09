import { cx } from '../cx';

// Table kit (spec §6): small-caps muted headers, soft dividers, hoverable rows.
// Designed to sit inside <Card padded={false}>.
export function Table({ className, children, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table className={cx('w-full text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className, children, ...props }: React.ComponentProps<'tr'>) {
  return (
    <thead>
      <tr className={cx('border-b border-stone-100', className)} {...props}>
        {children}
      </tr>
    </thead>
  );
}

export function TBody({ className, children, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody className={cx('divide-y divide-stone-100', className)} {...props}>
      {children}
    </tbody>
  );
}

export function Tr({
  interactive = false,
  className,
  children,
  ...props
}: React.ComponentProps<'tr'> & { interactive?: boolean }) {
  return (
    <tr
      className={cx(interactive && 'transition-colors hover:bg-stone-50/70', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Th({ className, children, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cx(
        'px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-stone-400',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }: React.ComponentProps<'td'>) {
  return (
    <td className={cx('px-5 py-3 text-stone-700', className)} {...props}>
      {children}
    </td>
  );
}
