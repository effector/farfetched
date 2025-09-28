import { FarfetchedDeclaration, getFarfetchedMeta } from '../model/operations';

export function createOperationViewModel({
  operation,
  statuses,
  data,
  errors,
}: {
  operation: FarfetchedDeclaration;
  statuses: Record<string, unknown>;
  data: Record<string, unknown>;
  errors: Record<string, unknown>;
}) {
  const meta = getFarfetchedMeta(operation);
  const status = statuses[operation.id] ?? 'unknown';
  const dataItem = data[operation.id] ?? null;
  const errorItem = errors[operation.id] ?? null;

  return {
    type: meta.type,
    name: meta.name ?? getFactoryName(operation) ?? 'unnamed',
    status,
    data: dataItem,
    error: errorItem,
  };
}

export function getFactoryName(node: any) {
  return node?.region?.region?.meta?.name;
}

export function overlap(search?: string, name?: string): boolean {
  if (!search || !name) return true;

  if (search.length === 0) return true;

  const normalSearch = search.toLowerCase();
  const normalName = name.toLowerCase();

  return normalSearch.includes(normalName) || normalName.includes(normalSearch);
}
