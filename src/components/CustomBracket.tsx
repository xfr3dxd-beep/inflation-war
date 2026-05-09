import React, { useEffect, useState } from 'react';
import { RefreshCw, LayoutList, Trophy, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchParticipants, fetchOpenMatches, fetchTournamentDetails } from '../services/challongeService'; 
import toast from 'react-hot-toast';
import { isSafeTournamentSlug } from '../lib/sanitize';
import { transformChallongeData } from '../utils/bracketTransforms';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CustomBracketProps {
    tournamentUrl: string;
    isModerator?: boolean;
}

export const CustomBracket: React.FC<CustomBracketProps> = ({ tournamentUrl, isModerator = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRosterIds, setUserRosterIds] = useState<string[]>([]);
    const [captainRosterIds, setCaptainRosterIds] = useState<string[]>([]);
    const [isCaptain, setIsCaptain] = useState<boolean>(false);
    const [activeMatches, setActiveMatches] = useState<Record<string, string>>({});
    const [tournamentType, setTournamentType] = useState<string>('single elimination');
    const [groupStagesEnabled, setGroupStagesEnabled] = useState(false);
    const [groupStageState, setGroupStageState] = useState<string>('');
    const [advanceCount, setAdvanceCount] = useState<number>(2);
    
    const [rosterMap, setRosterMap] = useState<Record<string, string>>({});
    const [nameMap, setNameMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchUserRosterIds = async () => {
            if (user?.id) {
                // Check if user is captain of any roster (for CREATE LOBBY button)
                const { data: captainRosters } = await supabase
                    .from('rosters')
                    .select('id')
                    .eq('captain_id', user.id);

                if (captainRosters && captainRosters.length > 0) {
                    setIsCaptain(true);
                    setCaptainRosterIds(captainRosters.map(r => r.id));
                }

                // userRosterIds = ONLY rosters where user is an active player (role='player')
                // This is used for JOIN LOBBY visibility.
                const { data: memberData } = await supabase
                    .from('roster_members')
                    .select('roster_id')
                    .eq('user_id', user.id)
                    .eq('role', 'player');
                    
                const playerIds = memberData ? memberData.map(m => m.roster_id) : [];
                setUserRosterIds(playerIds);
            }
        };
        fetchUserRosterIds();
    }, [user?.id]);

    useEffect(() => {
        const fetchActiveMatches = async () => {
            const { data: liveLobbies } = await supabase
                .from('lobbies')
                .select('challonge_match_id, code')
                .not('challonge_match_id', 'is', null);

            if (liveLobbies) {
                const liveMap: Record<string, string> = {};
                liveLobbies.forEach(lobby => {
                    if (lobby.challonge_match_id && lobby.code) {
                        liveMap[lobby.challonge_match_id] = lobby.code;
                    }
                });
                setActiveMatches(liveMap);
            }
        };

        fetchActiveMatches();

        const channel = supabase.channel('bracket_lobbies_events')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lobbies' },
                (payload) => {
                    const newRecord = payload.new as any;
                    if (newRecord && newRecord.challonge_match_id && newRecord.code) {
                        setActiveMatches(prev => ({
                            ...prev,
                            [newRecord.challonge_match_id]: newRecord.code
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadBracket = async () => {
        if (!tournamentUrl) return;
        setLoading(true);
        try {
            const matchesPromise = fetchOpenMatches(tournamentUrl);
            const [matchesRes, participantsData] = await Promise.all([
                matchesPromise,
                fetchParticipants(tournamentUrl)
            ]);
            
            setParticipants(participantsData);
            
            const { data: tData } = await supabase.from('tournaments')
                .select('id, tournament_type, group_stages_enabled')
                .eq('challonge_url', tournamentUrl)
                .single();
            
            if (tData) {
                if (tData.tournament_type) {
                    setTournamentType(tData.tournament_type.toLowerCase());
                }
                setGroupStagesEnabled(!!tData.group_stages_enabled);

                if (tData.group_stages_enabled) {
                    try {
                        const challongeDetails = await fetchTournamentDetails(tournamentUrl);
                        const state = challongeDetails?.attributes?.state || '';
                        setGroupStageState(state);
                        
                        // Extract advance count if present
                        const tOpts = challongeDetails?.attributes?.group_stage_options;
                        if (tOpts && tOpts.participant_count_to_advance_per_group) {
                            setAdvanceCount(tOpts.participant_count_to_advance_per_group);
                        }
                    } catch (e) {
                        console.warn('Could not fetch tournament state from Challonge:', e);
                    }
                } else {
                    setGroupStageState('');
                }

                const { data: regs } = await supabase.from('tournament_registrations')
                    .select('challonge_participant_id, roster_id, rosters(name)')
                    .eq('tournament_id', tData.id);
                    
                if (regs) {
                    const rMap: Record<string, string> = {};
                    const nMap: Record<string, string> = {};
                    regs.forEach(r => {
                        const targetId = String(r.challonge_participant_id);
                        rMap[targetId] = r.roster_id;
                        const rosterData = r.rosters as any;
                        if (rosterData && rosterData.name) {
                            nMap[targetId] = rosterData.name;
                        }
                    });

                    // Two-Stage Match Card Fix: Challonge generates new IDs for Elimination Phase participants.
                    // However, their `group_player_ids` array contains the Group Stage participant ID (which maps to our DB Main ID).
                    // We loop through the API participants and strictly alias any new "Final Stage" IDs back to their known Main IDs.
                    participantsData.forEach((p: any) => {
                        if (p.group_player_ids && Array.isArray(p.group_player_ids)) {
                            p.group_player_ids.forEach((gid: any) => {
                                const groupIdStr = String(gid);
                                const participantIdStr = String(p.id);
                                
                                // If the group ID is found in our DB mapping, assign the new participant ID to the exact same Roster ID.
                                if (rMap[groupIdStr]) {
                                    rMap[participantIdStr] = rMap[groupIdStr];
                                    nMap[participantIdStr] = nMap[groupIdStr];
                                }
                                
                                // Failsafe: Should the NEW ID be the Main ID instead, alias the Group ID back to it.
                                if (rMap[participantIdStr] && !rMap[groupIdStr]) {
                                    rMap[groupIdStr] = rMap[participantIdStr];
                                    nMap[groupIdStr] = nMap[participantIdStr];
                                }
                            });
                        }
                    });

                    setRosterMap(rMap);
                    setNameMap(nMap);
                }
            }

            const transformed = transformChallongeData(participantsData, matchesRes);
            setMatches(transformed.matches);
            setError(null);
        } catch (err: any) {
            console.error("Bracket Load Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshBracket = async () => {
        setIsRefreshing(true);
        await loadBracket();
        setIsRefreshing(false);
    };

    useEffect(() => {
        loadBracket();
    }, [tournamentUrl]);

    if (loading) {
        return <div className="text-slate-400 animate-pulse flex items-center justify-center p-12">DECRYPTING BRACKET ARCHIVES...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-8 border border-red-500/30 rounded-2xl bg-black/40">ERROR LOADING BRACKET: {error}</div>;
    }

    const isRoundRobin = tournamentType === 'round robin';

    // ── Helper: determine which matches can have "CREATE LOBBY" button ──
    // Rules:
    // 1. Match must be open (SCHEDULED/open/pending)
    // 2. Both participants must be known (no TBD)
    // 3. Only the FIRST chronological open match per team gets the button
    //    (sorted by Challonge suggested_play_order / round / id)
    // 4. User must be a captain and in the match
    const getCreatableMatchIds = (matchList: any[]): Set<string> => {
        // Sort by suggested_play_order (Challonge's intended order), then round, then id
        const sorted = [...matchList].sort((a, b) => {
            const orderA = a.suggested_play_order ?? a.tournamentRound ?? 0;
            const orderB = b.suggested_play_order ?? b.tournamentRound ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return (a.id ?? 0) - (b.id ?? 0);
        });

        const teamFirstMatch = new Set<string>(); // rosters that already have a creatable match
        const creatableIds = new Set<string>();

        for (const m of sorted) {
            const isOpen = m.state === 'SCHEDULED' || m.state === 'open' || m.state === 'pending';
            if (!isOpen) continue;

            const hasLobby = !!activeMatches[m.id];
            if (hasLobby) continue; // Already has a lobby

            const p1Id = m.participants[0]?.id;
            const p2Id = m.participants[1]?.id;

            // Both participants must be known (no TBD)
            if (!p1Id || !p2Id) continue;

            // Moderators can create *any* open match unconditionally
            if (isModerator) {
                creatableIds.add(String(m.id));
                continue;
            }

            const topRosterId = rosterMap[p1Id];
            const bottomRosterId = rosterMap[p2Id];
            if (!topRosterId || !bottomRosterId) continue;

            // Captain can CREATE lobbies for their team's matches.
            // We check captainRosterIds (rosters where user is captain)
            // OR userRosterIds (rosters where user is an active player).
            // The captain_id on the roster determines creation privilege.
            const allMyRosterIds = [...new Set([...captainRosterIds, ...userRosterIds])];
            const isInMatch = allMyRosterIds.length > 0 && (allMyRosterIds.includes(topRosterId) || allMyRosterIds.includes(bottomRosterId));
            if (!isInMatch || !isCaptain) continue;

            // Only allow if this team hasn't been assigned a creatable match yet
            const myRoster = allMyRosterIds.includes(topRosterId) ? topRosterId : bottomRosterId;
            if (teamFirstMatch.has(myRoster)) continue;

            teamFirstMatch.add(myRoster);
            creatableIds.add(String(m.id));
        }
        return creatableIds;
    };

    // ── Match Card (Reused for match lists and RR) ──
    const renderMatchCard = (match: any, canCreateLobby: boolean = false) => {
        const topRosterId = rosterMap[match.participants[0]?.id];
        const bottomRosterId = rosterMap[match.participants[1]?.id];
        // For JOIN LOBBY visibility: check both active player rosters AND captain rosters
        const allMyRosterIds = [...new Set([...captainRosterIds, ...userRosterIds])];
        const isPlayerInMatch = Boolean(allMyRosterIds.length > 0 && (allMyRosterIds.includes(topRosterId!) || allMyRosterIds.includes(bottomRosterId!)));
        const liveLobbyCode = activeMatches[match.id];
        const isComplete = match.state === 'complete';

        return (
            <div key={match.id} className={`relative transform hover:scale-[1.02] transition-all duration-300 ${isComplete ? 'opacity-50 saturate-50' : ''}`}>
                <div className={`rounded-xl p-4 shadow-lg flex flex-col justify-around gap-2 h-32 relative ${
                    liveLobbyCode
                        ? 'bg-gradient-to-br from-red-950/40 to-black/60 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        : canCreateLobby
                            ? 'bg-gradient-to-br from-sky-950/30 to-black/50 border border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.05)]'
                            : 'bg-black/40 border border-[#3b4b68]/40'
                }`}>
                    {/* Top Participant */}
                    <div className={`flex justify-between items-center px-3 py-1.5 rounded-md ${match.participants[0]?.isWinner ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-transparent'}`}>
                        <span className={`font-semibold font-outfit truncate pr-2 ${match.participants[0]?.isWinner ? 'text-green-400' : 'text-slate-300'}`}>
                            {match.participants[0]?.name || 'TBD'}
                        </span>
                        <span className={`font-mono font-bold ${match.participants[0]?.isWinner ? 'text-green-400' : 'text-slate-500'}`}>
                            {match.participants[0]?.resultText || '-'}
                        </span>
                    </div>
                    {/* Bottom Participant */}
                    <div className={`flex justify-between items-center px-3 py-1.5 rounded-md ${match.participants[1]?.isWinner ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-transparent'}`}>
                        <span className={`font-semibold font-outfit truncate pr-2 ${match.participants[1]?.isWinner ? 'text-green-400' : 'text-slate-300'}`}>
                            {match.participants[1]?.name || 'TBD'}
                        </span>
                        <span className={`font-mono font-bold ${match.participants[1]?.isWinner ? 'text-green-400' : 'text-slate-500'}`}>
                            {match.participants[1]?.resultText || '-'}
                        </span>
                    </div>
                    {/* Match Round Label */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a101f] border border-[#3b4b68] text-yellow-500 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                        {match.tournamentRoundText || 'Match'}
                    </div>

                    {/* ACTION BUTTONS — only if canCreateLobby is true */}
                    {!liveLobbyCode && canCreateLobby && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    if (!topRosterId || !bottomRosterId) {
                                        toast.error('Competitors have not synced via Tournament Registrations Matrix.');
                                        return;
                                    }
                                    const { data: lobbyCode, error } = await supabase.rpc('create_lobby', {
                                        p_lobby_name: `TNK-${String(match.id).slice(-4)}`,
                                        p_team_a_roster_id: topRosterId,
                                        p_team_b_roster_id: bottomRosterId,
                                        p_challonge_match_id: String(match.id)
                                    });
                                    if (error) throw error;
                                    if (lobbyCode) {
                                        const codeToJoin = typeof lobbyCode === 'object' ? (lobbyCode.code || lobbyCode.id) : lobbyCode;
                                        navigate(`/join/${codeToJoin}`);
                                    }
                                } catch (err: any) {
                                    console.error('Error creating lobby:', err);
                                    toast.error('Failed to create lobby: ' + err.message);
                                }
                            }}
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-sky-500/50 text-sky-400 hover:bg-sky-500/20 hover:text-white hover:border-sky-400 text-[10px] uppercase font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all z-10"
                        >
                            CREATE LOBBY
                        </button>
                    )}
                    {liveLobbyCode && (
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 z-10 w-max">
                            {isPlayerInMatch && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/join/${liveLobbyCode}`);
                                    }}
                                    className="bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20 hover:text-white hover:border-red-400 text-[10px] uppercase font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all"
                                >
                                    JOIN LOBBY
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/stream/${liveLobbyCode}`);
                                }}
                                className="bg-purple-500/10 border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:text-white hover:border-purple-400 text-[10px] uppercase font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.2)] transition-all"
                            >
                                WATCH
                            </button>
                        </div>
                    )}
                </div>
                {/* LIVE INDICATOR */}
                {liveLobbyCode && (
                    <div className="absolute -top-3 -right-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 blur animate-pulse rounded-full opacity-50"></div>
                            <div className="relative bg-black border border-red-500/50 text-red-500 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                Live
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ── Render Content ──
    const renderBracketOrStandings = () => {
        // ============================================
        // GROUP STAGE VIEW — Show group standings tables
        // ============================================
        if (groupStagesEnabled && groupStageState === 'group_stages_underway') {
            console.log('[DEBUG-GRPS] Render Standings - Total Participants:', participants.length);

            // ==========================================
            // GROUP STAGE ASSIGNMENT (Direct v1 Match Mapping)
            // Participants hold a `group_player_ids` array. Match objects hold `group_id` and `player1_id` (which corresponds to `group_player_ids`).
            // We scan the matches to definitively map every participant to their true Challonge group ID.
            // ==========================================
            const participantToRawGroupId: Record<string, string> = {};
            const groupIdToLetter: Record<string, string> = {};

            matches.forEach(m => {
                const matchData = m.match || m;
                const matchGroupId = matchData.group_id?.toString();
                const p1_sub_id = matchData.player1_id;
                const p2_sub_id = matchData.player2_id;

                if (matchGroupId) {
                    const mainP1 = participants.find((p: any) => p.group_player_ids?.includes(p1_sub_id));
                    const mainP2 = participants.find((p: any) => p.group_player_ids?.includes(p2_sub_id));

                    if (mainP1) participantToRawGroupId[mainP1.id || mainP1.attributes?.id] = matchGroupId;
                    if (mainP2) participantToRawGroupId[mainP2.id || mainP2.attributes?.id] = matchGroupId;
                }
            });

            // Map the large random integer group_ids sequentially to Group A, B, C...
            const uniqueRawGroups = Array.from(new Set(Object.values(participantToRawGroupId))).sort((a, b) => Number(a) - Number(b));
            uniqueRawGroups.forEach((rawGroupId, index) => {
                groupIdToLetter[rawGroupId] = `Group ${String.fromCharCode(65 + index)}`;
            });

            const getParticipantGroupName = (pid: string) => {
                const rawGroupId = participantToRawGroupId[pid];
                return rawGroupId ? groupIdToLetter[rawGroupId] : 'Group A';
            };

            const allStats: Record<string, { name: string; wins: number; losses: number; points: number; group: string }> = {};
            
            participants.forEach((p: any) => {
                const pid = (p.id || p.attributes?.id)?.toString();
                const pName = p.attributes?.name || p.name || nameMap[pid] || `Team ${pid}`;
                const gKey = pid ? getParticipantGroupName(pid) : 'Group A';
                
                if (pid) {
                    allStats[pid] = { name: pName, wins: 0, losses: 0, points: 0, group: gKey };
                }
            });

            matches.forEach((m: any) => {
                const matchData = m.match || m;
                if (matchData.state !== 'complete') return;

                const winnerSubId = matchData.winner_id;
                const p1SubId = matchData.player1_id;
                const p2SubId = matchData.player2_id;

                if (winnerSubId && p1SubId && p2SubId) {
                    const mainWinner = participants.find((p: any) => p.group_player_ids?.includes(winnerSubId));
                    const loserSubId = winnerSubId === p1SubId ? p2SubId : p1SubId;
                    const mainLoser = participants.find((p: any) => p.group_player_ids?.includes(loserSubId));

                    const winnerId = mainWinner?.id || mainWinner?.attributes?.id;
                    const loserId = mainLoser?.id || mainLoser?.attributes?.id;

                    if (winnerId && allStats[winnerId]) {
                        allStats[winnerId].wins++;
                        allStats[winnerId].points += 3;
                    }
                    if (loserId && allStats[loserId]) {
                        allStats[loserId].losses++;
                    }
                }
            });

            const groups: Record<string, typeof allStats[string][]> = {};
            Object.values(allStats).forEach(stat => {
                if (!groups[stat.group]) groups[stat.group] = [];
                groups[stat.group].push(stat);
            });

            Object.keys(groups).forEach(g => {
                groups[g].sort((a, b) => b.points - a.points || b.wins - a.wins);
            });

            const sortedGroupKeys = Object.keys(groups).sort();

            return (
                <div className="p-6 space-y-6">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-amber-400 font-black text-xs tracking-[0.2em] uppercase">Group Stage in Progress</span>
                        </div>
                    </div>
                    <div className={`grid gap-6 ${sortedGroupKeys.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
                        {sortedGroupKeys.map(groupName => (
                            <div key={groupName} className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 bg-gradient-to-r from-fuchsia-950/40 to-transparent border-b border-white/5">
                                    <h3 className="text-white font-black tracking-[0.15em] uppercase text-sm">{groupName}</h3>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="text-left px-5 py-3 font-mono">#</th>
                                            <th className="text-left px-5 py-3 font-mono">Team</th>
                                            <th className="text-center px-3 py-3 font-mono">W</th>
                                            <th className="text-center px-3 py-3 font-mono">L</th>
                                            <th className="text-center px-3 py-3 font-mono">PTS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups[groupName].map((stat, idx) => (
                                            <tr key={stat.name} className={`border-t border-white/5 transition-colors hover:bg-white/5 ${idx < advanceCount ? 'bg-emerald-950/10' : ''}`}>
                                                <td className="px-5 py-3 text-slate-600 font-mono text-sm">{idx + 1}</td>
                                                <td className="px-5 py-3">
                                                    <span className="text-white font-bold text-sm tracking-wide">{stat.name}</span>
                                                </td>
                                                <td className="text-center px-3 py-3 text-emerald-400 font-mono font-bold">{stat.wins}</td>
                                                <td className="text-center px-3 py-3 text-red-400 font-mono font-bold">{stat.losses}</td>
                                                <td className="text-center px-3 py-3 text-amber-400 font-mono font-black">{stat.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Match Schedule — Progressive Rounds */}
                    {(() => {
                        const creatableIds = getCreatableMatchIds(matches);

                        // Group matches by round (for Group Stages, `identifier` often holds the round text or `tournamentRound`)
                        const roundMap: Record<number, any[]> = {};
                        matches.forEach((m: any) => {
                            const matchData = m.match || m;
                            const roundNum = Math.abs(matchData.tournamentRound || matchData.suggested_play_order || 1) || 1;
                            if (!roundMap[roundNum]) roundMap[roundNum] = [];
                            roundMap[roundNum].push(m);
                        });
                        const sortedRounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

                        // Progressive unlock: show a round if:
                        // - It's round 1 (always show), OR
                        // - The previous round has at least one match that's started/complete/has a lobby
                        const visibleRounds: number[] = [];
                        for (let i = 0; i < sortedRounds.length; i++) {
                            const roundNum = sortedRounds[i];
                            if (i === 0) {
                                visibleRounds.push(roundNum);
                                continue;
                            }
                            const prevRound = sortedRounds[i - 1];
                            const prevMatches = roundMap[prevRound] || [];
                            const prevHasActivity = prevMatches.some((m: any) => {
                                const mData = m.match || m;
                                return mData.state === 'complete' || activeMatches[mData.id];
                            });
                            if (prevHasActivity) {
                                visibleRounds.push(roundNum);
                            }
                        }

                        return (
                            <div className="mt-12">
                                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 px-2">
                                    <LayoutList className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                                    <h3 className="text-sm md:text-xl font-bold font-outfit tracking-wider text-white uppercase">Group Matches</h3>
                                </div>
                                <div className="space-y-8">
                                    {visibleRounds.map(roundNum => (
                                        <div key={roundNum}>
                                            <div className="flex items-center gap-2 mb-4 px-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                                <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em]">Round {roundNum}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {roundMap[roundNum].map(m => renderMatchCard(m, creatableIds.has(String((m.match || m).id))))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                </div>
            );
        }

        // ============================================
        // ROUND ROBIN — Standings + Match Cards
        // ============================================
        if (isRoundRobin) {
            const stats = participants.map(p => {
                let wins = 0;
                let losses = 0;
                let ties = 0;
                let points = 0;
                
                matches.forEach(m => {
                    if (m.state !== 'complete') return;
                    const p1 = m.participants[0];
                    const p2 = m.participants[1];
                    
                    if (p1 && p1.id === p.id) {
                        if (p1.isWinner) { wins++; points += 3; }
                        else if (!p2?.isWinner && p1.resultText === p2?.resultText && p1.resultText !== null) { ties++; points += 1; }
                        else { losses++; }
                    } else if (p2 && p2.id === p.id) {
                        if (p2.isWinner) { wins++; points += 3; }
                        else if (!p1?.isWinner && p1?.resultText === p2.resultText && p2.resultText !== null) { ties++; points += 1; }
                        else { losses++; }
                    }
                });
                
                return {
                    ...p,
                    stats: { wins, losses, ties, points },
                    rank: p.final_rank || p.seed || 999 
                };
            });

            stats.sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
                return b.stats.wins - a.stats.wins;
            });
            
            return (
                <div className="p-4 md:p-8 w-full max-w-6xl mx-auto space-y-8 md:space-y-12 min-h-[85vh] bg-[#050b14] overflow-y-auto">
                    {/* Standings Table */}
                    <div className="bg-[#0a101f] border border-white/5 shadow-2xl rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-red-600/20 to-orange-500/20 px-4 py-4 md:px-8 md:py-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                                <h3 className="text-sm md:text-xl font-bold font-outfit tracking-wider text-white uppercase">{tournamentType} STANDINGS</h3>
                            </div>
                            <div className="text-slate-400 text-xs md:text-sm tracking-widest font-medium uppercase">
                                Top {stats.length} Teams
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/40 text-slate-400 text-[10px] md:text-sm uppercase tracking-wider font-semibold border-b border-white/5">
                                        <th className="py-3 px-3 md:py-4 md:px-8 w-12 md:w-24 text-center">Rank</th>
                                        <th className="py-3 px-3 md:py-4 md:px-8">Team</th>
                                        <th className="py-3 px-3 md:py-4 md:px-8 text-center w-16 md:w-32">W-L-T</th>
                                        <th className="py-3 px-3 md:py-4 md:px-8 text-center w-14 md:w-32">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((team, index) => {
                                        const rosterId = rosterMap[team.id];
                                        const displayName = nameMap[team.id] || team.name || `Team ${team.id}`;
                                        const isMyTeam = userRosterIds.some(id => String(id) === String(rosterId));
                                        
                                        return (
                                            <tr key={team.id} className={`border-b border-white/5 transition-colors ${
                                                isMyTeam ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-white/5'
                                            }`}>
                                                <td className="py-3 px-3 md:py-5 md:px-8 text-center">
                                                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-bold ${
                                                        index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                                                        index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                                                        index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50' :
                                                        'bg-white/5 text-slate-400'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 md:py-5 md:px-8">
                                                    <span className={`font-semibold tracking-wide text-xs md:text-base ${isMyTeam ? 'text-red-400' : 'text-slate-200'}`}>
                                                        {displayName}
                                                    </span>
                                                    {isMyTeam && (
                                                        <span className="ml-2 md:ml-3 text-[8px] md:text-[10px] uppercase tracking-wider font-bold text-red-500 bg-red-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm border border-red-500/20">Your Team</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 md:py-5 md:px-8 text-center font-mono text-xs md:text-base text-slate-300">
                                                    {team.stats.wins}-{team.stats.losses}-{team.stats.ties}
                                                </td>
                                                <td className="py-3 px-3 md:py-5 md:px-8 text-center font-bold text-white text-sm md:text-lg">
                                                    {team.stats.points}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Match Schedule — Progressive Rounds */}
                    {(() => {
                        const creatableIds = getCreatableMatchIds(matches);

                        // Group matches by round
                        const roundMap: Record<number, any[]> = {};
                        matches.forEach((m: any) => {
                            const round = Math.abs(m.tournamentRound || 0) || 1;
                            if (!roundMap[round]) roundMap[round] = [];
                            roundMap[round].push(m);
                        });
                        const sortedRounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

                        // Progressive unlock: show a round if:
                        // - It's round 1 (always show), OR
                        // - The previous round has at least one match that's started/complete/has a lobby
                        const visibleRounds: number[] = [];
                        for (let i = 0; i < sortedRounds.length; i++) {
                            const round = sortedRounds[i];
                            if (i === 0) {
                                visibleRounds.push(round);
                                continue;
                            }
                            const prevRound = sortedRounds[i - 1];
                            const prevMatches = roundMap[prevRound] || [];
                            const prevHasActivity = prevMatches.some((m: any) =>
                                m.state === 'complete' || activeMatches[m.id]
                            );
                            if (prevHasActivity) {
                                visibleRounds.push(round);
                            }
                        }

                        return (
                            <div>
                                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 px-2">
                                    <LayoutList className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                                    <h3 className="text-sm md:text-xl font-bold font-outfit tracking-wider text-white uppercase">Match Schedule</h3>
                                </div>
                                <div className="space-y-8">
                                    {visibleRounds.map(round => (
                                        <div key={round}>
                                            <div className="flex items-center gap-2 mb-4 px-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                                <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em]">Round {round}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {roundMap[round].map(m => renderMatchCard(m, creatableIds.has(String(m.id))))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            );
        }

        // ============================================
        // SE / DE — Challonge Embedded Iframe + Match List
        // ============================================
        const safeTournamentUrl = isSafeTournamentSlug(tournamentUrl) ? tournamentUrl : '';
        const challongeEmbedUrl = `https://challonge.com/${safeTournamentUrl}/module?theme=2&show_final_results=1`;

        const creatableIds = getCreatableMatchIds(matches);

        // Separate open/live matches for the action panel
        const actionableMatches = matches.filter((m: any) => {
            const isOpen = m.state === 'SCHEDULED' || m.state === 'open' || m.state === 'pending';
            const hasLobby = !!activeMatches[m.id];
            const topRosterId = rosterMap[m.participants[0]?.id];
            const bottomRosterId = rosterMap[m.participants[1]?.id];
            const allMyIds = [...new Set([...captainRosterIds, ...userRosterIds])];
            const isPlayerInMatch = Boolean(allMyIds.length > 0 && (allMyIds.includes(topRosterId!) || allMyIds.includes(bottomRosterId!)));
            // Show if: it's the creatable match, has a live lobby, or player is in an open match
            return creatableIds.has(String(m.id)) || hasLobby || (isOpen && isPlayerInMatch && m.participants[0]?.id && m.participants[1]?.id);
        });

        return (
            <div className="w-full space-y-6">
                {/* Challonge Bracket Embed */}
                <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-white/5 to-transparent border-b border-white/5">
                        <Trophy size={14} className="text-yellow-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Bracket</span>
                    </div>
                    {/* Clip container: hides the "Powered by Challonge" footer at the bottom */}
                    <div className="overflow-hidden" style={{ height: '500px' }}>
                        <iframe
                            src={challongeEmbedUrl}
                            width="100%"
                            height="540"
                            frameBorder="0"
                            scrolling="auto"
                            allowTransparency={true}
                            className="w-full"
                            style={{ background: '#050b14', marginBottom: '-40px' }}
                            title="Tournament Bracket"
                        />
                    </div>
                </div>

                {/* Your Matches Panel (only show if there are actionable matches) */}
                {actionableMatches.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <Swords className="w-5 h-5 text-sky-400" />
                            <h3 className="text-sm font-bold font-outfit tracking-wider text-white uppercase">Your Matches</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {actionableMatches.map(m => renderMatchCard(m, creatableIds.has(String(m.id))))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-full bg-gradient-to-b from-[#060c17] to-[#050b14] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden p-4">
            {/* Decorative background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl" />
            </div>

            {/* Refresh Button */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); handleRefreshBracket(); }}
                    className="p-2.5 bg-black/60 border border-white/10 hover:border-white/30 rounded-xl text-slate-400 hover:text-white transition-all backdrop-blur-sm shadow-lg"
                    title="Refresh Bracket"
                >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                {isRefreshing && (
                    <span className="text-red-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                        Syncing...
                    </span>
                )}
            </div>

            <div className="relative z-10">
                {renderBracketOrStandings()}
            </div>
        </div>
    );
};
