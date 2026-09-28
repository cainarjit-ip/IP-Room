export type Language = 'en' | 'np';

export type UserRole = 'renter' | 'owner' | 'admin';

export type RoomType = 'single' | 'shared' | '1bhk' | '2bhk' | 'studio' | 'full_flat';

export type OccupancyPreference = 'any' | 'students_only' | 'girls_only' | 'boys_only' | 'family';

/**
 * Nepal-focused identity document types supported by the profile/verification system.
 * Do not store document images as base64 in UserProfile; store secure storage URLs/IDs.
 */
export type NepalIdentityDocumentType =
  | 'citizenship'
  | 'national_id'
  | 'passport'
  | 'driving_license';

export type IdentityVerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'verified'
  | 'rejected';

export type IdentityDocumentStatus =
  | 'pending'
  | 'verified'
  | 'rejected';

export interface UserPersonalDetails {
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  permanentAddress?: string;
  currentAddress?: string;
  province?: string;
  district?: string;
  municipality?: string;
  ward?: number;
  areaLandmark?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

export interface IdentityDocument {
  id: string;
  type: NepalIdentityDocumentType;
  documentNumber?: string;
  fullNameOnDocument?: string;
  dateOfBirthOnDocument?: string;
  issueDate?: string;
  expiryDate?: string;
  issueDistrict?: string;
  documentFrontUrl?: string;
  documentBackUrl?: string;
  secureStorageId?: string;
  status: IdentityDocumentStatus;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface IdentityVerification {
  status: IdentityVerificationStatus;
  primaryDocumentType?: NepalIdentityDocumentType;
  documents: IdentityDocument[];
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  lastUpdatedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  verified: boolean;

  // Profile and Nepal identity verification
  personalDetails?: UserPersonalDetails;
  identityVerification?: IdentityVerification;

  // Existing verification flags retained for compatibility
  citizenshipVerified?: boolean;
  university?: string;
  studentIdVerified?: boolean;
}

export interface RoomAmenities {
  wifi: boolean;
  water24x7: boolean;
  hotWaterSolar: boolean;
  attachedBathroom: boolean;
  kitchenFacility: boolean;
  bikeParking: boolean;
  carParking: boolean;
  balcony: boolean;
  furnished: boolean;
  electricityBackup: boolean; // Inverter / Solar
  cctvSecurity: boolean;
}

export interface RoomLocation {
  province: string;
  provinceId: number;
  district: string;
  municipality: string;
  ward: number;
  areaLandmark: string;
  fullAddress: string;
  lat: number;
  lng: number;
  nearbyCampus?: string;
  distanceToCampusMeters?: number;
}

export interface RoomOwner {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  verified: boolean;
  superHost: boolean;
  citizenshipVerified: boolean;
  responseRate: string;
  responseTime: string;
  avatar: string;
}

export interface Review {
  id: string;
  authorName: string;
  authorUniversity?: string;
  rating: number;
  cleanliness: number;
  waterSupply: number;
  landlordBehavior: number;
  comment: string;
  date: string;
}

export interface VirtualTourHotspot {
  id: string;
  pitch: number; // Vertical angle -90 to 90
  yaw: number; // Horizontal angle -180 to 180
  targetSceneId: string;
  title: string;
  titleNp?: string;
}

export interface VirtualTourScene {
  id: string;
  title: string;
  titleNp: string;
  panoramaUrl: string;
  hotspots: VirtualTourHotspot[];
  roomTypeBadge?: string;
}

export type ListingStatus =
  | 'draft'
  | 'pending'
  | 'active'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'unpublished';

export interface ModerationLogEntry {
  id: string;
  listingId: string;
  listingTitle: string;
  action: 'approved' | 'rejected' | 'suspended' | 'unpublished' | 'restored' | 'deleted';
  previousStatus: ListingStatus;
  newStatus: ListingStatus;
  moderatorId: string;
  moderatorName: string;
  reason?: string;
  timestamp: string;
}

export interface RoomListing {
  id: string;
  title: string;
  titleNp: string;
  description: string;
  descriptionNp: string;
  price: number; // NPR per month
  deposit: number; // NPR advance
  roomType: RoomType;
  occupancyPreference: OccupancyPreference;
  images: string[];
  virtualTour?: VirtualTourScene[];
  location: RoomLocation;
  amenities: RoomAmenities;
  houseRules: string[];
  houseRulesNp: string[];
  waterSchedule: string; // e.g., "24/7 Deep Boring + Melamchi weekly"
  electricityRatePerUnit: number; // NPR per unit
  owner: RoomOwner;
  ratings: {
    average: number;
    count: number;
  };
  reviews: Review[];
  availableFrom: string;
  floor: string;
  featured: boolean;
  status: ListingStatus;
  rejectionReason?: string;
  moderatedAt?: string;
  moderatedBy?: string;
  createdAt: string;
}

export interface AIRecommendation {
  roomId: string;
  matchScore: number; // 0 - 100
  matchReasons: string[];
  collaborativeAffinityScore: number;
  contentSimilarityScore: number;
  highlightBadge?: string;
}

export interface UserBehaviorProfile {
  targetCampus?: string;
  preferredRoomTypes: RoomType[];
  targetBudgetMax: number;
  viewedRoomIds: string[];
  wishlistedRoomIds: string[];
  bookedRoomIds: string[];
  searchHistory: {
    location?: string;
    campus?: string;
    maxBudget?: number;
    timestamp: number;
  }[];
  preferredAmenities: (keyof RoomAmenities)[];
}

export interface RoommateProfile {
  id: string;
  name: string;
  avatar: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  university: string;
  faculty: string;
  hometown: string;
  targetLocation: string;
  targetBudgetMax: number;
  moveInDate: string;
  sleepSchedule: 'early_bird' | 'night_owl' | 'flexible';
  studyHabit: 'quiet_study' | 'group_study' | 'flexible';
  cleanliness: 'very_clean' | 'moderate';
  smokingDrinking: 'strictly_no' | 'occasional' | 'dont_mind';
  dietPreference: 'pure_veg' | 'non_veg' | 'any';
  pets: 'no_pets' | 'pet_friendly';
  bio: string;
  phone: string;
  whatsapp: string;
  verifiedStudent: boolean;
  lookingForRoom: boolean; // true = looking for flat together, false = already has flat looking for roommate
}

export interface BookingRequest {
  id: string;
  roomId: string;
  roomTitle: string;
  roomAddress: string;
  roomPrice: number;
  roomImage: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  tenantUniversity?: string;
  ownerId: string;
  moveInDate: string;
  durationMonths: number;
  totalMonthlyRent: number;
  securityDeposit: number;
  totalPaid: number;
  paymentMethod: 'khalti' | 'esewa' | 'card' | 'bank_transfer';
  paymentRefId: string;
  status: 'pending_approval' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  contractGenerated: boolean;
  createdAt: string;
}

export interface DisputeTicket {
  id: string;
  bookingId: string;
  roomTitle: string;
  complainantName: string;
  complainantRole: 'renter' | 'owner';
  issueType: 'deposit_refund' | 'water_shortage' | 'maintenance' | 'house_rules_violation' | 'other';
  subject: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  resolutionNotes?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isSelf: boolean;
}
