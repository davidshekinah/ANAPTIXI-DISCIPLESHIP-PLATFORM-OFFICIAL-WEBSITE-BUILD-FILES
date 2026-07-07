/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - PRAYER TAB SCRIPT
 * File: prayer.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. AUTHENTICATION & GLOBAL VARIABLES
    // ==========================================
    const activeUser = JSON.parse(localStorage.getItem('anaptixi_active_user'));
    if (!activeUser) {
        alert("You must be logged in to access the Prayer Tab.");
        window.location.href = 'index.html';
        return;
    }

    // Google Drive Audio IDs (Placeholder IDs - Replace with your 10 actual Drive File IDs)
    const audioDriveIDs = [
        'FILE_ID_1', 'FILE_ID_2', 'FILE_ID_3', 'FILE_ID_4', 'FILE_ID_5',
        'FILE_ID_6', 'FILE_ID_7', 'FILE_ID_8', 'FILE_ID_9', 'FILE_ID_10'
    ];
    let backgroundAudio = new Audio();
    
    // Timer State
    let prayerInterval;
    let secondsElapsed = 0;
    let isPrayerActive = false;
    let isPrayerComplete = false;
    let activePrayerType = null; // 'scheduled' or 'freewill'
    const SCHEDULED_TARGET_SECONDS = 300; // 5 minutes

    // DOM Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabs = document.querySelectorAll('.sub-tab-content');

    // Scheduled Prayer Elements
    const scheduledBtn = document.getElementById('btn-scheduled-prayer');
    const scheduledTimerDisplay = document.getElementById('scheduled-timer');
    const hourGridContainer = document.getElementById('hour-grid');

    // Free-Will Elements
    const freewillBtn = document.getElementById('btn-freewill-prayer');
    const freewillTimerDisplay = document.getElementById('freewill-timer');

    // ==========================================
    // 2. SUB-TAB SWITCHING & TAB LOCKING
    // ==========================================
    function switchSubTab(tabId) {
        if (isPrayerActive) {
            alert("Please complete or halt your current prayer session before switching tabs.");
            return;
        }
        subTabs.forEach(tab => tab.style.display = 'none');
        subTabBtns.forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(tabId).style.display = 'block';
        document.querySelector(`[data-target="${tabId}"]`).classList.add('active');
    }

    subTabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchSubTab(e.target.dataset.target);
        });
    });

    function toggleNavigationLock(lock) {
        const elementsToLock = [...navLinks, ...subTabBtns];
        elementsToLock.forEach(el => {
            if (lock) {
                el.classList.add('locked');
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.5';
            } else {
                el.classList.remove('locked');
                el.style.pointerEvents = 'auto';
                el.style.opacity = '1';
            }
        });
    }

    // ==========================================
    // 3. AUDIO MANAGEMENT (CDN BYPASS)
    // ==========================================
    function startAudioIfRequested() {
        const wantsAudio = confirm("Would you like to play background sound during your prayer?");
        if (wantsAudio) {
            const randomID = audioDriveIDs[Math.floor(Math.random() * audioDriveIDs.length)];
            // Dynamic URL routing through Google's User Content CDN
            backgroundAudio.src = `https://drive.googleusercontent.com/download?id=${randomID}&export=download`;
            backgroundAudio.loop = true;
            backgroundAudio.play().catch(err => console.log("Audio play blocked by browser:", err));
        }
    }

    function stopAudio() {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
    }

    // ==========================================
    // 4. SCHEDULED PRAYER LOGIC
    // ==========================================
    function formatTime(totalSeconds, isCountdown = false) {
        let displaySeconds = isCountdown ? Math.max(0, SCHEDULED_TARGET_SECONDS - totalSeconds) : totalSeconds;
        const m = Math.floor(displaySeconds / 60).toString().padStart(2, '0');
        const s = (displaySeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function handleScheduledPrayerClick() {
        if (!isPrayerActive) {
            // START PRAYER
            isPrayerActive = true;
            isPrayerComplete = false;
            activePrayerType = 'scheduled';
            secondsElapsed = 0;
            
            toggleNavigationLock(true);
            scheduledBtn.textContent = "Halt Prayer";
            scheduledBtn.classList.add('btn-halt');
            
            startAudioIfRequested();

            prayerInterval = setInterval(() => {
                secondsElapsed++;
                scheduledTimerDisplay.textContent = formatTime(secondsElapsed, true);

                if (secondsElapsed === SCHEDULED_TARGET_SECONDS) {
                    // TIMER COMPLETE
                    isPrayerComplete = true;
                    stopAudio(); // Alert user to stop praying
                    scheduledBtn.textContent = "Stop Praying and Record Session";
                    scheduledBtn.classList.remove('btn-halt');
                    scheduledBtn.classList.add('btn-record');
                }
            }, 1000);

        } else if (isPrayerActive && !isPrayerComplete) {
            // HALT PRAYER
            const confirmHalt = confirm("Your Prayer isn't complete yet, are you sure you want to halt? Note that it won't be recorded and this hour would still be left as null.");
            if (confirmHalt) {
                resetPrayerState();
            }
        } else if (isPrayerActive && isPrayerComplete) {
            // STOP AND RECORD PRAYER
            recordSession('scheduled', SCHEDULED_TARGET_SECONDS);
            resetPrayerState();
            updateHourGrid(); // Mark hour as green
        }
    }

    if (scheduledBtn) scheduledBtn.addEventListener('click', handleScheduledPrayerClick);

    // ==========================================
    // 5. FREE-WILL PRAYER LOGIC
    // ==========================================
    function handleFreewillPrayerClick() {
        if (!isPrayerActive) {
            // START PRAYER
            isPrayerActive = true;
            isPrayerComplete = false;
            activePrayerType = 'freewill';
            secondsElapsed = 0;
            
            toggleNavigationLock(true);
            freewillBtn.textContent = "Stop Praying and Record Session"; // Free will can be stopped anytime
            freewillBtn.classList.add('btn-record');
            
            startAudioIfRequested();

            prayerInterval = setInterval(() => {
                secondsElapsed++;
                freewillTimerDisplay.textContent = formatTime(secondsElapsed, false);
            }, 1000);

        } else {
            // STOP AND RECORD PRAYER
            stopAudio();
            recordSession('freewill', secondsElapsed);
            resetPrayerState();
            freewillTimerDisplay.textContent = "00:00";
        }
    }

    if (freewillBtn) freewillBtn.addEventListener('click', handleFreewillPrayerClick);

    // ==========================================
    // 6. SHARED PRAYER UTILITIES
    // ==========================================
    function resetPrayerState() {
        clearInterval(prayerInterval);
        stopAudio();
        isPrayerActive = false;
        isPrayerComplete = false;
        activePrayerType = null;
        secondsElapsed = 0;
        toggleNavigationLock(false);

        // Reset Scheduled UI
        scheduledTimerDisplay.textContent = "05:00";
        scheduledBtn.textContent = "Start Praying";
        scheduledBtn.className = "prayer-btn";

        // Reset Freewill UI
        freewillBtn.textContent = "Start Praying";
        freewillBtn.className = "prayer-btn";
    }

    async function recordSession(type, durationInSeconds) {
        try {
            // We will build syncProgress.js later
            const response = await fetch('/.netlify/functions/syncProgress', {
                method: 'POST',
                body: JSON.stringify({
                    handle: activeUser.handle,
                    type: type,
                    duration: durationInSeconds,
                    timestamp: new Date().toISOString()
                })
            });
            if (response.ok) {
                alert(`Session securely recorded! Time prayed: ${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`);
                fetchProgressData(); // Refresh Progress Monitor
            } else {
                console.error("Failed to sync session.");
            }
        } catch (error) {
            console.error("Network error recording session:", error);
        }
    }

    // ==========================================
    // 7. PROGRESS MONITOR & GRID LOGIC
    // ==========================================
    function updateHourGrid() {
        // We will mock this function visually until HTML is built
        // It will map the current time and paint hours red (missed), green (done), numb (future)
        const currentHour = new Date().getHours();
        const boxes = document.querySelectorAll('.hour-box');
        
        boxes.forEach(box => {
            const boxHour = parseInt(box.dataset.hour);
            if (boxHour > currentHour) {
                box.className = 'hour-box numb';
            } else if (boxHour < currentHour && !box.classList.contains('green')) {
                box.className = 'hour-box red';
            }
        });
    }

    async function fetchProgressData() {
        // Will connect to getProgress.js later
        try {
            const response = await fetch('/.netlify/functions/getProgress', {
                method: 'POST',
                body: JSON.stringify({ handle: activeUser.handle })
            });
            const data = await response.json();
            // Update UI elements based on data...
        } catch (error) {
            console.log("Progress Sync loading...", error);
        }
    }

    // ==========================================
    // 8. FREE-WILL AI CHAT MODULE
    // ==========================================
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiResponseArea = document.getElementById('ai-response-area');

    if (aiSendBtn) {
        aiSendBtn.addEventListener('click', async () => {
            const prompt = aiChatInput.value.trim();
            if (!prompt) return;

            aiResponseArea.innerHTML += `<p class="user-msg"><strong>You:</strong> ${prompt}</p>`;
            aiChatInput.value = '';
            aiResponseArea.innerHTML += `<p class="sys-msg" id="ai-loading"><em>Meditating on scripture...</em></p>`;

            try {
                // Connect to chat.js
                const response = await fetch('/.netlify/functions/chat', {
                    method: 'POST',
                    body: JSON.stringify({ prompt: prompt })
                });
                const data = await response.json();
                document.getElementById('ai-loading').remove();
                aiResponseArea.innerHTML += `<p class="ai-msg"><strong>Anaptixi Guide:</strong> ${data.message}</p>`;
            } catch (err) {
                document.getElementById('ai-loading').remove();
                aiResponseArea.innerHTML += `<p class="ai-err">Failed to connect to AI module.</p>`;
            }
        });
    }

    // ==========================================
    // 9. PUSH NOTIFICATION REGISTRATION (TEXT ONLY)
    // ==========================================
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('/sw.js').then(swReg => {
            console.log('Service Worker is registered', swReg);
            
            // Ask for notification permission if not already granted
            if (Notification.permission === 'default') {
                document.getElementById('notification-prompt').style.display = 'block'; // Ensure we build this in HTML
                document.getElementById('btn-allow-push').addEventListener('click', () => {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            alert("You will now receive hourly push notifications.");
                            document.getElementById('notification-prompt').style.display = 'none';
                        }
                    });
                });
            }
        }).catch(error => {
            console.error('Service Worker Error', error);
        });
    }

    // Initialization calls
    updateHourGrid();
    setInterval(updateHourGrid, 60000); // Check hour grid every minute
    fetchProgressData();
});