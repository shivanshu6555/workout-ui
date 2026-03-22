import axios from 'axios';

const SYNC_KEY = 'workout_offline_sets';

// 1. Save a set to local storage if the API call fails
export const saveOfflineSet = (sessionId, setPayload) => {
    const offlineSets = JSON.parse(localStorage.getItem(SYNC_KEY) || '[]');
    // We add a timestamp so we know exactly when you did the set
    offlineSets.push({ sessionId, payload: setPayload, timestamp: Date.now() });
    localStorage.setItem(SYNC_KEY, JSON.stringify(offlineSets));
    console.log("Network down. Set saved locally to offline queue.");
};

// 2. Loop through the queue and send them to the .NET API
export const syncOfflineSets = async () => {
    const offlineSets = JSON.parse(localStorage.getItem(SYNC_KEY) || '[]');
    if (offlineSets.length === 0) return;

    console.log(`Internet reconnected! Attempting to sync ${offlineSets.length} sets...`);
    const remainingSets = [];

    for (const item of offlineSets) {
        try {
            await axios.post(`/api/sessions/${item.sessionId}/sets`, item.payload);
            console.log("Successfully synced an offline set to the database!");
        } catch (error) {
            // If it fails again, keep it in the queue for next time
            console.error("Sync failed, keeping in queue.", error);
            remainingSets.push(item);
        }
    }

    // Update local storage to only hold the sets that failed to sync
    localStorage.setItem(SYNC_KEY, JSON.stringify(remainingSets));
};

// 3. Tell the browser to listen for the "I have internet again" event
window.addEventListener('online', syncOfflineSets);