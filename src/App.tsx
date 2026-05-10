import { useState, useEffect } from 'react';
import { 
  auth, 
  getUserProfile, 
  logoutUser, 
  db 
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { UserProfile, UserRole } from './types';
import { AuthScreen } from './components/AuthScreen';
import { DashboardAdmin } from './components/DashboardAdmin';
import { DashboardProducer } from './components/DashboardProducer';
import { DashboardAffiliate } from './components/DashboardAffiliate';
import { MarketplaceClient } from './components/MarketplaceClient';
import { ProfileSection } from './components/ProfileSection';
import { ChatsSection } from './components/ChatsSection';
import { 
  LogOut, 
  User, 
  MapPin, 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  ShieldAlert, 
  Check, 
  UserPlus, 
  SlidersHorizontal,
  Home,
  Users,
  Trophy,
  DollarSign,
  ShoppingBag,
  X,
  CreditCard,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Interactive Tester Swapper states
  const [isTesterSwitcherOpen, setIsTesterSwitcherOpen] = useState(false);
  
  // Custom role override for the user interface
  const [overrideRole, setOverrideRole] = useState<UserRole | null>(null);

  // UI state for navigation
  const [currentView, setCurrentView] = useState<'marketplace' | 'dashboard' | 'profile'>('marketplace');
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setCurrentUser(u);
      if (u) {
        // Fetch his official profile
        const profile = await getUserProfile(u.uid);
        setUserProfile(profile || null);
        // Default to marketplace when logging in
        setCurrentView('marketplace');
      } else {
        setUserProfile(null);
        setOverrideRole(null);
        setCurrentView('marketplace');
      }
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAuthSuccess = async (uid: string, role: UserRole) => {
    setAuthLoading(true);
    const profile = await getUserProfile(uid);
    setUserProfile(profile || null);
    setCurrentView('marketplace');
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    setActiveChatOrderId(null);
    setOverrideRole(null);
    await logoutUser();
  };

  // Switch role simulator (useful for testing on-the-fly)
  const handleForceOverrideRole = (target: UserRole) => {
    setOverrideRole(target);
    setActiveChatOrderId(null); // Clear active chat list on swap
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060813] text-white flex flex-col items-center justify-center font-sans">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center mb-4 shadow-xl">
          <span className="font-display font-extrabold text-3xl">M</span>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#060813] glowing-dot" />
        </div>
        <p className="text-sm text-slate-400 font-mono animate-pulse uppercase tracking-wider">Iniciando a rede do Mercado AO...</p>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Determine active view role
  const activeRole: UserRole = overrideRole || userProfile.tipo;

  return (
    <div className="min-h-screen bg-[#060813] text-white flex flex-col font-sans relative">
      
      {/* Dynamic Ambient Blur */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* CORE WEB NAVIGATION BAR */}
      <header className="sticky top-0 bg-[#060813]/90 backdrop-blur-md border-b border-white/5 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-400 flex items-center justify-center font-black shadow-lg shadow-blue-500/10">
              <span className="font-display text-xl text-white">M</span>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#060813] glowing-dot" />
            </div>
            <div>
              <h1 className="font-display font-black text-lg tracking-tight leading-none text-white">
                Mercado <span className="text-blue-500 font-extrabold">AO</span>
              </h1>
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#2563EB] mt-0.5 font-bold">Premium Angola Service</p>
            </div>
          </div>

          {/* Nav Right Profile section */}
          <div className="flex items-center gap-3">
            
            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1 mr-4 bg-slate-900/50 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setCurrentView('marketplace')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  currentView === 'marketplace' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Mercado</span>
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Painel</span>
              </button>
              <button
                onClick={() => setCurrentView('profile')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                  currentView === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Perfil</span>
              </button>
            </nav>

            {/* Mobile Nav Toggle - simple labels for mobile */}
            <div className="flex md:hidden gap-1 bg-slate-900/50 p-1 rounded-lg mr-2">
              <button onClick={() => setCurrentView('marketplace')} className={`p-2 rounded-md ${currentView === 'marketplace' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <ShoppingBag className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentView('dashboard')} className={`p-2 rounded-md ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <TrendingUp className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentView('profile')} className={`p-2 rounded-md ${currentView === 'profile' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <User className="w-4 h-4" />
              </button>
            </div>

            {/* User details capsule */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{userProfile.nome}</span>
              <span className="text-[10px] font-mono text-purple-400">
                {userProfile.tipo} {overrideRole ? `(Simulado como ${overrideRole})` : ''}
              </span>
            </div>

            {/* Quick action: User Avatar */}
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-350 select-none">
              <User className="w-4 h-4" />
            </div>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="p-2 bg-red-650/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/15"
              id="top_logout_btn"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* CORE WEB MAIN SECTION BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 relative z-10" id="app_view_area">
        <AnimatePresence mode="wait">
          {currentView === 'marketplace' && (
            <motion.div key="marketplace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MarketplaceClient 
                userId={currentUser.uid}
                onOpenChat={(orderId) => setActiveChatOrderId(orderId)}
              />
            </motion.div>
          )}

          {currentView === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {activeRole === 'ADM' && <DashboardAdmin userId={currentUser.uid} />}
              {activeRole === 'Produtor' && (
                <DashboardProducer 
                  userId={currentUser.uid} 
                  userProfile={userProfile}
                  onOpenChat={(orderId) => setActiveChatOrderId(orderId)}
                />
              )}
              {activeRole === 'Afiliado' && <DashboardAffiliate userId={currentUser.uid} userProfile={userProfile} />}
              {activeRole === 'Cliente' && (
                <div className="bg-slate-900/40 p-12 rounded-3xl border border-white/5 text-center">
                  <ShoppingBag className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-display font-bold text-white mb-2">Acesso ao Marketplace</h3>
                  <p className="text-slate-400 max-w-md mx-auto mb-6">Como comprador, a sua área principal é o Mercado. Use o botão acima para ver os produtos disponíveis.</p>
                  <button 
                    onClick={() => setCurrentView('marketplace')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors"
                  >
                    Ver Mercado agora
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfileSection userProfile={userProfile} onUpdate={setUserProfile} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-white/5 text-center text-xs text-slate-500 font-mono mt-12 bg-slate-950/25">
        © 2026 Mercado AO. Angola Digital Marketplace & Cash on Delivery Network.
      </footer>

      {/* CHATS DRAWER POPUP SLIDER */}
      <AnimatePresence>
        {activeChatOrderId && (
          <ChatsSection 
            orderId={activeChatOrderId}
            senderType={activeRole === 'Produtor' ? 'Produtor' : 'Cliente'}
            onClose={() => setActiveChatOrderId(null)}
          />
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* ⚠️ INTERACTIVE ROLE SWITCHER PANEL FOR TESTERS/EVALUATORS */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 left-6 z-55">
        {!isTesterSwitcherOpen ? (
          <button
            onClick={() => setIsTesterSwitcherOpen(true)}
            className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-400 font-semibold font-mono text-[10px] px-3 py-2 rounded-xl shadow-2xl transition-all"
            id="open_tester_bar_btn"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Painel de Desenvolvimento</span>
          </button>
        ) : (
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-5 shadow-2xl w-80 space-y-3 relative">
            <button
              onClick={() => setIsTesterSwitcherOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h5 className="font-display font-bold text-sm flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-400" />
              <span>Troca de Perfil de Acesso</span>
            </h5>
            <p className="text-[10px] text-slate-400 leading-normal">
              Utilitário para alternar entre as visões de negócio da plataforma:
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono font-bold">
              <button
                onClick={() => handleForceOverrideRole('Cliente')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'Cliente' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>🛒 Comprador</span>
              </button>

              <button
                onClick={() => handleForceOverrideRole('Produtor')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'Produtor' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>🏢 Vendedor</span>
              </button>

              <button
                onClick={() => handleForceOverrideRole('Afiliado')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'Afiliado' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>✨ Afiliado</span>
              </button>

              <button
                onClick={() => handleForceOverrideRole('ADM')}
                className={`py-2 px-2.5 rounded-lg border text-left flex flex-col justify-between ${
                  activeRole === 'ADM' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                <span>👑 Administrador</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              Perfil Original: <span className="text-slate-350">{userProfile.tipo}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
