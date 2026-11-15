import { useMemo } from 'react';

import { categoryOf, cityById, type Pro } from '../data/seed';
import { useStore } from '../store';
import { distanceKm } from './utils';

export type VisiblePro = Pro & { distance: number };

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Pros of the selected city within the radius, filtered by category/search; open first, then nearest. */
export function useVisiblePros() {
  const pros = useStore((s) => s.pros);
  const cityId = useStore((s) => s.cityId);
  const neighborhoodId = useStore((s) => s.neighborhoodId);
  const radiusKm = useStore((s) => s.radiusKm);
  const category = useStore((s) => s.category);
  const query = useStore((s) => s.query);

  return useMemo(() => {
    const city = cityById(cityId);
    const hood = city.neighborhoods.find((n) => n.id === neighborhoodId) ?? city.neighborhoods[0];
    const origin = { lat: hood.lat, lng: hood.lng };
    const q = normalize(query.trim());
    const list: VisiblePro[] = pros
      .filter((p) => p.cityId === city.id)
      .map((p) => ({ ...p, distance: distanceKm(origin, p) }))
      .filter((p) => p.distance <= radiusKm)
      .filter((p) => !category || p.category === category)
      .filter((p) => {
        if (!q) return true;
        const cat = categoryOf(p.category);
        return [p.name, p.neighborhood_fr, p.neighborhood_ar, cat.name_fr, cat.name_ar, ...p.services.map((s) => s.title_fr)]
          .map(normalize)
          .some((f) => f.includes(q));
      })
      .sort((a, b) => (a.isOpen === b.isOpen ? a.distance - b.distance : a.isOpen ? -1 : 1));
    return { pros: list, origin, city, hood };
  }, [pros, cityId, neighborhoodId, radiusKm, category, query]);
}
