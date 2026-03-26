// ==========================================
// SECTION 3: MODALS, LOADING SCREENS & AUTH
// ==========================================
function showModal(html, which = "#auth-modal") {
    document.getElementById('modal-bg').classList.add('active');
    document.querySelector(which).innerHTML = html; document.querySelector(which).classList.add('active');
}
function hideModal() {
    document.getElementById('modal-bg').classList.remove('active');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
}

window.showLoading = function(message = "Working...") {
    const txt = document.getElementById('loading-text');
    if(txt) txt.innerText = message;
    const scr = document.getElementById('loading-screen');
    if(scr) scr.classList.add('active');
}
window.hideLoading = function() {
    const scr = document.getElementById('loading-screen');
    if(scr) scr.classList.remove('active');
}

// --- 1. LOGIN & SIGNUP MODAL ---
window.showAuthModal = function(tab = 'login') {
    if (window.innerWidth <= 768) { sidebar.classList.remove('open'); sidebar.classList.add('closed'); }
    const isLogin = tab === 'login';
    
    showModal(`
      <div style="text-align:center; padding: 10px;">
          <h2 style="color:#2d3748; margin-top:0; margin-bottom:20px;">Platform ${isLogin ? 'Login' : 'Sign Up'}</h2>
          <form onsubmit="${isLogin ? 'doLogin(event)' : 'doSignup(event)'}">
              <input id="auth-email" type="email" placeholder="Email Address" required style="width:100%; padding:12px; margin-bottom:15px; border:2px solid #cbd5e0; border-radius:6px; box-sizing:border-box;">
              
              <div style="position: relative; width: 100%; margin-bottom:15px;">
                  <input id="auth-pass" type="password" placeholder="Password (8-20 characters)" required minlength="8" maxlength="20" style="width:100%; padding:12px; padding-right:40px; border:2px solid #cbd5e0; border-radius:6px; box-sizing:border-box; margin-bottom:0;">
                  <button type="button" onclick="togglePassword('auth-pass', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.2em; padding:0;">👁️</button>
              </div>
              
              <button class="btn-primary" type="submit" style="width: 100%; padding:12px; font-size:1.1em; margin-bottom: 15px;">Secure ${isLogin ? 'Login' : 'Sign Up'}</button>
          </form>
          
          <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
              <span class="link" onclick="showAuthModal('${isLogin ? 'signup' : 'login'}')" style="color: #718096;">
                  ${isLogin ? 'Create an account' : 'Already have an account? Login'}
              </span>
              ${isLogin ? `<span class="link" onclick="showForgotPassword()" style="color: #4299e1;">Forgot Password?</span>` : ''}
          </div>
      </div>
    `);
}

// --- 2. TOGGLE PASSWORD VISIBILITY ---
window.togglePassword = function(inputId, btnElement) {
    const passInput = document.getElementById(inputId);
    if (passInput.type === 'password') { passInput.type = 'text'; btnElement.innerText = '🙈'; } 
    else { passInput.type = 'password'; btnElement.innerText = '👁️'; }
}

// --- 3. FORGOT PASSWORD ---
window.showForgotPassword = function() {
    showModal(`
      <div style="text-align:center; padding: 10px;">
          <h2 style="color:#2d3748; margin-top:0; margin-bottom:10px;">Reset Password</h2>
          <p style="font-size:0.9em; color:#718096; margin-bottom:20px;">Enter your email and we'll send a secure reset link.</p>
          <form onsubmit="doPasswordReset(event)">
              <input id="reset-email" type="email" placeholder="Email Address" required style="width:100%; padding:12px; margin-bottom:15px; border:2px solid #cbd5e0; border-radius:6px; box-sizing:border-box;">
              <button class="btn-primary" type="submit" style="width: 100%; padding:12px; font-size:1.1em; margin-bottom: 15px;">Send Reset Link</button>
          </form>
          <div><span class="link" onclick="showAuthModal('login')" style="font-size: 0.9em; color: #718096;">⬅ Back to Login</span></div>
      </div>
    `);
}

// --- 4. AUTH LOGIC ---
window.doSignup = async function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    
    if (pass.length < 8 || pass.length > 20) {
        return alert("Password must be between 8 and 20 characters.");
    }

    showLoading("Creating Account...");
    const { data, error } = await supabase.auth.signUp({ email: email, password: pass });
    hideLoading();
    
    if (error) alert("Sign up error: " + error.message);
    else { 
        alert("✅ Account created! Please check your email inbox (and spam folder) to verify your account."); 
        hideModal(); 
    }
}

window.doLogin = async function(e) { 
    e.preventDefault(); 
    showLoading("Authenticating...");
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: pass }); 
    hideLoading();
    if (error) alert("Login failed: " + error.message); 
    else { setUserInfo(data.user); hideModal(); showDashboard('overview'); } 
}

window.doPasswordReset = async function(e) {
    e.preventDefault();
    showLoading("Sending link...");
    const email = document.getElementById('reset-email').value;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    hideLoading();
    if (error) alert("Error: " + error.message);
    else { alert("✅ Password reset link sent! Check your inbox/spam."); showAuthModal('login'); }
}

window.logout = async function() { await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); }

function setUserInfo(user) {
    currentUser = user;
    const userBar = document.getElementById('user-bar');
    if (userBar) userBar.textContent = user ? ("👤 " + user.email) : 'Not logged in';
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.textContent.includes('Logout') || item.textContent.includes('Login')) {
            if (user) { item.innerHTML = '🚪 Logout'; item.onclick = logout; item.classList.add('danger'); } 
            else { item.innerHTML = '🔑 Login'; item.onclick = () => showAuthModal('login'); item.classList.remove('danger'); }
        }
    });
}

// --- 5. DETECT RESET LINK ---
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
        showModal(`
          <div style="text-align:center; padding: 10px;">
              <h2 style="color:#2d3748; margin-top:0; margin-bottom:20px;">Set New Password</h2>
              <form onsubmit="doUpdatePassword(event)">
                  <div style="position: relative; width: 100%; margin-bottom:15px;">
                      <input id="new-pass" type="password" placeholder="New password (8-20 characters)" required minlength="8" maxlength="20" style="width:100%; padding:12px; padding-right:40px; border:2px solid #cbd5e0; border-radius:6px; box-sizing:border-box; margin-bottom:0;">
                      <button type="button" onclick="togglePassword('new-pass', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1.2em; padding:0;">👁️</button>
                  </div>
                  <button class="btn-primary" type="submit" style="width: 100%; padding:12px; font-size:1.1em; background:#48bb78;">Save Password</button>
              </form>
          </div>
        `);
    } else {
        setUserInfo(session?.user || null); 
    }
});

window.doUpdatePassword = async function(e) {
    e.preventDefault();
    const newPass = document.getElementById('new-pass').value;
    
    if (newPass.length < 8 || newPass.length > 20) {
        return alert("Password must be between 8 and 20 characters.");
    }

    showLoading("Updating password...");
    const { error } = await supabase.auth.updateUser({ password: newPass });
    hideLoading();
    if (error) alert("Error: " + error.message);
    else { alert("✅ Password updated securely!"); hideModal(); showDashboard('overview'); }
}

supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    showDashboard('overview');
});
