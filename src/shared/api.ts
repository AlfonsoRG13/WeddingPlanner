export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "No se pudo completar la solicitud.");
  }

  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export function getErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Ocurrió un error inesperado.";
}

export function normalizeSearch(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}
