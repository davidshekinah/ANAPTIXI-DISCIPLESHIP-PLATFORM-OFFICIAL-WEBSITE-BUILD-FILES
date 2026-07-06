/**
 * ANAPTIXI DISCIPLESHIP PLATFORM - HOME TAB SCRIPT
 * File: home.js
 * Description: Handles DOM manipulation, interactivity, auth toggling, and backend communication.
 */

document.addEventListener('DOMContentLoaded', () => {
    
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
        link.addEventListener('click', (e) => {
            if (e.target.getAttribute('data-status') === 'unavailable') {
                e.preventDefault();
                const tabName = e.target.textContent.trim();
                alert(`${tabName} Tab is currently unavailable, check back later. blessings!`);
            }
        });
    });

    // ==========================================
    // 3. AUTHENTICATION MODAL & DEVICE TRACKING TOGGLE
    // ==========================================
    const loginBtn = document.getElementById('nav-login-btn'); // Now the User SVG Icon
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = document.getElementById('close-login-modal');

    // Toggle Variables
    const tabRegister = document.getElementById('nav-tab-register');
    const tabLogin = document.getElementById('nav-tab-login');
    const viewRegister = document.getElementById('register-component');
    const viewLogin = document.getElementById('login-component');

    // Function to handle the UI switch between Login and Register
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

    // Manual Tab Clicking
    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthView('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthView('register'));

    // Open Modal & Check Local Storage
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            // Check if this device has logged in or registered before
            const isReturning = localStorage.getItem('anaptixi_returning_user');
            
            if (isReturning === 'true') {
                switchAuthView('login'); // Default to Login for returning users
            } else {
                switchAuthView('register'); // Default to Register for new devices
            }
            
            loginModal.style.display = 'flex';
        });
    }

    if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.style.display = 'none');


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
    // 5. DYNAMIC REGISTRATION FORM LOGIC (EDUCATIONAL STATUS)
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
    // 6. ANAPTIXI KEY CALCULATION & REGISTRATION SUBMISSION
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
                    
                    // Mark device as returning user
                    localStorage.setItem('anaptixi_returning_user', 'true');
                    
                    registerForm.reset();
                    if (loginModal) loginModal.style.display = 'none';
                } else {
                    alert(result.message || "An error occurred during registration.");
                }

            } catch (error) {
                console.error("Registration Transmission error:", error);
                alert("Network error: Could not reach the registration server.");
            }
        });
    }

    // ==========================================
    // 7. LOGIN INTERCEPTION & UNLOCKING TABS
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
                    alert(`Login granted! Welcome back, ${result.user.firstName}.`);
                    
                    // Mark device as returning user 
                    localStorage.setItem('anaptixi_returning_user', 'true');
                    
                    // UNLOCK THE RESTRICTED TABS BY ADDING CLASS TO BODY
                    document.body.classList.add('logged-in');
                    
                    loginForm.reset();
                    if (loginModal) loginModal.style.display = 'none';
                } else {
                    alert(result.message || "Invalid credentials.");
                }

            } catch (error) {
                console.error("Login Transmission error:", error);
                alert("Network error: Could not reach the login server.");
            }
        });
    }

    // Close modals when clicking outside of them
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) loginModal.style.display = 'none';
        if (e.target === joinModal) joinModal.style.display = 'none';
        if (e.target === askModal) askModal.style.display = 'none';
    });
});