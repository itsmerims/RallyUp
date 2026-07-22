import type { Player, Court, Match, FinancialConfig } from '../types';
import * as firestoreService from '../services/firestore';

export interface ExportData {
  version: number;
  exportedAt: string;
  players: Player[];
  courts: Court[];
  matches: Match[];
  financialConfig: FinancialConfig | null;
}

export function buildExportData(
  players: Player[],
  courts: Court[],
  matches: Match[],
  financialConfig: FinancialConfig,
): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    players,
    courts,
    matches,
    financialConfig,
  };
}

export function downloadExport(data: ExportData) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rallyup-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateImportData(data: unknown): { valid: true; data: ExportData } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid file format.' };
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return { valid: false, error: 'Unsupported data version.' };
  if (!Array.isArray(d.players)) return { valid: false, error: 'Missing or invalid players array.' };
  if (!Array.isArray(d.courts)) return { valid: false, error: 'Missing or invalid courts array.' };
  if (!Array.isArray(d.matches)) return { valid: false, error: 'Missing or invalid matches array.' };
  return { valid: true, data: data as ExportData };
}

export async function importData(userId: string, data: ExportData, options: { merge?: boolean } = {}): Promise<{ success: boolean; message: string }> {
  try {
    if (!options.merge) {
      await firestoreService.deleteAllPlayers(userId);
      await firestoreService.deleteAllCourts(userId);
      await firestoreService.deleteAllMatches(userId);
    }
    for (const player of data.players) {
      await firestoreService.savePlayer(userId, player);
    }
    for (const court of data.courts) {
      await firestoreService.saveCourt(userId, court);
    }
    for (const match of data.matches) {
      await firestoreService.saveMatch(userId, match);
    }
    if (data.financialConfig) {
      await firestoreService.saveFinancialConfig(userId, data.financialConfig);
    }
    return { success: true, message: `Imported ${data.players.length} players, ${data.matches.length} matches, ${data.courts.length} courts.` };
  } catch (err) {
    return { success: false, message: `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}
