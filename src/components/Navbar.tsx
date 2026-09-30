import React, { useState, useRef, useEffect } from 'react';
import { Language, UserRole, UserProfile } from '../types';
import { getTranslation } from '../data/translations';
import { NotificationCenter } from './NotificationCenter';
import { AppNotification } from '../services/supabase/notificationService';
import {
  Home,
  Heart,
  Scale,
  PlusCircle,
  ShieldCheck,
  Shield,
  Languages,
  LogIn,
  LogOut,
  UserPlus,
  ChevronDown,
  X,
  Menu,
  Map,
  Users,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: 'browse' | 'map' | 'roommates' | 'guide' | 'owner-dashboard' | 'admin-dashboard';
  setActiveTab: (tab: 'browse' | 'map' | 'roommates' | 'guide' | 'owner-dashboard' | 'admin-dashboard') => void;
  wishlistCount: number;
  onOpenWishlist: () => void;
  compareCount: number;
  onOpenCompare: () => void;
  onOpenAddListing: () => void;
  currentUser: UserProfile | null;
  onOpenAuthModal: (mode?: 'login' | 'signup', role?: UserRole) => void;
  onSignOut: () => void;
  notifications?: AppNotification[];
  onOpenBookingContract?: (bookingId: string) => void;
  onOpenChatWithRoom?: (roomId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  activeRole,
  onRoleChange,
  activeTab,
  setActiveTab,
  wishlistCount,
  onOpenWishlist,
  compareCount,
  onOpenCompare,
  onOpenAddListing,
  currentUser,
  onOpenAuthModal,
  onSignOut,
  notifications = [],
  onOpenBookingContract,
  onOpenChatWithRoom,
}) => {
  const t = getTranslation(language);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const navigateTo = (
    tab: 'browse' | 'map' | 'roommates' | 'guide' | 'owner-dashboard' | 'admin-dashboard'
  ) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  /* Navigation tab active styles */
  const getDesktopTabClass = (tabName: typeof activeTab, customActiveClass?: string) => {
    const isCurrent = activeTab === tabName;
    const activeStyling = customActiveClass || 'text-emerald-700 font-semibold border-b-2 border-emerald-600';
    return (
      'whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 pb-1 text-sm font-medium ' +
      (isCurrent ? activeStyling : 'text-slate-600')
    );
  };

  const getMobileTabClass = (tabName: typeof activeTab, activeBg = 'bg-emerald-50 text-emerald-700') => {
    const isCurrent = activeTab === tabName;
    return (
      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-left transition ' +
      (isCurrent ? activeBg : 'text-slate-700 hover:bg-slate-50')
    );
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* =========================================================
            TOP UTILITY BAR
        ========================================================= */}
        <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-3 sm:px-6 lg:px-8 border-b border-slate-800 overflow-x-hidden">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap min-w-0">
            {/* Role switchers: Student / Renter vs Room Owner */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
              <span className="hidden sm:inline text-slate-400 font-medium whitespace-nowrap shrink-0 text-[11px]">
                {currentUser ? 'Active Role:' : t.switchRole}
              </span>

              <div className="inline-flex rounded-md bg-slate-800 p-0.5 border border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onRoleChange('renter');
                    if (!currentUser) {
                      onOpenAuthModal('login', 'renter');
                    }
                  }}
                  className={
                    'px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ' +
                    (activeRole === 'renter'
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white')
                  }
                  title={currentUser ? 'Student Account Active' : 'Sign in as Student'}
                >
                  <span>🎓</span>
                  <span className="truncate max-w-[85px] sm:max-w-none">{t.roleStudent}</span>
                  {currentUser && activeRole === 'renter' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onRoleChange('owner');
                    navigateTo('owner-dashboard');
                    if (!currentUser) {
                      onOpenAuthModal('login', 'owner');
                    }
                  }}
                  className={
                    'px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ' +
                    (activeRole === 'owner'
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white')
                  }
                  title={currentUser ? 'Owner Account Active' : 'Sign in as Room Owner'}
                >
                  <span>🏠</span>
                  <span className="truncate max-w-[85px] sm:max-w-none">{t.roleOwner}</span>
                  {currentUser && activeRole === 'owner' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Top Right: Auth & Language */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 text-xs">
              {currentUser ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80 max-w-[130px] sm:max-w-[190px]">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{currentUser.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('login')}
                    className="text-slate-300 hover:text-white font-medium flex items-center gap-1 whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{language === 'np' ? 'लगइन' : 'Sign In'}</span>
                  </button>

                  <span className="text-slate-600">·</span>

                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('signup')}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{language === 'np' ? 'दर्ता गर्नुहोस्' : 'Sign Up'}</span>
                  </button>
                </div>
              )}

              {/* Language Switcher */}
              <div className="flex items-center gap-1 border-l border-slate-700 pl-2 sm:pl-3 shrink-0">
                <Languages className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => onLanguageChange('en')}
                  className={
                    'px-1.5 py-0.5 rounded text-[10px] sm:text-xs transition-colors ' +
                    (language === 'en'
                      ? 'font-bold text-white bg-slate-800'
                      : 'text-slate-400 hover:text-white')
                  }
                >
                  EN
                </button>
                <span className="text-slate-600">/</span>
                <button
                  type="button"
                  onClick={() => onLanguageChange('np')}
                  className={
                    'px-1.5 py-0.5 rounded text-[10px] sm:text-xs transition-colors ' +
                    (language === 'np'
                      ? 'font-bold text-emerald-400 bg-slate-800'
                      : 'text-slate-400 hover:text-white')
                  }
                >
                  NP
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            MAIN NAVBAR (RESPONSIVE)
        ========================================================= */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="min-h-16 py-2 flex items-center justify-between gap-2">
            {/* 1. LOGO SECTION (Left side, shrink-0, min-w-0, never covered) */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => navigateTo('browse')}
                className="flex items-center gap-2.5 text-left group shrink-0"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-lg tracking-tight shadow-sm group-hover:bg-emerald-800 transition-colors shrink-0">
                  IP
                </div>
                <div className="min-w-0">
                  <span className="font-display font-extrabold text-base xs:text-lg sm:text-xl text-slate-900 tracking-tight block leading-tight whitespace-nowrap">
                    IP Room
                  </span>
                  <span className="text-[9px] xs:text-[10px] sm:text-[11px] text-slate-500 font-medium block leading-tight whitespace-nowrap">
                    {language === 'np' ? 'नेपालको कोठा बजार' : "Nepal's Room Finder"}
                  </span>
                </div>
              </button>
            </div>

            {/* 2. NAVIGATION LINKS (Center, hidden below lg, flex-1, centered) */}
            <nav className="hidden lg:flex flex-1 items-center justify-center gap-5 xl:gap-7 min-w-0 px-4">
              <button
                type="button"
                onClick={() => navigateTo('browse')}
                className={getDesktopTabClass('browse')}
              >
                {t.browseRooms}
              </button>

              <button
                type="button"
                onClick={() => navigateTo('map')}
                className={getDesktopTabClass('map')}
              >
                {t.mapView}
              </button>

              <button
                type="button"
                onClick={() => navigateTo('roommates')}
                className={getDesktopTabClass('roommates')}
              >
                {language === 'np' ? 'साथी खोज्नुहोस्' : 'Roommate Finder'}
              </button>

              <button
                type="button"
                onClick={() => navigateTo('guide')}
                className={getDesktopTabClass('guide')}
              >
                {language === 'np' ? 'विद्यार्थी निर्देशिका' : 'Student Guide'}
              </button>

              {/* Owner Dashboard link only when activeRole === 'owner' */}
              {activeRole === 'owner' && (
                <button
                  type="button"
                  onClick={() => navigateTo('owner-dashboard')}
                  className={getDesktopTabClass('owner-dashboard', 'text-blue-700 font-semibold border-b-2 border-blue-600')}
                >
                  {t.ownerDashboard}
                </button>
              )}
            </nav>

            {/* 3. RIGHT ACTIONS (Right side, shrink-0, clean spacing) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Notification Center */}
              <div className="shrink-0">
                <NotificationCenter
                  currentUser={currentUser}
                  activeRole={activeRole}
                  language={language}
                  notifications={notifications}
                  onOpenBookingContract={onOpenBookingContract}
                  onOpenOwnerDashboard={() => navigateTo('owner-dashboard')}
                  onOpenChatWithRoom={onOpenChatWithRoom}
                />
              </div>

              {/* Wishlist button */}
              <button
                type="button"
                onClick={onOpenWishlist}
                className="relative shrink-0 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={t.savedWishlist}
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </button>

              {/* Compare button */}
              <button
                type="button"
                onClick={onOpenCompare}
                className="relative shrink-0 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title={t.compare}
                aria-label="Compare"
              >
                <Scale className="w-5 h-5" />
                {compareCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {compareCount}
                  </span>
                )}
              </button>

              {/* List Your Room (visible on desktop lg+, inside mobile drawer on small screens) */}
              <button
                type="button"
                onClick={onOpenAddListing}
                className="hidden lg:inline-flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-all shadow-xs whitespace-nowrap active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t.listYourRoom}</span>
              </button>

              {/* Desktop User Profile Dropdown or Sign In Button */}
              {currentUser ? (
                <div className="relative shrink-0" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition border border-slate-200"
                    aria-label="User menu"
                    aria-expanded={isUserMenuOpen}
                  >
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 mr-1 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-[80] text-xs overflow-visible animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
                        <p className="font-bold text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                        <span className="inline-block mt-1 text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded capitalize">
                          {currentUser.role === 'renter' ? 'Student / Renter' : currentUser.role === 'owner' ? 'Room Owner' : 'Administrator'}
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            if (currentUser.role === 'owner') {
                              navigateTo('owner-dashboard');
                            } else if (currentUser.role === 'admin') {
                              navigateTo('admin-dashboard');
                            } else {
                              setIsUserDashboardOpen(true);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 font-medium transition flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>My Dashboard</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenWishlist();
                          }}
                          className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-rose-600 font-medium transition flex items-center gap-2"
                        >
                          <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                          <span>Saved Rooms ({wishlistCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenCompare();
                          }}
                          className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-emerald-600 font-medium transition flex items-center gap-2"
                        >
                          <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Compare Rooms ({compareCount})</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onSignOut();
                          }}
                          className="w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium transition flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="hidden lg:inline-flex shrink-0 px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition whitespace-nowrap"
                >
                  Sign In
                </button>
              )}

              {/* Mobile Hamburger Menu Toggle (below lg) */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden shrink-0 p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* =========================================================
              MOBILE MENU (BELOW LG)
          ========================================================= */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-slate-200 py-3 max-h-[calc(100vh-4.5rem)] overflow-y-auto">
              <div className="space-y-1">
                {/* Browse Rooms */}
                <button
                  type="button"
                  onClick={() => navigateTo('browse')}
                  className={getMobileTabClass('browse')}
                >
                  <Home className="w-5 h-5 shrink-0" />
                  <span>{t.browseRooms}</span>
                </button>

                {/* Map View */}
                <button
                  type="button"
                  onClick={() => navigateTo('map')}
                  className={getMobileTabClass('map')}
                >
                  <Map className="w-5 h-5 shrink-0" />
                  <span>{t.mapView}</span>
                </button>

                {/* Roommate Finder */}
                <button
                  type="button"
                  onClick={() => navigateTo('roommates')}
                  className={getMobileTabClass('roommates')}
                >
                  <Users className="w-5 h-5 shrink-0" />
                  <span>{language === 'np' ? 'साथी खोज्नुहोस्' : 'Roommate Finder'}</span>
                </button>

                {/* Student Guide */}
                <button
                  type="button"
                  onClick={() => navigateTo('guide')}
                  className={getMobileTabClass('guide')}
                >
                  <BookOpen className="w-5 h-5 shrink-0" />
                  <span>{language === 'np' ? 'विद्यार्थी निर्देशिका' : 'Student Guide'}</span>
                </button>

                {/* Owner Dashboard - only when owner role is active */}
                {activeRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => navigateTo('owner-dashboard')}
                    className={getMobileTabClass('owner-dashboard', 'bg-blue-50 text-blue-700')}
                  >
                    <Home className="w-5 h-5 shrink-0" />
                    <span>{t.ownerDashboard}</span>
                  </button>
                )}

                {/* List Your Room - Mobile */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAddListing();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-lg text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{t.listYourRoom}</span>
                </button>

                {/* Saved Rooms & Compare - Mobile grid */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenWishlist();
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-rose-50 text-rose-700 text-sm font-semibold"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Saved</span>
                    {wishlistCount > 0 && (
                      <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {wishlistCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenCompare();
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold"
                  >
                    <Scale className="w-4 h-4" />
                    <span>Compare</span>
                    {compareCount > 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {compareCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Mobile Authentication */}
                {!currentUser ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-slate-100 text-slate-800 text-sm font-bold"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuthModal('signup');
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign Up
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (currentUser.role === 'owner') {
                          navigateTo('owner-dashboard');
                        } else if (currentUser.role === 'admin') {
                          navigateTo('admin-dashboard');
                        } else {
                          setIsUserDashboardOpen(true);
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 text-slate-700 text-sm font-semibold text-left"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      <span>My Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-rose-600 hover:bg-rose-50 text-sm font-semibold text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* =========================================================
          ADMIN PANEL (FIXED BOTTOM-RIGHT CORNER)
          Visible only to authenticated administrators
      ========================================================= */}
      {currentUser?.role === 'admin' && (
        <button
          type="button"
          onClick={() => navigateTo('admin-dashboard')}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] inline-flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          aria-label="Open Admin Panel"
          title="Open Admin Panel"
        >
          <Shield className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Admin Panel</span>
          <span aria-hidden="true" className="text-base leading-none">→</span>
        </button>
      )}

      {/* =========================================================
          STUDENT / RENTER DASHBOARD MODAL
      ========================================================= */}
      {isUserDashboardOpen && currentUser && currentUser.role !== 'owner' && currentUser.role !== 'admin' && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-950/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="renter-dashboard-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsUserDashboardOpen(false);
            }
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 sm:px-6 border-b border-slate-100 bg-white/95 backdrop-blur">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {language === 'np' ? 'मेरो ड्यासबोर्ड' : 'My Dashboard'}
                </p>
                <h2
                  id="renter-dashboard-title"
                  className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate"
                >
                  {currentUser.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsUserDashboardOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
                aria-label="Close dashboard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* User profile */}
              <section className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />

                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{currentUser.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{currentUser.email}</p>
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    {language === 'np' ? 'विद्यार्थी / भाडामा बस्ने' : 'Student / Renter'}
                  </span>
                </div>
              </section>

              {/* Account summary */}
              <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <Heart className="w-5 h-5 text-rose-500 mb-2" />
                  <p className="text-2xl font-extrabold text-slate-900">{wishlistCount}</p>
                  <p className="text-xs text-slate-500">Saved Rooms</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <Scale className="w-5 h-5 text-emerald-600 mb-2" />
                  <p className="text-2xl font-extrabold text-slate-900">{compareCount}</p>
                  <p className="text-xs text-slate-500">Compare List</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white col-span-2 sm:col-span-1">
                  <Home className="w-5 h-5 text-blue-600 mb-2" />
                  <p className="text-sm font-bold text-slate-900">Room Finder</p>
                  <p className="text-xs text-slate-500">Find your next room</p>
                </div>
              </section>

              {/* Quick actions */}
              <section>
                <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Actions</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDashboardOpen(false);
                      onOpenWishlist();
                    }}
                    className="px-4 py-3 rounded-xl bg-rose-50 text-rose-700 font-semibold text-sm hover:bg-rose-100 transition"
                  >
                    Saved Rooms
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDashboardOpen(false);
                      onOpenCompare();
                    }}
                    className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition"
                  >
                    Compare Rooms
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDashboardOpen(false);
                      navigateTo('browse');
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition"
                  >
                    Find a Room
                  </button>
                </div>
              </section>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Your account information and available room-finding shortcuts are shown here.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
