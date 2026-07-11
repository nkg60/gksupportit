import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

/** Une feuille d'export : un nom d'onglet + des lignes (objets plats). */
export interface FeuilleExport {
  nom: string;
  lignes: Record<string, unknown>[];
}

/**
 * Export des données (trésorerie, interventions) en Excel (.xlsx) via SheetJS,
 * ou en CSV, pour garder une copie hors ligne.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Exporte une ou plusieurs feuilles dans un unique classeur Excel. */
  exporterXlsx(feuilles: FeuilleExport[], nomFichier: string): void {
    const classeur = XLSX.utils.book_new();
    for (const f of feuilles) {
      const feuille = XLSX.utils.json_to_sheet(f.lignes);
      XLSX.utils.book_append_sheet(classeur, feuille, f.nom.slice(0, 31));
    }
    XLSX.writeFile(classeur, this.horodater(nomFichier, 'xlsx'));
  }

  /** Exporte une seule table en CSV. */
  exporterCsv(lignes: Record<string, unknown>[], nomFichier: string): void {
    const feuille = XLSX.utils.json_to_sheet(lignes);
    const csv = XLSX.utils.sheet_to_csv(feuille);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    this.telecharger(blob, this.horodater(nomFichier, 'csv'));
  }

  /** Ajoute la date du jour au nom de fichier. */
  private horodater(base: string, ext: string): string {
    const jour = new Date().toISOString().slice(0, 10);
    return `${base}-${jour}.${ext}`;
  }

  private telecharger(blob: Blob, nom: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.click();
    URL.revokeObjectURL(url);
  }
}
