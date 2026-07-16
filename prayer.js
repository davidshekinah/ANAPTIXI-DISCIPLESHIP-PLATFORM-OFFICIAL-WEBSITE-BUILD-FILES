/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - PRAYER TAB SCRIPT
 * File: prayer.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. AUTHENTICATION & GLOBAL VARIABLES
    const activeUser = JSON.parse(localStorage.getItem('anaptixi_active_user'));
    if (!activeUser) {
        alert("You must be logged in to access the Prayer Tab.");
        window.location.href = 'index.html';
        return;
    }

    let audioDatabaseLinks = [];
    let backgroundAudio = new Audio();
    
    let prayerInterval;
    let secondsElapsed = 0;
    let isPrayerActive = false;
    let isPrayerComplete = false;
    let activePrayerType = null;
    const SCHEDULED_TARGET_SECONDS = 300; 

    // Grid Array (Our unified state)
    let completedHoursToday = []; 

    const navLinks = document.querySelectorAll('.nav-link');
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabs = document.querySelectorAll('.sub-tab-content');
    const scheduledBtn = document.getElementById('btn-scheduled-prayer');
    const scheduledTimerDisplay = document.getElementById('scheduled-timer');
    const freewillBtn = document.getElementById('btn-freewill-prayer');
    const freewillTimerDisplay = document.getElementById('freewill-timer');

    // 2. FETCH DYNAMIC AUDIO
    async function loadMediaLinks() {
        try {
            const response = await fetch('/.netlify/functions/getMedia');
            const data = await response.json();
            if (data.media) audioDatabaseLinks = data.media.map(m => m.url);
        } catch (error) {
            console.error("Failed to load audio links from database:", error);
        }
    }
    loadMediaLinks(); 

    // 3. SERVICE WORKER & NOTIFICATION LOGIC
    const notificationPrompt = document.getElementById('notification-prompt');
    const btnAllowPush = document.getElementById('btn-allow-push');

    if ('serviceWorker' in navigator && 'Notification' in window) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            if (Notification.permission === 'default') {
                notificationPrompt.style.display = 'block';
            }
            btnAllowPush.addEventListener('click', () => {
                Notification.requestPermission().then(permission => {
                    notificationPrompt.style.display = 'none';
                    if (permission === 'granted') alert("Notifications enabled successfully!");
                });
            });
        });
    }

    let lastNotifiedHour = -1;
    function checkHourAndNotify() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        if (currentMinute === 0 && currentHour !== lastNotifiedHour) {
            lastNotifiedHour = currentHour;
            
            if (Notification.permission === 'granted') {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification("Prayer Hour Reminder", {
                        body: "Hello Anaptixian, it's time to pray.",
                        icon: '/ANAPTIXI LOGO.png',
                        vibrate: [200, 100, 200, 100, 200, 100, 200], 
                        data: { url: "/prayer.html" },
                        actions: [
                            { action: 'pray-now', title: 'Pray Now' },
                            { action: 'ignore', title: 'Ignore' }
                        ],
                        requireInteraction: true
                    });
                });
            }
        }
    }

    // 4. UNAVAILABLE TABS INTERCEPTOR
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-status') === 'unavailable') {
                e.preventDefault();
                alert(`${e.target.textContent.trim()} Tab is currently unavailable, check back later.`);
            }
        });
    });

    // 5. SUB-TAB SWITCHING
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

    subTabBtns.forEach(btn => btn.addEventListener('click', (e) => switchSubTab(e.target.dataset.target)));

    function toggleNavigationLock(lock) {
        [...navLinks, ...subTabBtns].forEach(el => {
            el.classList.toggle('locked', lock);
            el.style.pointerEvents = lock ? 'none' : 'auto';
            el.style.opacity = lock ? '0.5' : '1';
        });
    }

    // 6. AUDIO MANAGEMENT
    function startAudioIfRequested() {
        const wantsAudio = confirm("Would you like to play background sound during your prayer?");
        if (wantsAudio && audioDatabaseLinks.length > 0) {
            const randomURL = audioDatabaseLinks[Math.floor(Math.random() * audioDatabaseLinks.length)];
            backgroundAudio.src = randomURL;
            backgroundAudio.loop = true;
            backgroundAudio.play().catch(err => console.log("Audio blocked:", err));
        } else if (wantsAudio) {
            alert("Audio links are still loading from the database. Proceeding in silence.");
        }
    }

    function stopAudio() {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
    }

    // 7. TIMERS & RECORDING LOGIC
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
                if (secondsElapsed >= SCHEDULED_TARGET_SECONDS) {
                    isPrayerComplete = true;
                    stopAudio(); 
                    scheduledBtn.textContent = "Stop Praying and Record Session";
                    scheduledBtn.classList.remove('btn-halt');
                    scheduledBtn.classList.add('btn-record');
                }
            }, 1000);

        } else if (!isPrayerComplete) {
            if (confirm("Your Prayer isn't complete yet, are you sure you want to halt? Note that it won't be recorded.")) resetPrayerState();
        } else {
            recordSession('scheduled', SCHEDULED_TARGET_SECONDS);
            resetPrayerState();
        }
    }

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

    if (scheduledBtn) scheduledBtn.addEventListener('click', handleScheduledPrayerClick);
    if (freewillBtn) freewillBtn.addEventListener('click', handleFreewillPrayerClick);

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
                alert(`Session recorded! Time prayed: ${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`);
                
                // --- OPTIMISTIC UI UPDATE: Instant feedback! ---
                if (type === 'scheduled') {
                    completedHoursToday.push(new Date().getHours());
                    updateHourGrid();
                    updatePrayerButtonState(true);
                }
                
                fetchProgressData(); // Sync the background stats
            }
        } catch (error) {
            console.error("Recording failed:", error);
        }
    }

    // 8. PROGRESS DATA, MONGODB GRID & UI LOCKING
    function updatePrayerButtonState(hasPrayedInCurrentHour) {
        const container = scheduledBtn.parentNode;

        if (hasPrayedInCurrentHour) {
            scheduledBtn.style.display = 'none';
            
            let msgDiv = document.getElementById('prayer-lock-msg');
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.id = 'prayer-lock-msg';
                msgDiv.style.marginTop = '15px';
                msgDiv.style.color = '#334155';
                msgDiv.style.textAlign = 'center';
                
                msgDiv.innerHTML = `
                    <p>You have prayed in this hour and your next prayer hour is in <span id="prayer-lock-timer"></span>.</p>
                    <p>Click <span id="nav-to-freewill" style="color: #d97706; text-decoration: underline; cursor: pointer;">here</span> to navigate to the Free-Will Prayer tab if you want to continue praying in this hour.</p>
                `;
                container.appendChild(msgDiv);

                document.getElementById('nav-to-freewill').addEventListener('click', () => {
                    document.querySelector('[data-target="tab-freewill"]').click();
                });
            }
            updateLockTimer();
        } else {
            scheduledBtn.style.display = 'block';
            const msgDiv = document.getElementById('prayer-lock-msg');
            if (msgDiv) msgDiv.remove();
        }
    }

    function updateLockTimer() {
        const timerSpan = document.getElementById('prayer-lock-timer');
        if (timerSpan) {
            const now = new Date();
            const minsLeft = 59 - now.getMinutes();
            const secsLeft = 60 - now.getSeconds();
            timerSpan.textContent = `0 hours, ${minsLeft} minutes, ${secsLeft} seconds`;
        }
    }

    async function fetchProgressData() {
        try {
            const response = await fetch('/.netlify/functions/getProgress', {
                method: 'POST',
                body: JSON.stringify({ handle: activeUser.handle })
            });
            const data = await response.json();
            
            // --- DEFENSIVE DATABASE FETCHING ---
            // Grabs the logs no matter how the backend names them
            let dbLogs = data.scheduledLogs || (data.logs ? data.logs.filter(l => l.type === 'scheduled') : []);
            
            if (dbLogs.length > 0) {
                const now = new Date();
                const dbHours = dbLogs
                    .map(log => new Date(log.completedAt || log.timestamp)) // Handles both date variable formats
                    .filter(date => date.toDateString() === now.toDateString())
                    .map(date => date.getHours());
                
                // Merges DB hours with optimistic hours so nothing gets wiped out by lag
                completedHoursToday = [...new Set([...completedHoursToday, ...dbHours])];
            }

            let hasPrayedThisHour = completedHoursToday.includes(new Date().getHours());
            updatePrayerButtonState(hasPrayedThisHour);
            updateHourGrid(); // Force UI update immediately

            // Update stats
            document.getElementById('stat-daily').textContent = `${data.dailyPercent || 0}%`;
            document.getElementById('stat-monthly').textContent = `${data.monthlyPercent || 0}%`;
            document.getElementById('stat-yearly').textContent = `${data.yearlyPercent || 0}%`;
            
            const logContainer = document.getElementById('freeflow-logs');
            logContainer.innerHTML = '';
            
            if (data.freeFlowLogs && data.freeFlowLogs.length > 0) {
                data.freeFlowLogs.forEach(log => {
                    const formattedDate = new Date(log.completedAt || log.timestamp).toLocaleString();
                    const m = Math.floor(log.durationInSeconds / 60);
                    const s = log.durationInSeconds % 60;
                    logContainer.innerHTML += `<li style="padding: 10px; background: #f8fafc; margin-bottom: 5px; border-radius: 6px; border: 1px solid #e2e8f0;"><strong>Date:</strong> ${formattedDate} | <strong>Duration:</strong> ${m}m ${s}s</li>`;
                });
            } else {
                logContainer.innerHTML = `<li style="padding: 10px; background: #f8fafc; margin-bottom: 5px; border-radius: 6px;">No free-flow sessions recorded yet.</li>`;
            }
        } catch (error) {
            document.getElementById('freeflow-logs').innerHTML = `<li style="padding: 10px; color: #dc2626;">Failed to load logs.</li>`;
        }
    }

    function updateHourGrid() {
        const currentHour = new Date().getHours();
        document.querySelectorAll('.hour-box').forEach(box => {
            const boxHour = parseInt(box.dataset.hour);
            
            if (completedHoursToday.includes(boxHour)) {
                box.className = 'hour-box green';
            } else if (boxHour < currentHour) {
                box.className = 'hour-box red';
            } else {
                box.className = 'hour-box numb';
            }
        });
    }

    const downloadBtn = document.getElementById('btn-download-report');
    function checkPdfButtonAvailability() {
        if (downloadBtn) {
            if (new Date().getHours() === 23) { 
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
            html2pdf().set({
                margin: 1,
                filename: `Anaptixi_Progress_${activeUser.firstName}_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            }).from(document.getElementById('tab-progress')).save();
        });
    }

    // 9. AI CHAT MODULE
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
                const response = await fetch('/.netlify/functions/chat', { method: 'POST', body: JSON.stringify({ prompt: prompt }) });
                const data = await response.json();
                document.getElementById('ai-loading').remove();
                
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
                aiResponseArea.innerHTML += `<p class="ai-err">Failed to connect to AI module.</p>`;
            }
        });
    }

    // 10. SYSTEM LOOP
    fetchProgressData();
    
    // Checks every second to run the UI updates, animate the countdown timer, and monitor for the Push Notification
    setInterval(() => {
        updateHourGrid();
        checkPdfButtonAvailability();
        checkHourAndNotify();
        updateLockTimer();
    }, 1000); 
});
