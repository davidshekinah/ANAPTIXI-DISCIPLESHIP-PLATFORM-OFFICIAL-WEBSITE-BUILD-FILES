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

    // Google Drive Audio IDs (Exact IDs Provided)
    const audioDriveIDs = [
        "1uMj9Aag4Zcn20tJKhnlbaTYTpsf_a1md",
        "17I-nKEyD28Ilk5rH6Y1rkfMyZDKnwjF_",
        "1n7EM76lu2cgkkNScZ2EDFtvIzZyY7AQz",
        "1sCZDKf2HUt2t1Y3nWkPRJlU3rmDa7JYG",
        "1S-IRt07H8czvrV0SWm6bRxFlPSUyYmSJ",
        "1Sm5117BDjJDOKdt_iLqjjXa-C3bmXKs6",
        "17oZzzjNQ5DyJdU_9o0PlQJoy4eddiBw3",
        "1Oze0RfRJdXF21AUBdy_Imd_2DC9--YYE",
        "1HkO7644cENwHtc9HV4pk7O0KLhIEapdd",
        "1_dHv7wasCn1lon-iG3Dm4aO2I-BW-PHq"
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

    // Free-Will Elements
    const freewillBtn = document.getElementById('btn-freewill-prayer');
    const freewillTimerDisplay = document.getElementById('freewill-timer');

    // ==========================================
    // 2. UNAVAILABLE TABS INTERCEPTOR
    // ==========================================
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-status') === 'unavailable') {
                e.preventDefault();
                const tabName = e.target.textContent.trim();
                alert(`${tabName} Tab is currently unavailable, check back later. blessings!`);
            }
        });
    });

    // ==========================================
    // 3. SUB-TAB SWITCHING & TAB LOCKING
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
    // 4. AUDIO MANAGEMENT (DIRECT STREAM FIX)
    // ==========================================
    function startAudioIfRequested() {
        const wantsAudio = confirm("Would you like to play background sound during your prayer?");
        if (wantsAudio) {
            const randomID = audioDriveIDs[Math.floor(Math.random() * audioDriveIDs.length)];
            // Directly streams from Google Drive, completely bypassing the fetch CORS block
            backgroundAudio.src = `https://docs.google.com/uc?export=download&id=${randomID}`;
            backgroundAudio.loop = true;
            backgroundAudio.play().catch(err => console.log("Audio play blocked by browser:", err));
        }
    }

    function stopAudio() {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
    }

    // ==========================================
    // 5. SCHEDULED PRAYER LOGIC
    // ==========================================
    function formatTime(totalSeconds, isCountdown = false) {
        let displaySeconds = isCountdown ? Math.max(0, SCHEDULED_TARGET_SECONDS - totalSeconds) : totalSeconds;
        const m = Math.floor(displaySeconds / 60).toString().padStart(2, '0');
        const s = (displaySeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function handleScheduledPrayerClick() {
        if (!isPrayerActive) {
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
                    isPrayerComplete = true;
                    stopAudio(); 
                    scheduledBtn.textContent = "Stop Praying and Record Session";
                    scheduledBtn.classList.remove('btn-halt');
                    scheduledBtn.classList.add('btn-record');
                }
            }, 1000);

        } else if (isPrayerActive && !isPrayerComplete) {
            const confirmHalt = confirm("Your Prayer isn't complete yet, are you sure you want to halt? Note that it won't be recorded and this hour would still be left as null.");
            if (confirmHalt) resetPrayerState();
        } else if (isPrayerActive && isPrayerComplete) {
            recordSession('scheduled', SCHEDULED_TARGET_SECONDS);
            
            // Log local cache to instantly update grid colors
            let today = new Date().toDateString();
            let completedHours = JSON.parse(localStorage.getItem(`anaptixi_grid_${today}`)) || [];
            completedHours.push(new Date().getHours());
            localStorage.setItem(`anaptixi_grid_${today}`, JSON.stringify(completedHours));
            
            resetPrayerState();
            updateHourGrid();
        }
    }

    if (scheduledBtn) scheduledBtn.addEventListener('click', handleScheduledPrayerClick);

    // ==========================================
    // 6. FREE-WILL PRAYER LOGIC
    // ==========================================
    function handleFreewillPrayerClick() {
        if (!isPrayerActive) {
            isPrayerActive = true;
            isPrayerComplete = false;
            activePrayerType = 'freewill';
            secondsElapsed = 0;
            
            toggleNavigationLock(true);
            freewillBtn.textContent = "Stop Praying and Record Session";
            freewillBtn.classList.add('btn-record');
            
            startAudioIfRequested();

            prayerInterval = setInterval(() => {
                secondsElapsed++;
                freewillTimerDisplay.textContent = formatTime(secondsElapsed, false);
            }, 1000);

        } else {
            stopAudio();
            recordSession('freewill', secondsElapsed);
            resetPrayerState();
            freewillTimerDisplay.textContent = "00:00";
        }
    }

    if (freewillBtn) freewillBtn.addEventListener('click', handleFreewillPrayerClick);

    // ==========================================
    // 7. SHARED PRAYER UTILITIES & SYNC
    // ==========================================
    function resetPrayerState() {
        clearInterval(prayerInterval);
        stopAudio();
        isPrayerActive = false;
        isPrayerComplete = false;
        activePrayerType = null;
        secondsElapsed = 0;
        toggleNavigationLock(false);

        scheduledTimerDisplay.textContent = "05:00";
        scheduledBtn.textContent = "Start Praying";
        scheduledBtn.className = "prayer-btn";

        freewillBtn.textContent = "Start Praying";
        freewillBtn.className = "prayer-btn";
    }

    async function recordSession(type, durationInSeconds) {
        try {
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
                fetchProgressData(); 
            } else {
                console.error("Failed to sync session.");
            }
        } catch (error) {
            console.error("Network error recording session:", error);
        }
    }

    // ==========================================
    // 8. PROGRESS MONITOR DOM MAPPING
    // ==========================================
    async function fetchProgressData() {
        try {
            const response = await fetch('/.netlify/functions/getProgress', {
                method: 'POST',
                body: JSON.stringify({ handle: activeUser.handle })
            });
            const data = await response.json();
            
            // Map exact decimal percentages to DOM
            document.getElementById('stat-daily').textContent = `${data.dailyPercent || 0}%`;
            document.getElementById('stat-monthly').textContent = `${data.monthlyPercent || 0}%`;
            document.getElementById('stat-yearly').textContent = `${data.yearlyPercent || 0}%`;
            
            // Map Free-Flow Logs to DOM
            const logContainer = document.getElementById('freeflow-logs');
            logContainer.innerHTML = '';
            
            if (data.freeFlowLogs && data.freeFlowLogs.length > 0) {
                data.freeFlowLogs.forEach(log => {
                    const d = new Date(log.completedAt);
                    const formattedDate = d.toLocaleString();
                    const m = Math.floor(log.durationInSeconds / 60);
                    const s = log.durationInSeconds % 60;
                    
                    logContainer.innerHTML += `
                        <li style="padding: 10px; background: #f8fafc; margin-bottom: 5px; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <strong>Date:</strong> ${formattedDate} | <strong>Duration:</strong> ${m}m ${s}s
                        </li>
                    `;
                });
            } else {
                logContainer.innerHTML = `<li style="padding: 10px; background: #f8fafc; margin-bottom: 5px; border-radius: 6px;">No free-flow sessions recorded yet.</li>`;
            }

        } catch (error) {
            console.log("Progress Sync loading failed:", error);
            document.getElementById('freeflow-logs').innerHTML = `<li style="padding: 10px; color: #dc2626;">Failed to load logs. Network error.</li>`;
        }
    }

    function updateHourGrid() {
        const currentHour = new Date().getHours();
        const today = new Date().toDateString();
        const completedHours = JSON.parse(localStorage.getItem(`anaptixi_grid_${today}`)) || [];
        const boxes = document.querySelectorAll('.hour-box');
        
        boxes.forEach(box => {
            const boxHour = parseInt(box.dataset.hour);
            
            if (completedHours.includes(boxHour)) {
                box.className = 'hour-box green'; 
            } else if (boxHour < currentHour) {
                box.className = 'hour-box red'; 
            } else {
                box.className = 'hour-box numb'; 
            }
        });
    }

    // ==========================================
    // 9. PDF DOWNLOAD LOGIC (TIME-LOCK FIX)
    // ==========================================
    const downloadBtn = document.getElementById('btn-download-report');
    
    function checkPdfButtonAvailability() {
        const currentHour = new Date().getHours();
        if (downloadBtn) {
            if (currentHour === 23) { 
                downloadBtn.disabled = false;
                downloadBtn.style.backgroundColor = '#d97706';
                downloadBtn.style.cursor = 'pointer';
            } else {
                downloadBtn.disabled = true;
                downloadBtn.style.backgroundColor = '#64748b';
                downloadBtn.style.cursor = 'not-allowed';
            }
        }
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const progressElement = document.getElementById('tab-progress');
            const opt = {
                margin:       1,
                filename:     `Anaptixi_Progress_${activeUser.firstName}_${new Date().toISOString().split('T')[0]}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(progressElement).save();
        });
    }

    // ==========================================
    // 10. FREE-WILL AI CHAT MODULE (ERROR LOGGING FIX)
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
            aiResponseArea.innerHTML += `<p class="sys-msg" id="ai-loading"><em>Meditating on request...</em></p>`;
            aiResponseArea.scrollTop = aiResponseArea.scrollHeight; 

            try {
                const response = await fetch('/.netlify/functions/chat', {
                    method: 'POST',
                    body: JSON.stringify({ prompt: prompt })
                });
                const data = await response.json();
                document.getElementById('ai-loading').remove();
                
                // Directly outputs backend error logs in red so you aren't guessing
                if (data.message && data.message.includes("API ERROR:")) {
                    aiResponseArea.innerHTML += `<p class="ai-err"><strong>System Error:</strong> ${data.message}</p>`;
                } else if (data.message && data.message.includes("SERVER CRASH:")) {
                    aiResponseArea.innerHTML += `<p class="ai-err"><strong>Backend Error:</strong> ${data.message}</p>`;
                } else {
                    aiResponseArea.innerHTML += `<p class="ai-msg"><strong>Anaptixi Guide:</strong> ${data.message}</p>`;
                }
                
                aiResponseArea.scrollTop = aiResponseArea.scrollHeight;
            } catch (err) {
                document.getElementById('ai-loading').remove();
                aiResponseArea.innerHTML += `<p class="ai-err">Failed to connect to AI module. Network error.</p>`;
            }
        });
    }

    // ==========================================
    // 11. INITIALIZATION LOOP
    // ==========================================
    updateHourGrid();
    checkPdfButtonAvailability();
    fetchProgressData();
    
    setInterval(() => {
        updateHourGrid();
        checkPdfButtonAvailability();
    }, 60000); 

});