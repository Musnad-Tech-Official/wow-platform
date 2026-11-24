import type { SavedBusinessItem, SavedOfferItem } from './favorites-display';

export type FavoriteRow =
  | { kind: 'offers'; key: string; items: SavedOfferItem[] }
  | { kind: 'businesses'; key: string; items: SavedBusinessItem[] };

export function groupFavoriteRows(kind: 'offers', items: SavedOfferItem[], columns: number): FavoriteRow[];
export function groupFavoriteRows(kind: 'businesses', items: SavedBusinessItem[], columns: number): FavoriteRow[];
export function groupFavoriteRows(kind: FavoriteRow['kind'], items: SavedOfferItem[] | SavedBusinessItem[], columns: number): FavoriteRow[] {
  if (!Number.isInteger(columns) || columns < 1) throw new Error('Invalid favorites column count.');
  const rows: FavoriteRow[] = [];
  for (let i=0; i<items.length; i+=columns) {
    const key = kind + ':' + items[i]!.id;
    if (kind === 'offers') rows.push({kind,key,items:(items as SavedOfferItem[]).slice(i,i+columns)});
    else rows.push({kind,key,items:(items as SavedBusinessItem[]).slice(i,i+columns)});
  }
  return rows;
}
