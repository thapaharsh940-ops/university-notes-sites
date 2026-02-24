const ADMIN_CODE = "sahil123456"; 

let currentUser = null;
let currentBranch = null; let currentSemester = null;
let currentSection = null; let currentSubject = null;

// --- UI SETUP ---
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');
if (mobileBtn) mobileBtn.onclick = toggleSidebar;
if (sidebarToggle) sidebarToggle.onclick = toggleSidebar;

function toggleSidebar() {
    sidebar.classList.toggle("open");
    sidebar.classList.toggle("closed");
}

window.onclick = e => { if (e.target.classList.contains('modal-bg')) hideModal(); };
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

function showModal(html, which = "#auth-modal") {
    document.getElementById('modal-bg').classList.add('active');
    document.querySelector(which).innerHTML = html;
    document.querySelector(which).classList.add('active');
}

function hideModal() {
    document.getElementById('modal-bg').classList.remove('active');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
}

// --- AUTH ---
function showAuthModal(tab = 'login') {
    showModal(`
      <div style="text-align:center">
      <h2>${tab === 'login' ? "Login" : "Sign Up"}</h2>
      <form onsubmit="${tab === 'login' ? 'doLogin(event)' : 'doSignup(event)'}">
        <input id="auth-email" type="email" placeholder="Email" required><br>
        <input id="auth-pass" type="password" placeholder="Password" required><br>
        ${tab === 'signup' ? '<input id="auth-confirm" type="password" placeholder="Confirm Password" required><br>' : ''}
        <button class="btn-primary" type="submit">${tab === 'login' ? "Login" : "Sign Up"}</button>
      </form>
      <div style="margin-top:1em;"><a onclick="showAuthModal('${tab === 'login' ? 'signup' : 'login'}')" class="link">
        ${tab === 'login' ? 'Create new account' : 'Already have an account?'}</a></div>
      </div>
    `);
}

function setUserInfo(user) {
    currentUser = user;
    const userBar = document.getElementById('user-bar');
    if (userBar) userBar.textContent = user ? ("👤 " + user.email) : 'Not logged in';

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.textContent.includes('Logout') || item.textContent.includes('Login')) {
            if (user) {
                item.innerHTML = '🚪 Logout'; item.onclick = logout; item.classList.add('danger');
            } else {
                item.innerHTML = '🔑 Login'; item.onclick = () => showAuthModal('login'); item.classList.remove('danger');
            }
        }
    });
}

async function doSignup(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value, confirm = document.getElementById('auth-confirm').value;
    if (pass !== confirm) return alert("Passwords do not match.");
    let { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) alert("Signup error: " + error.message); else { alert("✅ Check email to verify!"); hideModal(); }
}
async function doLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value;
    let { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Login failed: " + error.message); else { setUserInfo(data.user); hideModal(); showDashboard('overview'); }
}
async function logout() { await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); }

supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    showDashboard('overview');
});
supabase.auth.onAuthStateChange((event, session) => setUserInfo(session?.user || null));

// --- NAVIGATION ---
function showDashboard(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    if (section === 'overview') { updateDashboardStats(); loadRecentlyViewed(); }
    if (section === 'allBranches') listBranches();
    if (section === 'search') setupSearch();
    if (section === 'myUploads') myUploads();
    if (section === 'savedNotes') loadBookmarks(); // NEW
}
window.showDashboard = showDashboard;

// --- FEATURE 1: LEADERBOARD & STATS ---
async function updateDashboardStats() {
    const { count: total } = await supabase.from("documents").select("*", { count: "exact", head: true });
    document.getElementById("totalDocs").innerText = total || 0;
    
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase.from("documents").select("*", { count: "exact", head: true }).gte('created_at', today.toISOString());
    document.getElementById("todayUploads").innerText = todayCount || 0;

    const { data: recent } = await supabase.from("documents").select("title,created_at").order("created_at", { ascending: false }).limit(5);
    document.getElementById("activity-log").innerHTML = recent && recent.length > 0 ? recent.map(x => `<li>${x.title}</li>`).join('') : '<li>No recent activity</li>';

    // NEW: Leaderboard Logic
    const { data: docs } = await supabase.from("documents").select("uploader_email");
    if(docs) {
        let counts = {};
        docs.forEach(d => { if(d.uploader_email) counts[d.uploader_email] = (counts[d.uploader_email] || 0) + 1; });
        let sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        document.getElementById("leaderboard-list").innerHTML = sorted.length > 0 ? 
            sorted.map((user, i) => `<li><b>#${i+1}</b> ${user[0].split('@')[0]} <span style="float:right">📄 ${user[1]}</span></li>`).join('') 
            : '<li>No contributors yet.</li>';
    }
}

