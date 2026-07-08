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
    ];
    
    let backgroundAudio = new Audio();
    let prayerInterval;
    let secondsElapsed = 0;
    let isPrayerActive = false;
    let isPrayerComplete = false;
    const SCHEDULED_TARGET_SECONDS = 300; 

    const navLinks = document.querySelectorAll('.nav-link');
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabs = document.querySelectorAll('.sub-tab-content');
    const scheduledBtn = document.getElementById('btn-scheduled-prayer');
    const scheduledTimerDisplay = document.getElementById('scheduled-timer');
    const freewillBtn = document.getElementById('btn-freewill-prayer');
    const freewillTimerDisplay = document.getElementById('freewill-timer');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-status') === 'unavailable') {
                e.preventDefault();
                alert(`${e.target.textContent.trim()} Tab is currently unavailable, check back later. blessings!`);
            }
        });
    });

    function switchSubTab(tabId) {
        if (isPrayerActive) { alert("Please complete or halt your current prayer session."); return; }
        subTabs.forEach(tab => tab.style.display = 'none');
        subTabBtns.forEach(btn => btn.classList.remove('active'));
        document.getElementById(tabId).style.display = 'block';
        document.querySelector(`[data-target="${tabId}"]`).classList.add('active');
    }

    subTabBtns.forEach(btn => btn.addEventListener('click', (e) => switchSubTab(e.target.dataset.target)));

    function toggleNavigationLock(lock) {
        [...navLinks, ...subTabBtns].forEach(el => {
            el.classList.toggle('locked', lock);
            el.style.pointerEvents = lock ? 'none' : 'auto';
            el.style.opacity = lock ? '0.5' : '1';
        });
    }

    // AUDIO FIX: Direct streaming bypasses strict CORS fetch blocks
    function startAudioIfRequested() {
        if (confirm("Would you like to play background sound during your prayer?")) {
            const randomID = audioDriveIDs[Math.floor(Math.random() * audioDriveIDs.length)];
            backgroundAudio.src = `https://docs.google.com/uc?export=download&id=${randomID}`;
            backgroundAudio.loop = true;
            backgroundAudio.play().catch(err => console.log("Browser Autoplay blocked audio:", err));
        }
    }

    function stopAudio() { backgroundAudio.pause(); backgroundAudio.currentTime = 0; }

    function formatTime(totalSeconds, isCountdown = false) {
        let displaySeconds = isCountdown ? Math.max(0, SCHEDULED_TARGET_SECONDS - totalSeconds) : totalSeconds;
        return `${Math.floor(displaySeconds / 60).toString().padStart(2, '0')}:${(displaySeconds % 60).toString().padStart(2, '0')}`;
    }

    function handleScheduledPrayerClick() {
        if (!isPrayerActive) {
            isPrayerActive = true; isPrayerComplete = false; secondsElapsed = 0;
            toggleNavigationLock(true);
            scheduledBtn.textContent = "Halt Prayer"; scheduledBtn.className = 'prayer-btn btn-halt';
            startAudioIfRequested();
            prayerInterval = setInterval(() => {
                secondsElapsed++;
                scheduledTimerDisplay.textContent = formatTime(secondsElapsed, true);
                if (secondsElapsed === SCHEDULED_TARGET_SECONDS) {
                    isPrayerComplete = true; stopAudio();
                    scheduledBtn.textContent = "Stop Praying and Record Session";
                    scheduledBtn.className = 'prayer-btn btn-record';
                }
            }, 1000);
        } else if (isPrayerActive && !isPrayerComplete) {
            if (confirm("Your Prayer isn't complete yet, are you sure you want to halt?")) resetPrayerState();
        } else if (isPrayerActive && isPrayerComplete) {
            recordSession('scheduled', SCHEDULED_TARGET_SECONDS);
            let today = new Date().toDateString();
            let completedHours = JSON.parse(localStorage.getItem(`anaptixi_grid_${today}`)) || [];
            completedHours.push(new Date().getHours());
            localStorage.setItem(`anaptixi_grid_${today}`, JSON.stringify(completedHours));
            resetPrayerState(); updateHourGrid();
        }
    }

    if (scheduledBtn) scheduledBtn.addEventListener('click', handleScheduledPrayerClick);

    function handleFreewillPrayerClick() {
        if (!isPrayerActive) {
            isPrayerActive = true; isPrayerComplete = false; secondsElapsed = 0;
            toggleNavigationLock(true);
            freewillBtn.textContent = "Stop Praying and Record Session"; freewillBtn.className = 'prayer-btn btn-record';
            startAudioIfRequested();
            prayerInterval = setInterval(() => {
                secondsElapsed++; freewillTimerDisplay.textContent = formatTime(secondsElapsed, false);
            }, 1000);
        } else {
            stopAudio(); recordSession('freewill', secondsElapsed); resetPrayerState(); freewillTimerDisplay.textContent = "00:00";
        }
    }

    if (freewillBtn) freewillBtn.addEventListener('click', handleFreewillPrayerClick);

    function resetPrayerState() {
        clearInterval(prayerInterval); stopAudio();
        isPrayerActive = false; isPrayerComplete = false; secondsElapsed = 0;
        toggleNavigationLock(false);
        scheduledTimerDisplay.textContent = "05:00"; scheduledBtn.textContent = "Start Praying"; scheduledBtn.className = "prayer-btn";
        freewillBtn.textContent = "Start Praying"; freewillBtn.className = "prayer-btn";
    }

    async function recordSession(type, durationInSeconds) {
        try {
            const res = await fetch('/.netlify/functions/syncProgress', {
                method: 'POST', body: JSON.stringify({ handle: activeUser.handle, type, duration: durationInSeconds, timestamp: new Date().toISOString() })
            });
            if (res.ok) {
                alert(`Session recorded: ${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`);
                fetchProgressData(); 
            }
        } catch (err) { console.error("Error recording session:", err); }
    }

    async function fetchProgressData() {
        try {
            const res = await fetch('/.netlify/functions/getProgress', { method: 'POST', body: JSON.stringify({ handle: activeUser.handle }) });
            const data = await res.json();
            
            document.getElementById('stat-daily').textContent = `${data.dailyPercent || 0}%`;
            document.getElementById('stat-monthly').textContent = `${data.monthlyPercent || 0}%`;
            document.getElementById('stat-yearly').textContent = `${data.yearlyPercent || 0}%`;
            
            const logContainer = document.getElementById('freeflow-logs');
            logContainer.innerHTML = '';
            if (data.freeFlowLogs && data.freeFlowLogs.length > 0) {
                data.freeFlowLogs.forEach(log => {
                    const formattedDate = new Date(log.completedAt).toLocaleString();
                    logContainer.innerHTML += `<li style="padding: 10px; background: #f8fafc; margin-bottom: 5px; border-radius: 6px; border: 1px solid #e2e8f0;">
                            <strong>Date:</strong> ${formattedDate} | <strong>Duration:</strong> ${Math.floor(log.durationInSeconds / 60)}m ${log.durationInSeconds % 60}s
                        </li>`;
                });
            } else { logContainer.innerHTML = `<li style="padding: 10px; background: #f8fafc; margin-bottom: 5px; border-radius: 6px;">No free-flow sessions recorded.</li>`; }
        } catch (err) { console.log("Progress Sync failed:", err); }
    }

    function updateHourGrid() {
        const currentHour = new Date().getHours();
        const completedHours = JSON.parse(localStorage.getItem(`anaptixi_grid_${new Date().toDateString()}`)) || [];
        document.querySelectorAll('.hour-box').forEach(box => {
            const boxHour = parseInt(box.dataset.hour);
            if (completedHours.includes(boxHour)) box.className = 'hour-box green';
            else if (boxHour < currentHour) box.className = 'hour-box red';
            else box.className = 'hour-box numb';
        });
    }

    // DISABLED BUTTON LOGIC FIX
    const downloadBtn = document.getElementById('btn-download-report');
    function checkPdfButtonAvailability() {
        if (new Date().getHours() === 23) {
            downloadBtn.disabled = false;
            downloadBtn.style.backgroundColor = '#d97706';
            downloadBtn.style.cursor = 'pointer';
        } else {
            downloadBtn.disabled = true;
            downloadBtn.style.backgroundColor = '#64748b'; // Grayed out
            downloadBtn.style.cursor = 'not-allowed';
        }
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            html2pdf().set({ margin: 1, filename: `Progress_${activeUser.firstName}.pdf`, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).from(document.getElementById('tab-progress')).save();
        });
    }

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
                const res = await fetch('/.netlify/functions/chat', { method: 'POST', body: JSON.stringify({ prompt }) });
                const data = await res.json();
                document.getElementById('ai-loading').remove();
                
                // If the message contains "API ERROR:", color it red so you know Google rejected it.
                if (data.message.includes("API ERROR:")) {
                    aiResponseArea.innerHTML += `<p class="ai-err"><strong>System Error:</strong> ${data.message}</p>`;
                } else {
                    aiResponseArea.innerHTML += `<p class="ai-msg"><strong>Anaptixi Guide:</strong> ${data.message}</p>`;
                }
                aiResponseArea.scrollTop = aiResponseArea.scrollHeight;
            } catch (err) {
                document.getElementById('ai-loading').remove();
                aiResponseArea.innerHTML += `<p class="ai-err">Connection failed.</p>`;
            }
        });
    }

    updateHourGrid(); checkPdfButtonAvailability(); fetchProgressData();
    setInterval(() => { updateHourGrid(); checkPdfButtonAvailability(); }, 60000); 
});