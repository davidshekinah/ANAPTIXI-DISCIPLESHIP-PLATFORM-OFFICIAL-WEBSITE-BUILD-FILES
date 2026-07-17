/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - HOME TAB SCRIPT
 * File: home.js
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 0. CUSTOM IN-APP MODAL ENGINE
    // ==========================================
    function showCustomModal(message, title = "Notification") {
        return new Promise((resolve) => {
            let overlay = document.getElementById('custom-modal-overlay');
            
            // Dynamically inject the modal HTML if it doesn't already exist
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'custom-modal-overlay';
                overlay.innerHTML = `
                    <div class="custom-modal-content">
                        <h2 id="custom-modal-title"></h2>
                        <p id="custom-modal-message"></p>
                        <div class="custom-modal-actions">
                            <button id="custom-modal-btn-confirm" class="submit-btn">OK</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);
            }

            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const confirmBtn = document.getElementById('custom-modal-btn-confirm');

            titleEl.textContent = title;
            messageEl.textContent = message;

            overlay.style.display = 'flex';
            
            // Smooth fade-in transition logic
            void overlay.offsetWidth; 
            overlay.style.opacity = '1';

            const closeModal = () => {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                    confirmBtn.removeEventListener('click', onConfirm);
                    resolve(true);
                }, 300); 
            };

            const onConfirm = () => {
                closeModal();
            };

            confirmBtn.addEventListener('click', onConfirm);
        });
    }
    
    // ==========================================
    // 1. END OF DAY COUNTDOWN TIMER
    // ==========================================
    const tickerElement = document.getElementById('countdown-ticker');

    function updateCountdown() {
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const diff = endOfDay - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (tickerElement) {
            tickerElement.textContent = `You have ${hours} Hours ${minutes} Minutes ${seconds} Seconds till end of day. We trust that your day has been productive thus far? Continue grinding, God is for you`;
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // ==========================================
    // 2. UNAVAILABLE TABS HANDLER
    // ==========================================
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            if (e.target.getAttribute('data-status') === 'unavailable') {
                e.preventDefault();
                const tabName = e.target.textContent.trim();
                await showCustomModal(`${tabName} Tab is currently unavailable, check back later. blessings!`, "Feature Unavailable");
            }
        });
    });

    // ==========================================
    // 3. UI STATE & MODAL MANAGERS
    // ==========================================
    const loginBtn = document.getElementById('nav-login-btn'); 
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = document.getElementById('close-login-modal');
    
    // Profile Modal specific variables
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const logoutBtn = document.getElementById('logout-btn');

    // Toggle Variables
    const tabRegister = document.getElementById('nav-tab-register');
    const tabLogin = document.getElementById('nav-tab-login');
    const viewRegister = document.getElementById('register-component');
    const viewLogin = document.getElementById('login-component');

    function switchAuthView(viewName) {
        if (viewName === 'login') {
            viewRegister.style.display = 'none';
            viewLogin.style.display = 'block';
            tabRegister.classList.remove('active');
            tabLogin.classList.add('active');
        } else {
            viewLogin.style.display = 'none';
            viewRegister.style.display = 'block';
            tabLogin.classList.remove('active');
            tabRegister.classList.add('active');
        }
    }

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthView('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthView('register'));

    // Dynamic Navigation Icon Function
    function updateNavToProfile(userData) {
        if (userData.profilePic) {
            loginBtn.innerHTML = `<img src="${userData.profilePic}" alt="Profile" class="nav-profile-pic">`;
            loginBtn.style.padding = '0';
            loginBtn.style.borderColor = 'var(--accent-color)';
        }
        
        document.getElementById('profile-display-pic').src = userData.profilePic || "";
        document.getElementById('profile-display-fn').textContent = userData.firstName || "";
        document.getElementById('profile-display-sn').textContent = userData.surname || "";
        document.getElementById('profile-display-un').textContent = userData.handle || "";
        document.getElementById('profile-display-age').textContent = userData.age || "";
        
        document.body.classList.add('logged-in');
    }

    const activeSession = localStorage.getItem('anaptixi_active_user');
    if (activeSession) {
        updateNavToProfile(JSON.parse(activeSession));
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (document.body.classList.contains('logged-in')) {
                profileModal.style.display = 'flex'; 
            } else {
                const isReturning = localStorage.getItem('anaptixi_returning_user');
                if (isReturning === 'true') {
                    switchAuthView('login'); 
                } else {
                    switchAuthView('register');
                }
                loginModal.style.display = 'flex'; 
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            localStorage.removeItem('anaptixi_active_user');
            document.body.classList.remove('logged-in');
            
            loginBtn.innerHTML = `<svg id="default-user-svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            loginBtn.style.padding = '';
            loginBtn.style.borderColor = '';
            
            profileModal.style.display = 'none';
            await showCustomModal("You have safely logged out.", "Session Ended");
            window.scrollTo(0,0);
        });
    }

    if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.style.display = 'none');
    if (closeProfileModal) closeProfileModal.addEventListener('click', () => profileModal.style.display = 'none');


    // ==========================================
    // 4. OTHER MODALS (Join Us & Ask)
    // ==========================================
    const joinFormLink = document.getElementById('join-form-link');
    const joinModal = document.getElementById('join-modal');
    const closeJoinModal = document.getElementById('close-join-modal');

    if (joinFormLink) joinFormLink.addEventListener('click', (e) => { e.preventDefault(); joinModal.style.display = 'flex'; });
    if (closeJoinModal) closeJoinModal.addEventListener('click', () => joinModal.style.display = 'none');

    const askBubble = document.getElementById('ask-bubble');
    const askModal = document.getElementById('ask-modal');
    const closeAskModal = document.getElementById('close-ask-modal');

    if (askBubble) askBubble.addEventListener('click', () => askModal.style.display = 'flex');
    if (closeAskModal) closeAskModal.addEventListener('click', () => askModal.style.display = 'none');


    // ==========================================
    // 5. DYNAMIC REGISTRATION FORM LOGIC 
    // ==========================================
    const eduSelect = document.getElementById('edu-status');
    const dynamicEduSections = document.querySelectorAll('.dynamic-edu-section');

    if (eduSelect) {
        eduSelect.addEventListener('change', (e) => {
            dynamicEduSections.forEach(section => section.style.display = 'none');
            const targetSection = document.getElementById(`edu-${e.target.value}`);
            if (targetSection) targetSection.style.display = 'block';
        });
    }


    // ==========================================
    // 6. ANAPTIXI KEY CALCULATION & REGISTRATION 
    // ==========================================
    function calculateExpectedKey(firstName) {
        return firstName.toUpperCase().split('').map(char => {
            const code = char.charCodeAt(0) - 64; 
            return (code > 0 && code <= 26) ? code : '';
        }).join('');
    }

    const registerForm = document.getElementById('register-form');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstName = document.getElementById('reg-firstname').value.trim();
            const surname = document.getElementById('reg-surname').value.trim();
            const enteredKey = document.getElementById('reg-anaptixi-key').value.trim();
            const age = document.getElementById('reg-age').value.trim();
            const fileInput = document.getElementById('reg-profile-pic');
            const password = document.getElementById('reg-password').value;
            
            const expectedKey = calculateExpectedKey(firstName);

            if (enteredKey !== expectedKey) {
                await showCustomModal("Incorrect Anaptixi Key, contact the Admin for an Anaptixi key if you haven't or enter the key correctly if you have", "Authentication Error");
                return; 
            }

            let profilePicBase64 = "";
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                profilePicBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            }

            try {
                const response = await fetch('/.netlify/functions/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, surname, anaptixiKey: enteredKey, age, profilePicBase64, password })
                });

                const result = await response.json();

                if (response.ok) {
                    await showCustomModal(`Success! Your Anaptixi Identity has been created: ${result.handle}`, "Identity Registered");
                    localStorage.setItem('anaptixi_returning_user', 'true');
                    registerForm.reset();
                    if (loginModal) loginModal.style.display = 'none';
                } else {
                    await showCustomModal(result.message || "An error occurred during registration.", "Registration Failed");
                }

            } catch (error) {
                console.error("Registration Transmission error:", error);
                await showCustomModal("Network error: Could not reach the registration server.", "Connection Error");
            }
        });
    }

    // ==========================================
    // 7. LOGIN INTERCEPTION & CACHING
    // ==========================================
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const identity = document.getElementById('login-identity').value.trim();
            const securityKey = document.getElementById('login-security-key').value;

            try {
                const response = await fetch('/.netlify/functions/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identity, securityKey })
                });

                const result = await response.json();

                if (response.ok) {
                    await showCustomModal(`Login granted! Welcome back, ${result.user.firstName}.`, "Access Granted");
                    
                    localStorage.setItem('anaptixi_returning_user', 'true');
                    localStorage.setItem('anaptixi_active_user', JSON.stringify(result.user));
                    
                    updateNavToProfile(result.user);
                    
                    loginForm.reset();
                    if (loginModal) loginModal.style.display = 'none';
                } else {
                    await showCustomModal(result.message || "Invalid credentials.", "Login Failed");
                }

            } catch (error) {
                console.error("Login Transmission error:", error);
                await showCustomModal("Network error: Could not reach the login server.", "Connection Error");
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === joinModal) joinModal.style.display = 'none';
        if (e.target === askModal) askModal.style.display = 'none';
        if (e.target === profileModal) profileModal.style.display = 'none';
    });
});