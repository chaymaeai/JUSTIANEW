/** Product IDs kept in data but omitted from public marketing UI. */
export const HIDDEN_SOLUTION_IDS = new Set<string>(["locaris", "compania"]);

/** Display names matching `Solution.name` / home cards (uppercase). */
export const HIDDEN_SOLUTION_NAMES = new Set<string>(["LOCARIS", "COMPANIA"]);

export function isSolutionIdHidden(id: string): boolean {
  return HIDDEN_SOLUTION_IDS.has(id);
}

export function isSolutionNameHidden(name: string): boolean {
  return HIDDEN_SOLUTION_NAMES.has(name);
}
