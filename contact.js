/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - CONTACT TAB SCRIPT
 * File: contact.js
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. END OF DAY COUNTDOWN TIMER
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

    // 2. UNAVAILABLE TABS HANDLER
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-status') === 'unavailable') {
                e.preventDefault();
                const tabName = e.target.textContent.trim();
                alert(`${tabName} Tab is currently unavailable, check back later. blessings!`);
            }
        });
    });

    // 3. UI STATE & MODAL MANAGERS
    const loginBtn = document.getElementById('nav-login-btn'); 
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = document.getElementById('close-login-modal');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const logoutBtn = document.getElementById('logout-btn');

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
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('anaptixi_active_user');
            document.body.classList.remove('logged-in');
            loginBtn.innerHTML = `<svg id="default-user-svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            loginBtn.style.padding = '';
            loginBtn.style.borderColor = '';
            profileModal.style.display = 'none';
            alert("You have safely logged out.");
            window.scrollTo(0,0);
        });
    }

    if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.style.display = 'none');
    if (closeProfileModal) closeProfileModal.addEventListener('click', () => profileModal.style.display = 'none');

    // 4. ASK A QUESTION BUBBLE MODAL
    const askBubble = document.getElementById('ask-bubble');
    const askModal = document.getElementById('ask-modal');
    const closeAskModal = document.getElementById('close-ask-modal');

    if (askBubble) askBubble.addEventListener('click', () => askModal.style.display = 'flex');
    if (closeAskModal) closeAskModal.addEventListener('click', () => askModal.style.display = 'none');

    // 5. ANAPTIXI KEY CALCULATION & REGISTRATION SUBMISSION
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
                alert("Incorrect Anaptixi Key, contact the Admin for an Anaptixi key if you haven't or enter the key correctly if you have");
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
                    alert(`Success! Your Anaptixi Identity has been created: ${result.handle}`);
                    localStorage.setItem('anaptixi_returning_user', 'true');
                    registerForm.reset();
                    if (loginModal) loginModal.style.display = 'none';
                } else {
                    alert(result.message || "An error occurred during registration.");
                }
            } catch (error) {
                console.error("Registration error:", error);
                alert("Network error: Could not reach the registration server.");
            }
        });
    }

    // 6. LOGIN INTERCEPTION & CACHING
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
                    alert(`Login granted! Welcome back, ${result.user.firstName}.`);
                    localStorage.setItem('anaptixi_returning_user', 'true');
                    localStorage.setItem('anaptixi_active_user', JSON.stringify(result.user));
                    updateNavToProfile(result.user);
                    loginForm.reset();
                    if (loginModal) loginModal.style.display = 'none';
                } else {
                    alert(result.message || "Invalid credentials.");
                }
            } catch (error) {
                console.error("Login error:", error);
                alert("Network error: Could not reach the login server.");
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === askModal) askModal.style.display = 'none';
        if (e.target === profileModal) profileModal.style.display = 'none';
    });
});