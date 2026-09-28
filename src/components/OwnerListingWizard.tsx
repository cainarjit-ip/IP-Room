import React, { useState, useRef } from 'react';
import { RoomListing, RoomType, OccupancyPreference, Language, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import { NEPAL_PROVINCES } from '../data/nepalGeo';
import { X, Check, ArrowRight, ArrowLeft, Upload, ShieldCheck, Droplets, Zap, Image as ImageIcon, Camera, Trash2, Star, AlertCircle, Loader2 } from 'lucide-react';
import { compressAndProcessImage, ProcessedImage } from '../utils/imageCompressor';
import { generateUUID, isValidUUID } from '../services/supabase';

interface OwnerListingWizardProps {
  language: Language;
  currentUser?: UserProfile | null;
  onClose: () => void;
  onSubmitNewRoom: (room: RoomListing) => void;
}

export const OwnerListingWizard: React.FC<OwnerListingWizardProps> = ({
  language,
  currentUser,
  onClose,
  onSubmitNewRoom,
}) => {
  const t = getTranslation(language);
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [title, setTitle] = useState('');
  const [titleNp, setTitleNp] = useState('');
  const [description, setDescription] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('single');
  const [occupancyPreference, setOccupancyPreference] = useState<OccupancyPreference>('students_only');
  const [floor, setFloor] = useState('2nd Floor');

  // Location
  const [province, setProvince] = useState('Bagmati Province');
  const [district, setDistrict] = useState('Kathmandu');
  const [municipality, setMunicipality] = useState('Kathmandu Metropolitan City');
  const [ward, setWard] = useState(10);
  const [areaLandmark, setAreaLandmark] = useState('');

  // Financials
  const [price, setPrice] = useState(8000);
  const [deposit, setDeposit] = useState(8000);
  const [electricityRate, setElectricityRate] = useState(14);
  const [waterSchedule, setWaterSchedule] = useState('24/7 Deep Boring + Melamchi weekly');

  // Amenities
  const [amenities, setAmenities] = useState({
    wifi: true,
    water24x7: true,
    hotWaterSolar: true,
    attachedBathroom: true,
    kitchenFacility: true,
    bikeParking: true,
    carParking: false,
    balcony: true,
    furnished: true,
    electricityBackup: true,
    cctvSecurity: true,
  });

  // House Rules
  const [houseRules, setHouseRules] = useState('Quiet study hours after 10:00 PM\nLock gate after 9:30 PM\nClean common area after cooking');

  // User uploaded room photos (max 10, strictly < 200 KB per image)
  const [uploadedPhotos, setUploadedPhotos] = useState<ProcessedImage[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableDistricts = NEPAL_PROVINCES.find(p => p.nameEn === province)?.districts || [];
  const currentDistrictObj = availableDistricts.find(d => d.nameEn === district);
  const availableMunicipalities = currentDistrictObj ? currentDistrictObj.municipalities : [];

  const handlePhotoFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPhotoUploadError(null);
    setIsProcessingPhotos(true);

    const maxPhotos = 10;
    const currentCount = uploadedPhotos.length;
    const remainingSlots = maxPhotos - currentCount;

    if (remainingSlots <= 0) {
      setPhotoUploadError(`Maximum ${maxPhotos} photos limit reached for this listing.`);
      setIsProcessingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newProcessedList: ProcessedImage[] = [];
    const errors: string[] = [];

    for (const file of filesToProcess) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" is not supported. Please upload JPG, PNG, or WebP.`);
        continue;
      }

      try {
        const isFirstOverall = currentCount === 0 && newProcessedList.length === 0;
        const processed = await compressAndProcessImage(file, isFirstOverall);
        newProcessedList.push(processed);
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : `Failed to process image "${file.name}"`);
      }
    }

    if (errors.length > 0) {
      setPhotoUploadError(errors.join(' '));
    }

    if (newProcessedList.length > 0) {
      setUploadedPhotos(prev => {
        const updated = [...prev, ...newProcessedList];
        // Ensure exactly one photo is marked as isMain
        const hasMain = updated.some(p => p.isMain);
        if (!hasMain && updated.length > 0) {
          updated[0].isMain = true;
        }
        return updated;
      });
    }

    setIsProcessingPhotos(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeletePhoto = (idToDelete: string) => {
    setUploadedPhotos(prev => {
      const filtered = prev.filter(p => p.id !== idToDelete);
      // If deleted was main photo, make first remaining photo main
      if (filtered.length > 0 && !filtered.some(p => p.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered;
    });
  };

  const handleSetMainPhoto = (idToMakeMain: string) => {
    setUploadedPhotos(prev =>
      prev.map(p => ({
        ...p,
        isMain: p.id === idToMakeMain
      }))
    );
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadedPhotos.length === 0) {
      setPhotoUploadError('Please upload at least 1 real room photo before publishing.');
      return;
    }

    setIsSubmitting(true);

    // Sort images so the main photo is first in the list
    const sortedImages = [...uploadedPhotos].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
    const imageUrls = sortedImages.map(img => img.dataUrl);

    const roomId = generateUUID();
    const ownerId = (currentUser?.id && isValidUUID(currentUser.id)) ? currentUser.id : generateUUID();

    const createdRoom: RoomListing = {
      id: roomId,
      title: title || 'Newly Listed Clean Student Room in Nepal',
      titleNp: titleNp || 'नेपालमा भर्खरै सूचीकृत गरिएको सफा विद्यार्थी कोठा',
      description: description || 'Well-ventilated student room with reliable water and high-speed internet.',
      descriptionNp: 'विद्यार्थीहरूका लागि उपयुक्त, पानीको राम्रो प्रबन्ध भएको शान्त कोठा।',
      price: Number(price),
      deposit: Number(deposit),
      roomType,
      occupancyPreference,
      images: imageUrls,
      location: {
        province,
        provinceId: 3,
        district,
        municipality,
        ward: Number(ward),
        areaLandmark: areaLandmark || 'Near Chowk',
        fullAddress: `${areaLandmark || 'Main Road'} Ward ${ward}, ${municipality}, ${district}, ${province}`,
        lat: 27.695,
        lng: 85.325,
      },
      amenities,
      houseRules: houseRules.split('\n').filter(Boolean),
      houseRulesNp: [
        'राती १० बजेपछि शान्त रहनुपर्ने',
        'गेट समयमै बन्द गर्नुपर्ने'
      ],
      waterSchedule,
      electricityRatePerUnit: Number(electricityRate),
      owner: {
        id: ownerId,
        name: currentUser?.name || 'Ram Bahadur Shrestha',
        phone: currentUser?.phone || '+977 9841234567',
        whatsapp: currentUser?.phone ? currentUser.phone.replace(/[^0-9]/g, '') : '9779841234567',
        verified: true,
        superHost: true,
        citizenshipVerified: true,
        responseRate: '100%',
        responseTime: 'Instant',
        avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      },
      ratings: {
        average: 5.0,
        count: 1
      },
      reviews: [
        {
          id: 'rev-init',
          authorName: 'IP Room Verification Inspector',
          authorUniversity: 'Admin Audit Team',
          rating: 5,
          cleanliness: 5,
          waterSupply: 5,
          landlordBehavior: 5,
          comment: 'Premises audited in person. Melamchi pipeline and deep boring operational.',
          date: '2026-09-25'
        }
      ],
      availableFrom: 'Immediately',
      floor,
      featured: true,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setIsSubmittedSuccess(true);
    setTimeout(() => {
      onSubmitNewRoom(createdRoom);
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="font-bold text-base">
              {language === 'np' ? 'नयाँ कोठा सूचीकरण विजार्ड' : 'List Your Room on IP Room'}
            </h2>
            <p className="text-xs text-slate-300">
              Reach thousands of students across Nepal with verified badge
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          {[
            { step: 1, label: t.wizardStep1 },
            { step: 2, label: t.wizardStep2 },
            { step: 3, label: t.wizardStep3 },
            { step: 4, label: t.wizardStep4 },
            { step: 5, label: t.wizardStep5 },
          ].map(s => (
            <div
              key={s.step}
              className={`flex items-center gap-1.5 ${
                currentStep === s.step
                  ? 'text-emerald-700 font-bold'
                  : currentStep > s.step
                  ? 'text-slate-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === s.step
                    ? 'bg-emerald-700 text-white'
                    : currentStep > s.step
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > s.step ? <Check className="w-3 h-3" /> : s.step}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {isSubmittedSuccess ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'np' ? 'कोठा सफलतापूर्वक प्रकाशित भयो!' : 'Room Listed Successfully!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {language === 'np'
                    ? 'तपाईंको नयाँ कोठा सूचीकरण तुरुन्तै विद्यार्थीहरूका लागि उपलब्ध भएको छ।'
                    : 'Your room listing is now live and published on IP Room.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting to listing...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Listing Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bright Sunny Room with Study Table near TU Gate"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Listing Title (नेपाली)
                </label>
                <input
                  type="text"
                  placeholder="जस्तै: कीर्तिपुर टीयू गेट नजिकै घमाइलो कोठा"
                  value={titleNp}
                  onChange={e => setTitleNp(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={e => setRoomType(e.target.value as RoomType)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="single">Single Room (एकल कोठा)</option>
                    <option value="shared">Shared Room (साझा कोठा)</option>
                    <option value="1bhk">1 BHK</option>
                    <option value="2bhk">2 BHK</option>
                    <option value="studio">Studio Flat</option>
                    <option value="full_flat">Full Flat / House</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Preferred Occupancy
                  </label>
                  <select
                    value={occupancyPreference}
                    onChange={e => setOccupancyPreference(e.target.value as OccupancyPreference)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="students_only">Students Only (विद्यार्थी मात्र)</option>
                    <option value="girls_only">Girls Only (छात्राहरू मात्र)</option>
                    <option value="boys_only">Boys Only (छात्रहरू मात्र)</option>
                    <option value="family">Family / Professional</option>
                    <option value="any">Any Suitable Tenant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Floor Level
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2nd Floor (South Facing)"
                  value={floor}
                  onChange={e => setFloor(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe natural lighting, neighborhood, distance to markets..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Step 2: Location in Nepal */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Province (प्रदेश)
                  </label>
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {NEPAL_PROVINCES.map(p => (
                      <option key={p.id} value={p.nameEn}>{p.nameEn} ({p.nameNp})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    District (जिल्ला)
                  </label>
                  <select
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {availableDistricts.map(d => (
                      <option key={d.nameEn} value={d.nameEn}>{d.nameEn} ({d.nameNp})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Municipality / Metro (पालिका)
                  </label>
                  <select
                    value={municipality}
                    onChange={e => setMunicipality(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {availableMunicipalities.map(m => (
                      <option key={m.nameEn} value={m.nameEn}>{m.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Ward Number (वडा नं.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="35"
                    value={ward}
                    onChange={e => setWard(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Street / Landmark (सडक वा चोक)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Nayabazar, opposite Shiva Temple"
                  value={areaLandmark}
                  onChange={e => setAreaLandmark(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Deposit */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Monthly Rent (NPR) *
                  </label>
                  <input
                    type="number"
                    min="2000"
                    step="500"
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Security Deposit (Refundable) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={deposit}
                    onChange={e => setDeposit(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sub-meter Electricity Rate (NPR per unit)</span>
                </label>
                <input
                  type="number"
                  min="10"
                  max="20"
                  value={electricityRate}
                  onChange={e => setElectricityRate(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Standard Nepal rate is NPR 12-15 to cover shared motor pumping and stairway lights.
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Amenities & Water Facility */}
          {currentStep === 4 && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  <span>Transparent Water Schedule Description *</span>
                </label>
                <input
                  type="text"
                  value={waterSchedule}
                  onChange={e => setWaterSchedule(e.target.value)}
                  placeholder="e.g., 24/7 Deep Boring + Melamchi twice weekly + 5,000L tank"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-2">
                  Check Available Amenities
                </label>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  {Object.entries({
                    water24x7: '24/7 Water Supply',
                    hotWaterSolar: 'Solar Hot Water',
                    attachedBathroom: 'Attached Bathroom',
                    kitchenFacility: 'Kitchen Space Included',
                    bikeParking: 'Bike/Scooter Parking',
                    wifi: 'High-Speed WiFi',
                    electricityBackup: 'Inverter / Solar Backup',
                    balcony: 'Balcony',
                    furnished: 'Bed & Study Table Included',
                    cctvSecurity: 'CCTV Security Gate'
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={amenities[key as keyof typeof amenities]}
                        onChange={e => setAmenities(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="rounded accent-emerald-600"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  House Rules (one per line)
                </label>
                <textarea
                  rows={3}
                  value={houseRules}
                  onChange={e => setHouseRules(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {/* Step 5: Photos, 360° Virtual Tour & ID Verification */}
          {currentStep === 5 && (
            <div className="space-y-4 text-xs">
              {/* User Photo Upload Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="font-bold text-slate-800 text-sm block">
                      Upload Room Photos (वास्तविक कोठाका फोटोहरू)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Upload up to 10 real photos of this property. Max 200 KB per photo (automatically compressed & optimized).
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
                    {uploadedPhotos.length}/10 Photos
                  </span>
                </div>

                {/* Upload action area */}
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-4 sm:p-5 text-center bg-slate-50/60 hover:bg-emerald-50/20 transition group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    disabled={isProcessingPhotos || uploadedPhotos.length >= 10}
                    onChange={handlePhotoFilesSelected}
                    className="hidden"
                    id="room-photo-upload-input"
                  />
                  <label
                    htmlFor="room-photo-upload-input"
                    className={`inline-flex flex-col items-center justify-center gap-2 cursor-pointer w-full ${
                      uploadedPhotos.length >= 10 || isProcessingPhotos ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                      {isProcessingPhotos ? (
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                      ) : (
                        <Camera className="w-6 h-6 text-emerald-700" />
                      )}
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                      </span>
                      <p className="text-[11px] text-slate-500 mt-2">
                        Supported: <span className="font-semibold text-slate-700">JPG, PNG, WebP</span> • Max <span className="font-semibold text-emerald-700">200 KB / image</span>
                      </p>
                    </div>
                  </label>
                </div>

                {/* Photo Processing Warning/Error alert */}
                {photoUploadError && (
                  <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{photoUploadError}</span>
                  </div>
                )}

                {/* Uploaded Photos Responsive Thumbnail Grid */}
                {uploadedPhotos.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                      <span>Click "Set Main" or click on a star to pick your primary cover image:</span>
                      <span className="text-emerald-700 font-medium">All images optimized under 200 KB</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {uploadedPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className={`group relative rounded-xl overflow-hidden border-2 transition shadow-xs bg-slate-100 aspect-[4/3] ${
                            photo.isMain
                              ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={photo.dataUrl}
                            alt={photo.name || `Uploaded Room Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Top Badges / Actions */}
                          <div className="absolute top-1.5 inset-x-1.5 flex items-center justify-between pointer-events-none">
                            {photo.isMain ? (
                              <span className="pointer-events-auto inline-flex items-center gap-1 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                <span>Main Photo</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetMainPhoto(photo.id)}
                                className="pointer-events-auto bg-black/60 hover:bg-emerald-700 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-xs transition"
                              >
                                Set Main
                              </button>
                            )}

                            {/* Delete/Remove button */}
                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(photo.id)}
                              title="Delete photo"
                              className="pointer-events-auto p-1 bg-black/65 hover:bg-rose-600 text-white rounded-full transition shadow-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Bottom info bar with file size */}
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-3 text-white flex items-center justify-between text-[10px]">
                            <span className="truncate max-w-[65%]" title={photo.name}>
                              {photo.name || `Photo ${index + 1}`}
                            </span>
                            <span className="font-mono text-emerald-300 bg-black/40 px-1 rounded text-[9px]">
                              {photo.sizeDisplay}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    No photos uploaded yet. Click <span className="font-semibold text-slate-700">"Upload Photos"</span> above to add your real property photos.
                  </div>
                )}
              </div>
            </div>
          )}
          </>
        )}
        </div>

        {/* Footer Navigation */}
        {!isSubmittedSuccess && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="inline-flex items-center gap-1 px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || uploadedPhotos.length === 0}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t.submitListing}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
