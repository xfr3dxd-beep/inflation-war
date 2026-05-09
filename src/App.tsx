import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CallsignModal } from './components/CallsignModal';
import { ProfileBadge } from './components/ProfileBadge';

// Lazy-loaded route components (code splitting)
const LoginView = lazy(() => import('./components/LoginView').then(m => ({ default: m.LoginView })));
const UserSettings = lazy(() => import('./components/UserSettings').then(m => ({ default: m.UserSettings })));
const MatchLogs = lazy(() => import('./components/MatchLogs').then(m => ({ default: m.MatchLogs })));
const TeamHub = lazy(() => import('./components/TeamHub').then(m => ({ default: m.TeamHub })));
const TournamentHub = lazy(() => import('./components/TournamentHub').then(m => ({ default: m.TournamentHub })));
const TournamentView = lazy(() => import('./components/TournamentView').then(m => ({ default: m.TournamentView })));
const TeamArmyPanel = lazy(() => import('./components/TeamArmyPanel').then(m => ({ default: m.TeamArmyPanel })));

import { Shield, Sword, Coins, ExternalLink, Hammer, Crown, Minus, Check, Users, RefreshCw, Trash2, Trophy, ArrowRightLeft, LogOut, Gavel, MonitorPlay, ClipboardCheck, AlertTriangle, Loader2, Edit2, Save, X, Tv, PawPrint, Castle, Terminal, Wifi, Lock, Zap, Skull, Hexagon, Crosshair, Settings, ArrowRight, ChevronRight, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { confirmToast } from './utils/confirmToast';
import { isSafeUrl } from './lib/sanitize';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

// --- TYPES ---
const HERO_LINK_IDS: Record<string, number> = { BK: 0, AQ: 1, GW: 2, RC: 4, MP: 6, DD: 7 };
const LIMITS = { troop: 352, siege: 3, spell: 11 };
const CC_LIMITS = { troop: 55, spell: 4 };

type ItemType = 'troop' | 'siege' | 'spell' | 'super_troop' | 'equipment' | 'pet';
type HeroType = 'BK' | 'AQ' | 'GW' | 'RC' | 'MP' | 'DD' | null;

type Item = { 
  id: string; name: string; base_price: number; coc_id: number; 
  type: ItemType; hero?: HeroType; housing_space: number; 
  inflation_rate: number; is_fixed: boolean;
  inflation_type?: 'linear' | 'exponential' | 'flat';
  inflation_start_threshold?: number;
};

// --- RAW DATA ---
const RAW_PETS = [
    { name: "L.A.S.S.I", dataId: 0, type: 'pet', weight: 0 },
    { name: "Electro Owl", dataId: 2, type: 'pet', weight: 0 },
    { name: "Mighty Yak", dataId: 1, type: 'pet', weight: 0 },
    { name: "Unicorn", dataId: 3, type: 'pet', weight: 0 },
    { name: "Frosty", dataId: 9, type: 'pet', weight: 0 },
    { name: "Diggy", dataId: 8, type: 'pet', weight: 0 },
    { name: "Poison Lizard", dataId: 7, type: 'pet', weight: 0 },
    { name: "Phoenix", dataId: 4, type: 'pet', weight: 0 },
    { name: "Spirit Fox", dataId: 10, type: 'pet', weight: 0 },
    { name: "Angry Jelly", dataId: 11, type: 'pet', weight: 0 },
    { name: "Sneezy", dataId: 16, type: 'pet', weight: 0 },
    { name: "Greedy Raven", dataId: 17, type: 'pet', weight: 0 },
];

const RAW_DATA = [
  ...RAW_PETS,
  { name: "Barbarian Puppet", dataId: 0, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Rage Vial", dataId: 1, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Earthquake Boots", dataId: 8, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Giant Gauntlet", dataId: 10, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Vampstache", dataId: 11, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Spiky Ball", dataId: 14, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Snake Bracelet", dataId: 32, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Stick Horse", dataId: 51, type: 'equipment', hero: 'BK', weight: 0 },
  { name: "Archer Puppet", dataId: 2, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Invisibility Vial", dataId: 3, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Frozen Arrow", dataId: 15, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Giant Arrow", dataId: 17, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Healer Puppet", dataId: 20, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Magic Mirror", dataId: 39, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Action Figure", dataId: 48, type: 'equipment', hero: 'AQ', weight: 0 },
  { name: "Eternal Tome", dataId: 4, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Life Gem", dataId: 5, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Heroic Torch", dataId: 19, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Fireball", dataId: 22, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Rage Gem", dataId: 24, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Healing Tome", dataId: 34, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Lavaloon Puppet", dataId: 41, type: 'equipment', hero: 'GW', weight: 0 },
  { name: "Seeking Shield", dataId: 6, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Royal Gem", dataId: 7, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Hog Rider Doll", dataId: 9, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Haste Vial", dataId: 12, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Rocket Spear", dataId: 13, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Electro Boots", dataId: 40, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Snow Flake", dataId: 50, type: 'equipment', hero: 'RC', weight: 0 },
  { name: "Dark Crown", dataId: 35, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Dark Orb", dataId: 43, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Henchman", dataId: 42, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Metal Pants", dataId: 44, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Meteor Staff", dataId: 49, type: 'equipment', hero: 'MP', weight: 0 },
  { name: "Noble Iron", dataId: 47, type: 'equipment', hero: 'MP', weight: 0 },
  // Dragon Duke Equipment
  { name: "Fire Heart", dataId: 52, type: 'equipment', hero: 'DD', weight: 0 },
  { name: "Flame Breath", dataId: 57, type: 'equipment', hero: 'DD', weight: 0 },
  { name: "Stun Blast", dataId: 56, type: 'equipment', hero: 'DD', weight: 0 },
  { name: "Rocket Backpack", dataId: 53, type: 'equipment', hero: 'DD', weight: 0 },
  { name: "Electro Fangs", dataId: 59, type: 'equipment', hero: 'DD', weight: 0 },
  // Sieges
  { name: "Wall Wrecker", dataId: 4000051, type: 'siege', weight: 1 },
  { name: "Battle Blimp", dataId: 4000052, type: 'siege', weight: 1 },
  { name: "Stone Slammer", dataId: 4000062, type: 'siege', weight: 1 },
  { name: "Siege Barracks", dataId: 4000075, type: 'siege', weight: 1 },
  { name: "Log Launcher", dataId: 4000087, type: 'siege', weight: 1 },
  { name: "Flame Flinger", dataId: 4000091, type: 'siege', weight: 1 },
  { name: "Battle Drill", dataId: 4000092, type: 'siege', weight: 1 },
  { name: "Troop Launcher", dataId: 4000135, type: 'siege', weight: 1 },
  { name: "Sky wagon", dataId: 188, type: 'siege', weight: 1 },
  // Troops — Elixir barracks order
  { name: "Barbarian", dataId: 4000000, type: 'troop', weight: 1 },
  { name: "Archer", dataId: 4000001, type: 'troop', weight: 1 },
  { name: "Giant", dataId: 4000003, type: 'troop', weight: 5 },
  { name: "Goblin", dataId: 4000002, type: 'troop', weight: 1 },
  { name: "Wall Breaker", dataId: 4000004, type: 'troop', weight: 2 },
  { name: "Balloon", dataId: 4000005, type: 'troop', weight: 5 },
  { name: "Wizard", dataId: 4000006, type: 'troop', weight: 4 },
  { name: "Healer", dataId: 4000007, type: 'troop', weight: 14 },
  { name: "Dragon", dataId: 4000008, type: 'troop', weight: 20 },
  { name: "P.E.K.K.A", dataId: 4000009, type: 'troop', weight: 25 },
  { name: "Baby Dragon", dataId: 4000023, type: 'troop', weight: 10 },
  { name: "Miner", dataId: 4000024, type: 'troop', weight: 6 },
  { name: "Electro Dragon", dataId: 4000059, type: 'troop', weight: 30 },
  { name: "Yeti", dataId: 4000053, type: 'troop', weight: 18 },
  { name: "Dragon Rider", dataId: 4000065, type: 'troop', weight: 25 },
  { name: "Electro Titan", dataId: 4000095, type: 'troop', weight: 32 },
  { name: "Root Rider", dataId: 4000110, type: 'troop', weight: 20 },
  { name: "Thrower", dataId: 4000132, type: 'troop', weight: 16 },
  { name: "Meteor Golem", dataId: 4000177, type: 'troop', weight: 40 },
  // Troops — Dark barracks order
  { name: "Minion", dataId: 4000010, type: 'troop', weight: 2 },
  { name: "Hog Rider", dataId: 4000011, type: 'troop', weight: 5 },
  { name: "Valkyrie", dataId: 4000012, type: 'troop', weight: 8 },
  { name: "Golem", dataId: 4000013, type: 'troop', weight: 30 },
  { name: "Witch", dataId: 4000015, type: 'troop', weight: 12 },
  { name: "Lava Hound", dataId: 4000017, type: 'troop', weight: 30 },
  { name: "Bowler", dataId: 4000022, type: 'troop', weight: 6 },
  { name: "Ice Golem", dataId: 4000058, type: 'troop', weight: 15 },
  { name: "Headhunter", dataId: 4000082, type: 'troop', weight: 6 },
  { name: "Apprentice Warden", dataId: 4000097, type: 'troop', weight: 20 },
  { name: "Druid", dataId: 4000123, type: 'troop', weight: 16 },
  { name: "Furnace", dataId: 4000150, type: 'troop', weight: 18 },
  // Super Troops
  { name: "Super Barbarian", dataId: 4000026, type: 'super_troop', weight: 5 },
  { name: "Super Archer", dataId: 4000027, type: 'super_troop', weight: 12 },
  { name: "Sneaky Goblin", dataId: 4000055, type: 'super_troop', weight: 3 },
  { name: "Super Wall Breaker", dataId: 4000028, type: 'super_troop', weight: 8 },
  { name: "Super Giant", dataId: 4000029, type: 'super_troop', weight: 10 },
  { name: "Rocket Balloon", dataId: 4000057, type: 'super_troop', weight: 8 },
  { name: "Super Wizard", dataId: 4000083, type: 'super_troop', weight: 10 },
  { name: "Super Dragon", dataId: 4000081, type: 'super_troop', weight: 40 },
  { name: "Inferno Dragon", dataId: 4000063, type: 'super_troop', weight: 15 },
  { name: "Super Minion", dataId: 4000084, type: 'super_troop', weight: 12 },
  { name: "Super Valkyrie", dataId: 4000064, type: 'super_troop', weight: 20 },
  { name: "Super Witch", dataId: 4000067, type: 'super_troop', weight: 40 },
  { name: "Ice Hound", dataId: 4000076, type: 'super_troop', weight: 40 },
  { name: "Super Bowler", dataId: 4000080, type: 'super_troop', weight: 30 },
  { name: "Super Miner", dataId: 4000056, type: 'super_troop', weight: 24 },
  { name: "Super Yeti", dataId: 4000147, type: 'super_troop', weight: 35 },
  { name: "Super Hog Rider", dataId: 4000098, type: 'super_troop', weight: 12 },
  // Spells — Elixir order
  { name: "Lightning Spell", dataId: 26000000, type: 'spell', weight: 1 },
  { name: "Healing Spell", dataId: 26000001, type: 'spell', weight: 2 },
  { name: "Rage Spell", dataId: 26000002, type: 'spell', weight: 2 },
  { name: "Jump Spell", dataId: 26000003, type: 'spell', weight: 2 },
  { name: "Freeze Spell", dataId: 26000005, type: 'spell', weight: 1 },
  { name: "Clone Spell", dataId: 26000016, type: 'spell', weight: 3 },
  { name: "Invisibility Spell", dataId: 26000035, type: 'spell', weight: 1 },
  { name: "Recall Spell", dataId: 26000053, type: 'spell', weight: 2 },
  { name: "Revive Spell", dataId: 26000098, type: 'spell', weight: 2 },
  { name: "Totem Spell", dataId: 26000120, type: 'spell', weight: 1 },
  // Spells — Dark order
  { name: "Poison Spell", dataId: 26000009, type: 'spell', weight: 1 },
  { name: "Earthquake Spell", dataId: 26000010, type: 'spell', weight: 1 },
  { name: "Haste Spell", dataId: 26000011, type: 'spell', weight: 1 },
  { name: "Skeleton Spell", dataId: 26000017, type: 'spell', weight: 1 },
  { name: "Bat Spell", dataId: 26000028, type: 'spell', weight: 1 },
  { name: "Overgrowth Spell", dataId: 26000070, type: 'spell', weight: 2 },
  { name: "Ice Block Spell", dataId: 26000109, type: 'spell', weight: 1 },
];

// Display order map — items sort by their position in RAW_DATA
const RAW_ORDER: Record<string, number> = {};
RAW_DATA.forEach((item, idx) => { RAW_ORDER[item.name] = idx; });
const sortByGameOrder = (items: Item[]) => [...items].sort((a, b) => (RAW_ORDER[a.name] ?? 999) - (RAW_ORDER[b.name] ?? 999));

// --- HELPERS ---
const getImageUrl = (name: string, type: string, hero?: string | null) => {
  if (name === "Meteor Golem") return "/meteor-golem.png";
  if (name === "Furnace") return "/furnace.png";
  if (name === "Stick Horse") return "/stick-horse.png";
  if (name === "Heroic Torch") return "/heroic-torch.png";
  if (name === "Fire Heart") return "/fire-heart.png";
  if (name === "Flame Breath") return "/flame-breath.png";
  if (name === "Stun Blast") return "/stun-blast.png";
  if (name === "Rocket Backpack") return "/rocket-backpack.png";
  if (name === "Electro Fangs") return "/electro-fangs.png";
  if (name === "Greedy Raven") return "/greedy-raven.png";
  if (name === "Sky wagon" || name === "Sky Wagon") return "/sky-wagon.png";
  const REPO_ROOT = "https://cdn.jsdelivr.net/gh/ClashKingInc/ClashKingAssets@main/assets/home-base";
  if (type === 'pet') return `${REPO_ROOT}/pet-pics/Icon_HV_Hero_Pets_${name.replace(/ /g, "_")}.png`;
  if (type === 'equipment' && hero) {
      let eqName = name.replace(/ /g, "_");
      if (name === "Hog Rider Doll") eqName = "Hog_Rider_Doll";
      if (name === "Action Figure") eqName = "WWEActionFigure"; 
      return `${REPO_ROOT}/equipment-pics/Hero_Equipment_${hero}_${eqName}.png`;
  }
  if (type === 'super_troop') return `${REPO_ROOT}/super-troop-pics/Icon_HV_${name.replace(/ /g, "_")}.png`;
  if (type === 'spell') {
      let s = name.replace(/ Spell$/, "").replace("Healing", "Heal").replace("Revive", "Hero_Revive_Potion").replace("Ice Block", "Ice_block"); 
      const prefix = ["Earthquake", "Haste", "Poison", "Skeleton", "Bat", "Overgrowth", "Ice_block"].includes(s) ? "Icon_HV_Dark_Spell_" : "Icon_HV_Spell_";
      return `${REPO_ROOT}/spell-pics/${prefix}${s}.png`;
  }
  let cn = name.toLowerCase().replace(/\./g, "").replace(/ /g, "-");     
  return `${REPO_ROOT}/troops/${cn}/${cn}-icon.png`;
};

// --- VISUAL COMPONENTS ---
const NumberTicker = ({ value, duration = 500 }: { value: number, duration?: number }) => {
    const [displayValue, setDisplayValue] = useState(value);
    
    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;
        
        const startTime = performance.now();
        const update = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out quart
            const ease = 1 - Math.pow(1 - progress, 4);
            
            const current = start + (end - start) * ease;
            setDisplayValue(Math.round(current));
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    }, [value, duration]);
    
    return <>{displayValue}</>;
};



// --- HELPER COMPONENT ---
function LobbyCodeSync({ setLobbyCode }: { setLobbyCode: (c: string) => void }) {
  const { code } = useParams();
  useEffect(() => { if (code) setLobbyCode(code.toUpperCase()); }, [code, setLobbyCode]);
  return null;
}

