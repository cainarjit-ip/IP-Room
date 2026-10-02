import React, { useState } from 'react';
import { RoomListing, AIRecommendation, Language, UserBehaviorProfile } from '../types';
import { getTranslation } from '../data/translations';
import { Sparkles, Brain, CheckCircle2, ChevronRight, School, Droplets, Zap, ArrowRight, ChevronDown } from 'lucide-react';

interface AIRecommendationsSectionProps {
  recommendedRooms: (RoomListing & { recommendation: AIRecommendation })[];
  userProfile: UserBehaviorProfile;
  language: Language;
  onSelectRoom: (room: RoomListing) => void;
  onQuickBook: (room: RoomListing) => void;
  onAdjustPreferences?: () => void;
}

export const AIRecommendationsSection: React.FC<AIRecommendationsSectionProps> = ({
  recommendedRooms,
  userProfile,
  language,
  onSelectRoom,
  onQuickBook,
  onAdjustPreferences,
}) => {
  const t = getTranslation(language);
  const [showAllMatches, setShowAllMatches] = useState(false);

  if (recommendedRooms.length === 0) return null;

  // Show up to 6 by default, or all when expanded
  const displayMatches = showAllMatches ? recommendedRooms : recommendedRooms.slice(0, 6);

  return (
    <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 rounded-2xl p-6 sm:p-8 text-white border border-emerald-900/60 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              AI Smart Recommendation Engine · नेपाल
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
              {recommendedRooms.length} Matches Found
            </span>
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
            Curated Matches for Your Student Profile
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Personalized via Content & Collaborative Filtering based on your target campus ({userProfile.targetCampus || 'TU'}) and budget limit.
          </p>
        </div>

        {onAdjustPreferences && (
          <button
            type="button"
            onClick={onAdjustPreferences}
            className="text-xs font-semibold text-emerald-300 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition border border-white/10 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            Adjust Target Campus & Budget
          </button>
        )}
      </div>

      {/* Recommended Rooms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayMatches.map(room => (
          <div
            key={room.id}
            className="bg-slate-900/90 rounded-xl overflow-hidden border border-emerald-500/30 hover:border-emerald-400/70 transition-all duration-200 flex flex-col justify-between group shadow-lg"
          >
            <div>
              {/* Image & Match Score Header */}
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-950 cursor-pointer" onClick={() => onSelectRoom(room)}>
                <img
                  src={room.images[0]}
                  alt={room.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md text-emerald-400 text-xs font-bold font-mono tabular-nums px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                  <Brain className="w-3.5 h-3.5" />
                  <span>{room.recommendation.matchScore}% Match</span>
                </div>

                {room.recommendation.highlightBadge && (
                  <div className="absolute bottom-2 left-2 bg-emerald-700/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {room.recommendation.highlightBadge}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div>
                  <span className="text-[11px] text-emerald-400 font-semibold block truncate">
                    {room.location.municipality} · Ward {room.location.ward}
                  </span>
                  <h3
                    onClick={() => onSelectRoom(room)}
                    className="font-bold text-sm text-white line-clamp-1 cursor-pointer group-hover:text-emerald-300 transition-colors"
                  >
                    {language === 'np' ? room.titleNp : room.title}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono font-bold text-base text-white tabular-nums">
                      रु. {room.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-400">{t.perMonth}</span>
                  </div>
                </div>

                {/* AI Rationale Bullets */}
                <div className="bg-white/5 rounded-lg p-2.5 border border-white/5 space-y-1.5 text-xs text-slate-300">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    Why IP Room AI Picked This:
                  </span>
                  {room.recommendation.matchReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectRoom(room)}
                className="flex-1 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Inspect Details
              </button>
              <button
                type="button"
                onClick={() => onQuickBook(room)}
                className="flex-1 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition active:scale-95 text-center shadow-xs"
              >
                Book via Escrow
              </button>
            </div>
          </div>
        ))}
      </div>

      {recommendedRooms.length > 6 && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setShowAllMatches(!showAllMatches)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition border border-white/10 cursor-pointer"
          >
            <span>
              {showAllMatches
                ? language === 'np'
                  ? 'कम सिफारिसहरू देखाउनुहोस्'
                  : 'Show Fewer Matches'
                : language === 'np'
                ? `सबै ${recommendedRooms.length} वटा सिफारिस गरिएका कोठा हेर्नुहोस्`
                : `View All ${recommendedRooms.length} Recommended Rooms`}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showAllMatches ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
};
