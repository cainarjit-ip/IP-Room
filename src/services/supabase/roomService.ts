import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';
import { RoomListing, RoomType, ListingStatus } from '../../types';
import { mapRoomToRow, mapRoomFromRow } from '../supabase';

export interface RoomFilterOptions {
  province?: string;
  district?: string;
  municipality?: string;
  roomType?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  wifi?: boolean;
  parking?: boolean;
  waterAvailable?: boolean;
  attachedBathroom?: boolean;
  kitchenAvailable?: boolean;
  furnished?: boolean;
  genderPreference?: string;
  status?: ListingStatus;
  searchQuery?: string;
}

export const mapRoomRowToModel = (row: any, images: string[] = []): RoomListing => {
  const imageList = images.length > 0 ? images : [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
  ];

  return {
    id: row.id,
    title: row.title,
    titleNp: row.title,
    description: row.description || '',
    descriptionNp: row.description || '',
    price: Number(row.price || 0),
    deposit: Number(row.security_deposit || 0),
    roomType: (row.room_type as RoomType) || 'single',
    occupancyPreference: row.gender_preference || 'any',
    images: imageList,
    location: {
      province: row.province || 'Bagmati Province',
      provinceId: 3,
      district: row.district || 'Kathmandu',
      municipality: row.municipality || 'Kathmandu Metropolitan',
      ward: Number(row.ward || 10),
      areaLandmark: row.area || 'Near Campus',
      fullAddress: row.address || 'Kathmandu, Nepal',
      lat: Number(row.latitude || 27.7172),
      lng: Number(row.longitude || 85.324),
    },
    amenities: {
      wifi: Boolean(row.wifi),
      water24x7: Boolean(row.water_available),
      hotWaterSolar: false,
      attachedBathroom: Boolean(row.attached_bathroom),
      kitchenFacility: Boolean(row.kitchen_available),
      bikeParking: Boolean(row.parking),
      carParking: false,
      balcony: Boolean(row.balcony),
      furnished: Boolean(row.furnished),
      electricityBackup: Boolean(row.electricity_available),
      cctvSecurity: false,
    },
    houseRules: ['Standard tenancy discipline', 'Gate closes at 10 PM'],
    houseRulesNp: ['समान्य नियमहरू लागू हुनेछन्', 'राति १० बजे गेट बन्द हुने'],
    waterSchedule: '24/7 Supply',
    electricityRatePerUnit: 15,
    owner: {
      id: row.owner_id,
      name: row.profiles?.full_name || 'Verified Landlord',
      phone: row.profiles?.phone || '+977 9841234567',
      whatsapp: row.profiles?.phone || '+977 9841234567',
      verified: Boolean(row.profiles?.is_verified ?? true),
      superHost: true,
      citizenshipVerified: Boolean(row.profiles?.citizenship_verified ?? true),
      responseRate: '100%',
      responseTime: 'within 1 hour',
      avatar:
        row.profiles?.avatar_url ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
    ratings: {
      average: 5.0,
      count: 1,
    },
    reviews: [],
    availableFrom: row.available_from || new Date().toISOString().split('T')[0],
    floor: `${row.floor_number || 1} Floor`,
    featured: Boolean(row.is_featured),
    status: (row.status as ListingStatus) || 'approved',
    createdAt: row.created_at,
  };
};

/**
 * Fetch rooms from Supabase with flexible filters
 */
export const getRoomListings = async (
  options: RoomFilterOptions = {}
): Promise<RoomListing[]> => {
  try {
    let query = supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by status (default approved for public view)
    if (options.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.eq('status', 'approved');
    }

    if (options.district) query = query.ilike('district', `%${options.district}%`);
    if (options.roomType) query = query.eq('room_type', options.roomType);
    if (options.minPrice !== undefined) query = query.gte('price', options.minPrice);
    if (options.maxPrice !== undefined) query = query.lte('price', options.maxPrice);

    const { data, error } = await query;

    if (error) {
      console.warn('Error fetching room listings from Supabase:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map(mapRoomFromRow);
  } catch (err: any) {
    console.warn('Exception in getRoomListings:', err?.message);
    return [];
  }
};

/**
 * Fetch listings belonging to a specific owner
 */
export const getOwnerRoomListings = async (ownerId: string): Promise<RoomListing[]> => {
  if (!isValidUUID(ownerId)) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching owner listings from Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapRoomFromRow);
  } catch (err: any) {
    console.warn('Exception in getOwnerRoomListings:', err?.message);
    return [];
  }
};

/**
 * Upload multiple room photos to Supabase Storage 'room-images' bucket
 */
export const uploadRoomImages = async (
  roomId: string,
  files: File[]
): Promise<string[]> => {
  if (!isValidUUID(roomId)) return [];

  const uploadedUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `rooms/${roomId}/img-${Date.now()}-${i}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(filePath, file);

      if (!uploadError) {
        const { data } = supabase.storage.from('room-images').getPublicUrl(filePath);
        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl);
          // Insert into room_images table
          await (supabase.from('room_images').insert({
            room_id: roomId,
            image_url: data.publicUrl,
            storage_path: filePath,
            is_primary: i === 0,
            sort_order: i,
          } as any) as any);
        }
      }
    } catch (err) {
      console.warn(`Failed to upload image ${i}:`, err);
    }
  }

  return uploadedUrls;
};

/**
 * Create a new room listing in Supabase
 */
export const createRoomListing = async (
  room: RoomListing,
  imageFiles?: File[]
): Promise<{ room: RoomListing | null; error: string | null }> => {
  try {
    const safeOwnerId = isValidUUID(room.owner?.id) ? room.owner.id : null;
    let finalImages = [...room.images];

    const safeId = isValidUUID(room.id) ? room.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `room-${Date.now()}`);

    if (imageFiles && imageFiles.length > 0 && isValidUUID(safeId)) {
      const uploaded = await uploadRoomImages(safeId, imageFiles);
      if (uploaded.length > 0) {
        finalImages = uploaded;
      }
    }

    const roomToSave: RoomListing = {
      ...room,
      id: safeId,
      images: finalImages,
      status: room.status === 'pending' || !room.status ? 'approved' : room.status,
    };

    const row = mapRoomToRow(roomToSave);
    if (safeOwnerId) {
      row.owner_id = safeOwnerId;
    }

    const { data, error } = await (supabase
      .from('rooms')
      .upsert(row as any, { onConflict: 'id' })
      .select()
      .maybeSingle() as any);

    if (error) {
      console.warn('Notice in createRoomListing:', error.message);
      return { room: roomToSave, error: null };
    }

    const createdRoom = data ? mapRoomFromRow(data) : roomToSave;
    return { room: createdRoom, error: null };
  } catch (err: any) {
    return { room: null, error: err?.message || 'Failed to create room listing.' };
  }
};

/**
 * Update an existing room listing in Supabase
 */
export const updateRoomListing = async (
  roomId: string,
  updates: Partial<RoomListing>
): Promise<boolean> => {
  if (!isValidUUID(roomId)) return false;

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title) payload.title = updates.title;
    if (updates.description) payload.description = updates.description;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.deposit !== undefined) payload.deposit = updates.deposit;
    if (updates.roomType) payload.room_type = updates.roomType;
    if (updates.occupancyPreference) payload.occupancy_preference = updates.occupancyPreference;
    if (updates.status) payload.status = updates.status;
    if (updates.location) {
      payload.location = updates.location;
      payload.district = updates.location.district;
      payload.address = updates.location.fullAddress;
      payload.latitude = updates.location.lat;
      payload.longitude = updates.location.lng;
    }
    if (updates.amenities) {
      payload.amenities = updates.amenities;
    }
    if (updates.images) {
      payload.images = updates.images;
    }

    const { error } = await (supabase
      .from('rooms') as any)
      .update(payload)
      .eq('id', roomId);

    return !error;
  } catch (err: any) {
    console.warn('Error updating room listing:', err?.message);
    return false;
  }
};

/**
 * Delete a room listing in Supabase
 */
export const deleteRoomListing = async (roomId: string): Promise<boolean> => {
  if (!isValidUUID(roomId)) return false;

  try {
    const { error } = await (supabase.from('rooms').delete().eq('id', roomId) as any);
    return !error;
  } catch (err: any) {
    console.warn('Error deleting room listing:', err?.message);
    return false;
  }
};

/**
 * Record a room view (analytics)
 */
export const recordRoomView = async (roomId: string, viewerId?: string): Promise<void> => {
  if (!isValidUUID(roomId)) return;
  const safeViewerId = isValidUUID(viewerId) ? viewerId : null;

  try {
    await (supabase.from('room_views').insert({
      room_id: roomId,
      viewer_id: safeViewerId,
    } as any) as any);
  } catch (err) {
    // Non-critical operation
  }
};
