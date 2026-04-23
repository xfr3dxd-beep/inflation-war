import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CustomBracket } from './CustomBracket';
import { ArrowLeft, Trophy, Crown, X, AlertTriangle, RotateCcw, Settings, Users, Terminal, MonitorPlay, ChevronRight, RefreshCw, Loader2, Trash2, Shuffle } from 'lucide-react';
import { fetchParticipants, finalizeTournament, startTournament, fetchOpenMatches, startGroupStage, finalizeGroupStage, fetchTournamentDetails, randomizeParticipants, toggleGroupStage } from '../services/challongeService';
import toast from 'react-hot-toast';
import { confirmToast } from '../utils/confirmToast';

const TournamentPodium = ({ podiumData, tournament }: { podiumData: any[], tournament: any }) => {
    const renderRank = (rank: number, label: string, colorClass: string, iconColor: string, prizeStr: string | null) => {
        const teams = podiumData.filter(p => p.rank === rank);
        if (teams.length === 0) return null;
        
        const isFirst = rank === 1;
        
        return (
            <div className={`flex flex-col items-center gap-3 p-6 rounded-3xl bg-black/40 border ${colorClass} backdrop-blur-md shadow-2xl flex-1 w-full max-w-[320px] relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <div className={`p-4 rounded-full bg-black/80 border ${colorClass} relative z-10 shadow-inner`}>
                    <Trophy size={isFirst ? 56 : 40} className={`${iconColor} ${isFirst ? 'drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]' : ''}`} />
                </div>
                <h3 className={`font-black tracking-widest uppercase text-sm md:text-base ${iconColor} relative z-10`}>{label}</h3>
                
                <div className="flex flex-col gap-3 w-full mt-2 relative z-10">
                    {teams.map(team => (
                        <div key={team.id} className="bg-[#050b14]/80 border border-white/10 px-5 py-4 rounded-2xl flex flex-col items-center text-center shadow-lg">
                            <span className={`font-black tracking-wider ${isFirst ? 'text-lg text-white' : 'text-base text-slate-200'}`}>{team.name}</span>
                            {team.tag && <span className="text-slate-500 font-bold text-xs mt-1">[{team.tag}]</span>}
                        </div>
                    ))}
                </div>
                
                {prizeStr && (
                    <div className="mt-4 px-5 py-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-400 font-black tracking-widest text-sm text-center w-full relative z-10 shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2">
                        <Crown size={16} /> {prizeStr}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col items-center mt-2 mb-16 animate-slide-up">
            <div className="flex items-center gap-4 mb-10">
                <div className="h-[2px] w-12 md:w-32 bg-gradient-to-r from-transparent to-yellow-500/50"></div>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-[0.2em] uppercase text-center flex items-center gap-3 drop-shadow-2xl">
                    <Crown className="text-yellow-500" size={32} /> TOURNAMENT PODIUM <Crown className="text-yellow-500" size={32} />
                </h2>
                <div className="h-[2px] w-12 md:w-32 bg-gradient-to-l from-transparent to-yellow-500/50"></div>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-end justify-center w-full gap-6 md:gap-8 px-4">
                <div className="order-2 md:order-1 flex justify-center w-full md:w-auto">
                    {renderRank(2, "Silver Medalist", "border-slate-300/60 bg-gradient-to-b from-slate-400/10 to-transparent", "text-slate-300", tournament?.prize_2nd)}
                </div>
                <div className="order-1 md:order-2 flex justify-center w-full md:w-auto mb-0 md:mb-8 z-10">
                    {renderRank(1, "Grand Champion", "border-yellow-400/80 bg-gradient-to-b from-yellow-500/20 to-transparent shadow-[0_0_50px_rgba(234,179,8,0.2)]", "text-yellow-400", tournament?.prize_1st)}
                </div>
                <div className="order-3 md:order-3 flex justify-center w-full md:w-auto">
                    {renderRank(3, "Bronze Medalist", "border-amber-700/60 bg-gradient-to-b from-amber-700/10 to-transparent", "text-amber-600", tournament?.prize_3rd)}
                </div>
            </div>
        </div>
    );
};

export const TournamentView: React.FC = () => {
    const { challongeUrl } = useParams<{ challongeUrl: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [profile, setProfile] = useState<any>(null);
    const [tournament, setTournament] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [podiumData, setPodiumData] = useState<any[]>([]);
    
    // Moderator feature state
    const [confirmText, setConfirmText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Phase 32: Moderator Control Panel State
    const [showModPanel, setShowModPanel] = useState(false);
    const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [challongeState, setChallongeState] = useState<string>('');
    const [isSeeded, setIsSeeded] = useState(false);
    const [isTogglingGroups, setIsTogglingGroups] = useState(false);

    useEffect(() => {
        if (!challongeUrl) return;
        
        const fetchViewData = async () => {
            setLoading(true);
            
            // 1. Fetch Profile Role
            if (user?.id) {
                const { data: pData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setProfile(pData);
            }
            
            // 2. Fetch Tournament
            await fetchTournamentData();
            
            setLoading(false);
        };
        fetchViewData();

        // Realtime: watch this tournament for live updates — StrictMode safe
        let isMounted = true;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const timer = setTimeout(() => {
            if (!isMounted) return;
            channel = supabase.channel(`tournament-view-${challongeUrl}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'tournaments', filter: `challonge_url=eq.${challongeUrl}` },
                    (payload) => {
                        if (payload.eventType === 'DELETE') {
                            toast.error('This tournament has been deleted.');
                            navigate('/tournaments');
                        } else {
                            fetchTournamentData();
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('[TournamentView] Realtime subscription status:', status);
                });
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (channel) supabase.removeChannel(channel);
        };
    }, [user, challongeUrl]);

    // Fetch registered teams when mod panel opens
    useEffect(() => {
        if (showModPanel && tournament?.id) {
            const fetchTeams = async () => {
                const { data, error } = await supabase
                    .from('tournament_registrations')
                    .select(`
                        roster_id,
                        rosters ( name, tag )
                    `)
                    .eq('tournament_id', tournament.id);
                
                if (data && !error) {
                    setRegisteredTeams(data);
                }
            };
            fetchTeams();

            // Fetch Challonge state for group stage controls
            if (tournament?.group_stages_enabled && tournament?.challonge_url) {
                const fetchState = async () => {
                    try {
                        const details = await fetchTournamentDetails(tournament.challonge_url);
                        setChallongeState(details?.attributes?.state || '');
                    } catch (e) {
                        console.warn('Could not fetch Challonge state:', e);
                    }
                };
                fetchState();
            }
        }
    }, [showModPanel, tournament]);

    const fetchTournamentData = async () => {
        if (!challongeUrl) return;
        const { data } = await supabase.from('tournaments').select('*').eq('challonge_url', challongeUrl).single();
        if (data) {
            setTournament(data);
            
            // Phase 44: Fetch Podium Data if completed
            if (data.status === 'completed') {
                try {
                    const participants = await fetchParticipants(data.challonge_url);
                    const { data: regs } = await supabase.from('tournament_registrations')
                        .select('challonge_participant_id, rosters(name,tag)')
                        .eq('tournament_id', data.id);
                        
                    const podium = participants
                        .filter((p: any) => p?.attributes && [1, 2, 3].includes(p.attributes.final_rank))
                        .map((p: any) => {
                            const pId = p.id.toString();
                            const pAttrs = p.attributes;
                            const reg = regs?.find(r => r.challonge_participant_id === pId);
                            const rosterData = reg?.rosters as any;
                            const name = rosterData?.name || pAttrs.name;
                            const tag = rosterData?.tag || '';
                            return { rank: pAttrs.final_rank, name, tag, id: p.id };
                        });
                    setPodiumData(podium);
                } catch (e) {
                    console.error("Failed to fetch podium data", e);
                }
            }
        }
    };

    const handleFinalizeTournament = async () => {
        if (!tournament?.id || confirmText !== 'CONFIRM') return;
        setIsProcessing(true);
        
        try {
            await finalizeTournament(tournament.challonge_url);
            const participants = await fetchParticipants(tournament.challonge_url);
            // v2.1 JSON:API format: { id, attributes: { final_rank, name, ... } }
            const winner = participants.find((p: any) => p.attributes?.final_rank === 1);
            
            if (winner && winner.id) {
                const { data: registration, error: regError } = await supabase
                    .from('tournament_registrations')
                    .select('roster_id')
                    .eq('tournament_id', tournament.id)
                    .eq('challonge_participant_id', winner.id.toString())
                    .single();
                    
                if (regError || !registration) {
                    throw new Error("Winner registration not found in database matching Challonge ID.");
                }
                
                const { error: rpcError } = await supabase.rpc('conclude_tournament', {
                    p_tournament_id: tournament.id,
                    p_winning_roster_id: registration.roster_id
                });
                
                if (rpcError) throw rpcError;
            } else {
                throw new Error("No 1st place winner found on Challonge Bracket.");
            }
            
            setShowModPanel(false);
            setConfirmText('');
            await fetchTournamentData();
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to finalize tournament: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReopenTournament = async () => {
        if (!tournament?.id) return;
        const confirmReopen = await confirmToast("Are you sure you want to REOPEN this tournament? The Champions snapshot will be permanently deleted and the status will return to 'active'.");
        if (!confirmReopen) return;

        const { error } = await supabase.from('tournaments')
            .update({ status: 'active', winner_snapshot: null })
            .eq('id', tournament.id);

        if (!error) {
            await fetchTournamentData();
        } else {
            toast.error('Failed to reopen tournament: ' + error.message);
        }
    };

    const handleStartTournament = async () => {
        setIsProcessing(true);
        try {
            if (tournament.group_stages_enabled) {
                await toast.promise(
                    (async () => {
                        // Start the group stage
                        await startGroupStage(tournament.challonge_url);
                        const { error } = await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournament.id);
                        if (error) throw error;
                        setChallongeState('group_stages_underway');
                        await fetchTournamentData();
                    })(),
                    { loading: 'Starting group stage...', success: 'Group Stage Started!', error: (err) => err.message || 'Failed to start group stage' }
                );
            } else {
                await toast.promise(
                    (async () => {
                        await startTournament(tournament.challonge_url);
                        const { error } = await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournament.id);
                        if (error) throw error;
                        await fetchTournamentData();
                    })(),
                    { loading: 'Starting Tournament...', success: 'Tournament Started!', error: (err) => err.message || 'Failed to start tournament' }
                );
            }
        } catch { /* toast.promise handles display */ }
        finally { setIsProcessing(false); }
    };

    const handleFinalizeGroupStage = async () => {
        setIsProcessing(true);
        try {
            await toast.promise(
                (async () => {
                    await finalizeGroupStage(tournament.challonge_url);
                    setChallongeState('group_stages_finalized');
                    await fetchTournamentData();
                })(),
                { loading: 'Finalizing Group Stage...', success: 'Group Stage Finalized! Bracket generating...', error: (err) => 'Failed to finalize group stage: ' + err.message }
            );
        } catch { /* toast.promise handles display */ }
        finally { setIsProcessing(false); }
    };

    const handleStartFinalStage = async () => {
        setIsProcessing(true);
        try {
            await toast.promise(
                (async () => {
                    await startTournament(tournament.challonge_url);
                    setChallongeState('underway');
                    await fetchTournamentData();
                })(),
                { loading: 'Starting Final Stage...', success: 'Final Stage Started! Matches are now open.', error: (err) => 'Failed to start final stage: ' + err.message }
            );
        } catch { /* toast.promise handles display */ }
        finally { setIsProcessing(false); }
    };

    const handleSyncMatches = async () => {
        setIsSyncing(true);
        try {
            await toast.promise(
                (async () => {
                    const matches = await fetchOpenMatches(tournament.challonge_url);
                    if (!matches || matches.length === 0) {
                        throw new Error('No open matches found on Challonge.');
                    }
                    await fetchTournamentData();
                    return matches;
                })(),
                { loading: 'Syncing matches from Challonge...', success: (matches) => `Synced ${matches.length} active matches.`, error: (err) => err.message || 'Sync Failed' }
            );
        } catch { /* toast.promise handles display */ }
        finally { setIsSyncing(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050b14] flex items-center justify-center">
                <div className="text-slate-400 animate-pulse font-mono tracking-widest text-xl">ACCESSING ARCHIVES...</div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center p-8">
                <div className="text-red-500 font-mono tracking-widest text-2xl mb-8 border border-red-900 bg-red-950/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">TOURNAMENT DATA CORRUPTED OR MISSING</div>
                <button 
                    onClick={() => navigate('/tournament')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/5 font-bold uppercase tracking-widest text-sm"
                >
                    <ArrowLeft size={16} /> RETURN TO HUB
                </button>
            </div>
        );
    }

    const isCompleted = tournament.status === 'completed';
    const winnerSnap = isCompleted && tournament.winner_snapshot 
        ? (typeof tournament.winner_snapshot === 'string' ? JSON.parse(tournament.winner_snapshot) : tournament.winner_snapshot) 
        : null;

    return (
        <div className="min-h-screen bg-[#050b14] p-4 md:p-8 flex flex-col relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {isCompleted ? (
                    <>
                        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-400/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                    </>
                ) : (
                    <>
                        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                    </>
                )}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Header Tools */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between mb-8 max-w-[1600px] mx-auto w-full gap-4">
                <button 
                    onClick={() => navigate('/tournament')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 font-bold uppercase tracking-widest text-xs self-start md:self-auto"
                >
                    <ArrowLeft size={16} /> ARCHIVE HUB
                </button>
                
                <div className="flex flex-col items-center flex-1 max-w-3xl text-center">
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-2xl capitalize flex items-center gap-4 justify-center">
                        {tournament.title}
                    </h1>
                    {tournament.prize_pool && (
                        <div className="mt-3 text-emerald-400/90 font-bold uppercase tracking-widest text-sm bg-emerald-950/50 border border-emerald-500/20 px-6 py-1.5 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.1)]">
                            PRIZE POOL: {tournament.prize_pool}
                        </div>
                    )}
                </div>
                
                <div className="w-full md:w-auto flex flex-col items-center gap-2">
                    {/* Unified Moderator Control Panel Trigger */}
                    {profile?.role === 'moderator' && (
                        <div className="flex gap-3">
                            {tournament.status === 'upcoming' && (
                                <button
                                    onClick={async () => {
                                        setIsProcessing(true);
                                        try {
                                            await toast.promise(
                                                (async () => {
                                                    await randomizeParticipants(tournament.challonge_url);
                                                    setIsSeeded(true);
                                                })(),
                                                { loading: 'Randomizing...', success: 'Shuffled!', error: 'Failed' }
                                            );
                                        } catch { }
                                        finally { setIsProcessing(false); }
                                    }}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 bg-violet-900/40 border border-violet-500/50 hover:bg-violet-700/60 hover:border-violet-400 text-violet-200 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg transition-all hover:scale-105"
                                >
                                    <Shuffle size={14} /> SHUFFLE BRACKET
                                </button>
                            )}
                            <button 
                                onClick={() => setShowModPanel(true)}
                                className="flex items-center gap-2 bg-slate-800/40 border border-slate-500/50 hover:bg-slate-700/60 hover:border-slate-400 text-slate-200 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(100,116,139,0.2)] transition-all hover:scale-105"
                            >
                                <Settings size={14} className="animate-spin-slow" /> MOD PANEL
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Container */}
            <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col relative z-10 animate-fade-in gap-8">
                
                {/* 🌟 The New Podium (Phase 44) 🌟 */}
                {isCompleted && podiumData.length > 0 && (
                    <TournamentPodium podiumData={podiumData} tournament={tournament} />
                )}

                {/* 🌟 The Museum Banner 🌟 */}
                {isCompleted && winnerSnap && (
                    <div className="w-full rounded-2xl overflow-hidden border border-yellow-500/40 bg-gradient-to-br from-yellow-950/80 via-[#1a1400] to-yellow-950/40 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative animate-slide-up">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Trophy size={200} className="text-yellow-500" />
                        </div>
                        
                        <div className="relative z-10 p-6 md:p-10 flex flex-col items-center text-center">
                            <div className="p-4 bg-yellow-500/10 rounded-full mb-6 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                <Trophy size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                            </div>
                            
                            <h2 className="text-yellow-500 font-mono tracking-[0.3em] font-black uppercase text-sm md:text-base mb-2 drop-shadow-lg">
                                OFFICIAL TOURNAMENT CHAMPIONS
                            </h2>
                            <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 drop-shadow-2xl">
                                {winnerSnap.roster_name} <span className="text-yellow-500/60 font-normal">[{winnerSnap.roster_tag}]</span>
                            </h3>

                            {/* Roster Players List */}
                            {winnerSnap.players && winnerSnap.players.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    {winnerSnap.players.map((p: any) => (
                                        <div key={p.user_id} className="bg-black/40 border border-yellow-500/20 px-4 py-2 rounded-xl flex items-center gap-2 backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                            <Crown size={14} className="text-yellow-500/70" />
                                            <span className="text-yellow-100 font-bold tracking-wider">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Embedded Bracket Container */}
                <div className="w-full min-h-[85vh] rounded-2xl overflow-visible border border-white/5 shadow-2xl relative bg-[#0a101f]">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none opacity-50"></div>
                    <div className="relative z-10 w-full h-full">
                        <CustomBracket 
                            tournamentUrl={tournament.challonge_url} 
                            isModerator={profile?.role === 'moderator'}
                        />
                    </div>
                </div>

            </div>

            {/* 🌟 Moderator Control Panel Modal 🌟 */}
            {profile?.role === 'moderator' && showModPanel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModPanel(false)}></div>
                    <div className="relative bg-[#0a101f]/90 border border-slate-500/30 rounded-2xl w-full max-w-4xl shadow-[0_0_50px_rgba(148,163,184,0.15)] flex flex-col max-h-[90vh] overflow-hidden animate-slide-up backdrop-blur-xl">
                        
                        {/* Panel Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-widest drop-shadow-md">
                                    <Settings className="text-slate-400" size={24} /> OMNI-CONTROL PANEL
                                </h2>
                                <p className="text-sm font-bold tracking-widest text-slate-500 mt-1 uppercase">
                                    SYS-STATUS: <span className={tournament.status === 'active' ? 'text-blue-400' : tournament.status === 'upcoming' ? 'text-purple-400' : 'text-yellow-500'}>{tournament.status}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowModPanel(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={28} />
                            </button>
                        </div>
                        
                        {/* Two Column Layout Grid */}
                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 custom-scrollbar">
                            
                            {/* Section 1: Roster List */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                                    <Users size={16} className="text-blue-400" /> REGISTERED TEAMS ({registeredTeams.length})
                                </h3>
                                
                                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {registeredTeams.length === 0 ? (
                                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center text-slate-500 font-mono tracking-widest text-xs">
                                            NO TEAMS REGISTERED YET
                                        </div>
                                    ) : (
                                        registeredTeams.map(reg => (
                                            <div key={reg.roster_id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                                                <span className="font-bold text-slate-200">{reg.rosters.name}</span>
                                                <span className="text-xs font-black tracking-widest text-slate-500 bg-white/5 px-2 py-1 rounded">
                                                    [{reg.rosters.tag}]
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            
                            {/* Section 2: Command Actions */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                                    <Terminal size={16} className="text-emerald-400" /> SYSTEM OVERRIDES
                                </h3>
                                
                                <div className="flex flex-col gap-3">
                                    {/* GROUP STAGE CONFIG — only when upcoming and has group stages */}
                                    {tournament.status === 'upcoming' && (
                                        <div className="p-4 border border-fuchsia-500/20 bg-fuchsia-950/20 rounded-xl">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={tournament.group_stages_enabled}
                                                        disabled={isTogglingGroups}
                                                        onChange={async (e) => {
                                                            const newValue = e.target.checked;
                                                            setIsTogglingGroups(true);
                                                            try {
                                                                await toast.promise(
                                                                    (async () => {
                                                                        await toggleGroupStage(tournament.challonge_url, newValue);
                                                                        // Update local DB
                                                                        await supabase.from('tournaments').update({ group_stages_enabled: newValue }).eq('id', tournament.id);
                                                                        await fetchTournamentData();
                                                                    })(),
                                                                    { loading: newValue ? 'Enabling group stages...' : 'Disabling group stages...', success: newValue ? 'Group stages enabled!' : 'Group stages disabled!', error: (err) => err.message || 'Failed' }
                                                                );
                                                            } catch { /* handled by toast */ }
                                                            finally { setIsTogglingGroups(false); }
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className={`w-5 h-5 border-2 rounded transition-colors ${tournament.group_stages_enabled ? 'bg-fuchsia-500 border-fuchsia-500' : 'border-slate-600 bg-black'} ${isTogglingGroups ? 'opacity-50' : ''}`}></div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-xs tracking-widest uppercase">GROUP STAGES</span>
                                                    <span className="text-slate-500 text-[10px]">Two-stage: Groups → Bracket</span>
                                                </div>
                                                {isTogglingGroups && <Loader2 size={14} className="animate-spin text-fuchsia-400 ml-auto" />}
                                            </label>
                                        </div>
                                    )}

                                    {/* SEED / RANDOMIZE PARTICIPANTS — only when upcoming */}
                                    {tournament.status === 'upcoming' && (
                                        <button
                                            onClick={async () => {
                                                setIsProcessing(true);
                                                try {
                                                    await toast.promise(
                                                        (async () => {
                                                            await randomizeParticipants(tournament.challonge_url);
                                                            setIsSeeded(true);
                                                        })(),
                                                        { loading: 'Randomizing participant seeding...', success: 'Participants shuffled and seeded!', error: (err) => err.message || 'Failed to seed' }
                                                    );
                                                } catch { /* handled by toast */ }
                                                finally { setIsProcessing(false); }
                                            }}
                                            disabled={isProcessing || isSeeded}
                                            className={`w-full flex items-center justify-between p-4 rounded-xl transition-all font-black tracking-widest text-sm group disabled:opacity-50 ${
                                                isSeeded
                                                    ? 'bg-emerald-900/30 border border-emerald-500/40 text-emerald-300'
                                                    : 'bg-violet-900/20 border border-violet-500/30 hover:bg-violet-800/40 hover:border-violet-400 text-violet-100 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                                            }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Shuffle size={18} className={isSeeded ? 'text-emerald-500' : 'group-hover:scale-110 transition-transform text-violet-500'} />
                                                {isSeeded ? '✓ BRACKET SHUFFLED' : 'SHUFFLE & SEED BRACKET'}
                                            </span>
                                            {!isSeeded && <ChevronRight size={16} className="opacity-50" />}
                                        </button>
                                    )}

                                    {/* START */}
                                    {tournament.status === 'upcoming' && (
                                        <button 
                                            onClick={handleStartTournament}
                                            disabled={isProcessing || (tournament.group_stages_enabled && !isSeeded)}
                                            className="w-full flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-500/30 hover:bg-emerald-800/40 hover:border-emerald-400 text-emerald-100 rounded-xl transition-all font-black tracking-widest text-sm shadow-[0_0_15px_rgba(52,211,153,0.1)] group disabled:opacity-50"
                                        >
                                            <span className="flex items-center gap-3"><MonitorPlay size={18} className="group-hover:scale-110 transition-transform text-emerald-500" /> START TOURNAMENT</span>
                                            {tournament.group_stages_enabled && !isSeeded && (
                                                <span className="text-[9px] text-amber-400 font-normal tracking-normal normal-case">Seed first</span>
                                            )}
                                            {!(tournament.group_stages_enabled && !isSeeded) && <ChevronRight size={16} className="opacity-50" />}
                                        </button>
                                    )}
                                    
                                    {/* SYNC MATCHES */}
                                    {tournament.status === 'active' && (
                                        <button 
                                            onClick={handleSyncMatches}
                                            disabled={isSyncing}
                                            className="w-full flex items-center justify-between p-4 bg-blue-900/20 border border-blue-500/30 hover:bg-blue-800/40 hover:border-blue-400 text-blue-100 rounded-xl transition-all font-black tracking-widest text-sm shadow-[0_0_15px_rgba(59,130,246,0.1)] group disabled:opacity-50"
                                        >
                                            <span className="flex items-center gap-3">
                                                <RefreshCw size={18} className={`text-blue-500 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> 
                                                {isSyncing ? 'SYNCING MATRIX...' : 'SYNC ALL MATCHES'}
                                            </span>
                                            <ChevronRight size={16} className="opacity-50" />
                                        </button>
                                    )}

                                    {/* GROUP STAGE CONTROLS */}
                                    {tournament.group_stages_enabled && challongeState === 'group_stages_underway' && (
                                        <button 
                                            onClick={handleFinalizeGroupStage}
                                            disabled={isProcessing}
                                            className="w-full flex items-center justify-between p-4 bg-amber-900/20 border border-amber-500/30 hover:bg-amber-800/40 hover:border-amber-400 text-amber-100 rounded-xl transition-all font-black tracking-widest text-sm shadow-[0_0_15px_rgba(245,158,11,0.1)] group disabled:opacity-50"
                                        >
                                            <span className="flex items-center gap-3">
                                                <Trophy size={18} className="group-hover:scale-110 transition-transform text-amber-500" />
                                                FINALIZE GROUP STAGE
                                            </span>
                                            <ChevronRight size={16} className="opacity-50" />
                                        </button>
                                    )}

                                    {/* START FINAL STAGE */}
                                    {tournament.group_stages_enabled && challongeState === 'group_stages_finalized' && tournament.status === 'active' && (
                                        <button 
                                            onClick={handleStartFinalStage}
                                            disabled={isProcessing}
                                            className="w-full flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-500/30 hover:bg-emerald-800/40 hover:border-emerald-400 text-emerald-100 rounded-xl transition-all font-black tracking-widest text-sm shadow-[0_0_15px_rgba(52,211,153,0.1)] group disabled:opacity-50 mt-2"
                                        >
                                            <span className="flex items-center gap-3">
                                                <MonitorPlay size={18} className="group-hover:scale-110 transition-transform text-emerald-500" />
                                                START FINAL STAGE
                                            </span>
                                            <ChevronRight size={16} className="opacity-50" />
                                        </button>
                                    )}
                                    
                                    {/* END TOURNAMENT (Migrated from showEndModal) */}
                                    {tournament.status === 'active' && (
                                        <div className="mt-4 p-4 border border-red-500/30 bg-red-950/30 rounded-xl flex flex-col gap-3">
                                            <h4 className="text-red-400 font-black text-xs tracking-widest uppercase flex items-center gap-2">
                                                <AlertTriangle size={14} /> FINALIZE BRACKET
                                            </h4>
                                            <input
                                                type="text"
                                                value={confirmText}
                                                onChange={(e) => setConfirmText(e.target.value)}
                                                placeholder="Type CONFIRM"
                                                className="w-full bg-black/60 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 transition-colors font-mono tracking-widest text-sm"
                                            />
                                            <button 
                                                onClick={() => { handleFinalizeTournament(); setShowModPanel(false); }}
                                                disabled={confirmText !== 'CONFIRM' || isProcessing}
                                                className="w-full flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all font-black tracking-widest text-xs shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50"
                                            >
                                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />} CONCLUDE TOURNAMENT
                                            </button>
                                        </div>
                                    )}
                                    
                                    {/* POST-COMPLETION OVERRIDES */}
                                    {tournament.status === 'completed' && (
                                        <>
                                            <button 
                                                onClick={() => { handleReopenTournament(); setShowModPanel(false); }}
                                                disabled={isProcessing}
                                                className="w-full flex items-center justify-between p-4 bg-orange-900/20 border border-orange-500/30 hover:bg-orange-800/40 hover:border-orange-400 text-orange-100 rounded-xl transition-all font-black tracking-widest text-sm group disabled:opacity-50"
                                            >
                                                <span className="flex items-center gap-3"><RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500 text-orange-500" /> REOPEN BRACKET</span>
                                                <ChevronRight size={16} className="opacity-50" />
                                            </button>
                                            
                                            {/* Future VOID Implementation Setup */}
                                            <button 
                                                onClick={() => toast('Void logic pending...', { icon: '⚠️' })}
                                                disabled={isProcessing}
                                                className="w-full flex items-center justify-between p-4 bg-red-900/10 border border-red-500/20 hover:bg-red-900/30 hover:border-red-500 text-red-300 rounded-xl transition-all font-black tracking-widest text-sm group opacity-70 hover:opacity-100 disabled:opacity-50"
                                            >
                                                <span className="flex items-center gap-3"><Trash2 size={18} className="text-red-500" /> VOID TOURNAMENT</span>
                                                <ChevronRight size={16} className="opacity-50" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
