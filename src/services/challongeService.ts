import { supabase } from '../lib/supabase';

// We use our Supabase Edge Function to securely retrieve Challonge data.
// The Edge Function implicitly holds the `CHALLONGE_API_KEY` internally via Supabase Secrets.


export const fetchParticipants = async (tournamentId: string) => {
    // v2.1 URL path
    const endpoint = `/tournaments/${tournamentId}/participants`;
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { endpoint, method: 'GET' }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }

    const v2Data = data?.data || [];

    // Challonge v2.1 drops the group_player_ids array which maps match IDs to participant IDs.
    // We seamlessly fetch the v1 data right here and merge it into the v2 participant objects.
    try {
        const v1Endpoint = `/v1/tournaments/${tournamentId}/participants.json`;
        const { data: v1Data, error: v1Error } = await supabase.functions.invoke('challonge-proxy', {
            body: { endpoint: v1Endpoint, method: 'GET' }
        });
        
        if (!v1Error && Array.isArray(v1Data)) {
            v2Data.forEach((p: any) => {
                const v1Match = v1Data.find((v1: any) => v1.participant?.id?.toString() === p.id?.toString());
                if (v1Match && v1Match.participant?.group_player_ids) {
                    p.group_player_ids = v1Match.participant.group_player_ids;
                }
            });
        }
    } catch (e) {
        console.warn('Silent fail fetching v1 participant mappings', e);
    }

    // Return the data array internally wrapped by JSON:API
    return v2Data;
};

export const fetchOpenMatches = async (tournamentId: string) => {
    // Reverting to v1 API specifically to recover `prerequisite_match_ids` which are stripped in JSON:API v2.1
    // The @g-loot frontend library requires these explicit node mappings to draw the upper/lower trees perfectly.
    const timestamp = new Date().getTime();
    const endpoint = `/v1/tournaments/${tournamentId}/matches.json?state=all&_=${timestamp}`; // Fetch all states to calculate final rounds properly
    
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { endpoint, method: 'GET' }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }
    // Return the v1 array
    return data || [];
};

export const reportMatchScore = async (
    tournamentId: string,
    matchId: string,
    winnerId: string,
    winnerScore: string,
    loserId: string,
    loserScore: string
) => {
    // v2.1 URL path
    const endpoint = `/tournaments/${tournamentId}/matches/${matchId}`;
    
    // v2.1 JSON:API payload — both participants must be included
    const payload = {
        data: {
            type: "Match",
            attributes: {
                match: [
                    {
                        participant_id: winnerId,
                        score_set: winnerScore, 
                        advancing: true
                    },
                    {
                        participant_id: loserId,
                        score_set: loserScore,
                        advancing: false
                    }
                ]
            }
        }
    };

    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    });



    if (error) {
        throw new Error(`Edge Function Error Updating Match: ${error.message}`);
    }
    
    return data?.data;
};

export const finalizeTournament = async (tournamentId: string) => {
    // v2.1 URL path is changed to PUT on state
    const endpoint = `/tournaments/${tournamentId}/change_state`;
    
    const payload = {
        data: {
            type: "TournamentState",
            attributes: {
                state: "finalize"
            }
        }
    };

    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }
    
    return data?.data;
};

export const createTournament = async (tournamentData: { name: string, url: string, tournamentType: string, groupStagesEnabled: boolean, groupSize?: number, advancePerGroup?: number }) => {
    const endpoint = '/tournaments';
    
    // JSON:API Tournament Creation Structure
    const payload: any = {
        data: {
            type: "tournament",
            attributes: {
                name: tournamentData.name,
                url: tournamentData.url,
                tournament_type: tournamentData.tournamentType,
                group_stage_enabled: tournamentData.groupStagesEnabled
            }
        }
    };

    if (tournamentData.tournamentType === 'round robin') {
        payload.data.attributes.round_robin_options = {
            iterations: 1,
            ranking: "match wins"
        };
    }

    // Only send group_stage_enabled flag at creation time.
    // Do NOT send group_stage_options here — Challonge v2.1 API has strict validation
    // (powers of 2 for advance count, ranked_by must be filled, etc.) that conflicts
    // with flexible configuration. Group stage settings will use Challonge defaults
    // (4 per group, top 2 advance, round robin) and can be adjusted:
    // 1. Via the Challonge website tournament settings page
    // 2. Via the Advanced Options modal (PUT update after creation)
    // 3. Via the moderator panel in TournamentView before starting



    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'POST',
            body: JSON.stringify(payload)
        }
    });



    if (error) {
        // Because Supabase Client intercepts HTTP 4xx/5xx and scrubs the payload,
        // we first check if there is a context or response payload attached.
        if (error.context && error.context.errors) {
             throw new Error(`Challonge Validation Error: ${JSON.stringify(error.context.errors)}`);
        }
        if (error.message && error.message.includes('non-2xx')) {
            const status = error.context?.status || 'Unknown';
            if (status === 422 || status === '422') {
                throw new Error(`Challonge rejected the request. Status 422. Please verify the URL is not taken and options are valid.`);
            } else if (status === 401 || status === '401') {
                throw new Error(`Edge Function returned 401 Unauthorized. The CHALLONGE_API_KEY secret in Supabase may be invalid or expired.`);
            }
            throw new Error(`Edge Function Error (Status ${status}): Challonge proxy request failed.`);
        }
        throw new Error(error.message || "Failed to initialize tournament on Challonge.");
    }
    
    // Challonge returns 422 if URL taken inside the payload (if proxied perfectly)
    if (responseData && responseData.errors) {
        throw new Error(`Challonge Validation Error: ${JSON.stringify(responseData.errors)}`);
    }

    return responseData?.data;
};

