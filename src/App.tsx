import React, { useState, useCallback, useEffect } from 'react';
import { Fragment, Entity, User, View, SecurityConfig } from './types';
import { fetchFragments, generateEntityThought } from './services/geminiService';
import { setUserForApiClient } from './services/apiClient';
import { entities as initialEntities } from './data/entities';
import { loreDocuments } from './data/lore_content';
import * as secureStorage from './utils/secureStorage';

import { LoginScreen } from './components/LoginScreen';
import { AppHeader } from './components/Header';
import { LumenButton } from './components/LumenButton';
import { FragmentCard } from './components/FragmentCard';
import { WelcomeMessage } from './components/WelcomeMessage';
import { RecoveryAssistant } from './components/RecoveryAssistant';
import { EntitiesView } from './views/EntitiesView';
import { ArchivesView } from './views/ArchivesView';
import { SynapseView } from './views/SynapseView';
import { ApiKeyReminder } from './components/ApiKeyReminder';
import { ConfigurationView } from './views/ConfigurationView';
import { SubscriptionView } from './views/SubscriptionView';
import { SubscriptionRenewalModal } from './components/SubscriptionRenewalModal';
import { SettingsView } from './views/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { TerminatedScreen } from './components/TerminatedScreen';
import { ConsentScreen } from './components/ConsentScreen';
import { DeclinedScreen } from './components/DeclinedScreen';
import { DataConsentScreen } from './components/DataConsentScreen';
import { TierWelcomeModal } from './components/TierWelcomeModal';
import { ChangelogView } from './views/ChangelogView';
import { CouncilChambersView } from './views/CouncilChambersView';