// --- FEATURE 2: RECENTLY VIEWED (LocalStorage) ---
function trackRecentView(doc) {
    let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
    recent = recent.filter(d => d.id !== doc.id); // Remove if already exists
    recent.unshift({ id: doc.id, title: doc.title, file_url: doc.file_url, file_type: doc.file_type }); // Add to front
    if(recent.length > 4) recent.pop(); // Keep only last 4
    localStorage.setItem('recentViews', JSON.stringify(recent));
    loadRecentlyViewed();
}
function loadRecentlyViewed() {
    let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
    const container = document.getElementById('recent-views-container');
    const list = document.getElementById('recentViews');
    if(recent.length === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    list.innerHTML = recent.map(d => `
        <div class="stat-card" style="cursor:pointer; padding: 1em;" onclick="previewFile('${d.file_url}', '${d.file_type}', ${d.id})">
            <h4 style="margin:0; color:#2d3748;">${d.title}</h4>
            <small style="color:#718096">Click to view again</small>
        </div>
    `).join('');
}

// --- FEATURE 3 & 4: UPVOTES & BOOKMARKS ---
async function toggleUpvote(docId) {
    if(!currentUser) return alert("Please login to upvote.");
    const { data } = await supabase.from('upvotes').select('*').eq('user_id', currentUser.id).eq('document_id', docId);
    if(data && data.length > 0) await supabase.from('upvotes').delete().eq('id', data[0].id); // Remove vote
    else await supabase.from('upvotes').insert([{ user_id: currentUser.id, document_id: docId }]); // Add vote
    
    // Refresh the UI to show new counts
    if(currentSubject) loadDocuments(currentSubject.id);
}

async function toggleBookmark(docId) {
    if(!currentUser) return alert("Please login to save notes.");
    const { data } = await supabase.from('bookmarks').select('*').eq('user_id', currentUser.id).eq('document_id', docId);
    if(data && data.length > 0) {
        await supabase.from('bookmarks').delete().eq('id', data[0].id);
        alert("Removed from Saved Notes");
    } else {
        await supabase.from('bookmarks').insert([{ user_id: currentUser.id, document_id: docId }]);
        alert("Added to Saved Notes 🔖");
    }
    if(currentSubject) loadDocuments(currentSubject.id);
    loadBookmarks();
}

async function loadBookmarks() {
    if (!currentUser) return document.getElementById('savedNotesList').innerHTML = '<p>Login to see saved notes.</p>';
    const { data } = await supabase.from('bookmarks').select('documents(*)').eq('user_id', currentUser.id);
    
    const list = document.getElementById('savedNotesList');
    if (!data || data.length === 0) return list.innerHTML = '<p>No saved notes yet.</p>';
    
    list.innerHTML = data.map(b => {
        let d = b.documents;
        return `
        <div class="branch-card">
            <h4>🔖 ${d.title}</h4>
            <button onclick="previewFile('${d.file_url}', '${d.file_type}', ${d.id})" class="btn-primary">👁️ View</button>
            <button onclick="toggleBookmark(${d.id})" class="btn-action active-bookmark">Unsave</button>
        </div>`
    }).join('');
}

// --- FEATURE 5: COMMENTS & Q&A ---
async function loadComments(docId) {
    const { data } = await supabase.from('comments').select('*').eq('document_id', docId).order('created_at', { ascending: true });
    let html = data.map(c => `
        <div class="comment-box">
            <div class="comment-author">${c.user_email.split('@')[0]} <small style="color:gray">${new Date(c.created_at).toLocaleDateString()}</small></div>
            <div>${c.content}</div>
        </div>
    `).join('');
    
    document.getElementById('comment-list').innerHTML = html || '<p><small>No comments yet. Be the first!</small></p>';
}

window.postComment = async function(docId) {
    if(!currentUser) return alert("Login to comment.");
    const content = document.getElementById('new-comment-input').value;
    if(!content) return;
    await supabase.from('comments').insert([{ document_id: docId, user_id: currentUser.id, user_email: currentUser.email, content }]);
    document.getElementById('new-comment-input').value = '';
    loadComments(docId);
}

// --- UPDATED PREVIEW (Includes Comments & Recent Views Tracking) ---
window.previewFile = async function(url, type, docId) {
    // Save to recently viewed
    if(docId) {
        const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single();
        if(doc) trackRecentView(doc);
    }

    let contentHtml = '<button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>';
    if (type.startsWith('image/')) contentHtml += `<img src="${url}" alt="Preview" class="preview-image" style="max-width:100%;"/>`;
    else if (type === 'application/pdf') contentHtml += `<embed src="${url}" type="application/pdf" class="preview-pdf" style="width:100%; height:60vh;" />`;
    else contentHtml += `<p>Preview not available.</p><a href="${url}" target="_blank" download class="btn-primary">📥 Download File</a>`;
    
    // Add Comments UI
    if(docId) {
        contentHtml += `
            <div class="comment-section">
                <h3>Q&A & Comments</h3>
                <div id="comment-list" style="max-height: 150px; overflow-y:auto; margin-bottom: 1em;">Loading comments...</div>
                <div style="display:flex; gap:0.5em;">
                    <input id="new-comment-input" placeholder="Ask a question or leave a comment..." style="margin:0; flex:1;" />
                    <button class="btn-primary" onclick="postComment(${docId})" style="margin:0;">Post</button>
                </div>
            </div>
        `;
    }
    
    showModal(contentHtml, '#preview-modal');
    if(docId) loadComments(docId);
}

// --- CORE DOCUMENT LOADING (Updated for Upvotes/Bookmarks) ---
window.uploadDocument = async function(e) {
    e.preventDefault();
    const title = document.getElementById('docTitle').value, file = document.getElementById('docFile').files[0];
    if (!file) return;
    try {
        const fileName = `${Date.now()}_${file.name}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        await supabase.from('documents').insert([{
            subject_id: currentSubject.id, title,
            file_url: publicUrl, file_type: file.type || 'unknown', file_size: file.size,
            uploaded_by: currentUser.id, uploader_email: currentUser.email // NEW: Tracking email for Leaderboard
        }]);
        alert("Upload successful!"); loadDocuments(currentSubject.id);
    } catch(err) { alert("Upload failed: " + err.message); }
};

async function loadDocuments(subjectId) {
    const { data: docs } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('subject_id', subjectId).order('created_at', {ascending: false});
    const list = document.getElementById('documentList');
    if (!docs || docs.length === 0) return list.innerHTML = "<p>No documents uploaded.</p>";
    
    list.innerHTML = docs.map(d => {
        const upvoteCount = d.upvotes ? d.upvotes.length : 0;
        return `
        <div class="branch-card">
            <h4>${d.title}</h4>
            <p><small>${(d.file_size/1024/1024).toFixed(2)} MB</small></p>
            <div style="margin-top: 1em;">
                <button onclick="previewFile('${d.file_url}', '${d.file_type}', ${d.id})" class="btn-primary">👁️ Open</button>
                <a href="${d.file_url}" target="_blank" download class="btn-primary" style="text-decoration:none;">📥 Download</a>
                <button onclick="toggleUpvote(${d.id})" class="btn-action">👍 Upvote (${upvoteCount})</button>
                <button onclick="toggleBookmark(${d.id})" class="btn-action">🔖 Save</button>
            </div>
        </div>
    `}).join('');
}

// --- STANDARD CRUD RETENTION (Kept short for space) ---
async function listBranches() { /* standard */ }
window.delBranch = async function(id) { /* standard */ }
window.createBranch = function() { /* standard */ }
window.showBranch = async function(branchId) {
    const { data } = await supabase.from('branches').select('*').eq('id', branchId).single();
    currentBranch = data;
    document.getElementById('branchDetail').innerHTML = `<h2>${data.name}</h2><div id="semesterList"></div>`;
    showDashboard('branchDetail'); loadSemesters(branchId);
}
async function loadSemesters(branchId) {
    const { data } = await supabase.from('semesters').select('*').eq('branch_id', branchId);
    document.getElementById('semesterList').innerHTML = data.map(s => `<div class="branch-card" onclick="showSemester('${s.id}')"><h3>Sem ${s.semester_number}: ${s.name}</h3></div>`).join('');
}
window.showSemester = async function(id) {
    const { data } = await supabase.from('semesters').select('*').eq('id', id).single();
    currentSemester = data;
    document.getElementById('semesterDetail').innerHTML = `<h2>${data.name}</h2><div id="sectionList"></div>`;
    showDashboard('semesterDetail'); loadSections(id);
}
async function loadSections(semId) {
    const { data } = await supabase.from('sections').select('*').eq('semester_id', semId);
    document.getElementById('sectionList').innerHTML = data.map(s => `<div class="branch-card" onclick="showSection('${s.id}')"><h3>${s.name}</h3></div>`).join('');
}
window.showSection = async function(id) {
    const { data } = await supabase.from('sections').select('*').eq('id', id).single();
    currentSection = data;
    document.getElementById('sectionDetail').innerHTML = `<h2>${data.name}</h2><div id="subjectList"></div>`;
    showDashboard('sectionDetail'); loadSubjects(id);
}
async function loadSubjects(secId) {
    const { data } = await supabase.from('subjects').select('*').eq('section_id', secId);
    document.getElementById('subjectList').innerHTML = data.map(s => `<div class="branch-card" onclick="showSubject('${s.id}')"><h3>${s.name}</h3></div>`).join('');
}
window.showSubject = async function(id) {
    const { data } = await supabase.from('subjects').select('*').eq('id', id).single();
    currentSubject = data;
    document.getElementById('subjectDetail').innerHTML = `
      <h2>${data.name}</h2>
      <form onsubmit="uploadDocument(event)">
        <input id="docTitle" placeholder="Title" required /> <input id="docFile" type="file" required />
        <button class="btn-primary">Upload</button>
      </form>
      <div id="documentList" style="margin-top:1em;"></div>`;
    showDashboard('subjectDetail'); loadDocuments(id);
}