export const registerParticipant = async (tournamentUrl: string, rosterName: string) => {
    const endpoint = `/tournaments/${tournamentUrl}/participants`;
    
    const payload = {
        data: {
            type: "Participant",
            attributes: {
                name: rosterName
            }
        }
    };

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'POST',
            body: JSON.stringify(payload)
        }
    });

    if (error) {
        throw new Error(error.message || "Failed to register team on Challonge.");
    }
    
    if (responseData && responseData.errors) {
        throw new Error(`Challonge Validation Error: ${JSON.stringify(responseData.errors)}`);
    }

    // In JSON:API, ID is at the top level of the data object
    return responseData?.data?.id;
};

export const startTournament = async (tournamentUrl: string) => {
    // v2.1 URL path is changed to PUT on state
    const endpoint = `/tournaments/${tournamentUrl}/change_state`;

    const payload = {
        data: {
            type: "TournamentState",
            attributes: {
                state: "start"
            }
        }
    };

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    });

    if (error) {
        throw new Error(error.message || "Failed to start tournament on Challonge.");
    }
    
    return responseData?.data;
};

// ===== Group Stage Functions (v2.1) =====

export const fetchTournamentDetails = async (tournamentUrl: string) => {
    const endpoint = `/tournaments/${tournamentUrl}`;
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { endpoint, method: 'GET' }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }
    return data?.data;
};

export const startGroupStage = async (tournamentUrl: string) => {
    const endpoint = `/tournaments/${tournamentUrl}/change_state`;
    const payload = {
        data: {
            type: "TournamentState",
            attributes: {
                state: "start_group_stage"
            }
        }
    };

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    });

    if (error) {
        throw new Error(error.message || "Failed to start group stage on Challonge.");
    }
    return responseData?.data;
};

export const finalizeGroupStage = async (tournamentUrl: string) => {
    const endpoint = `/tournaments/${tournamentUrl}/change_state`;
    const payload = {
        data: {
            type: "TournamentState",
            attributes: {
                state: "finalize_group_stage"
            }
        }
    };

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    });

    if (error) {
        throw new Error(error.message || "Failed to finalize group stage on Challonge.");
    }
    return responseData?.data;
};

export const randomizeParticipants = async (tournamentUrl: string) => {
    // Fetch all participants via v2.1
    const endpoint = `/tournaments/${tournamentUrl}/participants`;
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { endpoint, method: 'GET' }
    });

    if (error) {
        throw new Error(error.message || "Failed to fetch participants for seeding.");
    }

    const participants = data?.data || [];
    if (participants.length === 0) {
        throw new Error("No participants found to shuffle.");
    }

    // Fisher-Yates shuffle to generate random seed order
    const seeds = participants.map((_: any, i: number) => i + 1);
    for (let i = seeds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
    }

    // Update each participant's seed via v2.1 PUT
    const updatePromises = participants.map((p: any, idx: number) => {
        const updateEndpoint = `/tournaments/${tournamentUrl}/participants/${p.id}`;
        const payload = {
            data: {
                type: "Participant",
                attributes: {
                    seed: seeds[idx]
                }
            }
        };
        return supabase.functions.invoke('challonge-proxy', {
            body: {
                endpoint: updateEndpoint,
                method: 'PUT',
                body: JSON.stringify(payload)
            }
        });
    });

    const results = await Promise.all(updatePromises);
    const failed = results.filter(r => r.error);
    if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} participant seed(s).`);
    }

    return results.map(r => r.data);
};

export const toggleGroupStage = async (
    tournamentUrl: string, 
    enabled: boolean
) => {
    const endpoint = `/tournaments/${tournamentUrl}`;
    const payload = {
        data: {
            type: "tournament",
            attributes: {
                group_stage_enabled: enabled,
            }
        }
    };



    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: JSON.stringify(payload)
        }
    });



    if (error) {
        throw new Error(error.message || "Failed to toggle group stage on Challonge.");
    }
    if (responseData?.errors) {
        throw new Error(`Challonge Error: ${JSON.stringify(responseData.errors)}`);
    }
    return responseData?.data;
};
