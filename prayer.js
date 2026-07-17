/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - PRAYER TAB SCRIPT
 * File: prayer.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================\
    // 1. AUTHENTICATION & GLOBAL VARIABLES
    // ==========================================\
    const activeUser = JSON.parse(localStorage.getItem('anaptixi_active_user'));
    if (!activeUser) {
        alert("Session Expired: You must be logged in to access the Prayer Tab.");
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
    const SCHEDULED_TARGET_SECONDS = 300; // 5 Minutes

    // Grid Array State (Holds integer hours like [0, 5, 12, 14])
    let completedHoursToday = []; 

    const navLinks = document.querySelectorAll('.nav-link');
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabs = document.querySelectorAll('.sub-tab-content');
    
    const scheduledBtn = document.getElementById('btn-scheduled-prayer');
    const scheduledTimerDisplay = document.getElementById('scheduled-timer');
    const freewillBtn = document.getElementById('btn-freewill-prayer');
    const freewillTimerDisplay = document.getElementById('freewill-timer');

    // ==========================================\
    // 2. CUSTOM IN-APP MODAL LOGIC (Replaces alerts/confirms)
    // ==========================================\
    function showCustomModal(title, message, isConfirm = false) {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-modal-overlay');
            const titleEl = document.getElementById('custom-modal-title');
            const msgEl = document.getElementById('custom-modal-message');
            const btnCancel = document.getElementById('custom-modal-btn-cancel');
            const btnConfirm = document.getElementById('custom-modal-btn-confirm');

            if (!overlay) {
                // Safety fallback if HTML overlay hasn't loaded
                if (isConfirm) resolve(confirm(title + ": " + message));
                else { alert(title + ": " + message); resolve(true); }
                return;
            }

            titleEl.textContent = title;
            msgEl.textContent = message;
            btnCancel.style.display = isConfirm ? 'inline-block' : 'none';
            
            overlay.style.display = 'flex';
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);

            const cleanup = () => {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 300);
                btnConfirm.removeEventListener('click', onConfirm);
                btnCancel.removeEventListener('click', onCancel);
            };

            const onConfirm = () => { cleanup(); resolve(true); };
            const onCancel = () => { cleanup(); resolve(false); };

            btnConfirm.addEventListener('click', onConfirm);
            btnCancel.addEventListener('click', onCancel);
        });
    }

    // ==========================================\
    // 3. FETCH DYNAMIC AUDIO & PLAYBACK ENGINE
    // ==========================================\
    async function fetchMedia() {
        try {
            const response = await fetch('/.netlify/functions/getMedia');
            const data = await response.json();
            if (data.media && data.media.length > 0) {
                audioDatabaseLinks = data.media.map(m => m.url);
            } else {
                console.warn("No background sounds returned from server.");
            }
        } catch (error) {
            await showCustomModal('Audio Error', 'Network delay: Could not load background audio tracks from server.');
        }
    }
    
    async function playRandomAudio() {
        if (audioDatabaseLinks.length === 0) {
            await showCustomModal('Audio Notice', 'Audio tracks are still loading or unavailable. Initiating silent session.');
            return;
        }
        try {
            const randIndex = Math.floor(Math.random() * audioDatabaseLinks.length);
            backgroundAudio.src = audioDatabaseLinks[randIndex];
            backgroundAudio.loop = true;
            await backgroundAudio.play();
        } catch (e) {
            console.warn("Audio autoplay blocked by browser policy.", e);
        }
    }

    // ==========================================\
    // 4. SUB-TAB NAVIGATION ROUTING
    // ==========================================\
    subTabBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            // Tab Switch Blocking Logic
            if (isPrayerActive) {
                const proceed = await showCustomModal('Active Session Warning', 'You have an ongoing prayer session. Navigating away will halt and lose current progress. Do you want to proceed?', true);
                if (!proceed) return;
                activePrayerType === 'scheduled' ? resetScheduledState() : resetFreewillState();
            }

            subTabBtns.forEach(b => b.classList.remove('active'));
            subTabs.forEach(t => t.style.display = 'none');
            
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).style.display = 'block';
        });
    });

    // ==========================================\
    // 5. PROGRESS & GRID PERSISTENCE ENGINE
    // ==========================================\
    async function fetchProgressData() {
        try {
            const response = await fetch('/.netlify/functions/getProgress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handle: activeUser.handle })
            });
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('stat-daily').textContent = `${data.dailyPercent}%`;
                document.getElementById('stat-monthly').textContent = `${data.monthlyPercent}%`;
                document.getElementById('stat-yearly').textContent = `${data.yearlyPercent}%`;

                // Render Free-flow logs
                const logsContainer = document.getElementById('freeflow-logs');
                if (data.freeFlowLogs && data.freeFlowLogs.length > 0) {
                    logsContainer.innerHTML = '';
                    const sortedLogs = data.freeFlowLogs.sort((a,b) => new Date(b.completedAt) - new Date(a.completedAt));
                    sortedLogs.forEach(log => {
                        const mins = Math.floor(log.durationInSeconds / 60);
                        const secs = log.durationInSeconds % 60;
                        const dateStr = new Date(log.completedAt).toLocaleString();
                        const li = document.createElement('li');
                        li.style.padding = '10px';
                        li.style.background = '#f8fafc';
                        li.style.marginBottom = '5px';
                        li.style.borderRadius = '6px';
                        li.innerHTML = `<strong>${mins}m ${secs}s</strong> - <span style="font-size:12.5px;">${dateStr}</span>`;
                        logsContainer.appendChild(li);
                    });
                } else {
                    logsContainer.innerHTML = '<li style="padding: 10px;">No free-will sessions recorded yet.</li>';
                }

                // Rewrite: Extract Completed Hourly Logs mapped from Backend
                if (data.scheduledLogs) {
                    const todayStr = new Date().toDateString();
                    completedHoursToday = data.scheduledLogs
                        .filter(log => new Date(log.completedAt).toDateString() === todayStr)
                        .map(log => new Date(log.completedAt).getHours());
                } else {
                    // Cache Fallback mapping if backend payload structure differs temporarily
                    const cachedGrid = JSON.parse(localStorage.getItem(`anaptixi_grid_${activeUser.handle}`)) || {};
                    if (cachedGrid.date === new Date().toDateString()) {
                        completedHoursToday = cachedGrid.hours || [];
                    }
                }
                updateHourGrid();
            }
        } catch (error) {
            console.error("Progress fetch error:", error);
        }
    }

    async function syncSessionRecord(type, duration) {
        try {
            const response = await fetch('/.netlify/functions/syncProgress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    handle: activeUser.handle,
                    type: type,
                    duration: duration,
                    timestamp: new Date().toISOString()
                })
            });
            const data = await response.json();
            
            if (response.ok) {
                // Successful Sync Confirmation Modal
                await showCustomModal('Session Saved', `Your ${type === 'scheduled' ? 'Scheduled' : 'Free-Will'} prayer session has been successfully recorded to the cloud.`);
                
                // Immediately map to the UI and fallback Cache to maintain state
                if (type === 'scheduled') {
                    const currentHour = new Date().getHours();
                    if (!completedHoursToday.includes(currentHour)) {
                        completedHoursToday.push(currentHour);
                        localStorage.setItem(`anaptixi_grid_${activeUser.handle}`, JSON.stringify({
                            date: new Date().toDateString(),
                            hours: completedHoursToday
                        }));
                    }
                }
                fetchProgressData();
            } else {
                await showCustomModal('Sync Error', data.message || "Failed to save session.");
            }
        } catch (err) {
            await showCustomModal('Network Error', 'Failed to reach synchronization servers. Session progress may not be logged.');
        }
    }

    // Function to calculate grid states
    function updateHourGrid() {
        const currentHour = new Date().getHours();
        const boxes = document.querySelectorAll('.hour-box');
        
        boxes.forEach(box => {
            const boxHour = parseInt(box.getAttribute('data-hour'));
            box.classList.remove('numb', 'red', 'green');
            
            if (completedHoursToday.includes(boxHour)) {
                box.classList.add('green'); // Target Met permanently
            } else if (boxHour < currentHour) {
                box.classList.add('red'); // Missed
            } else {
                box.classList.add('numb'); // Future or Current (Not complete yet)
            }
        });
    }

    // ==========================================\
    // 6. SCHEDULED PRAYER TIMER LOGIC
    // ==========================================\
    function formatTimerDisplay(seconds, element) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        element.textContent = `${m}:${s}`;
    }

    function resetScheduledState() {
        clearInterval(prayerInterval);
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
        isPrayerActive = false;
        isPrayerComplete = false;
        activePrayerType = null;
        secondsElapsed = 0;
        formatTimerDisplay(SCHEDULED_TARGET_SECONDS, scheduledTimerDisplay);
        scheduledBtn.textContent = 'Start Praying';
        scheduledBtn.classList.remove('btn-halt', 'btn-record');
        scheduledBtn.classList.add('prayer-btn');
        subTabBtns.forEach(b => b.classList.remove('locked'));
    }

    scheduledBtn.addEventListener('click', async () => {
        if (!isPrayerActive) {
            // Consent Notification Modal Block
            const consent = await showCustomModal('Audio Consent', 'This session will play background worship instrumental. Allow audio playback?', true);
            if(consent) playRandomAudio();
            
            isPrayerActive = true;
            isPrayerComplete = false;
            activePrayerType = 'scheduled';
            secondsElapsed = 0;
            
            scheduledBtn.textContent = 'Halt Prayer';
            scheduledBtn.classList.replace('prayer-btn', 'btn-halt');
            subTabBtns.forEach(b => { if(!b.classList.contains('active')) b.classList.add('locked'); });
            
            prayerInterval = setInterval(() => {
                secondsElapsed++;
                const remaining = SCHEDULED_TARGET_SECONDS - secondsElapsed;
                
                if (remaining <= 0) {
                    clearInterval(prayerInterval);
                    isPrayerComplete = true;
                    formatTimerDisplay(0, scheduledTimerDisplay);
                    backgroundAudio.pause();
                    
                    scheduledBtn.textContent = 'Record Session';
                    scheduledBtn.classList.replace('btn-halt', 'btn-record');
                } else {
                    formatTimerDisplay(remaining, scheduledTimerDisplay);
                }
            }, 1000);
        } else {
            if (isPrayerComplete) {
                syncSessionRecord('scheduled', SCHEDULED_TARGET_SECONDS);
                resetScheduledState();
            } else {
                // Halting Warning Modal
                const halt = await showCustomModal('Halt Prayer', 'Are you sure you want to stop this scheduled session before completion? Progress will be lost.', true);
                if (halt) resetScheduledState();
            }
        }
    });

    // ==========================================\
    // 7. FREE-WILL PRAYER TIMER LOGIC
    // ==========================================\
    function resetFreewillState() {
        clearInterval(prayerInterval);
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
        isPrayerActive = false;
        activePrayerType = null;
        secondsElapsed = 0;
        formatTimerDisplay(0, freewillTimerDisplay);
        freewillBtn.textContent = 'Start Praying';
        freewillBtn.classList.remove('btn-halt', 'btn-record');
        freewillBtn.classList.add('prayer-btn');
        subTabBtns.forEach(b => b.classList.remove('locked'));
    }

    freewillBtn.addEventListener('click', async () => {
        if (!isPrayerActive) {
            const consent = await showCustomModal('Audio Consent', 'Allow background audio for this free-flow session?', true);
            if(consent) playRandomAudio();

            isPrayerActive = true;
            activePrayerType = 'freewill';
            secondsElapsed = 0;
            
            freewillBtn.textContent = 'Halt & Record Session';
            freewillBtn.classList.replace('prayer-btn', 'btn-halt');
            subTabBtns.forEach(b => { if(!b.classList.contains('active')) b.classList.add('locked'); });
            
            prayerInterval = setInterval(() => {
                secondsElapsed++;
                formatTimerDisplay(secondsElapsed, freewillTimerDisplay);
            }, 1000);
        } else {
            // Halt warning modal specific to saving elapsed time
            const m = Math.floor(secondsElapsed / 60);
            const s = secondsElapsed % 60;
            const halt = await showCustomModal('Halt & Record', `You have prayed for ${m}m ${s}s. Halt and save this free-flow session to the cloud?`, true);
            
            if (halt) {
                clearInterval(prayerInterval);
                backgroundAudio.pause();
                syncSessionRecord('freewill', secondsElapsed);
                resetFreewillState();
            }
        }
    });

    // ==========================================\
    // 8. AI ASSISTANT LOGIC
    // ==========================================\
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiInput = document.getElementById('ai-chat-input');
    const aiResponseArea = document.getElementById('ai-response-area');

    if (aiSendBtn && aiInput) {
        aiSendBtn.addEventListener('click', async () => {
            const prompt = aiInput.value.trim();
            if (!prompt) return;

            aiResponseArea.innerHTML += `<p class="user-msg">${prompt}</p>`;
            aiInput.value = '';
            aiResponseArea.innerHTML += `<p id="ai-loading" class="sys-msg">Guide is typing...</p>`;
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

    // ==========================================\
    // 9. PUSH NOTIFICATIONS & PDF AVAILABILITY 
    // ==========================================\
    const btnAllowPush = document.getElementById('btn-allow-push');
    const notificationPrompt = document.getElementById('notification-prompt');

    if ('Notification' in window && navigator.serviceWorker) {
        if (Notification.permission === 'default') {
            notificationPrompt.style.display = 'block';
        }
        btnAllowPush.addEventListener('click', () => {
            Notification.requestPermission().then(async permission => {
                if (permission === 'granted') {
                    notificationPrompt.style.display = 'none';
                    await showCustomModal('Notifications Enabled', 'You will now receive silent push screen reminders at the start of every hour.');
                }
            });
        });
    }

    let lastNotifiedHour = -1;
    function checkHourAndNotify() {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour !== lastNotifiedHour && now.getMinutes() === 0) {
            lastNotifiedHour = currentHour;
            if (Notification.permission === 'granted' && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('Anaptixi Prayer Time', {
                        body: `It is exactly ${currentHour}:00. Time for your 5-minute scheduled prayer!`,
                        icon: 'ANAPTIXI LOGO.png',
                        tag: 'hourly-prayer'
                    });
                });
            }
        }
    }

    function checkPdfButtonAvailability() {
        const btnDownload = document.getElementById('btn-download-report');
        if (!btnDownload) return;
        const currentHour = new Date().getHours();
        
        // Allowed between 11PM and 12AM (Hour 23)
        if (currentHour === 23) {
            btnDownload.disabled = false;
            btnDownload.style.cursor = 'pointer';
            btnDownload.style.backgroundColor = '#d97706'; // Active state color
        } else {
            btnDownload.disabled = true;
            btnDownload.style.cursor = 'not-allowed';
            btnDownload.style.backgroundColor = '#64748b'; // Disabled state color
        }
    }

    const btnDownload = document.getElementById('btn-download-report');
    if (btnDownload) {
        btnDownload.addEventListener('click', () => {
            const element = document.getElementById('tab-progress');
            html2pdf().from(element).save(`Anaptixi_Report_${activeUser.handle}_${new Date().toDateString()}.pdf`);
        });
    }

    // ==========================================\
    // 10. SYSTEM LOOP & INITIALIZATION
    // ==========================================\
    fetchMedia();
    fetchProgressData();
    
    // Monitors logic routines every second 
    setInterval(() => {
        updateHourGrid();
        checkPdfButtonAvailability();
        checkHourAndNotify();
    }, 1000); 

});