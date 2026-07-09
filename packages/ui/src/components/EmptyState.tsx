export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      {icon && (
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-stone-100 text-stone-400">
          {icon}
        </div>
      )}
      <p className="mt-3 text-sm font-medium text-stone-700">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
