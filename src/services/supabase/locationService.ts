import { supabase } from '../../lib/supabase';
import { NEPAL_PROVINCES, ProvinceData } from '../../data/nepalGeo';

export interface LocationProvince {
  id: number;
  nameEn: string;
  nameNp: string;
}

export interface LocationDistrict {
  id: number;
  provinceId: number;
  nameEn: string;
  nameNp: string;
}

export interface LocationMunicipality {
  id: number;
  districtId: number;
  nameEn: string;
  nameNp: string;
  type: string;
}

/**
 * Fetch all 7 provinces of Nepal (instant from standardized Geo dataset)
 */
export const getNepalProvinces = async (): Promise<LocationProvince[]> => {
  return NEPAL_PROVINCES.map(p => ({
    id: p.id,
    nameEn: p.nameEn,
    nameNp: p.nameNp,
  }));
};

/**
 * Fetch districts for a province by provinceId or province name
 */
export const getNepalDistricts = async (
  provinceIdOrName?: number | string
): Promise<LocationDistrict[]> => {
  let districts: LocationDistrict[] = [];
  NEPAL_PROVINCES.forEach(p => {
    if (!provinceIdOrName || p.id === provinceIdOrName || p.nameEn.toLowerCase() === String(provinceIdOrName).toLowerCase()) {
      p.districts.forEach((d, idx) => {
        districts.push({
          id: p.id * 100 + idx,
          provinceId: p.id,
          nameEn: d.nameEn,
          nameNp: d.nameNp,
        });
      });
    }
  });
  return districts;
};

/**
 * Fetch municipalities for a district
 */
export const getNepalMunicipalities = async (
  districtNameOrId: string | number
): Promise<LocationMunicipality[]> => {
  const results: LocationMunicipality[] = [];
  NEPAL_PROVINCES.forEach(p => {
    p.districts.forEach(d => {
      if (d.nameEn.toLowerCase() === String(districtNameOrId).toLowerCase()) {
        d.municipalities.forEach((m, idx) => {
          results.push({
            id: idx + 1,
            districtId: 1,
            nameEn: m.nameEn,
            nameNp: m.nameNp,
            type: m.type,
          });
        });
      }
    });
  });
  return results;
};
