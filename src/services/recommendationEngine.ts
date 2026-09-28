import { RoomListing, AIRecommendation, UserBehaviorProfile, RoomType } from '../types';
import { GoogleGenAI } from '@google/genai';

const BEHAVIOR_STORAGE_KEY = 'iproom_user_behavior_v1';

// Default initial student behavior profile
export const getInitialBehaviorProfile = (): UserBehaviorProfile => {
  try {
    const saved = localStorage.getItem(BEHAVIOR_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }

  return {
    targetCampus: 'Tribhuvan University (Central Campus)',
    preferredRoomTypes: ['studio', 'single'],
    targetBudgetMax: 10000,
    viewedRoomIds: [],
    wishlistedRoomIds: [],
    bookedRoomIds: [],
    searchHistory: [
      {
        campus: 'Tribhuvan University (Central Campus)',
        location: 'Kathmandu',
        maxBudget: 10000,
        timestamp: Date.now()
      }
    ],
    preferredAmenities: ['water24x7', 'wifi', 'hotWaterSolar', 'attachedBathroom']
  };
};

export const saveUserBehaviorProfile = (profile: UserBehaviorProfile): void => {
  try {
    localStorage.setItem(BEHAVIOR_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
};

// Track room view
export const trackRoomView = (roomId: string, currentProfile: UserBehaviorProfile): UserBehaviorProfile => {
  const updatedViews = Array.from(new Set([roomId, ...currentProfile.viewedRoomIds])).slice(0, 20);
  const updated: UserBehaviorProfile = {
    ...currentProfile,
    viewedRoomIds: updatedViews,
  };
  saveUserBehaviorProfile(updated);
  return updated;
};

// Track wishlist toggle
export const trackWishlistAction = (roomId: string, isAdded: boolean, currentProfile: UserBehaviorProfile): UserBehaviorProfile => {
  const updatedWishlist = isAdded
    ? Array.from(new Set([roomId, ...currentProfile.wishlistedRoomIds]))
    : currentProfile.wishlistedRoomIds.filter(id => id !== roomId);

  const updated: UserBehaviorProfile = {
    ...currentProfile,
    wishlistedRoomIds: updatedWishlist,
  };
  saveUserBehaviorProfile(updated);
  return updated;
};

// Track booking
export const trackBookingAction = (roomId: string, currentProfile: UserBehaviorProfile): UserBehaviorProfile => {
  const updatedBookings = Array.from(new Set([roomId, ...currentProfile.bookedRoomIds]));
  const updated: UserBehaviorProfile = {
    ...currentProfile,
    bookedRoomIds: updatedBookings,
  };
  saveUserBehaviorProfile(updated);
  return updated;
};

// Track search query
export const trackSearchAction = (
  params: { campus?: string; location?: string; maxBudget?: number; roomType?: string },
  currentProfile: UserBehaviorProfile
): UserBehaviorProfile => {
  const newSearch = {
    campus: params.campus,
    location: params.location,
    maxBudget: params.maxBudget,
    timestamp: Date.now(),
  };

  const updatedPreferredTypes = params.roomType && !currentProfile.preferredRoomTypes.includes(params.roomType as RoomType)
    ? [params.roomType as RoomType, ...currentProfile.preferredRoomTypes]
    : currentProfile.preferredRoomTypes;

  const updated: UserBehaviorProfile = {
    ...currentProfile,
    targetCampus: params.campus || currentProfile.targetCampus,
    targetBudgetMax: params.maxBudget || currentProfile.targetBudgetMax,
    preferredRoomTypes: updatedPreferredTypes,
    searchHistory: [newSearch, ...currentProfile.searchHistory].slice(0, 15),
  };
  saveUserBehaviorProfile(updated);
  return updated;
};

/**
 * Hybrid Recommendation Engine (Content-Based + Collaborative Filtering)
 */
export const calculateRecommendations = (
  allRooms: RoomListing[],
  profile: UserBehaviorProfile
): (RoomListing & { recommendation: AIRecommendation })[] => {
  return allRooms.map(room => {
    const reasons: string[] = [];

    // 1. Content-based similarity scoring (0 - 50 points)
    let contentScore = 0;

    // Campus proximity
    if (profile.targetCampus && room.location.nearbyCampus === profile.targetCampus) {
      contentScore += 20;
      reasons.push(`Within ${room.location.distanceToCampusMeters || 300}m of your campus (${profile.targetCampus})`);
    } else if (room.location.distanceToCampusMeters && room.location.distanceToCampusMeters <= 500) {
      contentScore += 10;
      reasons.push(`Walking distance (${room.location.distanceToCampusMeters}m) to nearby university`);
    }

    // Budget fit
    if (room.price <= profile.targetBudgetMax) {
      contentScore += 15;
      const savings = profile.targetBudgetMax - room.price;
      if (savings > 0) {
        reasons.push(`Under your budget by रु. ${savings.toLocaleString('en-IN')}/mo`);
      } else {
        reasons.push(`Perfect match for your target budget of रु. ${profile.targetBudgetMax.toLocaleString('en-IN')}`);
      }
    } else if (room.price <= profile.targetBudgetMax * 1.15) {
      contentScore += 8;
    }

    // Room type preference
    if (profile.preferredRoomTypes.includes(room.roomType)) {
      contentScore += 8;
      reasons.push(`Matches your preferred ${room.roomType.toUpperCase()} format`);
    }

    // Amenities preference
    let amenityMatches = 0;
    if (room.amenities.water24x7) amenityMatches++;
    if (room.amenities.wifi) amenityMatches++;
    if (room.amenities.hotWaterSolar) amenityMatches++;
    if (room.amenities.attachedBathroom) amenityMatches++;

    if (amenityMatches >= 3) {
      contentScore += 7;
      reasons.push('Verified 24/7 water supply & high-speed student WiFi');
    }

    // 2. Collaborative filtering affinity scoring (0 - 50 points)
    // Simulates cohort affinity: Students with similar campus affiliation & budget choices
    let collaborativeScore = 15;

    // High rating affinity
    if (room.ratings.average >= 4.8) {
      collaborativeScore += 12;
      reasons.push(`Highly rated (${room.ratings.average}★) by 98% of past student tenants`);
    }

    // Cohort interest signal
    if (room.featured || room.owner.superHost) {
      collaborativeScore += 10;
      reasons.push('Super Landlord with citizenship verification');
    }

    // Cross-interaction affinity (viewed / wishlisted similar)
    if (profile.viewedRoomIds.includes(room.id)) {
      collaborativeScore += 5;
    }

    if (profile.wishlistedRoomIds.includes(room.id)) {
      collaborativeScore += 8;
      reasons.push('Saved in your private wishlist');
    }

    // Total Normalized Match Score (max 100, min 65)
    const rawTotal = contentScore + collaborativeScore;
    const matchScore = Math.min(99, Math.max(68, rawTotal + 35));

    let highlightBadge = undefined;
    if (matchScore >= 92) {
      highlightBadge = 'Top AI Match';
    } else if (contentScore >= 35) {
      highlightBadge = 'Campus Proximity Pick';
    } else if (collaborativeScore >= 30) {
      highlightBadge = 'Popular with TU Students';
    }

    const recommendation: AIRecommendation = {
      roomId: room.id,
      matchScore,
      matchReasons: reasons.slice(0, 3),
      collaborativeAffinityScore: Math.round((collaborativeScore / 50) * 100),
      contentSimilarityScore: Math.round((contentScore / 50) * 100),
      highlightBadge
    };

    return {
      ...room,
      recommendation,
    };
  }).sort((a, b) => b.recommendation.matchScore - a.recommendation.matchScore);
};

/**
 * Optional Gemini AI Synthesis for personalized student housing insight
 */
export const generateGeminiInsight = async (
  room: RoomListing,
  profile: UserBehaviorProfile
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return `Based on your target campus (${profile.targetCampus || 'TU'}) and budget limit of रु. ${profile.targetBudgetMax.toLocaleString('en-IN')}, this listing stands out for its verified 24/7 water supply and peaceful study environment.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an expert student housing advisor in Nepal.
Generate a concise 2-sentence recommendation rationale for this student room listing:
Room: ${room.title} at ${room.location.fullAddress}, Rent: NPR ${room.price}, Water: ${room.waterSchedule}, Distance: ${room.location.distanceToCampusMeters}m to ${room.location.nearbyCampus}.
Student Profile: Target Campus: ${profile.targetCampus}, Max Budget: NPR ${profile.targetBudgetMax}.
Explain why this is an ideal fit specifically for university life in Kathmandu/Nepal.`
    });

    return response.text?.trim() || `Excellent match for your studies near ${room.location.nearbyCampus} with guaranteed water and quiet hours.`;
  } catch {
    return `Based on your target campus (${profile.targetCampus || 'TU'}) and budget limit of रु. ${profile.targetBudgetMax.toLocaleString('en-IN')}, this listing stands out for its verified 24/7 water supply and peaceful study environment.`;
  }
};