// --- COMPONENT ---
function AppContent() {
  const { user, profile, loading, supabase } = useAuth();
  const navigate = useNavigate();
  const foundLobbyRef = useRef<any>(null);
  const location = useLocation();
  // const [view, setView] = useState<View>('login'); // Replaced by Router
  // const [previousView, setPreviousView] = useState<View>('login'); // Handled by history
  const [lobbyCode, setLobbyCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [foundLobby, setFoundLobby] = useState<any>(null);
  // Keep ref in sync so realtime callbacks always have latest value
  useEffect(() => { foundLobbyRef.current = foundLobby; }, [foundLobby]);
  const [lobbyTeams, setLobbyTeams] = useState<any[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [tempTeamName, setTempTeamName] = useState('');
  
  const [focusedPlayer, setFocusedPlayer] = useState<any>(null);
  const [petModalItem, setPetModalItem] = useState<Item | null>(null);

  const [userRosterIds, setUserRosterIds] = useState<string[]>([]);
  const [rosterLoaded, setRosterLoaded] = useState(false);

  const [showOverseerModal, setShowOverseerModal] = useState(false);
  const [matchType, setMatchType] = useState<'custom' | 'official'>('custom');
  const [allRosters, setAllRosters] = useState<{id:string, name:string, tag:string, challonge_participant_id?: string | null}[]>([]);
  const [activeLobbies, setActiveLobbies] = useState<any[]>([]);
  const [selectedTeamA, setSelectedTeamA] = useState<string | null>(null);
  const [selectedTeamB, setSelectedTeamB] = useState<string | null>(null);

  const [linkBracket, setLinkBracket] = useState(false);
  const [tournamentUrl, setTournamentUrl] = useState('');
  const [openMatches, setOpenMatches] = useState<any[]>([]);
  const [challongeMatchId, setChallongeMatchId] = useState<string | null>(null);
  const [isFetchingMatches, setIsFetchingMatches] = useState(false);
  // Map Participant ID -> Native Roster UUID correctly
  const [participantToRosterMap, setParticipantToRosterMap] = useState<Record<string, string>>({});
  const [challongeParticipantMap, setChallongeParticipantMap] = useState<Record<string, string>>({}); // Restored back for fallback display name resolution

  const [teamBudget, setTeamBudget] = useState(1050);
  const [dbItems, setDbItems] = useState<Item[]>([]);
  const [teamPurchases, setTeamPurchases] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [modLoading, setModLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [streamerLoading, setStreamerLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [refLinks, setRefLinks] = useState(['', '', '']);
  const [refResult, setRefResult] = useState<number | null>(null);
  const [refBreakdown, setRefBreakdown] = useState<any[]>([]);

  // End Match Tracking
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [endMatchScores, setEndMatchScores] = useState<Record<string, { stars: string, percentage: string }>>({});
  const [showTeamPanel, setShowTeamPanel] = useState(false);

  const [showSandbox, setShowSandbox] = useState(false);
  const [poppingItem, setPoppingItem] = useState<string | null>(null);

  const handleUpdateItem = async (itemId: string, newBase: number, newInf: number, infType: string, threshold: number = 0) => {
      setIsProcessing(true);
      await supabase.from('items').update({ base_price: newBase, inflation_rate: newInf, inflation_type: infType, is_fixed: infType === 'flat', inflation_start_threshold: threshold }).eq('id', itemId);
      await checkDatabase(); 
      setIsProcessing(false);
  };

  const handleUpdateBudget = async (newBudget: number) => {
      if (!foundLobby?.id) return;
      setIsProcessing(true);
      await supabase.from('teams').update({ budget: newBudget }).eq('lobby_id', foundLobby.id);
      setTeamBudget(newBudget);
      await fetchTeams(foundLobby.id);
      setIsProcessing(false);
      toast.success(`All teams budget set to ${newBudget} gold`);
  };

  // --- INIT ---
  useEffect(() => { checkDatabase(); }, []);

  useEffect(() => {
      if (!loading) {
          attemptRestoreSession();
      }
  }, [loading]);

  useEffect(() => {
     if (!user) {
         setUserRosterIds([]);
         setRosterLoaded(true); // No user = resolution complete (no roster)
         return;
     }

     let cancelled = false;
     setRosterLoaded(false);

     const resolveRoster = async () => {
          try {
              // Only fetch rosters where user is an ACTIVE PLAYER (role='player').
              // Captain privilege is for creating lobbies only, not joining them.
              const { data: memberRows } = await supabase
                  .from('roster_members')
                  .select('roster_id')
                  .eq('user_id', user.id)
                  .eq('role', 'player');

              if (cancelled) return;
              const ids = memberRows ? memberRows.map(r => r.roster_id) : [];

               setUserRosterIds(ids);
               setRosterLoaded(true);
         } catch (err) {
             // Network error / timeout — still mark as loaded to prevent stuck UI
             console.warn('[RosterResolve] Error resolving roster, defaulting:', err);
             if (!cancelled) {
                 setUserRosterIds([]);
                 setRosterLoaded(true);
             }
         }
     };

     resolveRoster();
     return () => { cancelled = true; };
  }, [user?.id]);

  // Handle Automated Bracket Auto-Fetch
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (showOverseerModal && linkBracket && tournamentUrl.trim().length > 0) {
        setIsFetchingMatches(true);
        timeoutId = setTimeout(async () => {
            try {
                const { fetchOpenMatches, fetchParticipants } = await import('./services/challongeService');
                const [matches, participants] = await Promise.all([
                    fetchOpenMatches(tournamentUrl.trim()),
                    fetchParticipants(tournamentUrl.trim())
                ]);
                
                const { data: tData } = await supabase.from('tournaments')
                    .select('id')
                    .eq('challonge_url', tournamentUrl.trim())
                    .limit(1)
                    .maybeSingle();

                let dbNameMap: Record<string, string> = {};
                let dbRosterMap: Record<string, string> = {};
                if (tData) {
                    const { data: regs } = await supabase.from('tournament_registrations')
                        .select('challonge_participant_id, roster_id, rosters(name)')
                        .eq('tournament_id', tData.id);
                        
                    if (regs) {
                        regs.forEach(r => {
                            dbRosterMap[r.challonge_participant_id] = r.roster_id;
                            const rData = r.rosters as any;
                            if (rData && rData.name) {
                                dbNameMap[r.challonge_participant_id] = rData.name;
                            }
                        });
                    }
                }
                
                setParticipantToRosterMap(dbRosterMap);

                const pMap: Record<string, string> = {};
                if (participants && Array.isArray(participants)) {
                    participants.forEach((p: any) => {
                        if (p.participant && p.participant.id) {
                            const defaultName = p.participant.name || p.participant.display_name || p.participant.username || `Participant ${p.participant.id}`;
                            const nativeName = dbNameMap[p.participant.id.toString()] || defaultName;
                            pMap[p.participant.id.toString()] = nativeName;
                            
                            // Also map group_player_ids if they exist (used in some bracket types)
                            if (p.participant.group_player_ids && Array.isArray(p.participant.group_player_ids)) {
                                p.participant.group_player_ids.forEach((gId: number) => {
                                    pMap[gId.toString()] = nativeName;
                                });
                            }
                        }
                    });
                }
                setChallongeParticipantMap(pMap);
                setOpenMatches(matches);
            } catch (err: any) {
                console.error("Failed to auto-fetch matches:", err);
                setOpenMatches([]);
            } finally {
                setIsFetchingMatches(false);
            }
        }, 500); // 500ms debounce
    } else {
        setOpenMatches([]);
        setIsFetchingMatches(false);
    }
    
    return () => clearTimeout(timeoutId);
  }, [showOverseerModal, linkBracket, tournamentUrl]);

  const checkDatabase = async () => {
    const { data } = await supabase.from('items').select('*');
    if (!data || data.length === 0) seedDatabase(); else setDbItems(data);
  };

  const seedDatabase = async () => {
    const rows = RAW_DATA.map(i => ({
      id: i.name, name: i.name, type: i.type, hero: (i as any).hero || null, coc_id: i.dataId, base_price: 1, housing_space: (i as any).weight || 0,
      inflation_rate: 2, is_fixed: false
    }));
    await supabase.from('items').upsert(rows);
    const { data } = await supabase.from('items').select('*');
    if (data) setDbItems(data);
  };

  const fetchTeams = async (lId: string) => {
    const { data: teams } = await supabase.from('teams').select('*, players(id, name, army_link, is_locked, user_id, purchases(item_id, equipped_hero, is_cc))').eq('lobby_id', lId).order('created_at', { ascending: true });
    if (teams) setLobbyTeams(teams);
  };

  const attemptRestoreSession = async () => {
      const storedPid = localStorage.getItem('iw_pid');
      const storedTid = localStorage.getItem('iw_tid');
      const storedLobby = localStorage.getItem('iw_lobby');
      if (storedPid && storedTid && storedLobby) {
          const { data: player } = await supabase.from('players').select('id, name, team_id, is_locked').eq('id', storedPid).single();
          if (player && player.team_id === storedTid) {
              setPlayerId(player.id); setTeamId(player.team_id); setPlayerName(player.name); setLobbyCode(storedLobby); setIsLocked(player.is_locked || false);
              const { data: lobby } = await supabase.from('lobbies').select('*').ilike('code', storedLobby).single();
              if (lobby) { setFoundLobby(lobby); const { data: team } = await supabase.from('teams').select('name').eq('id', storedTid).single(); setTeamName(team?.name || ''); fetchTeams(lobby.id); navigate('/game'); }
          }
      }
      setIsRestoring(false);
  };

  useEffect(() => {
    const isJoinOrStream = location.pathname.startsWith('/stream/') || location.pathname.startsWith('/join/');
    if (isJoinOrStream && lobbyCode) {
        // If foundLobby is stale (different code), clear it so we reload
        const isStale = foundLobby && foundLobby.code?.toUpperCase() !== lobbyCode?.toUpperCase();
        if (isStale) {
            setFoundLobby(null);
            setLobbyTeams([]);
            return; // Will re-run with foundLobby = null
        }
        if (!foundLobby) {
            const loadStreamData = async () => {
                const { data: lobby } = await supabase.from('lobbies').select('*').ilike('code', lobbyCode).single();
                if (lobby) {
                    setFoundLobby(lobby);
                    fetchTeams(lobby.id);
                }
            };
            loadStreamData();
        }
    }
  }, [location.pathname, lobbyCode, foundLobby]);

  const handleFindLobby = async (e?: React.FormEvent | string, modeArg?: string, retryCount = 0) => {
    let mode: string = modeArg || '/join';
    if (e && typeof e === 'object' && 'preventDefault' in e) {
        e.preventDefault();
    } else if (typeof e === 'string') {
        mode = e;
    }

    let code = lobbyCode.trim().toUpperCase();
    setLobbyCode(code);

    // Pick the right loading setter for this button
    const setLoading = mode === 'streamer' ? setStreamerLoading : setDeployLoading;
    setLoading(true);

    // Helper to race promise against timeout
    const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number = 5000): Promise<T> => {
        return Promise.race([
            Promise.resolve(promise),
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
        ]);
    };

    try {
      let { data: lobby } = await withTimeout<any>(supabase.from('lobbies').select('*').eq('code', code).single());
      if (mode === '/moderator' && !lobby) {
         const { data: nl } = await withTimeout<any>(supabase.from('lobbies').insert({ code }).select().single());
         lobby = nl; await withTimeout(supabase.from('teams').insert([{ lobby_id: nl.id, name: 'Team 1', budget: 1050 }, { lobby_id: nl.id, name: 'Team 2', budget: 1050 }]));
      } else if (!lobby) { setLoading(false); toast.error('Lobby not found.'); return; }
      setFoundLobby(lobby); 
      fetchTeams(lobby.id); 
      
      if (mode === 'streamer') {
          navigate(`/stream/${lobby.code}`);
      } else {
          navigate(mode);
      }
    } catch (err: any) {
      console.error('[FindLobby] Error:', err);
      const isAbort = (err instanceof DOMException && err.name === 'AbortError') ||
                      (err?.message?.includes('AbortError')) ||
                      (err?.message?.includes('timed out'));
      if (isAbort && retryCount < 1) {
        console.warn('[FindLobby] Timeout — retrying...');
        await new Promise(r => setTimeout(r, 500));
        setLoading(false);
        return handleFindLobby(mode, modeArg, retryCount + 1);
      }
      toast.error('Error: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openOverseerModal = async () => {
    const code = lobbyCode.trim().toUpperCase();
    if (!code) { toast.error('Enter a Lobby ID first.'); return; }
    if (!profile || profile.role !== 'moderator') {
        toast.error('ACCESS DENIED: Insufficient Security Clearance.'); return;
    }
    
    setModLoading(true);
    if (allRosters.length === 0) {
        const { data, error } = await supabase.from('rosters').select('id, name, tag, challonge_participant_id').order('name');
        if (data) {
            setAllRosters(data);
            if (data.length >= 2) {
                setSelectedTeamA(data[0].id);
                setSelectedTeamB(data[1].id);
            } else if (data.length === 1) {
                setSelectedTeamA(data[0].id);
                setSelectedTeamB(data[0].id);
            }
        } else if (error) {
            console.error("Error fetching rosters:", error);
            toast.error('Error loading tournament rosters.');
        }
    }
    
    // Fetch active lobbies for the Live Browser
    const { data: lobbiesData, error: lobbiesError } = await supabase
        .from('lobbies')
        .select(`
            *,
            teams ( id, name, roster_id )
        `)
        .order('created_at', { ascending: false })
        .limit(10);
        
    if (lobbiesData) {
        // Enhance lobbies with tournament names if they represent an official match
        const enrichedLobbies = await Promise.all(lobbiesData.map(async (lobby) => {
            let tournamentName = null;
            if (lobby.challonge_match_id) {
                 const rosterId = lobby.teams?.[0]?.roster_id || lobby.teams?.[1]?.roster_id;
                 if (rosterId) {
                     const { data: tr } = await supabase.from('tournament_registrations').select('tournament_id, tournaments(name)').eq('roster_id', rosterId).limit(1).maybeSingle();
                     const tData = tr?.tournaments as any;
                     if (tData) {
                         tournamentName = Array.isArray(tData) ? tData[0]?.name : tData.name;
                     }
                 }
            }
            return { ...lobby, tournamentName };
        }));
        setActiveLobbies(enrichedLobbies);
    } else if (lobbiesError) {
        console.error("Error fetching active lobbies:", lobbiesError);
    }
    setModLoading(false);
    setShowOverseerModal(true);
  };

  const handleModeratorAccess = async (retryCount = 0, overrideCode?: string) => {
    const code = (overrideCode || lobbyCode).trim().toUpperCase();
    if (!code) { toast.error('Enter a Lobby ID first.'); return; }
    
    if (!profile || profile.role !== 'moderator') {
        toast.error('ACCESS DENIED: Insufficient Security Clearance.'); return;
    }

    console.log('[ModAccess] Starting lobby creation for:', code, 'Retry:', retryCount);
    
    setModLoading(true);
    
    // Helper to race promise against timeout
    const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number = 5000): Promise<T> => {
        return Promise.race([
            Promise.resolve(promise),
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
        ]);
    };

    try {
      setLobbyCode(code);
      
      // 1. Try to find existing lobby
      console.log('[ModAccess] Finding lobby...');
      let { data: lobby } = await withTimeout<any>(supabase.from('lobbies').select('*').eq('code', code).single());

      // 2. Create if not found
      if (!lobby) {
        console.log('[ModAccess] Lobby not found. Creating...');
        
        let nl, insertErr;
        
        const aId = matchType === 'official' ? selectedTeamA : null;
        const bId = matchType === 'official' ? selectedTeamB : null;
        const cId = (matchType === 'official' && linkBracket) ? challongeMatchId : null;

        const res = await supabase.rpc('create_lobby', {
            p_lobby_name: code,
            p_team_a_roster_id: aId,
            p_team_b_roster_id: bId,
            p_challonge_match_id: cId
        });
        
        nl = res.data;
        insertErr = res.error;
        
        if (insertErr) {
          if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key')) {
            console.warn('[ModAccess] Conflict (23505). Fetching existing...');
            const refetch = await withTimeout<any>(supabase.from('lobbies').select('*').eq('code', code).single());
            lobby = refetch.data;
          } else {
            throw insertErr;
          }
        } else {
          console.log('[ModAccess] Lobby created via RPC.');
          lobby = nl;
        }
      }

      if (!lobby) throw new Error('Could not verify lobby');

      console.log('[ModAccess] Success. Found lobby:', lobby);
      setFoundLobby(lobby);
      fetchTeams(lobby.id); // Fire and forget updater
      setShowOverseerModal(false);
      navigate('/moderator');
      
    } catch (err: any) {
      console.error('[ModAccess] Error:', err);
      
      // AbortError / Web Lock / Timeout retry logic
      const isAbort = (err instanceof DOMException && err.name === 'AbortError') ||
                      (err?.message?.includes('AbortError')) ||
                      (err?.message?.includes('navigator.locks')) ||
                      (err?.message?.includes('timed out'));

      if (isAbort && retryCount < 1) {
        console.warn('[ModAccess] AbortError check... retrying...');
        await new Promise(r => setTimeout(r, 500));
        return handleModeratorAccess(retryCount + 1);
      }
      
      if (err.message?.includes('row-level security') || err.message?.includes('violates row-level security policy')) {
          toast.error('ACCESS DENIED: Database policy violation.');
      } else {
          toast.error('Error: ' + (err?.message || 'Unknown error'));
      }
      
    } finally {
      setModLoading(false);
    }
  };

  const handleJoinTeam = async (tName: string) => {
    const nameToUse = (profile && profile.username && !profile.username.startsWith('Recruit_')) ? profile.username : playerName;
    if (!nameToUse) { toast.error('Enter your name first.'); return; }
    const team = lobbyTeams.find(t => t.name === tName);
    if (team?.players && team.players.length >= 3) { toast.error('Team is full!'); return; }
    
    setDeployLoading(true);

    const { data: tIdData } = await supabase.from('teams').select('id').eq('lobby_id', foundLobby.id).eq('name', tName).single();
    
    // Call secure backend RPC
    const { data: p, error } = await supabase.rpc('join_lobby_secure', {
        p_team_id: tIdData!.id,
        p_player_name: nameToUse
    });

    setDeployLoading(false);

    if (error) {
         if (error.message?.includes('Access Denied')) {
             toast.error(error.message); return;
         }
         toast.error('Error joining: ' + error.message); return;
    }
    
    localStorage.setItem('iw_pid', p.id);
    localStorage.setItem('iw_tid', tIdData!.id);
    localStorage.setItem('iw_lobby', lobbyCode.toUpperCase());
    setPlayerId(p.id); setTeamId(tIdData!.id); setTeamName(tName); setIsLocked(p.is_locked || false);
    if (foundLobby) await fetchTeams(foundLobby.id);
    navigate('/game');
  };

  // --- REALTIME ---
  useEffect(() => {
    if (location.pathname === '/game' && teamId) {
      fetchGameState();
      // Also refresh lobbyTeams so teammate panel has data after reload
      if (foundLobby) {
          fetchTeams(foundLobby.id);
      } else if (lobbyCode) {
          supabase.from('lobbies').select('id').eq('code', lobbyCode).single().then(({ data: L }) => {
              if (L) fetchTeams(L.id);
          });
      }
      console.log('[Realtime] Subscribing to game updates for team:', teamId);
      const ch = supabase.channel(`game-${teamId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, p => { if(p.new && (p.new as any).budget !== undefined) setTeamBudget((p.new as any).budget); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases', filter: `team_id=eq.${teamId}` }, () => fetchGameState())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `team_id=eq.${teamId}` }, async (payload) => { 
            // 1. Handle logic for ALL players in the team (someone joined, left, bought stuff, toggled lock)
            const lobby = foundLobbyRef.current;
            if (lobby) await fetchTeams(lobby.id);
            else if (lobbyCode) {
                 const { data: L } = await supabase.from('lobbies').select('id').ilike('code', lobbyCode).single();
                 if (L) await fetchTeams(L.id);
            }
            
            // 2. Handle specific logic if the update applies to THIS current player
            if (payload.new && (payload.new as any).id === playerId) {
                 const pl = payload.new as any;
                 if (pl.team_id !== teamId) {
                     console.log('[Realtime] Player moved to new team:', pl.team_id);
                     toast('Moved to new team. Army reset.', { icon: '🔄' });
                     const newTid = pl.team_id;
                     localStorage.setItem('iw_tid', newTid);
                     const { data: t } = await supabase.from('teams').select('name').eq('id', newTid).single();
                     setTeamId(newTid); setTeamName(t?.name || ''); setMyPurchases([]); setTeamPurchases([]);
                 }
                 if (pl.is_locked !== undefined) setIsLocked(pl.is_locked);
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` }, () => {
             toast.error('Team disbanded by moderator.');
             localStorage.removeItem('iw_pid'); localStorage.removeItem('iw_tid'); localStorage.removeItem('iw_lobby');
             setPlayerId(null); setTeamId(null); setFoundLobby(null); setLobbyCode(''); setIsLocked(false); navigate('/');
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` }, () => {
            toast.error('You have been removed from the match.');
            localStorage.removeItem('iw_pid'); localStorage.removeItem('iw_tid'); localStorage.removeItem('iw_lobby');
            setPlayerId(null); setTeamId(null); setFoundLobby(null); setLobbyCode(''); setIsLocked(false); navigate('/');
        })
        .subscribe((status) => {
            console.log('[Realtime] Subscription status:', status);
        });

      // Second channel: lobby-wide player changes (ensures teammate panel updates on join/leave)
      const lobbyId = foundLobbyRef.current?.id;
      const refreshTeams = async () => {
          const lobby = foundLobbyRef.current;
          if (lobby) await fetchTeams(lobby.id);
          else if (lobbyCode) {
              const { data: L } = await supabase.from('lobbies').select('id').ilike('code', lobbyCode).single();
              if (L) await fetchTeams(L.id);
          }
      };
      const lobbyChannel = supabase.channel(`lobby-players-${lobbyId || teamId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'players' }, refreshTeams)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'players' }, refreshTeams)
        .subscribe();

      return () => { 
          console.log('[Realtime] Unsubscribing from game updates for team:', teamId);
          supabase.removeChannel(ch);
          supabase.removeChannel(lobbyChannel);
      };
    }
    if (foundLobby && (location.pathname === '/moderator' || location.pathname.startsWith('/stream/'))) {
      const ch = supabase.channel('admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchTeams(foundLobby.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams(foundLobby.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => fetchTeams(foundLobby.id))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'lobbies', filter: `id=eq.${foundLobby.id}` }, () => {
             toast.error('Lobby has been deleted.');
             setFoundLobby(null);
             setLobbyCode('');
             setIsLocked(false);
             navigate('/');
        })
        .subscribe();
      return () => { supabase.removeChannel(ch); };
    }
  }, [location.pathname, teamId, foundLobby, playerId, lobbyCode]);

  const fetchGameState = async () => {
    const { data: t } = await supabase.from('teams').select('budget').eq('id', teamId!).single();
    if (t) setTeamBudget(t.budget);
    const { data: pur } = await supabase.from('purchases').select('*').eq('team_id', teamId!);
    if (pur) { setTeamPurchases(pur); setMyPurchases(pur.filter(x => x.player_id === playerId)); }
  };

  const handleBuy = async (item: Item, targetHero: string | null = null, isCC: boolean = false) => {
    if (isProcessing) return;
    if (isLocked) { toast.error('ARMY LOCKED: You cannot modify your deployment.'); return; }
    if (!isCC && (targetHero || item.hero)) {
        const activeH = new Set();
        myPurchases.forEach(p => { if(!p.is_cc) { if(p.equipped_hero) activeH.add(p.equipped_hero); const i=dbItems.find(x=>x.id===p.item_id); if(i?.hero) activeH.add(i.hero); }});
        if (!activeH.has(targetHero || item.hero) && activeH.size >= 4) { toast.error('4 Heroes Max'); return; }
    }
    if (item.type === 'pet' && !targetHero && !isCC) { setPetModalItem(item); return; }
    
    if (!isCC && item.type === 'super_troop') {
        const ownedSuperTroopTypes = new Set(
            myPurchases
              .filter(p => !p.is_cc && dbItems.find(i => i.id === p.item_id)?.type === 'super_troop')
              .map(p => p.item_id)
        );
        if (!ownedSuperTroopTypes.has(item.id) && ownedSuperTroopTypes.size >= 2) {
            toast.error('Max 2 types of Super Troops per army!');
            return;
        }
    }
    
    const count = teamPurchases.filter(x => x.item_id === item.id && !x.is_cc).length;
    const threshold = item.inflation_start_threshold || 0;
    const effectiveCount = Math.max(0, count - threshold);
    const p = isCC ? 0 : (
        (item.is_fixed || item.inflation_type === 'flat') ? item.base_price : 
        (count < threshold ? item.base_price :
        (item.inflation_type === 'exponential' ? item.base_price * Math.pow((item.inflation_rate || 2), effectiveCount) : 
        item.base_price + (effectiveCount * (item.inflation_rate || 2))))
    );
    if (teamBudget < p) { toast.error('Not enough budget.'); return; }

    let cat: any = 'troop';
    if (item.type === 'spell') cat = 'spell'; else if (item.type === 'siege') cat = 'siege'; else if (item.type === 'equipment') cat = 'equipment';
    if (isCC) {
        if (item.type === 'pet' || item.type === 'equipment' || item.type === 'siege') { toast.error('Pets/Equipment/Sieges cannot go in Clan Castle'); return; }
        const current = getCurrentWeight(cat as 'troop'|'spell', true);
        if (current + item.housing_space > CC_LIMITS[cat as keyof typeof CC_LIMITS]) { toast.error('CC Full'); return; }
    } else if (cat !== 'equipment' && item.type !== 'pet') {
             const current = getCurrentWeight(cat, false);
             if (current + item.housing_space > LIMITS[cat as keyof typeof LIMITS]) { toast.error('Army Full'); return; }
    }

    setIsProcessing(true); setPetModalItem(null);
    setPoppingItem(item.id); setTimeout(() => setPoppingItem(null), 250);
    await supabase.rpc('buy_item', { p_player_id: playerId, p_item_id: item.id, p_target_hero: targetHero, p_is_cc: isCC });
    fetchGameState(); setIsProcessing(false);
  };

  const handleSell = async (item: Item) => { if (isLocked) { toast.error('ARMY LOCKED'); return; } await supabase.rpc('sell_item', { p_player_id: playerId, p_item_id: item.id }); fetchGameState(); };
  const handleLeave = async () => { 
    if (isLocked) { toast.error('ARMY LOCKED: You cannot leave the match once committed.'); return; }
    if(!(await confirmToast('Are you sure you want to leave the match? All your assets will be refunded to the team.'))) return;
    setIsProcessing(true);
    if(playerId) {
        await supabase.rpc('clear_player_army', { p_player_id: playerId });
        await supabase.rpc('leave_team', { p_player_id: playerId }); 
    }
    localStorage.removeItem('iw_pid');
    localStorage.removeItem('iw_tid');
    localStorage.removeItem('iw_lobby');
    setPlayerId(null);
    setTeamId(null);
    setFoundLobby(null);
    setLobbyCode('');
    setIsProcessing(false);
    navigate('/'); 
  };

  const handleClearArmy = async () => {
      if (isLocked) { toast.error('ARMY LOCKED'); return; }
      if (myPurchases.length === 0) return;
      if (!(await confirmToast('Scrap your entire deployment? This will refund all gold to the team budget.'))) return;
      setIsProcessing(true);
      await supabase.rpc('clear_player_army', { p_player_id: playerId });
      fetchGameState();
      setIsProcessing(false);
  };

  // --- REFEREE ---
  const handleRefereeCheck = () => {
    let grandTotal = 0;
    const teamCounts: Record<string, number> = {}; 
    const parseSegment = (segment: string, allowedTypes: string[]) => {
        if (!segment) return;
        segment.split('-').forEach(p => {
            const [cStr, idStr] = p.split('x');
            if (!cStr || !idStr) return;
            const item = dbItems.find(i => (i.coc_id % 1000000) === (parseInt(idStr) % 1000000) && allowedTypes.includes(i.type));
            if (item) teamCounts[item.id] = (teamCounts[item.id] || 0) + parseInt(cStr);
        });
    };
    refLinks.forEach(link => {
        if (!link) return;
        let s = link.includes('army=') ? link.split('army=')[1] : link;
        const u = s.match(/u([^sihd]+)/); const sp = s.match(/s([^uhid]+)/); const h = s.match(/h([^usid]+)/);
        if(u) parseSegment(u[1], ['troop', 'super_troop', 'siege']);
        if(sp) parseSegment(sp[1], ['spell']);
        if(h) h[1].split('-').forEach(hs => { const em = hs.match(/e([0-9_]+)/); if(em) em[1].split('_').forEach(eid => { const item = dbItems.find(i => i.type === 'equipment' && i.coc_id === parseInt(eid)); if(item) teamCounts[item.id] = (teamCounts[item.id] || 0) + 1; }); });
    });
    const breakdown: any[] = [];
    Object.keys(teamCounts).forEach(id => {
        const item = dbItems.find(i => i.id === id);
        if (item) {
            const n = teamCounts[id];
            let cost = 0;
            const threshold = item.inflation_start_threshold || 0;
            if (item.is_fixed || item.inflation_type === 'flat') {
                cost = item.base_price * n;
            } else if (n <= threshold) {
                // All units within flat threshold
                cost = item.base_price * n;
            } else {
                // Flat portion + inflated portion
                const flatCost = item.base_price * threshold;
                const effectiveN = n - threshold;
                if (item.inflation_type === 'exponential') {
                    const rate = item.inflation_rate || 2;
                    cost = flatCost + (rate === 1 ? (item.base_price * effectiveN) : item.base_price * ((Math.pow(rate, effectiveN) - 1) / (rate - 1)));
                } else {
                    const rate = item.inflation_rate || 2;
                    cost = flatCost + (item.base_price * effectiveN) + (rate * (effectiveN * (effectiveN - 1)) / 2);
                }
            }
            grandTotal += cost;
            breakdown.push({ name: item.name, count: n, cost });
        }
    });
    setRefResult(grandTotal); setRefBreakdown(breakdown.sort((a,b)=>b.cost-a.cost));
  };

  const exportArmy = async () => {
    // 1. Calculate the link synchronously so it's always available
    const getItem = (id: string) => dbItems.find(i => i.id === id);
    const gen = (list: any[], types: string[]) => {
        const rel = list.map(p => getItem(p.item_id)).filter(i => i && types.includes(i.type)) as Item[];
        if (rel.length === 0) return '';
        const c: any = {}; rel.forEach(i => c[i.id] = (c[i.id] || 0) + 1);
        return Array.from(new Set(rel.map(i => i.id))).map(id => `${c[id]}x${getItem(id)!.coc_id % 1000000}`).join('-');
    };
    const main = myPurchases.filter(p => !p.is_cc); const cc = myPurchases.filter(p => p.is_cc);
    const hParts: string[] = [];
    ['BK', 'AQ', 'GW', 'RC', 'MP', 'DD'].forEach(h => {
        const pet = main.find(p => getItem(p.item_id)?.type === 'pet' && p.equipped_hero === h);
        const eqs = main.filter(p => getItem(p.item_id)?.type === 'equipment' && getItem(p.item_id)?.hero === h).map(p => getItem(p.item_id)!.coc_id);
        if (pet || eqs.length > 0) hParts.push(`${HERO_LINK_IDS[h]}${pet ? 'p' + getItem(pet.item_id)!.coc_id : ''}${eqs.length ? 'e' + eqs.join('_') : ''}`);
    });
    const hStr = hParts.length ? 'h' + hParts.join('-') : '';
    
    const ccTroopsStr = gen(cc, ['siege', 'troop', 'super_troop']);
    const ccSpellsStr = gen(cc, ['spell']);
    const ccStr = (ccTroopsStr ? 'i' + ccTroopsStr : '') + (ccSpellsStr ? 'd' + ccSpellsStr : '');
    
    const uStr = gen(main, ['troop', 'super_troop', 'siege']);
    const sStr = gen(main, ['spell']);
    const mainStr = (uStr ? 'u' + uStr : '') + (sStr ? 's' + sStr : '');
    
    const calculatedLink = hStr + ccStr + mainStr;
    const url = `https://link.clashofclans.com/en?action=CopyArmy&army=${calculatedLink}`;

    // 2. If already locked, open the window SYNCHRONOUSLY to bypass mobile popup blockers
    if (isLocked) {
        const currentPlayer = lobbyTeams.flatMap(t => t.players || []).find(p => p.id === playerId);
        const linkToOpen = currentPlayer?.army_link || url;
        if (linkToOpen && isSafeUrl(linkToOpen)) {
            window.open(linkToOpen, '_blank');
        } else {
            window.open(url, '_blank');
        }
        return;
    }

    // 3. Otherwise, do the locking flow (this is async, so the final window.open might be blocked depending on the browser/device)
    if (!(await confirmToast('CONFIRM DEPLOYMENT?\n\nThis will LOCK your army and prevent further changes.'))) return;
    
    if (playerId) {
        setIsProcessing(true);
        const { error } = await supabase.rpc('lock_player_army', { p_player_id: playerId, p_army_link: url });
        setIsProcessing(false);
        if (error) {
            toast.error('Error locking army: ' + error.message);
            return;
        }
        setIsLocked(true);
        toast.success("Army Locked! If it didn't open automatically, tap the 'OPEN ARMY LINK' button.");
    }

    // Try to open it. If it gets blocked, the user is safe because the button is now "OPEN ARMY LINK" (which works sync).
    try {
        window.open(url, '_blank');
    } catch (e) {
        console.warn("Popup blocked automatically opening the link.");
    }
  };

  // --- HELPERS FOR UI ---
  const calcPrice = (item: Item, isCC: boolean = false) => {
      if (isCC) return 0;
      if (item.is_fixed || item.inflation_type === 'flat') return item.base_price;
      const count = teamPurchases.filter(p => p.item_id === item.id && !p.is_cc).length;
      const threshold = item.inflation_start_threshold || 0;
      if (count < threshold) return item.base_price;
      const effectiveCount = count - threshold;
      if (item.inflation_type === 'exponential') return item.base_price * Math.pow((item.inflation_rate || 2), effectiveCount);
      return item.base_price + (effectiveCount * (item.inflation_rate || 2));
  };
  const getCurrentWeight = (cat: 'troop'|'spell'|'siege', isCC: boolean = false) => myPurchases.reduce((s,p)=>{ if(!!p.is_cc!==isCC)return s; const i=dbItems.find(x=>x.id===p.item_id); if(!i)return s; if(cat==='troop' && (i.type==='troop'||i.type==='super_troop'))return s+i.housing_space; if(cat==='spell' && i.type==='spell')return s+i.housing_space; if(cat==='siege' && i.type==='siege')return s+i.housing_space; return s; },0);
  const getMyCount = (id: string, isCC: boolean) => myPurchases.filter(p=>p.item_id===id && !!p.is_cc===isCC).length;

  const renderPlayerArmy = (p: any, isLarge = false) => {
    const items = p.purchases || []; 
    if (items.length === 0) return <div className="text-slate-600 italic flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-700"/>No Assets Deployed</div>;
    const getItem = (id: string) => dbItems.find(i => i.id === id);
    const counts: any = {}, ccCounts: any = {};
    items.forEach((x: any) => x.is_cc ? ccCounts[x.item_id] = (ccCounts[x.item_id] || 0) + 1 : counts[x.item_id] = (counts[x.item_id] || 0) + 1);
    const active = items.map((x: any) => ({ ...getItem(x.item_id), equipped_hero: x.equipped_hero, is_cc: x.is_cc })).filter((i: any) => i.name);
    
    const renderRow = (list: any[], cMap: any, label: string, color: string = "blue") => {
        const unique = Array.from(new Map(list.map(i => [i.id, i])).values());
        if (unique.length === 0) return null;
        return (
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[9px] font-bold text-${color}-400/70 uppercase w-12 tracking-wider`}>{label}</span>
                {unique.map((i: any) => (
                    <div key={i.id} className={`relative group/item ${isLarge ? 'w-14 h-14' : 'w-7 h-7'} bg-[#0a101f] border border-white/5 rounded-md hover:border-${color}-500/50 transition-all shadow-sm`}>
                        <img src={getImageUrl(i.name, i.type, i.hero)} className="w-full h-full object-contain p-1 opacity-80 group-hover/item:opacity-100 transition-opacity" />
                        <div className={`absolute -top-1.5 -right-1.5 bg-${color}-500/10 text-${color}-400 border border-${color}-500/20 font-mono text-[9px] font-bold flex items-center justify-center rounded-sm min-w-[14px] h-[14px] shadow-sm backdrop-blur-sm`}>
                            {cMap[i.id]}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    return (
        <div className={isLarge ? "space-y-4" : "space-y-1"}>
            <div className="flex flex-wrap gap-2 mb-3">
                {['BK', 'AQ', 'GW', 'RC', 'MP', 'DD'].filter(h => active.some((i: any) => !i.is_cc && (i.hero === h || i.equipped_hero === h))).map(h => (
                    <div key={h} className="group relative bg-white/5 p-1 rounded-lg border border-white/5 hover:border-yellow-500/30 flex items-center gap-1 transition-all">
                        <div className="relative">
                             <img src={`/${h.toLowerCase()}.png`} className="w-8 h-8 rounded-md border border-white/10 object-cover shadow-sm group-hover:grayscale-0 grayscale-[0.3] transition-all"/>
                             <div className="absolute -bottom-1 -right-1 bg-black/60 text-[8px] font-bold px-1 rounded text-white border border-white/10">{h}</div>
                        </div>
                        {active.filter((i: any) => !i.is_cc && i.type === 'pet' && i.equipped_hero === h).map((pet: any) => (
                            <div key={pet.id} className="relative w-6 h-6 border border-green-500/30 rounded bg-green-900/10 p-0.5" title={pet.name}>
                                 <img src={getImageUrl(pet.name, 'pet')} className="w-full h-full object-contain"/>
                            </div>
                        ))}
                        {active.filter((i: any) => !i.is_cc && i.hero === h).map((eq: any) => (
                            <div key={eq.id} className="relative w-6 h-6 border border-blue-500/30 rounded bg-blue-900/10 p-0.5" title={eq.name}>
                                <img src={getImageUrl(eq.name, 'equipment', h)} className="w-full h-full object-contain"/>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            {renderRow(active.filter((i: any) => !i.is_cc && (i.type === 'troop' || i.type === 'super_troop')), counts, "UNIT", "blue")}
            {renderRow(active.filter((i: any) => !i.is_cc && i.type === 'siege'), counts, "MECH", "orange")}
            {renderRow(active.filter((i: any) => !i.is_cc && i.type === 'spell'), counts, "META", "purple")}
            
            {(Object.keys(ccCounts).length > 0) && (
                <div className="border-t border-dashed border-white/5 pt-2 mt-2 bg-orange-500/5 rounded-lg p-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1 opacity-20"><Castle size={12} className="text-orange-500"/></div>
                    {renderRow(active.filter((i: any) => i.is_cc && i.type === 'siege'), ccCounts, "CC-M", "red")}
                    {renderRow(active.filter((i: any) => i.is_cc && (i.type === 'troop' || i.type === 'super_troop')), ccCounts, "CC-U", "red")}
                    {renderRow(active.filter((i: any) => i.is_cc && i.type === 'spell'), ccCounts, "CC-S", "red")}
                </div>
            )}
        </div>
    );
  };

  const getTickerItems = () => {
    const allItems: any[] = [];
    lobbyTeams.forEach((team, index) => {
        const counts: any = {};
        team.players?.forEach((p: any) => p.purchases?.forEach((pur: any) => counts[pur.item_id] = (counts[pur.item_id] || 0) + 1));
        Object.keys(counts).forEach(itemId => { const item = dbItems.find(i => i.id === itemId); if(item) allItems.push({ name: item.name, price: item.base_price + (counts[itemId] * 2), teamName: team.name, color: index === 0 ? "text-blue-400" : "text-purple-400" }); });
    });
    return allItems.sort((a, b) => b.price - a.price).slice(0, 25);
  };

  const handleRenameTeam = async (tId: string) => { if(!tempTeamName.trim()) return; await supabase.rpc('moderator_rename_team', { p_team_id: tId, p_new_name: tempTeamName }); setEditingTeamId(null); fetchTeams(foundLobby.id); };
  
  const handleEndMatchClick = () => {
      // Initialize scores for the modal
      const initialScores: Record<string, { stars: string, percentage: string }> = {};
      lobbyTeams.forEach(t => {
          initialScores[t.id] = { stars: '', percentage: '' };
      });
      setEndMatchScores(initialScores);
      setShowEndMatchModal(true);
  };

  const submitEndMatch = async () => {
      // Validate inputs
      for (const team of lobbyTeams) {
          const score = endMatchScores[team.id];
          if (!score || score.stars === '' || score.percentage === '') {
              toast.error(`Please enter both Stars and Destruction % for ${team.name}`);
              return;
          }
      }

      setModLoading(true);
      
      try {
          // Automated Bracket Advancement Logic
          if (foundLobby.challonge_match_id) {
              if (!tournamentUrl) {
                  toast.error('Please enter the Tournament URL to auto-update the bracket.');
                  setModLoading(false);
                  return;
              }
              
              // Calculate Winner
              let winnerTeam: any = null;
              let maxStars = -1;
              let maxPct = -1;
              for (const team of lobbyTeams) {
                  const s = parseInt(endMatchScores[team.id].stars) || 0;
                  const p = parseFloat(endMatchScores[team.id].percentage) || 0;
                  if (s > maxStars || (s === maxStars && p > maxPct)) {
                      maxStars = s;
                      maxPct = p;
                      winnerTeam = team;
                  }
              }
              
              // Query Database correctly mapping tournament_registrations matrix
              let wChallongeId: string | null = null;
              
              const { data: tData } = await supabase.from('tournaments')
                  .select('id')
                  .eq('challonge_url', tournamentUrl)
                  .single();
                  
              if (tData) {
                  const { data: reg } = await supabase.from('tournament_registrations')
                      .select('challonge_participant_id')
                      .eq('tournament_id', tData.id)
                      .eq('roster_id', winnerTeam.roster_id)
                      .single();
                  wChallongeId = reg?.challonge_participant_id;
              }
              
              if (!wChallongeId) {
                  toast.error(`Cannot advance bracket: Winning team (${winnerTeam.name}) has no linked Challonge ID.`);
                  setModLoading(false);
                  return;
              }
              
              // ==========================================
              // SCORE EXTRACTION & MAIN ID RESOLUTION
              // ==========================================
              // Challonge v2 updates explicitly require the Main Participant IDs.
              // Instead of trusting the volatile Sub-IDs found in `targetMatch` for Group Stages,
              // we extract the known Lobby Teams and rigidly map them backwards to their Main IDs!
              let winnerScore = '0';
              let loserScore = '0';
              let loserChallongeId: string | null = null;

              // 1. Extract Scores accurately from the frontend matrix
              const winnerTeamStars = parseInt(endMatchScores[winnerTeam.id]?.stars) || 0;
              winnerScore = String(winnerTeamStars);

              const loserTeamObj = lobbyTeams.find(t => t.id !== winnerTeam.id);
              if (loserTeamObj) {
                  const loserTeamStars = parseInt(endMatchScores[loserTeamObj.id]?.stars) || 0;
                  loserScore = String(loserTeamStars);

                  // 2. Fetch the Loser's exact Main Participant ID dynamically
                  const { data: loserReg } = await supabase.from('tournament_registrations')
                      .select('challonge_participant_id')
                      .eq('tournament_id', tData.id)
                      .eq('roster_id', loserTeamObj.roster_id)
                      .single();
                  
                  if (loserReg) {
                      loserChallongeId = loserReg.challonge_participant_id;
                  }
              }

              if (!loserChallongeId) {
                  toast.error('Cannot determine losing team Challonge ID. Score will not be submitted.');
                  setModLoading(false);
                  return;
              }

              console.log('[DEBUG_CHALLONGE_IDS] Pre-API Push -> Winner Main:', wChallongeId, '| Loser Main:', loserChallongeId);

              const { reportMatchScore } = await import('./services/challongeService');
              await reportMatchScore(tournamentUrl, foundLobby.challonge_match_id, wChallongeId, winnerScore, loserChallongeId, loserScore);
          }
          
          const { error } = await supabase.rpc('end_match_secure', { p_lobby_id: foundLobby.id, p_team_scores: endMatchScores });
          if (error) throw error;
          toast.success('Match Archived & Lobby Cleared.');
          setShowEndMatchModal(false);
          setFoundLobby(null); setLobbyCode(''); navigate('/');
      } catch (err: any) {
          toast.error('Error: ' + err.message);
      } finally {
          setModLoading(false);
      }
  };

  const handleNuke = async () => { 
    if(!(await confirmToast('DELETE LOBBY? This action cannot be undone.'))) return;
    await supabase.rpc('delete_lobby', { p_lobby_id: foundLobby.id });
    setFoundLobby(null);
    setLobbyCode('');
    navigate('/');
  };
  const handleSwitch = async (pId: string, currentTeamName: string) => { 
    if (lobbyTeams.length < 2) return; 
    const other = lobbyTeams.find(t => t.name !== currentTeamName); 
    if(!other || !(await confirmToast(`Switch to ${other.name}? This will refund the current team's budget and clear the player's army.`))) return;
    await supabase.rpc('clear_player_army', { p_player_id: pId });
    await supabase.from('players').update({ team_id: other.id }).eq('id', pId); 
    fetchTeams(foundLobby.id); 
  };
  const handleKick = async (pId: string) => { 
      if(!(await confirmToast('Kick player?'))) return; 
      await supabase.rpc('clear_player_army', { p_player_id: pId });
      await supabase.from('players').delete().eq('id', pId); 
      fetchTeams(foundLobby.id); 
  };
  const handleReset = async (tId: string) => { 
      if(!(await confirmToast('Initiate Protocol: Purge & Reset? This will delete all team purchases and restore the budget to 1050g.'))) return;
      await supabase.rpc('moderator_reset_team', { p_team_id: tId }); 
      fetchTeams(foundLobby.id); 
  };

  // --- RENDERING CC SECTION ---
  const renderCCSection = () => {
    const ccItems = myPurchases.filter(p => p.is_cc);
    const active = ccItems.map(p => dbItems.find(i => i.id === p.item_id)).filter(Boolean) as Item[];
    const counts: any = {}; active.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
    const unique = Array.from(new Map(active.map(i => [i.id, i])).values());
    
    return (
      <div className="relative group bg-orange-950/10 border border-orange-500/20 rounded-2xl p-4 mb-4 overflow-hidden hover:border-orange-500/40 transition-colors">
         <div className="absolute -right-6 -top-6 text-orange-500/5 transform rotate-12 group-hover:rotate-0 transition-transform duration-700">
             <Castle size={120} />
         </div>
        <div className="font-black text-orange-200 flex items-center gap-2 mb-4 tracking-wider relative z-10 text-sm">
            <div className="p-1 bg-orange-500/20 rounded shadow-[0_0_10px_rgba(249,115,22,0.2)]"><Castle size={14} className="text-orange-400"/></div> 
            REINFORCEMENTS
        </div>
              <div className="flex justify-between gap-2 mb-4 relative z-10 text-[9px] font-bold uppercase tracking-wider text-orange-500/60">
              <div className="flex flex-col items-center bg-[#0a101f] flex-1 py-2 rounded-lg border border-orange-500/10">
                  <span>Troops</span>
                  <span className="text-orange-400 text-xs">{getCurrentWeight('troop', true)}<span className="opacity-50">/55</span></span>
              </div>
              <div className="flex flex-col items-center bg-[#0a101f] flex-1 py-2 rounded-lg border border-orange-500/10">
                  <span>Spells</span>
                  <span className="text-orange-400 text-xs">{getCurrentWeight('spell', true)}<span className="opacity-50">/4</span></span>
              </div>
         </div>

        <div className="flex flex-wrap gap-2 relative z-10 min-h-[40px]">
            {unique.map(i => (
                <div key={i.id} className="relative w-9 h-9 bg-[#0a101f] rounded-md border border-orange-500/20 shadow-inner hover:border-orange-500 max-w-full group/cc">
                    <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain p-1" />
                    <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-black text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded shadow-md">{counts[i.id]}</div>
                    {!isLocked && <button onClick={() => handleSell(i)} disabled={isProcessing} className="absolute -bottom-1.5 -left-1.5 z-20 bg-red-500 hover:bg-red-400 text-white w-4 h-4 flex items-center justify-center rounded shadow-md opacity-100 lg:opacity-0 lg:group-hover/cc:opacity-100 transition-opacity active:scale-90" title={`Remove ${i.name}`}><Minus size={10} strokeWidth={4} /></button>}
                </div>
            ))}
            {active.length === 0 && <span className="text-[10px] text-orange-500/30 font-bold uppercase tracking-widest py-2 w-full text-center border border-dashed border-orange-500/20 rounded">Empty Bunker</span>}
        </div>
      </div>
    );
  };

  const renderCCShop = () => {
      const renderMiniGrid = (list: Item[]) => (
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">{list.map(i => { const count = getMyCount(i.id, true); return (
              <div key={i.id} className={`relative group perspective-500 ${poppingItem === i.id ? 'animate-pop' : ''}`}>
                  <div onClick={() => handleBuy(i, null, true)} className="cursor-pointer hover:transform hover:rotate-x-12 transition-all duration-300 bg-[#0a101f] rounded-lg border border-white/5 hover:border-orange-500/50 aspect-square p-1.5 relative overflow-hidden shadow-black/50 shadow-lg" title={i.name}>
                      <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform" />
                  </div>
                  {count > 0 && (<div className="absolute -bottom-1.5 -left-1.5 z-10 bg-orange-500 text-black text-[9px] font-black w-4 h-4 flex items-center justify-center rounded shadow-sm border border-orange-400">{count}</div>)}
                  {count > 0 && (<button onClick={(e) => { e.stopPropagation(); handleSell(i); }} className="absolute -top-1.5 -right-1.5 z-20 bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded shadow-md hover:bg-red-400 transition-colors"><Minus size={10} strokeWidth={4} /></button>)}
              </div>
          )})}</div>
      );
      return (
          <div className="bg-[#050b14]/80 p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-orange-500/20 mb-6 lg:mb-8 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-orange-500/10 transition-colors duration-1000"></div>
               <div className="relative z-10 border-b border-orange-500/10 pb-4 lg:pb-6 mb-4 lg:mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 lg:gap-0">
                   <div>
                       <h2 className="text-2xl font-black flex gap-3 items-center text-orange-100 tracking-tighter shadow-orange-500/50">
                            <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                                <Castle size={20} className="text-white"/>
                            </div> 
                            REINFORCEMENT DRAFT
                       </h2>
                       <p className="text-orange-500/50 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 ml-14">Clan Castle Requisitions</p>
                   </div>
               </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-4">
                        <h5 className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-950/20 p-2 rounded border border-orange-500/10">
                            <Sword size={12}/> Troops <span className="ml-auto opacity-50">Max 55</span>
                        </h5>
                        {renderMiniGrid(sortByGameOrder(dbItems.filter(i => i.type === 'troop' || i.type === 'super_troop')))}
                    </div>
                    <div className="space-y-4">
                        <h5 className="flex items-center gap-2 text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-950/20 p-2 rounded border border-orange-500/10">
                            <Hexagon size={12}/> Spells <span className="ml-auto opacity-50">Max 4</span>
                        </h5>
                        {renderMiniGrid(sortByGameOrder(dbItems.filter(i => i.type === 'spell')))}
                    </div>
                </div>
          </div>
      )
  };

  const renderGrid = (list: Item[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{list.map(i => {
        const p = calcPrice(i), qty = getMyCount(i.id, false), isOwned = i.type === 'equipment' && qty > 0, isOwnedPet = i.type === 'pet' && qty > 0;
        const activeClass = (qty > 0 || isOwned || isOwnedPet) ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.1)]' : 'border-white/5 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5';
        
        return (
           <div key={i.id} className={`bg-[#0a101f] rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 group relative overflow-hidden border ${activeClass} ${poppingItem === i.id ? 'animate-pop' : ''}`}>
                
                {/* Background Glow for Hero Items */}
                {i.hero && <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>}
                
                <div className="relative mb-3">
                    {i.hero && (<div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 shadow-lg overflow-hidden"><img src={`/${i.hero.toLowerCase()}.png`} className="w-full h-full object-cover opacity-80" alt={i.hero}/></div>)}
                    <div className="aspect-square bg-black/40 rounded-xl relative overflow-hidden flex items-center justify-center border border-white/5 shadow-inner">
                        <img src={getImageUrl(i.name, i.type, i.hero)} className={`w-full h-full object-contain p-3 transition-transform duration-500 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] ${qty > 0 || isOwned ? 'scale-110 grayscale-0' : 'grayscale-[0.5] group-hover:scale-110 group-hover:grayscale-0'}`} />
                        {(isOwned || isOwnedPet) && <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center backdrop-blur-[1px] border-2 border-green-500/50 rounded-xl"><div className="bg-green-500 text-black w-8 h-8 rounded flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.6)]"><Check size={20} strokeWidth={4}/></div></div>}
                        {qty > 0 && i.type !== 'equipment' && i.type !== 'pet' && <div className="absolute bottom-2 right-2 bg-yellow-500 text-black px-2 py-0.5 rounded font-black text-[10px] shadow-lg shadow-yellow-500/20 z-10 border border-yellow-400">x{qty}</div>}
                    </div>
                </div>
                
                <div className="text-center mb-3 relative z-10">
                    <div className="font-bold text-xs leading-tight min-h-[2.5em] flex items-center justify-center text-slate-300 group-hover:text-white transition-colors uppercase tracking-wide">{i.name}</div>
                    <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded border border-white/5 text-blue-400 font-mono font-bold text-[10px] bg-blue-900/10 shadow-inner">
                        {p} <Coins size={10} className="text-yellow-400"/>
                    </div>
                </div>
                
                <div className="flex gap-1.5 h-9 mt-auto relative z-10">
                    {qty > 0 ? (
                        <>
                            <button onClick={() => handleSell(i)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white w-1/3 rounded-lg flex items-center justify-center transition-all border border-red-500/20 active:scale-95 group/sell"><Minus size={14} strokeWidth={3} /></button>
                            <button onClick={() => handleBuy(i)} disabled={teamBudget < p || isProcessing} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:grayscale text-white w-2/3 rounded-lg flex items-center justify-center transition-all font-black uppercase text-[10px] tracking-wider shadow-lg active:scale-95 border-t border-white/10">BUY</button>
                        </>
                    ) : (
                        <button onClick={() => handleBuy(i)} disabled={teamBudget < p || isProcessing} className="w-full bg-slate-800 hover:bg-white text-slate-400 hover:text-black rounded-lg flex items-center justify-center transition-all font-black uppercase text-[10px] tracking-widest border border-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] active:scale-95 hover:-translate-y-0.5">ACQUIRE</button>
                    )}
                </div>
            </div>
        )
      })}</div>
  );

  // --- HARD GATE: Mandatory Auth ---
  if (loading) return <div className="min-h-screen bg-[#050b14] flex items-center justify-center"><div className="relative"><div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div><Loader2 className="w-12 h-12 animate-spin text-blue-500 relative z-10"/></div></div>;
  if (!user) return <LoginView />;


  // --- TEAM SELECTION VIEW ---
  const teamSelectionView = (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#050b14]">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500"></div>
          
           <div className="max-w-5xl w-full space-y-6 lg:space-y-12 relative z-10 animate-fade-in">
               <div className="text-center space-y-4 lg:space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                      <Wifi size={12} className="animate-pulse"/> Secure Link Established
                  </div>
                  <div>
                    <h2 className="text-5xl lg:text-7xl font-black text-white tracking-tighter drop-shadow-2xl mb-2" translate="no">{lobbyCode}</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Mission Control Lobby</p>
                  </div>
                  
                  <div className="relative max-w-lg mx-auto group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 rounded-lg opacity-0 group-focus-within:opacity-100 transition duration-500 blur-md"></div>
                      {profile && profile.username && !profile.username.startsWith('Recruit_') ? (
                        <div className="relative bg-[#0a101f] border border-green-500/30 text-2xl lg:text-4xl font-black text-center text-white px-4 py-4 lg:px-8 lg:py-6 w-full rounded-2xl shadow-xl flex items-center justify-center gap-3" translate="no">
                          <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] shrink-0" />
                          <span>{profile.username}</span>
                          <span className="text-[10px] text-green-400/60 font-bold tracking-[0.2em] uppercase absolute bottom-2 right-4">Verified</span>
                        </div>
                      ) : (
                        <input 
                          value={playerName} 
                          onChange={e => setPlayerName(e.target.value)} 
                          className="relative bg-[#0a101f] border border-white/10 text-2xl lg:text-4xl font-black text-center text-white focus:border-yellow-500/50 outline-none px-4 py-4 lg:px-8 lg:py-6 w-full placeholder:text-slate-800 transition-all rounded-2xl shadow-xl" 
                          placeholder="ENTER CALLSIGN" 
                          autoFocus
                          translate="no"
                        />
                      )}
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {lobbyTeams.map((team, idx) => (
                      <div key={team.id} className="group relative" style={{animationDelay: `${idx * 100}ms`}}>
                          <div className={`absolute -inset-0.5 bg-gradient-to-r ${idx === 0 ? 'from-blue-600 to-cyan-600' : 'from-purple-600 to-pink-600'} rounded-[2.5rem] opacity-20 group-hover:opacity-60 transition duration-500 blur`}></div>
                          <div className="relative glass rounded-[2rem] p-8 flex flex-col h-full bg-[#0a101f]/90 border border-white/5 backdrop-blur-xl transition-transform duration-300 hover:scale-[1.01]">
                              <div className="flex justify-between items-start mb-8">
                                   <div className={`p-4 rounded-2xl ${idx === 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'} border border-white/5`}>
                                       <Users className="w-8 h-8" />
                                   </div>
                                   <div className="text-right">
                                       <h3 className="text-3xl font-black tracking-tight text-white mb-1">{team.name}</h3>
                                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Squadron {idx + 1}</div>
                                   </div>
                              </div>
                              
                              <div className="flex-1 w-full space-y-3 mb-8">
                                  {[0, 1, 2].map(i => (
                                      <div key={i} className={`rounded-xl p-4 text-sm font-bold flex items-center gap-4 border transition-all ${team.players?.[i] ? 'bg-white/5 border-white/10 text-white shadow-lg' : 'bg-black/20 border-white/5 text-slate-700 dashed-border'}`}>
                                          <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${team.players?.[i] ? 'bg-green-500 text-green-500' : 'bg-slate-800 text-slate-800'}`} />
                                          {team.players?.[i] ? (
                                              <span className="text-base tracking-wide">{team.players[i].name}</span>
                                          ) : (
                                              <span className="opacity-40 uppercase tracking-wider text-[10px]">Open Slot</span>
                                          )}
                                      </div>
                                  ))}
                              </div>
                              
                              {(() => {
                                  const isAlreadyInTeam = team.players?.some((p: any) => p.user_id === user?.id);
                                  const isFull = !isAlreadyInTeam && (team.players?.length >= 3);
                                   // Use explicit rosterLoaded flag to know when resolution is complete.
                                  // rosterResolved = true when: roster resolution is done OR team has no roster binding
                                  const rosterResolved = rosterLoaded || !team.roster_id;
                                  // STRICT: Only active players (role='player') on the roster can join.
                                  // No moderator bypass — moderator must also be an active player to join.
                                  const isLocked = rosterResolved && team.roster_id && !userRosterIds.includes(team.roster_id);
                                  const isMyTeam = rosterResolved && team.roster_id && userRosterIds.includes(team.roster_id);
                                  const isLoading = !rosterResolved && !!team.roster_id;

                                  
                                  return (
                                      <button 
                                        onClick={() => handleJoinTeam(team.name)} 
                                        disabled={isFull || isLocked || isLoading || deployLoading} 
                                        className={`w-full py-5 rounded-xl font-black uppercase tracking-widest transition-all duration-300 shadow-xl flex items-center justify-center gap-2 ${isAlreadyInTeam ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-emerald-400/50' : isFull ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5' : isLoading ? 'bg-slate-800/50 text-slate-400 cursor-wait border border-white/5' : isLocked ? 'bg-red-950/40 text-red-500/50 cursor-not-allowed border border-red-500/20 hover:border-red-500/50 hover:bg-red-900/30 text-red-400' : isMyTeam ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white text-black hover:bg-blue-50 hover:scale-[1.02] hover:shadow-white/20'}`}
                                      >
                                          {deployLoading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isAlreadyInTeam ? <Zap size={18} className="text-white"/> : isFull ? <Lock size={16}/> : isLoading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : isLocked ? <Lock size={16} className="text-red-500 mb-0.5"/> : <Zap size={18} className={isMyTeam ? 'text-white' : (idx===0?'text-blue-600':'text-purple-600')} />}
                                          {deployLoading ? 'VERIFYING...' : isAlreadyInTeam ? 'REJOIN TEAM' : isFull ? 'UNIT FULL' : isLoading ? 'VERIFYING ACCESS...' : isLocked ? 'RESTRICTED' : isMyTeam ? 'JOIN YOUR TEAM' : 'INITIATE LINK'}
                                      </button>
                                  );
                              })()}
                          </div>
                      </div>
                  ))}
              </div>
              <button onClick={() => navigate('/')} className="block mx-auto text-slate-600 hover:text-red-400 text-xs tracking-[0.2em] font-bold uppercase transition-colors py-4 flex items-center gap-2">
                 <LogOut size={14}/> Abort Connection
              </button>
          </div>
      </div>
  );

  // --- ROUTER & VIEWS ---
  return (
    <>
      <Routes>
        <Route path="/" element={
          isRestoring ? (
             <div className="min-h-screen bg-[#050b14] flex items-center justify-center"><div className="relative"><div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div><Loader2 className="w-12 h-12 animate-spin text-blue-500 relative z-10"/></div></div>
          ) : (
            <>
          <ProfileBadge />
          <div className="min-h-screen flex flex-col justify-between py-8 px-4 relative overflow-x-hidden bg-[#050b14]">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
              <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-yellow-500/5 rounded-full blur-[80px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
          </div>
          
          {/* 1. Header (Centered, Top) */}
          <div className="relative z-10 flex flex-col items-center justify-center animate-slide-down pt-4 md:pt-8 w-full">
                <div className="relative w-20 h-20 lg:w-28 lg:h-28 flex items-center justify-center mb-6">
                    <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-40 rounded-full animate-pulse-slow"></div>
                    <div className="relative z-10 bg-[#0a101f] p-3 lg:p-4 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.2)] ring-1 ring-white/20">
                        <Shield className="w-10 h-10 lg:w-14 lg:h-14 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" strokeWidth={1.5} />
                    </div>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-1 tracking-tighter text-white drop-shadow-2xl text-center leading-none">
                    CLASH ELITE<br className="md:hidden"/> NETWORK
                </h1>
                <h2 className="text-2xl md:text-3xl font-black mb-4 tracking-tighter text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 text-glow uppercase">Inflation War</span>
                </h2>
                <p className="text-blue-200/60 font-medium tracking-[0.3em] md:tracking-[0.4em] text-[9px] md:text-[10px] uppercase border-y border-white/5 py-2 px-4 md:px-8 text-center">Tactical Economy Simulator</p>
          </div>
          
          {/* 2. Body (Two Columns, Middle) */}
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 flex-grow place-items-center mt-8 mb-8 relative z-10">
              
              {/* Left Column (Matchmaking) */}
              <div className="w-full max-w-md relative group animate-slide-up">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-yellow-600 rounded-[2rem] opacity-30 blur-lg group-hover:opacity-60 transition duration-1000"></div>
                  <div className="glass p-6 lg:p-10 rounded-[2rem] text-center relative shadow-2xl border border-white/10 bg-black/40 backdrop-blur-xl">
                      
                      <form onSubmit={(e) => handleFindLobby(e, '/join/' + lobbyCode)} className="space-y-6 relative">
                          <div className="relative group/input">
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover/input:opacity-50 transition duration-500 blur"></div>
                              <div className="relative flex items-center bg-[#050b14] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                                  <div className="pl-4 text-slate-500"><Terminal size={20} /></div>
                                  <input 
                                      value={lobbyCode} 
                                      onChange={e => setLobbyCode(e.target.value)} 
                                      className="w-full bg-transparent p-3 lg:p-5 text-center text-xl lg:text-3xl font-black font-mono uppercase tracking-[0.2em] outline-none text-white placeholder:text-slate-800 transition-all focus:placeholder:text-slate-700" 
                                      placeholder="LOBBY ID" 
                                      autoFocus
                                      translate="no"
                                  />
                              </div>
                          </div>
                          
                          {/* Matchmaking Action Buttons */}
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                type="submit" 
                                disabled={deployLoading || !lobbyCode.trim()}
                                className={`col-span-2 group/btn relative overflow-hidden font-black py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 flex items-center justify-center ${deployLoading ? 'bg-gray-800 text-white/60 cursor-wait' : 'bg-white text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none'}`}
                              >
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                                  <span className="relative z-10 tracking-widest text-xs flex items-center justify-center gap-2">
                                      {deployLoading ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> VERIFYING...</> : <><Zap size={14} /> DEPLOY</>}
                                  </span>
                              </button>
                              <button type="button" onClick={() => openOverseerModal()} disabled={modLoading || !lobbyCode.trim()} className={`group/btn relative overflow-hidden font-black py-4 rounded-xl border transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.1)] flex items-center justify-center ${modLoading ? 'bg-red-900/20 text-red-400 border-red-500/30 cursor-wait' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'}`}>
                                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/10 to-red-600/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                                  <span className="relative z-10 tracking-widest text-xs flex items-center justify-center gap-2">
                                      {modLoading ? <><div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> VERIFYING...</> : <><Crown size={14} /> OVERSEER</>}
                                  </span>
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleFindLobby('streamer')} 
                                disabled={streamerLoading || !lobbyCode.trim()}
                                className={`group/btn relative overflow-hidden font-black py-4 rounded-xl border transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.1)] flex items-center justify-center ${streamerLoading ? 'bg-purple-900/20 text-purple-400 border-purple-500/30 cursor-wait' : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-purple-500/10'}`}
                              >
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/10 to-purple-600/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                                  <span className="relative z-10 tracking-widest text-xs flex items-center justify-center gap-2">
                                      {streamerLoading ? <><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> VERIFYING...</> : <><MonitorPlay size={14} /> STREAM</>}
                                  </span>
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
              
              {/* Right Column (Portal Hub) */}
              <div className="w-full max-w-md md:max-w-full grid grid-cols-2 gap-4 md:gap-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
                  {/* My Team */}
                  <button 
                      type="button"
                      onClick={() => navigate('/team')}
                      className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-black/40 backdrop-blur-xl hover:bg-emerald-500/10 transition-all duration-500 shadow-xl flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-40 hover:scale-[1.02] active:scale-95 hover:border-emerald-500/50"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                      <div className="p-4 bg-emerald-500/10 rounded-full mb-3 shadow-[0_0_20px_rgba(52,211,153,0.2)] group-hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] transition-all">
                          <Users size={28} className="text-emerald-400 group-hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"/>
                      </div>
                      <span className="relative z-10 font-black tracking-widest text-sm text-emerald-100">MY TEAM</span>
                  </button>

                  {/* Tournaments */}
                  <button 
                      type="button"
                      onClick={() => navigate('/tournament')}
                      className="group relative overflow-hidden rounded-3xl border border-yellow-500/40 bg-black/40 backdrop-blur-xl hover:bg-yellow-500/15 transition-all duration-500 shadow-[0_0_30px_rgba(234,179,8,0.1)] hover:shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-40 hover:scale-[1.02] active:scale-95"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                      <div className="absolute inset-0 bg-yellow-400/5 mix-blend-overlay"></div>
                      <div className="p-4 bg-yellow-500/10 rounded-full mb-3 shadow-[0_0_20px_rgba(234,179,8,0.3)] group-hover:shadow-[0_0_50px_rgba(234,179,8,0.6)] transition-all animate-pulse-slow">
                          <Trophy size={32} className="text-yellow-400 drop-shadow-[0_0_12px_rgba(234,179,8,0.8)]"/>
                      </div>
                      <span className="relative z-10 font-black tracking-widest text-sm text-yellow-100">TOURNAMENTS</span>
                  </button>

                  {/* Archive */}
                  <button 
                      type="button"
                      onClick={() => navigate('/logs')}
                      className="group relative overflow-hidden rounded-3xl border border-purple-500/20 bg-black/40 backdrop-blur-xl hover:bg-purple-500/10 transition-all duration-500 shadow-xl flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-40 hover:scale-[1.02] active:scale-95 hover:border-purple-500/50"
                  >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                      <div className="p-4 bg-purple-500/10 rounded-full mb-3 shadow-[0_0_20px_rgba(168,85,247,0.2)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all">
                          <Castle size={28} className="text-purple-400 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"/>
                      </div>
                      <span className="relative z-10 font-black tracking-widest text-sm text-purple-100">ARCHIVE</span>
                  </button>

                  {/* Referee Tools (Conditional vs Empty Slot) */}
                  {profile?.role === 'moderator' ? (
                      <button 
                          onClick={() => navigate('/referee')}
                          className="group relative overflow-hidden rounded-3xl border border-red-500/30 bg-black/40 backdrop-blur-xl hover:bg-red-500/15 transition-all duration-500 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col items-center justify-center aspect-square md:aspect-auto md:h-40 hover:scale-[1.02] active:scale-95 hover:border-red-500/60"
                      >
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                          <div className="p-4 bg-red-500/10 rounded-full mb-3 shadow-[0_0_20px_rgba(239,68,68,0.3)] group-hover:shadow-[0_0_40px_rgba(239,68,68,0.6)] transition-all">
                              <Gavel size={28} className="text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"/>
                          </div>
                          <span className="relative z-10 font-black tracking-widest text-sm text-red-100">REFEREE</span>
                      </button>
                  ) : (
                      <div className="hidden md:flex rounded-3xl border border-white/5 bg-black/20 backdrop-blur-xl items-center justify-center aspect-square md:aspect-auto md:h-40 opacity-50">
                          {/* Placeholder to keep grid balanced on desktop if non-mod */}
                      </div>
                  )}
              </div>
          </div>
          
          {/* 3. Footer (Centered, Bottom) */}
          <div className="relative z-10 flex flex-col items-center w-full pb-0 animate-fade-in" style={{animationDelay: '0.4s'}}>
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 p-4 rounded-2xl border border-white/5 bg-black/20 backdrop-blur-sm mb-6 shadow-xl">
                  <div className="flex items-center gap-4">
                      <img src="/Logo.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-lg" />
                      <span className="text-sm font-black tracking-[0.15em] uppercase text-slate-300 text-shadow">
                          CLASH OF CLANS ELITE NETWORK
                      </span>
                  </div>
                  
                  <div className="hidden md:block w-px h-8 bg-white/10"></div>
                  
                  <a 
                      href="https://discord.gg/jFgFVPAJ8M" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/40"
                  >
                      VISIT DISCORD <ExternalLink size={12} />
                  </a>
              </div>
              
              <p className="text-[9px] text-slate-600 font-medium tracking-wide max-w-xl text-center leading-tight px-4">
                  This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: <a href="https://www.supercell.com/fan-content-policy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 underline transition-colors">www.supercell.com/fan-content-policy</a>.
              </p>
          </div>
       </div>
      </>
        )
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <ProfileBadge />
          <UserSettings />
        </ProtectedRoute>
      } />
      
      
      <Route path="/logs" element={<MatchLogs />} />
      
      <Route path="/join/:code" element={<><LobbyCodeSync setLobbyCode={setLobbyCode} />{teamSelectionView}</>} />
      <Route path="/join" element={teamSelectionView} />

  <Route path="/referee" element={
    <div className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 flex items-center justify-center animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
        <div className="max-w-3xl w-full relative z-10">
            <button onClick={() => navigate('/')} className="mb-8 group flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Return to Base
            </button>
            <div className="glass p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl bg-black/40">
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-30"><Gavel className="w-20 h-20 md:w-[120px] md:h-[120px] text-yellow-500/10"/></div>
            
            <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10 relative z-10">
                <div className="p-3 md:p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                    <Gavel className="text-yellow-500 w-8 h-8 md:w-10 md:h-10"/>
                </div>
                <div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-600 drop-shadow-sm">AUDIT PROTOCOL</h1>
                    <p className="text-yellow-500/60 font-mono text-[10px] tracking-widest uppercase mt-1">Legality Verification System v2.0</p>
                </div>
            </div>
            
            <div className="space-y-4 mb-10 relative z-10">
                {refLinks.map((L, i) => (
                    <div key={i} className="group relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600/20 to-yellow-400/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur"></div>
                        <div className="relative flex items-center bg-[#0a101f] border border-white/10 rounded-xl overflow-hidden focus-within:border-yellow-500/50 transition-colors">
                             <div className="pl-4 text-slate-500 font-mono text-xs opacity-50">LINK_{i+1}</div>
                             <input 
                                value={L} 
                                onChange={e => { const n=[...refLinks]; n[i]=e.target.value; setRefLinks(n); }} 
                                className="w-full bg-transparent p-4 text-sm font-mono text-white outline-none placeholder:text-slate-700 transition-colors" 
                                placeholder="PASTE CLASH ARMY LINK OR TEXT DATA..." 
                             />
                        </div>
                    </div>
                ))}
            </div>
            
            <button onClick={handleRefereeCheck} className="w-full bg-gradient-to-r from-green-600 to-green-500 py-5 rounded-xl font-black flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all relative z-10 group overflow-hidden">
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <ClipboardCheck className="relative z-10"/> <span className="relative z-10">Execute Compliance Check</span>
            </button>
            
            {refResult !== null && (
                <div className="mt-10 glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-slide-up relative z-10">
                    <div className={`text-center p-8 border-b border-white/5 relative overflow-hidden ${refResult > 1050 ? 'bg-red-950/50' : 'bg-green-950/50'}`}>
                        <div className={`absolute inset-0 blur-3xl opacity-20 ${refResult > 1050 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div className="relative z-10">
                            <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-2 bg-black/20 inline-block px-3 py-1 rounded-full border border-white/5">Total Computed Value</div>
                            <div className={`text-8xl font-black tracking-tighter ${refResult > 1050 ? 'text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]'}`}>
                                {refResult}<span className="text-5xl text-opacity-50 tracking-normal ml-1">g</span>
                            </div>
                            <div className={`font-mono font-bold text-sm tracking-widest uppercase mt-2 ${refResult > 1050 ? 'text-red-400' : 'text-green-400'}`}>
                                {refResult > 1050 ? <span className="flex items-center justify-center gap-2"><AlertTriangle size={14}/> Budget Exceeded</span> : <span className="flex items-center justify-center gap-2"><Check size={14}/> Within Parameters</span>}
                            </div>
                        </div>
                    </div>
                    <div className="p-0 max-h-80 overflow-y-auto custom-scrollbar bg-[#0a101f]/90">
                        <table className="w-full text-sm font-mono">
                            <thead className="text-[10px] uppercase tracking-widest text-slate-500 bg-black/40 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="text-left py-3 px-6 font-bold">Asset Identifier</th>
                                    <th className="py-3 px-6 text-center font-bold">Volume</th>
                                    <th className="text-right py-3 px-6 font-bold">Gold Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {refBreakdown.map((b, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-3 px-6 font-bold text-slate-300 group-hover:text-white transition-colors">{b.name}</td>
                                        <td className="py-3 px-6 text-center text-slate-500 group-hover:text-slate-300">x{b.count}</td>
                                        <td className="py-3 px-6 text-right text-yellow-500 font-bold drop-shadow-sm">{b.cost}g</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
        </div>
    </div>
    </div>

  } />

  <Route path="/stream/:code" element={
        <>
            <LobbyCodeSync setLobbyCode={setLobbyCode} />
            <div className="min-h-screen bg-[#050b14] text-white p-6 pb-20 overflow-hidden relative animate-fade-in font-sans selection:bg-purple-500/30">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
            
            <style>{`
                @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } 
                .ticker-wrap { position: fixed; bottom: 0; left: 0; width: 100%; height: 60px; background: rgba(5, 11, 20, 0.95); backdrop-filter: blur(12px); overflow: hidden; white-space: nowrap; z-index: 100; border-top: 1px solid rgba(168,85,247,0.2); display: flex; align-items: center; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); } 
                .ticker-content { display: inline-block; padding-left: 100%; animation: marquee 80s linear infinite; } 
                .ticker-item { display: inline-flex; align-items: center; padding: 0 3rem; font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 900; color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.3); } 
                .custom-scrollbar::-webkit-scrollbar { display: none; } 
                .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            
            {focusedPlayer && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={() => setFocusedPlayer(null)}>
                    <div className="glass border-2 border-yellow-500/50 p-12 rounded-[2.5rem] shadow-[0_0_100px_rgba(234,179,8,0.2)] max-w-6xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative bg-[#0a101f]" onClick={e => e.stopPropagation()}>
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-yellow-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-8 mb-10 sticky top-0 z-10 bg-[#0a101f]/95 backdrop-blur-md">
                            <div>
                                <h2 className="text-7xl font-black tracking-tighter text-white drop-shadow-lg mb-2">{focusedPlayer.name}</h2>
                                <div className="text-yellow-500 font-mono tracking-widest uppercase text-sm font-bold flex items-center gap-2"><div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"/> Live Unit Inspection</div>
                            </div>
                            <button onClick={() => setFocusedPlayer(null)} className="bg-white/5 hover:bg-white/10 text-white p-4 rounded-2xl transition-all border border-white/10 hover:border-white/30 hover:rotate-90 duration-500"><X size={32}/></button>
                        </div>
                        {renderPlayerArmy(focusedPlayer, true)}
                    </div>
                </div>
            )}
            
            <header className="flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center mb-6 md:mb-10 glass px-4 py-4 md:px-8 md:py-5 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 shadow-2xl relative z-10 bg-black/40">
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                    <div className="p-3 md:p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)] animate-pulse-slow">
                        <Tv className="text-purple-400 w-6 h-6 md:w-8 md:h-8"/>
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 drop-shadow-sm">LIVE UPLINK</h1>
                        <p className="text-purple-400/60 font-bold tracking-[0.2em] text-[10px] uppercase mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
                            Target Sector: <span className="text-white font-mono bg-white/10 px-1.5 rounded">{lobbyCode}</span>
                        </p>
                    </div>
                </div>
                <button onClick={() => navigate('/')} className="w-full md:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-900/10">
                    TERMINATE FEED
                </button>
            </header>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-10 h-full pb-20 relative z-10">
                {lobbyTeams.map((team, idx) => (
                    <div key={team.id} className="glass border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl h-fit relative overflow-hidden bg-[#0a101f]/60 backdrop-blur-md group hover:border-white/10 transition-colors">
                        <div className={`absolute top-0 right-0 w-96 h-96 ${idx === 0 ? 'bg-blue-500/5' : 'bg-purple-500/5'} rounded-full blur-[100px] pointer-events-none group-hover:bg-opacity-100 transition-all duration-1000`}/>
                        
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-10 border-b border-white/5 pb-6 md:pb-8 relative z-10">
                            <div>
                                <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-2 drop-shadow-xl">{team.name}</h2>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Squadron Command</div>
                            </div>
                            <div className="bg-black/40 px-4 py-2 md:px-8 md:py-4 rounded-2xl border border-yellow-500/20 font-mono text-yellow-400 text-3xl md:text-5xl font-black shadow-[0_0_40px_rgba(234,179,8,0.1)] flex items-center gap-4 w-fit">
                                {team.budget} <Coins className="w-6 h-6 md:w-8 md:h-8 opacity-80 text-yellow-600"/>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-6 relative z-10">
                            {team.players?.map((p: any) => (
                                <div key={p.id} onClick={() => setFocusedPlayer(p)} className="glass bg-black/40 rounded-[1.5rem] p-6 border border-white/5 hover:border-blue-500/50 transition-all cursor-zoom-in group/card hover:shadow-[0_0_50px_rgba(59,130,246,0.1)] hover:-translate-y-1 duration-300 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover/card:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                                    <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="font-black text-3xl tracking-tight text-slate-200 group-hover/card:text-blue-400 transition-colors drop-shadow-md">{p.name}</div>
                                            {p.is_locked && <div className="px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1"><Lock size={10}/></div>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {p.army_link && (
                                                <a href={isSafeUrl(p.army_link) ? p.army_link : '#'} target="_blank" rel="noopener noreferrer" onClick={e => { if (!isSafeUrl(p.army_link)) e.preventDefault(); e.stopPropagation(); }} className="bg-yellow-500/10 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 p-2 rounded-lg transition-all hover:scale-110 active:scale-95" title="Open Army Link">
                                                    <ExternalLink size={14}/>
                                                </a>
                                            )}
                                            <div className="text-[9px] text-blue-400/70 uppercase font-black tracking-widest bg-blue-900/10 px-3 py-1.5 rounded-lg border border-blue-500/10 group-hover/card:bg-blue-500 group-hover/card:text-black transition-all shadow-sm flex items-center gap-2">
                                                <Crosshair size={12}/> Inspect Loadout
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative z-10">{renderPlayerArmy(p, true)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="ticker-wrap">
                <div className="ticker-content">
                    {getTickerItems().map((item:any, i:number) => (
                        <div key={i} className={`ticker-item ${item.color}`}>
                            <span className="text-white text-xs mr-3 opacity-30 font-mono tracking-widest bg-white/10 px-2 py-0.5 rounded border border-white/5 uppercase">[{item.teamName}]</span>
                            <span className="drop-shadow-sm">{item.name.toUpperCase()}</span>
                            <span className="text-slate-600 mx-3 opacity-50">///</span> 
                            <span className="font-mono text-white bg-slate-800/80 px-2 rounded text-base">{item.price}g</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </>
  } />

  <Route path="/moderator" element={
    <ProtectedRoute requiredRole="moderator">
    <div className="min-h-screen bg-[#050b14] text-white p-8 animate-fade-in relative overflow-x-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
        <div className="max-w-[1920px] mx-auto relative z-10">
            <header className="glass flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0 mb-6 md:mb-10 border border-white/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="p-3 md:p-4 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse-slow">
                        <Trophy className="text-red-500 w-8 h-8 md:w-10 md:h-10"/> <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 drop-shadow-sm">OVERSEER DASHBOARD</h1>
                        <p className="text-red-400/60 font-bold tracking-[0.2em] text-[10px] uppercase mt-1 flex items-center gap-2">
                             System Admin Access // Sector: <span className="text-white font-mono bg-white/10 px-1.5 rounded">{lobbyCode}</span>
                        </p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <button onClick={() => navigate('/')} className="w-full md:w-auto group bg-slate-800/80 hover:bg-slate-700 border border-white/10 hover:border-white/20 px-6 py-3 md:px-8 md:py-4 rounded-xl font-black flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all shadow-lg hover:shadow-xl active:scale-95">
                        <LogOut size={18} className="text-slate-400 group-hover:text-white transition-colors"/> <span className="text-slate-400 group-hover:text-white transition-colors">Disconnect</span>
                    </button>
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <button onClick={handleEndMatchClick} className="w-full md:w-auto group bg-green-600 hover:bg-green-500 px-6 py-3 md:px-8 md:py-4 rounded-xl font-black flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_50px_rgba(34,197,94,0.6)] hover:-translate-y-1 active:translate-y-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <Check size={18} className="relative z-10"/> <span className="relative z-10">END MATCH</span>
                        </button>
                        {import.meta.env.VITE_ENABLE_SANDBOX === 'true' && (
                            <button onClick={() => setShowSandbox(!showSandbox)} className="w-full md:w-auto group bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 px-6 py-3 md:px-8 md:py-4 rounded-xl font-black flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all shadow-lg text-blue-400 hover:text-blue-300 active:scale-95">
                                <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500"/> <span>{showSandbox ? 'Close Sandbox' : 'Economy Sandbox'}</span>
                            </button>
                        )}

                        <button onClick={handleNuke} className="w-full md:w-auto group bg-red-600 hover:bg-red-500 px-6 py-3 md:px-8 md:py-4 rounded-xl font-black flex items-center justify-center gap-3 text-xs tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] hover:-translate-y-1 active:translate-y-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <Trash2 size={18} className="relative z-10"/> <span className="relative z-10">Execute Global Purge</span>
                        </button>
                    </div>
                </div>
            </header>
            
            {import.meta.env.VITE_ENABLE_SANDBOX === 'true' && showSandbox && (
                <div className="glass border border-blue-500/30 rounded-[2.5rem] p-6 md:p-10 mb-10 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden bg-[#0a101f]/95 backdrop-blur-xl animate-slide-up">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="flex items-center gap-4 mb-8 border-b border-blue-500/20 pb-6 relative z-10">
                        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30"><Settings className="text-blue-400 w-8 h-8"/></div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-blue-100 tracking-tighter drop-shadow-md">ECONOMY TUNING SANDBOX</h2>
                            <p className="text-blue-400/60 font-bold uppercase tracking-widest text-[10px] mt-1">Live Database Override Controls</p>
                        </div>
                    </div>

                    {/* Budget Control */}
                    <div className="mb-8 bg-yellow-900/10 border border-yellow-500/20 rounded-2xl p-6 relative z-10">
                        <h3 className="text-lg font-black text-yellow-400 tracking-widest uppercase mb-4 flex items-center gap-3">
                            <Coins size={20}/> GLOBAL TEAM BUDGET
                        </h3>
                        <div className="flex items-center gap-4">
                            <input id="sandbox-budget" type="number" defaultValue={lobbyTeams[0]?.budget ?? 1050} className="w-32 bg-black/60 border border-yellow-500/20 rounded-lg p-3 text-center text-yellow-400 font-mono font-black text-lg outline-none focus:border-yellow-500 transition-colors" />
                            <span className="text-yellow-500/60 font-bold text-xs uppercase tracking-widest">Gold per team</span>
                            <button disabled={isProcessing} onClick={() => {
                                const val = parseInt((document.getElementById('sandbox-budget') as HTMLInputElement).value);
                                if (!isNaN(val) && val > 0) handleUpdateBudget(val);
                            }} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-6 py-3 rounded-lg hover:bg-yellow-500 hover:text-black transition-all text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 disabled:opacity-50">
                                Apply to All Teams
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar relative z-10 max-h-[700px] bg-black/20 rounded-2xl">
                        {[
                            { title: 'EQUIPMENT', types: ['equipment'] },
                            { title: 'TROOPS', types: ['troop', 'super_troop'] },
                            { title: 'SPELLS', types: ['spell'] },
                            { title: 'SIEGES', types: ['siege'] },
                            { title: 'PETS', types: ['pet'] }
                        ].map(category => {
                            const catItems = sortByGameOrder(dbItems.filter(i => category.types.includes(i.type)));
                            if (catItems.length === 0) return null;
                            return (
                                <div key={category.title} className="mb-8 bg-[#0a101f]/80 rounded-2xl border border-white/5 shadow-inner overflow-hidden">
                                    <div className="bg-blue-900/20 px-6 py-4 border-b border-blue-500/20">
                                        <h3 className="text-xl font-black text-blue-400 tracking-widest uppercase">{category.title}</h3>
                                    </div>
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead className="bg-black/40">
                                            <tr className="border-b border-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                                <th className="p-4 pl-8">Asset Name</th>
                                                <th className="p-4 text-center">Base Price (g)</th>
                                                <th className="p-4 text-center">Inflation Rate</th>
                                                <th className="p-4 text-center">Equation Type</th>
                                                <th className="p-4 text-center">Inflation Start</th>
                                                <th className="p-4 text-right pr-8">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm">
                                            {catItems.map(item => (
                                                <tr key={item.id} className="hover:bg-blue-500/5 transition-colors group">
                                                    <td className="p-4 pl-8 font-bold text-slate-200 flex items-center gap-3">
                                                        <img src={getImageUrl(item.name, item.type, item.hero)} className="w-8 h-8 object-contain bg-black/40 rounded border border-white/10 p-1" alt=""/>
                                                        {item.name}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input id={`base-${item.id}`} type="number" defaultValue={item.base_price} className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-center text-yellow-400 font-mono font-bold outline-none focus:border-blue-500 transition-colors" />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input id={`inf-${item.id}`} type="number" defaultValue={item.inflation_rate} className="w-20 bg-black/60 border border-white/10 rounded-lg p-2 text-center text-red-400 font-mono font-bold outline-none focus:border-blue-500 transition-colors" />
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <select id={`type-${item.id}`} defaultValue={item.inflation_type || (item.is_fixed ? 'flat' : 'linear')} className="bg-black/60 border border-white/10 rounded-lg p-2 text-center text-purple-400 font-mono font-bold outline-none focus:border-blue-500 cursor-pointer">
                                                            <option value="linear">Linear (Add)</option>
                                                            <option value="exponential">Exponential (Multiply)</option>
                                                            <option value="flat">Flat (Fixed Price)</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <input id={`thr-${item.id}`} type="number" defaultValue={item.inflation_start_threshold || 0} min="0" className="w-16 bg-black/60 border border-white/10 rounded-lg p-2 text-center text-cyan-400 font-mono font-bold outline-none focus:border-blue-500 transition-colors" title="Number of purchases before inflation kicks in" />
                                                    </td>
                                                    <td className="p-4 text-right pr-8">
                                                        <button disabled={isProcessing} onClick={() => {
                                                            const b = parseInt((document.getElementById(`base-${item.id}`) as HTMLInputElement).value);
                                                            const i = parseInt((document.getElementById(`inf-${item.id}`) as HTMLInputElement).value);
                                                            const t = (document.getElementById(`type-${item.id}`) as HTMLSelectElement).value;
                                                            const th = parseInt((document.getElementById(`thr-${item.id}`) as HTMLInputElement).value) || 0;
                                                            handleUpdateItem(item.id, b, i, t, th);
                                                        }} className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-5 py-2.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 disabled:opacity-50 opacity-0 group-hover:opacity-100">
                                                            Deploy
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {lobbyTeams.map(team => (
                    <div key={team.id} className="glass border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden bg-[#0a101f]/80 backdrop-blur-xl group hover:border-white/10 transition-colors">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-opacity-100 transition-all duration-1000"></div>
                        
                        <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8 relative z-10">
                            {editingTeamId === team.id ? (
                                <div className="flex items-center gap-3 w-full">
                                    <input autoFocus value={tempTeamName} onChange={e => setTempTeamName(e.target.value)} className="bg-slate-950 border border-blue-500/50 rounded-xl px-4 py-3 text-3xl font-black w-full text-white outline-none focus:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-shadow placeholder:text-slate-700"/>
                                    <button onClick={() => handleRenameTeam(team.id)} className="bg-green-600/20 text-green-500 border border-green-500/50 p-2 md:p-3 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-lg hover:shadow-green-500/30"><Save size={20} className="md:w-6 md:h-6"/></button>
                                    <button onClick={() => setEditingTeamId(null)} className="bg-red-600/20 text-red-500 border border-red-500/50 p-2 md:p-3 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-lg hover:shadow-red-500/30"><X size={20} className="md:w-6 md:h-6"/></button>
                                </div>
                            ) : (
                                <h2 className="text-3xl md:text-5xl font-black tracking-tighter flex items-center gap-3 md:gap-4 group/title cursor-pointer text-white drop-shadow-lg transition-colors hover:text-blue-200" onClick={() => { setTempTeamName(team.name); setEditingTeamId(team.id); }}>
                                    {team.name} 
                                    <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10 opacity-0 group-hover/title:opacity-100 transition-all border border-blue-500/20">
                                        <Edit2 size={16} className="text-blue-400 md:w-[18px] md:h-[18px]"/>
                                    </div>
                                </h2>
                            )}
                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] font-mono tracking-tighter">
                                <NumberTicker value={team.budget} /> <span className="text-2xl text-yellow-500/80">GOLD</span>
                            </div>
                        </div>
                        
                        <div className="space-y-6 mb-10 relative z-10">
                            {team.players?.map((p: any) => (
                                <div key={p.id} className="glass bg-black/40 p-6 rounded-2xl border border-white/5 shadow-inner hover:border-white/10 transition-colors group/player">
                                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse relative z-10"/>
                                                <div className="absolute inset-0 bg-green-500 blur-sm opacity-50 animate-ping"></div>
                                            </div>
                                            <span className="font-black text-2xl tracking-tight text-slate-200 group-hover/player:text-white transition-colors">{p.name}</span>
                                            {p.army_link && (
                                                <a href={isSafeUrl(p.army_link) ? p.army_link : '#'} target="_blank" rel="noopener noreferrer" onClick={e => { if (!isSafeUrl(p.army_link)) e.preventDefault(); }} className="ml-2 bg-yellow-500/10 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-[9px] font-black px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all uppercase tracking-widest hover:scale-105 active:scale-95">
                                                    <ExternalLink size={10}/> Link
                                                </a>
                                            )}
                                        </div>
                                        {p.is_locked && <div className="ml-4 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><Lock size={10}/> LOCKED</div>}
                                        <div className="flex gap-3 ml-auto">

                                            {!p.is_locked && (
                                                <>
                                                    <button onClick={() => handleSwitch(p.id, team.name)} className="p-3 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-600 hover:text-white rounded-xl text-blue-400 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]" title="Switch Teams"><ArrowRightLeft size={18}/></button>
                                                    <button onClick={() => handleKick(p.id)} className="p-3 bg-red-500/10 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-xl text-red-500 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]" title="Kick Player"><Skull size={18}/></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {renderPlayerArmy(p)}
                                </div>
                            ))}
                        </div>
                        
                        <button onClick={() => handleReset(team.id)} className="w-full mt-6 bg-slate-900/80 hover:bg-red-900/60 text-red-400 hover:text-white border border-red-500/20 hover:border-red-500/50 py-5 rounded-2xl font-black flex justify-center items-center gap-3 transition-all group/reset uppercase tracking-widest text-xs relative overflow-hidden shadow-lg">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent translate-x-[-100%] group-hover/reset:translate-x-[100%] transition-transform duration-700"></div>
                            <RefreshCw className="group-hover/reset:rotate-180 transition-transform duration-500 relative z-10"/> <span className="relative z-10">Initiate Protocol: Purge & Reset {team.name}</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
    </ProtectedRoute>

  } />

  <Route path="/game" element={<>
    <div className="min-h-screen text-white flex flex-col lg:flex-row font-sans lg:overflow-hidden bg-[#050b14] relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none fixed"></div>
      
      <TeamArmyPanel 
          isOpen={showTeamPanel}
          onClose={() => setShowTeamPanel(false)}
          teamPurchases={teamPurchases}
          teamPlayers={lobbyTeams.find(t => t.id === teamId)?.players || []}
          currentPlayerId={playerId || ''}
          dbItems={dbItems}
          getImageUrl={getImageUrl}
      />

      {petModalItem && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={() => setPetModalItem(null)}>
              <div className="glass border border-white/10 rounded-[2.5rem] p-10 w-full max-w-3xl shadow-2xl animate-slide-up relative overflow-hidden bg-[#0a101f] will-change-transform" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                  <h3 className="text-4xl font-black mb-10 tracking-tighter text-center flex items-center justify-center gap-4">
                      DEPLOY <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">{petModalItem.name.toUpperCase()}</span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 relative z-10">
                      {['BK', 'AQ', 'GW', 'RC', 'MP', 'DD'].map(hero => (
                          <button key={hero} onClick={() => handleBuy(petModalItem, hero)} className="glass bg-black/40 hover:bg-green-500/10 border border-white/5 hover:border-green-500/50 rounded-[1.5rem] aspect-square flex flex-col items-center justify-center gap-3 transition-all group shadow-lg hover:-translate-y-1 duration-300">
                              <div className="relative">
                                  <div className="absolute inset-0 bg-green-500 blur-md opacity-0 group-hover:opacity-40 transition-opacity rounded-full"></div>
                                  <img src={`/${hero.toLowerCase()}.png`} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-slate-700 group-hover:border-green-500 object-cover relative z-10 shadow-2xl grayscale-[0.5] group-hover:grayscale-0 transition-all"/>
                              </div>
                              <span className="font-black text-[10px] sm:text-xs tracking-[0.2em] text-slate-500 group-hover:text-green-400 transition-colors">{hero}</span>
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setPetModalItem(null)} className="w-full mt-10 py-5 bg-slate-900 hover:bg-red-500/10 text-slate-500 hover:text-red-500 border border-white/5 hover:border-red-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">ABORT DEPLOYMENT</button>
              </div>
          </div>
      )}

      <div className="flex-1 h-auto lg:h-screen lg:overflow-y-auto pb-24 lg:pb-32 scroll-smooth relative custom-scrollbar">
        <header className="glass sticky top-0 z-50 p-4 lg:px-8 lg:py-5 shadow-2xl border-b border-white/5 backdrop-blur-xl bg-[#050b14]/80">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 lg:gap-0">
            <div className="flex items-center gap-4 lg:gap-6">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-2 lg:p-3 rounded-2xl text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-pulse-slow">
                    <Shield size={24} className="lg:w-7 lg:h-7" strokeWidth={2.5}/>
                </div>
                <div>
                    <span className="font-black text-xl lg:text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">INFLATION WAR</span>
                    <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase text-slate-500 mt-1">
                        <span className="bg-slate-800/80 px-2 py-1 rounded border border-white/5 text-slate-300">{lobbyCode}</span>
                        <span className="text-slate-700">///</span>
                        <span className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{teamName}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4 lg:gap-8 w-full lg:w-auto justify-between lg:justify-end">
                <div className="hidden xl:flex gap-8 bg-black/20 p-2 rounded-2xl border border-white/5">
                    <div className="text-center group cursor-default px-4">
                        <div className="text-[9px] font-black text-blue-500 tracking-widest mb-1 opacity-70 group-hover:opacity-100 transition-opacity">TROOPS</div>
                        <div className="text-sm font-black text-slate-200">{getCurrentWeight('troop')}<span className="text-slate-600 mx-1 font-normal">/</span>{LIMITS.troop}</div>
                    </div>
                    <div className="w-px bg-white/5 my-1"></div>
                    <div className="text-center group cursor-default px-4">
                        <div className="text-[9px] font-black text-orange-500 tracking-widest mb-1 opacity-70 group-hover:opacity-100 transition-opacity">SIEGES</div>
                        <div className="text-sm font-black text-slate-200">{getCurrentWeight('siege')}<span className="text-slate-600 mx-1 font-normal">/</span>{LIMITS.siege}</div>
                    </div>
                    <div className="w-px bg-white/5 my-1"></div>
                    <div className="text-center group cursor-default px-4">
                        <div className="text-[9px] font-black text-purple-500 tracking-widest mb-1 opacity-70 group-hover:opacity-100 transition-opacity">SPELLS</div>
                        <div className="text-sm font-black text-slate-200">{getCurrentWeight('spell')}<span className="text-slate-600 mx-1 font-normal">/</span>{LIMITS.spell}</div>
                    </div>
                </div>


                
                <div className="bg-black/40 px-3 py-2 lg:pl-5 lg:pr-5 lg:py-3 rounded-full border border-yellow-500/30 flex items-center gap-2 lg:gap-4 shadow-[0_0_20px_rgba(234,179,8,0.15)] backdrop-blur-md group hover:border-yellow-500/50 transition-colors cursor-pointer" onClick={() => setShowTransactions(true)}>
                    <div className="flex flex-col items-end pr-2 lg:pr-4 border-r border-yellow-500/20">
                        <span className="text-[7px] lg:text-[9px] font-black text-yellow-500/50 tracking-widest uppercase mb-px">My Cost</span>
                        <span className="text-xs lg:text-sm font-black font-mono text-yellow-500/80">{myPurchases.reduce((a, p) => a + (p.price_paid || 0), 0)}G</span>
                    </div>
                    <div className="text-2xl lg:text-3xl font-black font-mono text-yellow-500 tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform origin-right w-[60px] lg:w-[80px] text-right"><NumberTicker value={teamBudget} /></div>
                    <Coins className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] w-5 h-5 lg:w-6 lg:h-6"/>
                </div>

                <button 
                    onClick={() => setShowTeamPanel(p => !p)} 
                    className="bg-blue-500/10 hover:bg-blue-500/20 p-2 lg:p-4 rounded-xl lg:rounded-2xl text-blue-400 transition-all border border-blue-500/20 hover:border-blue-500/40 relative group" 
                    title="View Teammates' Armies"
                >
                    <Users className="w-5 h-5 lg:w-6 lg:h-6 group-hover:scale-110 transition-transform" />
                    <span className="hidden lg:block absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-blue-400">Team</span>
                </button>
                
                {!isLocked && (
                <button onClick={handleLeave} className="bg-red-500/10 hover:bg-red-500/20 p-2 lg:p-4 rounded-xl lg:rounded-2xl text-red-500 hover:text-red-400 transition-all border border-red-500/20 hover:border-red-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] group" title="Exit Match">
                    <LogOut className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
                </button>
                )}
            </div>
          </div>

          {/* Mobile Army Capacity Row */}
          <div className="flex xl:hidden w-full justify-around bg-black/20 py-2 px-2 rounded-xl border border-white/5 mt-4 lg:mt-0 shadow-inner">
              <div className="text-center flex flex-col items-center justify-center">
                  <div className="text-[9px] font-black text-blue-500 tracking-widest mb-0.5 opacity-80 backdrop-blur-sm">TROOPS</div>
                  <div className="text-xs font-black text-slate-200">{getCurrentWeight('troop')}<span className="text-slate-600 mx-0.5 font-normal">/</span>{LIMITS.troop}</div>
              </div>
              <div className="w-px bg-white/5 my-1"></div>
              <div className="text-center flex flex-col items-center justify-center">
                  <div className="text-[9px] font-black text-orange-500 tracking-widest mb-0.5 opacity-80 backdrop-blur-sm">SIEGES</div>
                  <div className="text-xs font-black text-slate-200">{getCurrentWeight('siege')}<span className="text-slate-600 mx-0.5 font-normal">/</span>{LIMITS.siege}</div>
              </div>
              <div className="w-px bg-white/5 my-1"></div>
              <div className="text-center flex flex-col items-center justify-center">
                  <div className="text-[9px] font-black text-purple-500 tracking-widest mb-0.5 opacity-80 backdrop-blur-sm">SPELLS</div>
                  <div className="text-xs font-black text-slate-200">{getCurrentWeight('spell')}<span className="text-slate-600 mx-0.5 font-normal">/</span>{LIMITS.spell}</div>
              </div>
          </div>
        </header>

        <main className="p-4 pb-24 lg:p-8 lg:pb-32 max-w-[1800px] mx-auto space-y-10 lg:space-y-20 animate-fade-in relative z-10">
            <section className="space-y-6 lg:space-y-10 relative">
                 <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-500/0 via-yellow-500/50 to-yellow-500/0 opacity-50"></div>
                <div className="flex items-center gap-4 lg:gap-6 border-b border-white/5 pb-4 lg:pb-6">
                    <div className="p-3 lg:p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                        <Crown className="text-yellow-500 w-8 h-8 lg:w-10 lg:h-10 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]"/>
                    </div>
                    <div>
                        <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 to-yellow-600 drop-shadow-sm">HERO ARSENAL</h2>
                        <p className="text-yellow-500/40 text-[10px] lg:text-sm tracking-[0.3em] uppercase font-bold mt-1 lg:mt-2">Equipment & Abilities Configuration</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-10">
                    {['BK','AQ','GW','RC','MP','DD'].map(h => {  
                        const hItems = sortByGameOrder(dbItems.filter(i => i.hero === h)); 
                        if (hItems.length === 0) return null; 
                        return (
                            <div key={h} className="glass rounded-[2rem] p-8 border border-white/5 hover:border-yellow-500/30 transition-all group bg-black/20 hover:bg-black/40">
                                <h4 className="text-white font-black mb-8 flex items-center gap-4 text-2xl uppercase tracking-tighter border-b border-white/5 pb-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                                        <img src={`/${h.toLowerCase()}.png`} className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-xl relative z-10 group-hover:scale-110 transition-transform duration-500 grayscale-[0.3] group-hover:grayscale-0"/>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="group-hover:text-yellow-400 transition-colors drop-shadow-md">{h}</span>
                                        <span className="text-[10px] text-slate-500 tracking-[0.2em] font-normal">Loadout Config</span>
                                    </div>
                                </h4>
                                {renderGrid(hItems)}
                            </div>
                        ) 
                    })}
                </div>
            </section>
            
            <section className="relative">
                 <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500/0 via-green-500/50 to-green-500/0 opacity-50"></div>
                <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-10">
                    <div className="p-3 lg:p-4 bg-green-500/10 rounded-2xl border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                        <PawPrint className="text-green-500 w-8 h-8 lg:w-10 lg:h-10 drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]"/>
                    </div>
                    <div>
                        <h2 className="text-3xl lg:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-100 to-green-600">COMPANIONS</h2>
                        <p className="text-green-500/40 text-[10px] lg:text-sm tracking-[0.3em] uppercase font-bold mt-1 lg:mt-2">Tactical Pet Support</p>
                    </div>
                </div>
                <div className="glass p-4 lg:p-10 rounded-[1.5rem] lg:rounded-[2.5rem] border border-white/5 bg-black/20 shadow-inner">{renderGrid(sortByGameOrder(dbItems.filter(i => i.type === 'pet')))}</div>
            </section>

            {renderCCShop()}

            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 lg:gap-16">
                <section className="relative">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500/0 via-blue-500/50 to-blue-500/0 opacity-50"></div>
                    <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-10">
                        <div className="p-3 lg:p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                            <Sword className="text-blue-500 w-6 h-6 lg:w-8 lg:h-8 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]"/>
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-blue-100">TROOPS</h2>
                    </div>
                    {renderGrid(sortByGameOrder(dbItems.filter(i => i.type === 'troop' || i.type === 'super_troop')))}
                </section>
                
                <div className="space-y-8 lg:space-y-16">
                    <section className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500/0 via-orange-500/50 to-orange-500/0 opacity-50"></div>
                        <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-10">
                            <div className="p-3 lg:p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                                <Hammer className="text-orange-500 w-6 h-6 lg:w-8 lg:h-8 drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]"/>
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-orange-100">SIEGES</h2>
                        </div>
                        {renderGrid(sortByGameOrder(dbItems.filter(i => i.type === 'siege')))}
                    </section>
                    
                    <section className="relative">
                        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-50"></div>
                        <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-10">
                            <div className="p-3 lg:p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                                <Shield className="text-purple-500 w-6 h-6 lg:w-8 lg:h-8 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]"/>
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-purple-100">SPELLS</h2>
                        </div>
                        {renderGrid(sortByGameOrder(dbItems.filter(i => i.type === 'spell')))}
                    </section>
                </div>
            </div>
        </main>

        {/* Floating Export Button */}
        <div className={`fixed bottom-0 left-0 w-full lg:w-[calc(100%-24rem)] pointer-events-none p-4 lg:p-10 z-[90] flex justify-center bg-gradient-to-t from-[#050b14] to-transparent transition-opacity duration-300 ${petModalItem ? 'opacity-0 pointer-events-none' : ''}`}>
            {isLocked ? (
                <button onClick={exportArmy} className="pointer-events-auto bg-slate-800/80 hover:bg-slate-700 px-6 py-4 lg:px-16 lg:py-6 rounded-2xl font-black flex gap-3 lg:gap-4 items-center justify-center transition-all shadow-xl text-sm lg:text-base uppercase tracking-[0.2em] text-slate-400 border border-white/10 backdrop-blur-md w-full lg:w-auto">
                     <Lock size={20} className="lg:w-6 lg:h-6"/> LOCKED & DEPLOYED
                </button>
            ) : (
                <button onClick={exportArmy} className="pointer-events-auto bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 px-6 py-4 lg:px-16 lg:py-6 rounded-2xl font-black flex gap-3 lg:gap-4 items-center justify-center transition-all shadow-[0_0_50px_rgba(34,197,94,0.3)] hover:shadow-[0_0_80px_rgba(34,197,94,0.5)] active:scale-95 text-sm lg:text-base uppercase tracking-[0.2em] text-white border border-green-400/30 backdrop-blur-md hover:-translate-y-2 duration-300 relative overflow-hidden group w-full lg:w-auto">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <ExternalLink size={20} className="lg:w-6 lg:h-6 relative z-10" strokeWidth={3}/> <span className="relative z-10">LOCK & GENERATE LINK</span>
                </button>
            )}
        </div>
      </div>
      
      {/* Sidebar with Premium Design */}
      <div className="glass w-full lg:w-96 h-auto lg:h-screen lg:sticky lg:top-0 lg:overflow-y-auto p-0 z-40 flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 shadow-2xl relative bg-[#0a101f]/95 backdrop-blur-2xl">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>
            <div className="p-6 lg:p-8 border-b border-white/5 relative z-10 bg-[#0a101f]/50 backdrop-blur-md sticky top-0 flex justify-between items-center">
                <div className="font-black text-xl lg:text-2xl flex items-center gap-4 tracking-tighter text-white">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <Sword className="text-blue-500 w-5 h-5 lg:w-6 lg:h-6" />
                    </div>
                    <div>
                        ARMY PREVIEW
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live Loadout</div>
                    </div>
                </div>
                {myPurchases.length > 0 && !isLocked && (
                    <button onClick={handleClearArmy} disabled={isProcessing} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95 group" title="Clear Entire Army">
                        <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                )}
            </div>
            
            <div className="flex-1 p-4 lg:p-6 space-y-4 lg:space-y-6 relative z-10 pb-32">
                {['BK', 'AQ', 'GW', 'RC', 'MP', 'DD'].filter(h => myPurchases.filter(p => !p.is_cc).map(p => ({ equipped_hero: p.equipped_hero, ...dbItems.find(i => i.id === p.item_id) })).some(i => i.hero === h || i.equipped_hero === h)).map(h => {
                    const active = myPurchases.filter(p => !p.is_cc).map(p => ({ equipped_hero: p.equipped_hero, ...dbItems.find(i => i.id === p.item_id) })).filter(Boolean) as any[];
                    return (
                        <div key={h} className="glass rounded-2xl p-4 lg:p-5 border border-white/5 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-colors bg-black/20">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>
                            <div className="flex items-center gap-4 mb-4">
                                <img src={`/${h.toLowerCase()}.png`} className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl border-2 border-slate-700 object-cover shadow-lg" />
                                <span className="font-black text-slate-300 text-lg">{h}</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {active.filter(i => i.type === 'pet' && i.equipped_hero === h).map((pet, idx) => (<div key={'p'+idx} className="relative group/pet"><img src={getImageUrl(pet.name as string, 'pet')} className="w-8 h-8 lg:w-10 lg:h-10 bg-black/60 rounded-xl border border-green-500/50 p-1.5 shadow-inner"/><div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>{!isLocked && <button onClick={() => handleSell(pet)} disabled={isProcessing} className="absolute -bottom-1 -left-1 z-20 bg-red-500 hover:bg-red-400 text-white w-4 h-4 flex items-center justify-center rounded-full shadow-md opacity-100 lg:opacity-0 lg:group-hover/pet:opacity-100 transition-opacity active:scale-90" title={`Remove ${pet.name}`}><Minus size={9} strokeWidth={4} /></button>}</div>))}
                                {active.filter(i => i.hero === h).map((eq, idx) => (<div key={'e'+idx} className="relative group/eq"><img src={getImageUrl(eq.name as string, 'equipment', h)} className="w-8 h-8 lg:w-10 lg:h-10 bg-black/60 rounded-xl border border-blue-500/30 p-1.5 shadow-inner"/><div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: `${idx*200}ms`}}></div>{!isLocked && <button onClick={() => handleSell(eq)} disabled={isProcessing} className="absolute -bottom-1 -left-1 z-20 bg-red-500 hover:bg-red-400 text-white w-4 h-4 flex items-center justify-center rounded-full shadow-md opacity-100 lg:opacity-0 lg:group-hover/eq:opacity-100 transition-opacity active:scale-90" title={`Remove ${eq.name}`}><Minus size={9} strokeWidth={4} /></button>}</div>))}
                            </div>
                        </div>
                    )
                })}
                {renderCCSection()}
                {['troop','siege','spell'].map(type => {
                    const active = myPurchases.filter(p => !p.is_cc).map(p => dbItems.find(i => i.id === p.item_id)).filter(Boolean) as Item[];
                    const list = Array.from(new Map(active.map(i => [i.id, i])).values()).filter(i => type === 'troop' ? (i.type === 'troop' || i.type === 'super_troop') : i.type === type);
                    if (list.length === 0) return null;
                    const counts: any = {}; active.forEach(i => counts[i.id] = (counts[i.id] || 0) + 1);
                    const color = type === 'siege' ? 'orange' : type === 'spell' ? 'purple' : 'blue';
                    return (
                        <div key={type} className="mb-6 lg:mb-8">
                            <h3 className={`text-[10px] font-black text-${color}-500 uppercase tracking-[0.2em] mb-3 lg:mb-4 flex items-center gap-2 after:h-px after:flex-1 after:bg-${color}-500/20`}>{type}s</h3>
                            <div className="grid grid-cols-4 gap-2 lg:gap-3 will-change-transform">
                                {list.map(i => (
                                    <div key={i.id} className={`relative glass rounded-xl border border-white/5 aspect-square shadow-sm overflow-hidden group hover:border-${color}-500/50 transition-colors`}>
                                        <div className={`absolute inset-0 bg-${color}-500/10 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                                        <img src={getImageUrl(i.name, i.type)} className="w-full h-full object-contain p-2 drop-shadow-sm relative z-10" />
                                        <div className={`absolute -top-0 -right-0 bg-${color}-500 text-black text-[9px] font-black w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center rounded-bl-xl shadow-md z-20`}>{counts[i.id]}</div>
                                        {!isLocked && <button onClick={() => handleSell(i)} disabled={isProcessing} className="absolute bottom-0 left-0 z-30 bg-red-500 hover:bg-red-400 text-white w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center rounded-tr-xl shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity active:scale-90" title={`Remove ${i.name}`}><Minus size={10} strokeWidth={4} /></button>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
      </div>
    </div>
  </>} />
  <Route path="/logs" element={<MatchLogs />} />
  <Route path="/team" element={<TeamHub />} />
  <Route path="/tournament" element={<TournamentHub />} />
  <Route path="/tournament/:challongeUrl" element={<TournamentView />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>

{showOverseerModal && (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={() => setShowOverseerModal(false)}>
        <div className="glass border border-white/10 rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl animate-slide-up relative overflow-hidden bg-[#0a101f]" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <h3 className="text-4xl font-black mb-8 tracking-tighter text-center flex items-center justify-center gap-4 text-red-500 drop-shadow-sm">
                <Crown size={32}/> OVERSEER SETUP
            </h3>
            
            <div className="space-y-6 relative z-10">
                <div className="flex gap-4 p-2 bg-black/40 rounded-2xl border border-white/5">
                    <button onClick={() => setMatchType('custom')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${matchType === 'custom' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>CUSTOM GAME</button>
                    <button onClick={() => setMatchType('official')} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${matchType === 'official' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>OFFICIAL MATCH</button>
                </div>
                
                {matchType === 'official' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <input 
                                    type="checkbox" 
                                    id="linkBracket" 
                                    checked={linkBracket} 
                                    onChange={e => setLinkBracket(e.target.checked)}
                                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                                />
                                <label htmlFor="linkBracket" className="text-sm font-bold text-white cursor-pointer select-none">Link to Tournament Bracket</label>
                            </div>

                            {linkBracket && (
                                <div className="space-y-4 p-4 bg-red-900/10 border border-red-500/20 rounded-xl mb-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tournament URL (e.g. cocelitetest1)</label>
                                        <input 
                                            type="text" 
                                            placeholder="Tournament ID/URL"
                                            value={tournamentUrl}
                                            onChange={e => setTournamentUrl(e.target.value)}
                                            className="w-full bg-[#050b14] border border-white/10 focus:border-red-500/50 rounded-xl p-3 font-bold text-white outline-none transition-colors"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Open Match</label>
                                        <select 
                                            value={challongeMatchId || ''} 
                                            onChange={(e) => {
                                                const mId = e.target.value;
                                                setChallongeMatchId(mId);
                                                if (mId) {
                                                    const m = openMatches.find((x: any) => x.match.id.toString() === mId);
                                                    if (m) {
                                                        const p1Id = m.match.player1_id?.toString();
                                                        const p2Id = m.match.player2_id?.toString();
                                                        
                                                        // Phase 39: Map native strings via interpolation table perfectly
                                                        const roster1Id = participantToRosterMap[p1Id];
                                                        const roster2Id = participantToRosterMap[p2Id];
                                                        
                                                        if (roster1Id) setSelectedTeamA(roster1Id);
                                                        if (roster2Id) setSelectedTeamB(roster2Id);
                                                    }
                                                }
                                            }}
                                            className="w-full bg-[#050b14] border border-red-500/30 rounded-xl p-3 font-bold outline-none text-white focus:border-red-500 transition-colors"
                                            disabled={isFetchingMatches || openMatches.length === 0}
                                        >
                                            {isFetchingMatches ? (
                                                <option value="">-- Loading Matches... --</option>
                                            ) : openMatches.length === 0 ? (
                                                <option value="">-- No open matches found --</option>
                                            ) : (
                                                <>
                                                    <option value="">-- Choose Match --</option>
                                                    {openMatches.map((m: any) => {
                                                        const p1Id = m.match.player1_id?.toString();
                                                        const p2Id = m.match.player2_id?.toString();
                                                        
                                                        // Look up Roster IDs specifically from the synced mapping
                                                        const roster1Id = participantToRosterMap[p1Id];
                                                        const roster2Id = participantToRosterMap[p2Id];
                                                        
                                                        const roster1 = roster1Id ? allRosters.find(r => r.id === roster1Id) : undefined;
                                                        const roster2 = roster2Id ? allRosters.find(r => r.id === roster2Id) : undefined;
                                                        
                                                        const name1 = roster1 ? roster1.name : (challongeParticipantMap[p1Id] || `Participant ${p1Id || 'TBD'}`);
                                                        const name2 = roster2 ? roster2.name : (challongeParticipantMap[p2Id] || `Participant ${p2Id || 'TBD'}`);
                                                        
                                                        const label = `${m.match.identifier}: ${name1} vs ${name2}`;
                                                        return <option key={m.match.id} value={m.match.id}>{label}</option>;
                                                    })}
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Team A Roster</label>
                                    <select 
                                        value={selectedTeamA || ''} 
                                        onChange={e => setSelectedTeamA(e.target.value)} 
                                        className="w-full bg-[#050b14] border border-blue-500/30 rounded-xl p-4 font-bold outline-none text-blue-100 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!!challongeMatchId}
                                    >
                                        {allRosters.map(r => <option key={r.id} value={r.id}>[{r.tag}] {r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Team B Roster</label>
                                    <select 
                                        value={selectedTeamB || ''} 
                                        onChange={e => setSelectedTeamB(e.target.value)} 
                                        className="w-full bg-[#050b14] border border-purple-500/30 rounded-xl p-4 font-bold outline-none text-purple-100 focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!!challongeMatchId}
                                    >
                                        {allRosters.map(r => <option key={r.id} value={r.id}>[{r.tag}] {r.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowOverseerModal(false)} className="flex-1 py-4 px-6 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">CANCEL</button>
                    <button type="button" onClick={() => handleModeratorAccess()} disabled={modLoading} className="flex-1 py-4 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                        {modLoading ? 'DEPLOYING...' : 'DEPLOY MATCH'}
                    </button>
                </div>
                
                {/* LIVE LOBBY BROWSER */}
                <div className="pt-8 mt-8 border-t border-white/10 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a101f] px-4 text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase flex items-center gap-2">
                        <Wifi size={12} className="animate-pulse" /> ONGOING MATCHES
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {activeLobbies.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase tracking-widest">No active links found.</div>
                        ) : (
                            activeLobbies.map(lobby => (
                                <div key={lobby.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-black text-lg tracking-tight">{lobby.code}</span>
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 py-0.5 px-2 rounded-full hidden sm:inline-block">
                                                {formatDistanceToNow(new Date(lobby.created_at), { addSuffix: true })}
                                            </span>
                                            {lobby.challonge_match_id ? (
                                                <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 flex items-center gap-1 shadow-sm">
                                                    <Trophy size={10} /> {lobby.tournamentName || "TOURNAMENT MATCH"}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 shadow-sm">
                                                    <Sword size={10} /> CUSTOM MATCH
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                                            {lobby.teams?.[0] ? (
                                                <span className={lobby.teams[0].roster_id ? "text-blue-400" : ""}>
                                                    {lobby.teams[0].roster_id ? allRosters.find(r => r.id === lobby.teams[0].roster_id)?.name || lobby.teams[0].name : lobby.teams[0].name}
                                                </span>
                                            ) : 'Unknown'}
                                            <span className="text-slate-600 text-[10px]">VS</span>
                                            {lobby.teams?.[1] ? (
                                                <span className={lobby.teams[1].roster_id ? "text-purple-400" : ""}>
                                                    {lobby.teams[1].roster_id ? allRosters.find(r => r.id === lobby.teams[1].roster_id)?.name || lobby.teams[1].name : lobby.teams[1].name}
                                                </span>
                                            ) : 'Unknown'}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setLobbyCode(lobby.code);
                                            setShowOverseerModal(false);
                                            handleModeratorAccess(0, lobby.code);
                                        }}
                                        className="py-2 px-4 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        JOIN <ArrowRight size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
)}
{showEndMatchModal && (
    <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={() => setShowEndMatchModal(false)}>
        <div className="glass border border-white/10 rounded-[2rem] w-full max-w-xl max-h-[85vh] overflow-y-auto custom-scrollbar bg-[#0a101f] relative shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#0a101f]/95 backdrop-blur-md sticky top-0 z-10">
                <h3 className="text-2xl font-black text-center tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                    MATCH CONCLUSION
                </h3>
                <p className="text-center text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">Enter Combat Reports</p>
            </div>

            {/* Body */}
            <div className="p-4 md:p-6 space-y-5 relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                 {lobbyTeams.map(team => (
                     <div key={team.id} className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3">
                         <h4 className="font-black text-base text-white tracking-widest uppercase">{team.name}</h4>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-[10px] font-black text-yellow-500 tracking-[0.2em] uppercase mb-1.5 flex items-center gap-2"><Trophy size={12}/> Stars</label>
                                 <input 
                                     type="number" 
                                     min="0"
                                     value={endMatchScores[team.id]?.stars || ''}
                                     onChange={e => setEndMatchScores(prev => ({ ...prev, [team.id]: { ...prev[team.id], stars: e.target.value } }))}
                                     className="w-full bg-[#050b14] border border-white/10 focus:border-yellow-500/50 rounded-lg p-3 font-bold text-white outline-none transition-all shadow-inner text-center text-xl"
                                     placeholder="0"
                                 />
                             </div>
                             <div>
                                 <label className="block text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase mb-1.5 flex items-center gap-2"><ArrowRight size={12}/> Destruction %</label>
                                 <input 
                                     type="number" 
                                     min="0"
                                     step="0.1"
                                     max="100"
                                     value={endMatchScores[team.id]?.percentage || ''}
                                     onChange={e => setEndMatchScores(prev => ({ ...prev, [team.id]: { ...prev[team.id], percentage: e.target.value } }))}
                                     className="w-full bg-[#050b14] border border-white/10 focus:border-blue-500/50 rounded-lg p-3 font-bold text-white outline-none transition-all shadow-inner text-center text-xl"
                                     placeholder="0.0"
                                 />
                             </div>
                         </div>
                     </div>
                 ))}
                 
                 {foundLobby?.challonge_match_id && (
                     <div className="bg-[#050b14]/80 p-4 rounded-xl border border-red-500/30">
                         <label className="block text-[10px] font-black text-red-500 mb-1.5 uppercase tracking-widest flex items-center gap-2"><Trophy size={12}/> Bracket Auto-Advance URL</label>
                         <p className="text-[10px] text-slate-400 mb-2">This is an Official Match. Enter the Challonge Tournament ID to automatically report the winner.</p>
                         <input 
                             type="text"
                             value={tournamentUrl}
                             onChange={e => setTournamentUrl(e.target.value)}
                             placeholder="e.g. cocelitetest1"
                             className="w-full bg-black border border-white/5 focus:border-red-500/50 rounded-lg p-3 font-bold text-white outline-none transition-all shadow-inner"
                         />
                     </div>
                 )}
                 
                 <div className="flex gap-3 pt-3 border-t border-white/10">
                     <button type="button" onClick={() => setShowEndMatchModal(false)} className="flex-1 py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">CANCEL</button>
                     <button type="button" onClick={submitEndMatch} disabled={modLoading} className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                         {modLoading ? 'PROCESSING...' : <><ChevronRight size={16}/> CONFIRM & SUBMIT</>}
                     </button>
                 </div>
            </div>
        </div>
    </div>
)}
</>
  );
}

// --- AUTH WRAPPER ---
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, refetchOnWindowFocus: false } }
});

// Suspense fallback — matches the app's dark theme
const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 opacity-60">
      <div className="w-8 h-8 border-2 border-sky-400/50 border-t-sky-400 rounded-full animate-spin" />
      <span className="text-xs tracking-widest uppercase text-sky-300 font-semibold">Loading</span>
    </div>
  </div>
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#0a101f', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, letterSpacing: '0.03em' }, success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } } }} />
      <CallsignModal />
      <Suspense fallback={<SuspenseFallback />}>
        <AppContent />
      </Suspense>
    </AuthProvider>
    </QueryClientProvider>
  );
}