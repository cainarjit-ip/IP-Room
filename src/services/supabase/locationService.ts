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
 * Fetch all 7 provinces of Nepal from Supabase (with local fallback)
 */
export const getNepalProvinces = async (): Promise<LocationProvince[]> => {
  try {
    const { data, error } = await (supabase
      .from('nepal_provinces')
      .select('*')
      .order('id', { ascending: true }) as any);

    if (error || !data || data.length === 0) {
      return NEPAL_PROVINCES.map(p => ({
        id: p.id,
        nameEn: p.nameEn,
        nameNp: p.nameNp,
      }));
    }

    return data.map((row: any) => ({
      id: row.id,
      nameEn: row.name_en,
      nameNp: row.name_np,
    }));
  } catch (err) {
    return NEPAL_PROVINCES.map(p => ({
      id: p.id,
      nameEn: p.nameEn,
      nameNp: p.nameNp,
    }));
  }
};

/**
 * Fetch districts for a province by provinceId or province name
 */
export const getNepalDistricts = async (
  provinceIdOrName?: number | string
): Promise<LocationDistrict[]> => {
  try {
    let query = supabase.from('nepal_districts').select('*').order('name_en', { ascending: true });

    if (typeof provinceIdOrName === 'number') {
      query = query.eq('province_id', provinceIdOrName);
    }

    const { data, error } = await (query as any);

    if (error || !data || data.length === 0) {
      // Fallback to NEPAL_PROVINCES
      let districts: LocationDistrict[] = [];
      NEPAL_PROVINCES.forEach(p => {
        if (!provinceIdOrName || p.id === provinceIdOrName || p.nameEn === provinceIdOrName) {
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
    }

    return data.map((row: any) => ({
      id: row.id,
      provinceId: row.province_id,
      nameEn: row.name_en,
      nameNp: row.name_np,
    }));
  } catch (err) {
    return [];
  }
};

/**
 * Fetch municipalities for a district
 */
export const getNepalMunicipalities = async (
  districtNameOrId: string | number
): Promise<LocationMunicipality[]> => {
  try {
    let query = supabase
      .from('nepal_municipalities')
      .select('*')
      .order('name_en', { ascending: true });

    if (typeof districtNameOrId === 'number') {
      query = query.eq('district_id', districtNameOrId);
    }

    const { data, error } = await (query as any);

    if (error || !data || data.length === 0) {
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
    }

    return data.map((row: any) => ({
      id: row.id,
      districtId: row.district_id,
      nameEn: row.name_en,
      nameNp: row.name_np,
      type: row.type,
    }));
  } catch (err) {
    return [];
  }
};
