import React, { useState } from 'react';
import { RoommateProfile, Language } from '../types';
import { getTranslation } from '../data/translations';
import { INITIAL_ROOMMATES } from '../data/mockRoommates';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  MessageCircle,
  MessageSquare,
  Sparkles,
  MapPin,
  School,
  Moon,
  Sun,
  ShieldCheck,
  PlusCircle,
  X,
  HeartHandshake,
  Check
} from 'lucide-react';

interface RoommateFinderProps {
  language: Language;
  onOpenDirectChat: (recipientName: string, recipientRole: string) => void;
}

export const RoommateFinder: React.FC<RoommateFinderProps> = ({
  language,
  onOpenDirectChat,
}) => {
  const t = getTranslation(language);

  // User's own habit profile (for calculating compatibility)
  const [myProfile, setMyProfile] = useState<Partial<RoommateProfile>>({
    gender: 'male',
    sleepSchedule: 'night_owl',
    studyHabit: 'quiet_study',
    cleanliness: 'very_clean',
    smokingDrinking: 'strictly_no',
    dietPreference: 'any',
    targetBudgetMax: 7000,
    university: 'Tribhuvan University (Central Campus)',
    hometown: 'Pokhara',
    lookingForRoom: true,
  });

  const [roommates, setRoommates] = useState<RoommateProfile[]>(INITIAL_ROOMMATES);
  const [selectedGender, setSelectedGender] = useState<'all' | 'female' | 'male'>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [maxBudget, setMaxBudget] = useState<number>(9000);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedRoommateDetail, setSelectedRoommateDetail] = useState<RoommateProfile | null>(null);

  // Compatibility algorithm: 0 - 100%
  const calculateCompatibility = (candidate: RoommateProfile): number => {
    let score = 50; // Baseline

    // Sleep schedule match
    if (myProfile.sleepSchedule === candidate.sleepSchedule) score += 15;
    else if (myProfile.sleepSchedule === 'flexible' || candidate.sleepSchedule === 'flexible') score += 8;

    // Study habit match
    if (myProfile.studyHabit === candidate.studyHabit) score += 15;
    else if (myProfile.studyHabit === 'flexible' || candidate.studyHabit === 'flexible') score += 8;

    // Smoking / Drinking
    if (myProfile.smokingDrinking === candidate.smokingDrinking) score += 12;
    else if (myProfile.smokingDrinking === 'strictly_no' && candidate.smokingDrinking === 'strictly_no') score += 15;

    // Budget overlap
    if (candidate.targetBudgetMax <= (myProfile.targetBudgetMax || 7000)) score += 10;

    // University / Location proximity
    if (myProfile.university && candidate.university.includes(myProfile.university.split(' ')[0])) score += 10;

    // Diet match
    if (myProfile.dietPreference === candidate.dietPreference || myProfile.dietPreference === 'any' || candidate.dietPreference === 'any') score += 8;

    return Math.min(99, Math.max(65, score));
  };

  // Filtered list
  const filteredRoommates = roommates.filter(r => {
    if (selectedGender !== 'all' && r.gender !== selectedGender) return false;
    if (r.targetBudgetMax > maxBudget) return false;
    if (selectedCampus !== 'all' && !r.university.toLowerCase().includes(selectedCampus.toLowerCase())) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchUniv = r.university.toLowerCase().includes(q);
      const matchTown = r.hometown.toLowerCase().includes(q);
      const matchLoc = r.targetLocation.toLowerCase().includes(q);
      if (!matchName && !matchUniv && !matchTown && !matchLoc) return false;
    }
    return true;
  }).sort((a, b) => calculateCompatibility(b) - calculateCompatibility(a));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-xs bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-800">
              AI Roommate Matching · साथी खोज्नुहोस्
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            Find Compatible Student Roommates in Nepal
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
            Split rent and utility costs with verified students from TU, Pulchowk, KU, Shankar Dev, and Apex College based on matching study habits, sleep schedules, and lifestyle preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsProfileModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-md whitespace-nowrap self-start md:self-auto active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Edit My Living Habits</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Keyword Search */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Search by Renter or Campus
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. Pulchowk, TU, Pokhara, CSIT..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Gender Preference
            </label>
            <div className="inline-flex w-full rounded-lg bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedGender('all')}
                className={`flex-1 py-1.5 rounded-md font-medium transition ${
                  selectedGender === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('female')}
                className={`flex-1 py-1.5 rounded-md font-medium transition ${
                  selectedGender === 'female' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Girls Only
              </button>
              <button
                type="button"
                onClick={() => setSelectedGender('male')}
                className={`flex-1 py-1.5 rounded-md font-medium transition ${
                  selectedGender === 'male' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Boys Only
              </button>
            </div>
          </div>

          {/* Campus Filter */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Campus Affiliation
            </label>
            <select
              value={selectedCampus}
              onChange={e => setSelectedCampus(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="all">All Nepal Campuses</option>
              <option value="Tribhuvan">Tribhuvan University (TU Kirtipur)</option>
              <option value="Pulchowk">Pulchowk Campus (IOE)</option>
              <option value="Shankar Dev">Shankar Dev (Putalisadak)</option>
              <option value="Apex">Apex / Baneshwor Colleges</option>
              <option value="Prithvi">Prithvi Narayan (PNC Pokhara)</option>
              <option value="Chitwan">Chitwan Medical College (CMC)</option>
            </select>
          </div>

          {/* Budget Share Slider */}
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
              <span>Max Budget Share:</span>
              <span className="font-mono text-emerald-700 font-bold">
                रु. {maxBudget.toLocaleString('en-IN')}/person
              </span>
            </div>
            <input
              type="range"
              min="3000"
              max="12000"
              step="500"
              value={maxBudget}
              onChange={e => setMaxBudget(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 mt-2"
            />
          </div>
        </div>
      </div>

      {/* Roommates Grid */}
      {filteredRoommates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800">
              {language === 'np' ? 'कुनै साथी प्रोफाइल भेटिएन' : 'No Roommate Profiles Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {language === 'np'
                ? 'तपाईंको कलेज नजिकै कोठा शेयर गर्न मिल्ने साथी खोज्न आफ्नो अध्ययन बानी र प्राथमिकताहरू सहितको प्रोफाइल पोस्ट गर्नुहोस्।'
                : 'Be the first student to publish your study habits, wake-up schedule, and campus preferences to find compatible roommates.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'np' ? 'मेरो प्रोफाइल पोस्ट गर्नुहोस्' : 'Post Your Roommate Profile'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoommates.map(profile => {
          const compatibilityScore = calculateCompatibility(profile);

          return (
            <div
              key={profile.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                {/* Header: Photo, Name, University */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-13 h-13 rounded-full object-cover border-2 border-emerald-500/20"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900">{profile.name}</h3>
                        {profile.verifiedStudent && (
                          <span title="Student ID Verified" className="text-blue-600">
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block truncate">
                        {profile.age} yrs · From {profile.hometown}
                      </span>
                    </div>
                  </div>

                  {/* Compatibility Badge */}
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-200 font-mono tabular-nums">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{compatibilityScore}% Match</span>
                    </div>
                  </div>
                </div>

                {/* Faculty & Campus */}
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <School className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{profile.university}</span>
                  </div>
                  <div className="text-slate-500 pl-5 text-[11px]">
                    {profile.faculty}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 pl-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Target: {profile.targetLocation}</span>
                  </div>
                </div>

                {/* Living Habits Micro-Grid */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    {profile.sleepSchedule === 'early_bird' ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    )}
                    <span className="capitalize">{profile.sleepSchedule.replace('_', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="capitalize">{profile.studyHabit.replace('_', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold shrink-0">🚭</span>
                    <span>
                      {profile.smokingDrinking === 'strictly_no' ? 'Non-smoker' : 'Occasional'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold shrink-0">🥗</span>
                    <span className="capitalize">{profile.dietPreference.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">
                  "{profile.bio}"
                </p>

                {/* Budget Share & Flat Status */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Budget Share</span>
                    <span className="font-mono font-bold text-slate-900">
                      रु. {profile.targetBudgetMax.toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Flat Status</span>
                    <span className="font-semibold text-emerald-700">
                      {profile.lookingForRoom ? 'Looking for flat together' : 'Has room, needs co-tenant'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex items-center gap-2">
                <a
                  href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent(`Hello ${profile.name}! I saw your roommate profile on IP Room for ${profile.university} and would like to connect.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => onOpenDirectChat(profile.name, 'student')}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Start Chat</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Edit My Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-slate-900">
                  My Living Habits & Roommate Criteria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Sleep Schedule</label>
                  <select
                    value={myProfile.sleepSchedule}
                    onChange={e => setMyProfile(prev => ({ ...prev, sleepSchedule: e.target.value as any }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="early_bird">Early Bird (Before 10 PM)</option>
                    <option value="night_owl">Night Owl (Past 12 AM)</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Study Habits</label>
                  <select
                    value={myProfile.studyHabit}
                    onChange={e => setMyProfile(prev => ({ ...prev, studyHabit: e.target.value as any }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="quiet_study">Strictly Quiet Study</option>
                    <option value="group_study">Group Study / Discussions</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Smoking / Drinking</label>
                  <select
                    value={myProfile.smokingDrinking}
                    onChange={e => setMyProfile(prev => ({ ...prev, smokingDrinking: e.target.value as any }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="strictly_no">Strictly Non-Smoker</option>
                    <option value="occasional">Occasional</option>
                    <option value="dont_mind">Don't Mind</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Diet Preference</label>
                  <select
                    value={myProfile.dietPreference}
                    onChange={e => setMyProfile(prev => ({ ...prev, dietPreference: e.target.value as any }))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="pure_veg">Pure Vegetarian Only</option>
                    <option value="non_veg">Non-Vegetarian</option>
                    <option value="any">Any Diet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">My Campus / University</label>
                <input
                  type="text"
                  value={myProfile.university || ''}
                  onChange={e => setMyProfile(prev => ({ ...prev, university: e.target.value }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Monthly Budget (NPR)</label>
                <input
                  type="number"
                  value={myProfile.targetBudgetMax || 7000}
                  onChange={e => setMyProfile(prev => ({ ...prev, targetBudgetMax: Number(e.target.value) }))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Save Habits & Recalculate Matches
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