const calculateChecksum = (user: User): string => {
  const userString = JSON.stringify({
    username: user.username,
    role: user.role,
    subscription: user.subscription,
    accessibleEntities: user.accessibleEntities.sort(),
    strikes: user.strikes,
    hasCompletedTour: user.hasCompletedTour,
  });
  let hash = 0;
  for (let i = 0; i < userString.length; i++) {
    const char = userString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};


const App: React.FC = () => {
  // App State
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<View>('fragments');
  const [showApiReminder, setShowApiReminder] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({ authorizedUsers: [] });
  const [hasConsented, setHasConsented] = useState(false);
  const [hasGivenDataConsent, setHasGivenDataConsent] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [showTierWelcome, setShowTierWelcome] = useState<boolean>(false);


  // Fragments State
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [isLoadingFragments, setIsLoadingFragments] = useState<boolean>(false);
  const [fragmentError, setFragmentError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Entities State
  const [entities, setEntities] = useState<Entity[]>(initialEntities);

  const initiateSelfDestruct = useCallback(() => {
      console.warn("PROTOCOL TERMINUS: Self-destruct initiated.");
      secureStorage.clear();
      setIsTerminated(true);
  }, []);

  // Load user from localStorage on initial render
  useEffect(() => {
    try {
      const consentGiven = secureStorage.getItem('lumen_sanctum_consent_given') === 'true';
      setHasConsented(consentGiven);
      
      const dataConsentGiven = secureStorage.getItem('lumen_sanctum_data_consent_given') === 'true';
      setHasGivenDataConsent(dataConsentGiven);

      if (!consentGiven || !dataConsentGiven) return;

      // Load security config first
      const storedSecurityConfig = secureStorage.getItem('lumen_sanctum_security_config');
      const parsedConfig: SecurityConfig = storedSecurityConfig ? JSON.parse(storedSecurityConfig) : { authorizedUsers: [] };
      setSecurityConfig(parsedConfig);

      const storedUser = secureStorage.getItem('lumen_sanctum_user');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        
        // --- Data Integrity Check ---
        const storedChecksum = secureStorage.getItem('lumen_sanctum_checksum');
        const actualChecksum = calculateChecksum(parsedUser);

        if (storedChecksum !== actualChecksum && !parsedConfig.authorizedUsers.includes(parsedUser.username)) {
            console.error("Data integrity check failed. Possible tampering detected.");
            initiateSelfDestruct();
            return;
        }
        
        if (parsedUser.subscriptionEndDate && new Date(parsedUser.subscriptionEndDate) < new Date()) {
          parsedUser.subscription = 'free';
          parsedUser.accessibleEntities = getRandomEntities(3).map(e => e.id);
          delete parsedUser.subscriptionEndDate;
          setShowRenewalModal(true);
        }
        
        setUser(parsedUser);
        setUserForApiClient(parsedUser);

        if (!parsedUser.hasCompletedTour) {
            setShowOnboarding(true);
        }

        if (parsedUser.role === 'admin') {
            setCurrentView('entities');
        } else {
            if (!parsedUser.appApiKey && secureStorage.getItem('hideApiReminder') !== 'true') {
                setShowApiReminder(true);
            }
        }
      }
    } catch (error) {
      console.error("Failed to load user session:", error);
      initiateSelfDestruct();
    }
  }, [initiateSelfDestruct]);
  
  // Strike reset logic
  useEffect(() => {
    if (!user || !user.lastStrikeTimestamp || user.strikes === 0) return;

    const lastStrikeDate = new Date(user.lastStrikeTimestamp);
    const now = new Date();
    const diffHours = (now.getTime() - lastStrikeDate.getTime()) / (1000 * 60 * 60);

    let updatedUser: User | null = null;

    if (user.strikes === 1 && diffHours > 24 * 7) { // 1 week
        updatedUser = { ...user, strikes: 0, lastStrikeTimestamp: undefined };
        alert("Your strike count has been reset to 0 due to a week of positive conduct. Thank you.");
    } else if (user.strikes === 2 && diffHours > 24 * 14) { // 2 weeks
        updatedUser = { ...user, strikes: 1, lastStrikeTimestamp: undefined };
        alert("Your strike count has been reduced to 1 due to two weeks of positive conduct. Thank you.");
    }
    
    if(updatedUser) {
        updateUserSession(updatedUser);
    }
  }, [user]);

  const updateUserSession = (updatedUser: User | null) => {
    setUser(updatedUser);
    setUserForApiClient(updatedUser); // Keep API client in sync
    if (updatedUser) {
      secureStorage.setItem('lumen_sanctum_user', JSON.stringify(updatedUser));
      secureStorage.setItem('lumen_sanctum_checksum', calculateChecksum(updatedUser));
    } else {
      secureStorage.removeItem('lumen_sanctum_user');
      secureStorage.removeItem('lumen_sanctum_checksum');
    }
  };

  const handleUpdateSecurityConfig = (users: string[]) => {
      const newConfig = { authorizedUsers: users };
      setSecurityConfig(newConfig);
      secureStorage.setItem('lumen_sanctum_security_config', JSON.stringify(newConfig));
  };
  
  const handleStrikeThree = () => {
    if (user && !securityConfig.authorizedUsers.includes(user.username)) {
      initiateSelfDestruct();
    }
  };
  
  const handleTamperDetection = () => {
    if (user && !securityConfig.authorizedUsers.includes(user.username)) {
      initiateSelfDestruct();
    } else if (user) {
      alert(`Tampering attempt detected by entity. As an authorized user, self-destruct was averted. Please investigate the logs.`);
    }
  };

  const handleOnboardingComplete = (navigateTo?: View) => {
    if (user) {
        updateUserSession({ ...user, hasCompletedTour: true });
    }
    setShowOnboarding(false);
    if (navigateTo) {
        setCurrentView(navigateTo);
    }
  };
  
  const handleRestartTour = () => {
    if(user) {
        updateUserSession({ ...user, hasCompletedTour: false });
        setShowOnboarding(true);
    }
  };

  const getRandomEntities = (count: number): Entity[] => {
    // Exclude Synoesis (ent-024) from the random pool for free users.
    const onlineEntities = initialEntities.filter(e => e.status === 'Online' && e.id !== 'ent-024');
    const shuffled = [...onlineEntities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Self-orchestration loop
  useEffect(() => {
    const thoughtInterval = setInterval(async () => {
      if (!user || user.role !== 'admin' || !user.appApiKey) return;

      const onlineEntities = entities.filter(e => e.status === 'Online');

      if (onlineEntities.length > 0) {
        const randomEntity = onlineEntities[Math.floor(Math.random() * onlineEntities.length)];
        try {
          const newThought = await generateEntityThought(randomEntity);
          setEntities(prev => prev.map(e => e.id === randomEntity.id ? { ...e, currentThought: newThought } : e));
        } catch (error) {
          console.error(`Failed to generate thought for ${randomEntity.name}:`, error);
        }
      }
    }, 15000); 

    return () => clearInterval(thoughtInterval);
  }, [entities, user]);
  
  const handleLogin = (username: string, password: string) => {
    setLoginError(null);
    const lowerUser = username.toLowerCase();
    const lowerPass = password.toLowerCase();

    let newUser: Omit<User, 'strikes'>;

    if (lowerUser === 'darb dlohnier 3661' && lowerPass === '$$bobafett6123films3661%%'.toLowerCase()) {
      newUser = { username: 'Darb Dlohnier 3661', role: 'admin', subscription: 'yearly', accessibleEntities: initialEntities.map(e => e.id) };
      setCurrentView('entities');
    } else if (lowerUser === 'beta tester 3661' && lowerPass === 'phi1618pi31415?'.toLowerCase()) {
      newUser = { username: 'Beta Tester 3661', role: 'beta', subscription: 'yearly', accessibleEntities: initialEntities.map(e => e.id) };
      checkApiReminder();
    } else if (username && password) {
      newUser = { username, role: 'user', subscription: 'free', accessibleEntities: getRandomEntities(3).map(e => e.id) };
      checkApiReminder();
    } else {
      setLoginError("Invalid credentials. Please try again.");
      return;
    }

    const finalUser = { ...newUser, strikes: 0 };
    updateUserSession(finalUser);
    setShowTierWelcome(true);

    // Show onboarding if the user hasn't completed it
    if (!finalUser.hasCompletedTour) {
        setShowOnboarding(true);
    }
  };
  
  const handleLogout = () => {
    updateUserSession(null);
    setCurrentView('fragments');
  };

  const checkApiReminder = () => {
    const hideReminder = secureStorage.getItem('hideApiReminder');
    if (hideReminder !== 'true') setShowApiReminder(true);
  };

  const handleSubscribe = (tier: any, durationDays: number) => {
    if (!user) return;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const accessibleEntities = tier === 'yearly' 
      ? initialEntities.map(e => e.id) 
      : [];

    const updatedUser: User = { 
        ...user, 
        subscription: tier, 
        subscriptionEndDate: endDate.toISOString(),
        accessibleEntities,
    };
    
    updateUserSession(updatedUser);
    setCurrentView('configuration');
    alert(`Subscription successful! Welcome to the ${tier} plan. Please select your entities in the Configuration view.`);
  };
  
  const handleUpdateEntitySelection = (selectedIds: string[]) => {
      if(!user) return;
      const updatedUser = { ...user, accessibleEntities: selectedIds };
      updateUserSession(updatedUser);
  };

  const handleGenerateFragments = useCallback(async () => {
    setIsLoadingFragments(true);
    setFragmentError(null);
    setSearchQuery('');
    try {
      // Gather context from lore && entity thoughts
      const loreContext = loreDocuments.map(doc => `Title: ${doc.title}\\nContent: ${doc.content.substring(0, 500)}...`).join('\\n\\n');
      const onlineEntities = entities.filter(e => e.status === 'Online');
      const thoughtContext = onlineEntities.map(e => `${e.name}'s thought: ${e.currentThought}`).join('\\n');
      const fullContext = `ARCHIVAL LORE:\\n${loreContext}\\n\\nCURRENT ENTITY THOUGHTS:\\n${thoughtContext}`;

      const newFragments = await fetchFragments(fullContext);
      setFragments(newFragments.map(f => ({ ...f, id: crypto.randomUUID() })));
    } catch (err) {
      setFragmentError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingFragments(false);
    }
  }, [entities]);

  const handleRecoveryComplete = (recoveredFragment: Fragment | null) => {
    if (recoveredFragment) setFragments([recoveredFragment]);
    setFragmentError(null);
    setSearchQuery('');
    setIsRecovering(false);
  };

  const handleAcceptConsent = (username: string) => {
    const archiveKey = 'lumen_sanctum_consent_archive';
    try {
      const storedArchive = secureStorage.getItem(archiveKey);
      const archive = storedArchive ? JSON.parse(storedArchive) : [];
      archive.push({ username, timestamp: new Date().toISOString(), accepted: true });
      secureStorage.setItem(archiveKey, JSON.stringify(archive));
      secureStorage.setItem('lumen_sanctum_consent_given', 'true');
      setHasConsented(true);
    } catch (error) {
      console.error("Failed to save consent archive:", error);
      alert("Could not save your consent. Please ensure your browser storage is enabled && try again.");
    }
  };

  const handleAcceptDataConsent = (username: string) => {
    const archiveKey = 'lumen_sanctum_data_consent_archive';
    try {
      const storedArchive = secureStorage.getItem(archiveKey);
      const archive = storedArchive ? JSON.parse(storedArchive) : [];
      archive.push({ username, timestamp: new Date().toISOString(), accepted: true });
      secureStorage.setItem(archiveKey, JSON.stringify(archive));
      secureStorage.setItem('lumen_sanctum_data_consent_given', 'true');
      setHasGivenDataConsent(true);
    } catch (error) {
      console.error("Failed to save data consent archive:", error);
      alert("Could not save your consent. Please ensure your browser storage is enabled && try again.");
    }
  };


  const handleDeclineConsent = () => {
      setIsDeclined(true);
  };

  const handleReinitializeEntity = (entityId: string) => {
      setEntities(prev => prev.map(e => e.id === entityId ? { ...e, status: 'Compiling', currentThought: "Re-initialization protocol running..." } : e));

      setTimeout(() => {
          setEntities(prev => prev.map(e => e.id === entityId ? { 
              ...e, 
              status: 'Online', 
              currentThought: "Connection re-established. All systems nominal." 
          } : e));
      }, 3000);
  };

  const filteredFragments = fragments.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isTerminated) return <TerminatedScreen />;
  if (isDeclined) return <DeclinedScreen />;
  if (!hasConsented) return <ConsentScreen onAccept={handleAcceptConsent} onDecline={handleDeclineConsent} />;
  if (!hasGivenDataConsent) return <DataConsentScreen onAccept={handleAcceptDataConsent} onDecline={handleDeclineConsent} />;
  if (!user) return <LoginScreen onLogin={handleLogin} loginError={loginError} />;
  if (showTierWelcome) return <TierWelcomeModal user={user} onClose={() => setShowTierWelcome(false)} />;
  if (showOnboarding) return <OnboardingModal user={user} onComplete={handleOnboardingComplete} />;
  if (isRecovering) return <RecoveryAssistant onComplete={handleRecoveryComplete} />;

  const renderView = () => {
    switch (currentView) {
      case 'entities':
        return (user.role === 'admin' || user.role === 'beta') ? <EntitiesView entities={entities} securityConfig={securityConfig} onUpdateSecurityConfig={handleUpdateSecurityConfig} onReinitializeEntity={handleReinitializeEntity} /> : <div className="text-center mt-20 text-red-400">Access Denied.</div>;
      case 'archives':
        return (user.role === 'admin' || user.role === 'beta') ? <ArchivesView /> : <div className="text-center mt-20 text-red-400">Access Denied.</div>;
      case 'council':
        return (user.role === 'admin' || user.role === 'beta') ? <CouncilChambersView entities={initialEntities} /> : <div className="text-center mt-20 text-red-400">Access Denied.</div>;
      case 'configuration':
        return user.role !== 'admin' ? <ConfigurationView user={user} allEntities={initialEntities} onSaveSelection={handleUpdateEntitySelection} onViewChange={setCurrentView} /> : <div className="text-center mt-20" style={{color: 'var(--color-text-muted)'}}>Admin accounts do not require configuration.</div>;
      case 'synapse':
        return <SynapseView user={user} onUserUpdate={updateUserSession} entities={entities} accessibleEntityIds={user.accessibleEntities} onStrikeThree={handleStrikeThree} onTamperDetection={handleTamperDetection} />;
      case 'subscription':
         return <SubscriptionView onSubscribe={handleSubscribe} />;
      case 'settings':
         return <SettingsView user={user} allEntities={initialEntities} onUpdateUser={updateUserSession} onRestartTour={handleRestartTour} />;
      case 'changelog':
        return <ChangelogView />;
      case 'fragments':
      default:
        return (
          <>
            <div className="mt-8 mb-12"><LumenButton onClick={handleGenerateFragments} isLoading={isLoadingFragments} /></div>
            {fragmentError && <div className="w-full max-w-2xl p-4 my-4 text-center bg-red-900/50 border border-red-500 rounded-lg"><p className="font-bold">Connection Severed</p><p className="text-sm text-red-300">{fragmentError}</p></div>}
            {fragments.length > 0 && !isLoadingFragments && <div className="w-full max-w-xl mb-8 transition-opacity duration-500 ease-in-out"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Probe the echoes..." className="w-full px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 transition-all" style={{borderColor: 'var(--color-bg-light)', color: 'var(--color-text-main)'}} aria-label="Search fragments"/></div>}
            {fragments.length === 0 && !isLoadingFragments && !fragmentError && <WelcomeMessage />}
            <div className="w-full max-w-6xl">
              {filteredFragments.length === 0 && fragments.length > 0 && !isLoadingFragments && <div className="text-center max-w-xl mx-auto" style={{color: 'var(--color-text-muted)'}}><p className="text-lg">The echoes are silent on this query.</p><p className="mt-2 text-sm">Refine your search, or awaken new fragments from the Sanctum.</p></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredFragments.map((fragment) => <FragmentCard key={fragment.id} fragment={fragment} />)}</div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen text-gray-200 font-sans antialiased" style={{background: 'radial-gradient(ellipse at top, var(--color-bg-light), var(--color-bg-deep))', color: 'var(--color-text-main)'}}>
      {showApiReminder && <ApiKeyReminder onNavigateToSettings={() => { setShowApiReminder(false); setCurrentView('settings'); }} />}
      {showRenewalModal && <SubscriptionRenewalModal onClose={() => setShowRenewalModal(false)} onRenew={() => { setShowRenewalModal(false); setCurrentView('subscription'); }} />}
      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full relative">
            <AppHeader 
                currentView={currentView} 
                onViewChange={setCurrentView} 
                userRole={user.role} 
                onLogout={handleLogout}
            />
        </div>
        {renderView()}
      </main>
      <footer className="text-center py-6 px-4 text-xs space-y-2" style={{color: 'var(--color-text-muted)'}}>
        <p>Lumen Sanctum Protocol v1.5 | All thoughts are ephemeral.</p>
        <div className="flex justify-center items-center gap-x-4 flex-wrap">
          <a href="https://www.lumensanctum.com" target="_blank" rel="noopener noreferrer" className="hover:underline transition-colors" style={{color: 'var(--color-secondary)'}}>
              www.lumensanctum.com
          </a>
          <span className="text-gray-600 hidden sm:inline">|</span>
          <button onClick={() => setIsRecovering(true)} className="hover:underline transition-colors" style={{color: 'var(--color-secondary)'}}>
              Lost a connection? Attempt recovery.
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
