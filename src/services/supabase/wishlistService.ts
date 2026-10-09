import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';

/**
 * Fetch wishlisted room IDs for the authenticated user.
 * Strictly checks for authenticated session and valid UUID identifiers.
 */
export const getUserWishlistRoomIds = async (userId: string | null | undefined): Promise<string[]> => {
  if (!isValidUUID(userId)) {
    return [];
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('room_id')
      .eq('user_id', userId as string);

    if (error) {
      return [];
    }

    return (data || []).map((row: any) => row.room_id);
  } catch {
    return [];
  }
};

/**
 * Toggle room in user's wishlist in Supabase
 */
export const toggleWishlistItem = async (
  userId: string | null | undefined,
  roomId: string,
  isCurrentlyWishlisted: boolean
): Promise<boolean> => {
  if (!isValidUUID(userId) || !isValidUUID(roomId)) {
    return false;
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return false;
  }

  try {
    if (isCurrentlyWishlisted) {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId as string)
        .eq('room_id', roomId);
      return !error;
    } else {
      const { error } = await supabase
        .from('wishlists')
        .upsert(
          { user_id: userId as string, room_id: roomId } as any,
          { onConflict: 'user_id,room_id' }
        );
      return !error;
    }
  } catch (err: any) {
    console.warn('Exception in toggleWishlistItem:', err?.message);
    return false;
  }
};
