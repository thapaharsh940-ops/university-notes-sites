// ==========================================
// SECTION 1: GLOBAL VARIABLES & ADMIN SETUP
// ==========================================
const ADMIN_CODE = "sahil12345"; 

let currentUser = null;
// Notes Variables
let currentBranch = null; let currentBatch = null; let currentSemester = null; let currentSection = null; let currentSubject = null;
// Workstation Variables
let wsBranch = null; let wsBatch = null; let wsSemester = null; let wsSection = null; let wsSubject = null;

// ==========================================
// SECTION 2: SIDEBAR & MOBILE MENU CONTROLS
// ==========================================
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');

if (mobileBtn) mobileBtn.onclick = toggleSidebar;
if (sidebarToggle) sidebarToggle.onclick = toggleSidebar;

function toggleSidebar() { sidebar.classList.toggle("open"); sidebar.classList.toggle("closed"); }

window.onclick = e => { 
    if (e.target.classList.contains('modal-bg')) hideModal(); 
    if (window.innerWidth <= 768) {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
            sidebar.classList.remove('open'); sidebar.classList.add('closed');
        }
    }
};

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

// ==========================================
// SECTION 3: MODAL (POPUP) MANAGEMENT
// ==========================================
function showModal(html, which = "#auth-modal") {
    document.getElementById('modal-bg').classList.add('active');
    document.querySelector(which).innerHTML = html;
    document.querySelector(which).classList.add('active');
}
function hideModal() {
    document.getElementById('modal-bg').classList.remove('active');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
}

// ==========================================
// SECTION 4: AUTHENTICATION (LOGIN & SIGNUP)
// ==========================================
function showAuthModal(tab = 'login') {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) { sidebar.classList.remove('open'); sidebar.classList.add('closed'); }
    showModal(`
      <div style="text-align:center">
      <h2>${tab === 'login' ? "Login" : "Sign Up"}</h2>
      <form onsubmit="${tab === 'login' ? 'doLogin(event)' : 'doSignup(event)'}">
        <input id="auth-email" type="email" placeholder="Email" required><br>
        <input id="auth-pass" type="password" placeholder="Password" required><br>
        <button class="btn-primary" type="submit">${tab === 'login' ? "Login" : "Sign Up"}</button>
      </form>
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
            if (user) { item.innerHTML = '🚪 Logout'; item.onclick = logout; item.classList.add('danger'); } 
            else { item.innerHTML = '🔑 Login'; item.onclick = () => showAuthModal('login'); item.classList.remove('danger'); }
        }
    });
}

window.doSignup = async function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value;
    let { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) alert("Signup error: " + error.message); else { alert("✅ Check email to verify!"); hideModal(); }
}
window.doLogin = async function(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value;
    let { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Login failed: " + error.message); else { setUserInfo(data.user); hideModal(); showDashboard('overview'); }
}
window.logout = async function() { await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); }

supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    showDashboard('overview');
});

// ==========================================
// SECTION 5: SAFE NAVIGATION & ROUTING
// (Wrapped in try/catch to prevent freezing)
// ==========================================
window.showDashboard = async function(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(section);
    if(target) target.classList.add('active');
    
    try {
        // Notes Routing
        if (section === 'overview') { await updateNotesStats(); loadRecentlyViewed(); }
        if (section === 'allBranches') listBranches();
        if (section === 'myUploads') myUploads();
        if (section === 'savedNotes') loadBookmarks();
        if (section === 'searchSection') showSearchPage();
        
        // Workstation Routing
        if (section === 'wsOverview') await updateWsStats();
        if (section === 'workstationHome') wsListBranches();

    } catch(err) {
        console.error("Routing error:", err);
    }

    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) { sidebar.classList.remove('open'); sidebar.classList.add('closed'); }
}

// ==========================================
// SECTION 6: DASHBOARD STATS (Separated)
// ==========================================
window.updateNotesStats = async function() {
    const { count: totalNotes } = await supabase.from("documents").select("*", { count: "exact", head: true });
    
    const { data: docs } = await supabase.from("documents").select("uploader_email");
    let sortedLeaderboard = [];
    if(docs) {
        let counts = {};
        docs.forEach(d => { if(d.uploader_email) counts[d.uploader_email] = (counts[d.uploader_email] || 0) + 1; });
        sortedLeaderboard = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5); 
    }

    const overviewSection = document.getElementById('overview');
    if(overviewSection) {
        overviewSection.innerHTML = `
            <h2 style="margin-bottom: 25px; color: #2d3748;">Notes Overview</h2>
            <div class="dash-grid">
                <div class="dash-card-premium bg-purple">
                    <h3>📚 Total Notes Uploaded</h3>
                    <div class="number">${totalNotes || 0}</div>
                </div>
            </div>
            <h3 style="color: #2d3748; margin-bottom: 15px;">🏆 Top Notes Contributors</h3>
            <ul style="list-style: none; padding: 0; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                ${sortedLeaderboard.length > 0 ? 
                    sortedLeaderboard.map((user, i) => `
                    <li style="padding: 15px 20px; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 1.1em; color: ${i === 0 ? '#d69e2e' : '#4a5568'};">#${i+1} &nbsp; ${user[0].split('@')[0]}</span> 
                        <span style="background: #ebf4ff; color: #3182ce; padding: 5px 10px; border-radius: 20px; font-weight: bold;">📄 ${user[1]} notes</span>
                    </li>`).join('') 
                    : '<li style="padding: 20px; text-align: center; color: #a0aec0;">No contributors yet.</li>'
                }
            </ul>
            <div id="recent-views-container" style="margin-top: 30px; display: none;">
                <h3 style="color: #2d3748;">🕒 Recently Viewed Notes</h3>
                <div id="recentViews" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        `;
    }
}

window.updateWsStats = async function() {
    let html = `<h2 style="margin-bottom: 25px; color: #2d3748;">Workstation Dashboard</h2>`;
    
    if(!currentUser) {
        html += `<div style="background: white; padding: 20px; border-radius: 8px;">Please login to view your Workstation Activity.</div>`;
    } else {
        const { count: myActs } = await supabase.from("assignments").select("*", { count: "exact", head: true }).eq('uploaded_by', currentUser.id);
        html += `
            <div class="dash-grid">
                <div class="dash-card-premium bg-green">
                    <h3>💻 Your Activity (Assignments Uploaded)</h3>
                    <div class="number">${myActs || 0}</div>
                </div>
            </div>
        `;
    }
    document.getElementById('wsOverview').innerHTML = html;
}

// ==========================================
// SECTION 7: RECENT VIEWS TRACKING
// ==========================================
function trackRecentView(doc) {
    let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
    recent = recent.filter(d => d.id !== doc.id); 
    recent.unshift({ id: doc.id, title: doc.title, file_url: doc.file_url, file_type: doc.file_type });
    if(recent.length > 4) recent.pop(); 
    localStorage.setItem('recentViews', JSON.stringify(recent));
    loadRecentlyViewed();
}
function loadRecentlyViewed() {
    let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
    const container = document.getElementById('recent-views-container');
    const list = document.getElementById('recentViews');
    if(!container || !list) return;
    if(recent.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    list.innerHTML = recent.map(d => `<div class="stat-card" style="cursor:pointer; padding: 1em; background: #f7fafc; border-left: 4px solid #4299e1;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')"><h4 style="margin:0; color:#2d3748;">${d.title}</h4></div>`).join('');
}

// ==========================================
// SECTION 8: SOCIAL FEATURES (UPVOTE, BOOKMARK, COMMENT)
// ==========================================
window.toggleUpvote = async function(docId) {
    if(!currentUser) return alert("Please login to upvote.");
    const { data } = await supabase.from('upvotes').select('*').eq('user_id', currentUser.id).eq('document_id', docId);
    if(data && data.length > 0) await supabase.from('upvotes').delete().eq('id', data[0].id);
    else await supabase.from('upvotes').insert([{ user_id: currentUser.id, document_id: docId }]);
    if(document.getElementById('subjectDetail').classList.contains('active') && currentSubject) loadDocuments(currentSubject.id);
}
window.toggleBookmark = async function(docId) {
    if(!currentUser) return alert("Please login to save notes.");
    const { data } = await supabase.from('bookmarks').select('*').eq('user_id', currentUser.id).eq('document_id', docId);
    if(data && data.length > 0) { await supabase.from('bookmarks').delete().eq('id', data[0].id); alert("Removed from Saved Notes"); } 
    else { await supabase.from('bookmarks').insert([{ user_id: currentUser.id, document_id: docId }]); alert("Added to Saved Notes 🔖"); }
    if(document.getElementById('subjectDetail').classList.contains('active') && currentSubject) loadDocuments(currentSubject.id);
    loadBookmarks();
}
async function loadBookmarks() {
    const list = document.getElementById('savedNotesList');
    if (!list) return;
    if (!currentUser) return list.innerHTML = '<p>Login to see saved notes.</p>';
    const { data } = await supabase.from('bookmarks').select('documents(*)').eq('user_id', currentUser.id);
    if (!data || data.length === 0) return list.innerHTML = '<p>No saved notes yet.</p>';
    list.innerHTML = data.map(b => {
        let d = b.documents; if(!d) return '';
        return `<div class="branch-card"><h4>🔖 ${d.title}</h4><button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary">👁️ View</button><button onclick="toggleBookmark('${d.id}')" class="btn-action active-bookmark">Unsave</button></div>`
    }).join('');
}
async function loadComments(docId) {
    const { data } = await supabase.from('comments').select('*').eq('document_id', docId).order('created_at', { ascending: true });
    let html = data?.map(c => `<div class="comment-box"><div class="comment-author">${c.user_email.split('@')[0]} <small style="color:gray">${new Date(c.created_at).toLocaleDateString()}</small></div><div>${c.content}</div></div>`).join('') || '<p><small>No comments yet.</small></p>';
    const commentList = document.getElementById('comment-list'); if(commentList) commentList.innerHTML = html;
}
window.postComment = async function(docId) {
    if(!currentUser) return alert("Login to comment.");
    const content = document.getElementById('new-comment-input').value; if(!content) return;
    await supabase.from('comments').insert([{ document_id: docId, user_id: currentUser.id, user_email: currentUser.email, content }]);
    document.getElementById('new-comment-input').value = ''; loadComments(docId);
}

// ==========================================
// SECTION 9: FILE PREVIEW MANAGER
// ==========================================
window.previewFile = async function(url, type, docId) {
    if(docId) {
        const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single();
        if(doc) trackRecentView(doc);
    }
    let contentHtml = '<button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>';
    if (type.startsWith('image/')) contentHtml += `<img src="${url}" alt="Preview" class="preview-image" style="max-width:100%;"/>`;
    else if (type === 'application/pdf') contentHtml += `<embed src="${url}" type="application/pdf" class="preview-pdf" style="width:100%; height:60vh;" />`;
    else contentHtml += `<p>Preview not available.</p><a href="${url}" target="_blank" download class="btn-primary">📥 Download File</a>`;
    
    if(docId) {
        contentHtml += `
            <div class="comment-section">
                <h3>Q&A & Comments</h3>
                <div id="comment-list" style="max-height: 150px; overflow-y:auto; margin-bottom: 1em;">Loading comments...</div>
                <div style="display:flex; gap:0.5em;">
                    <input id="new-comment-input" placeholder="Add a comment..." style="margin:0; flex:1;" />
                    <button class="btn-primary" onclick="postComment('${docId}')" style="margin:0;">Post</button>
                </div>
            </div>`;
    }
    showModal(contentHtml, '#preview-modal');
    if(docId) loadComments(docId);
}

// ==========================================
// SECTION 10: BROWSE HIERARCHY (NOTES ONLY)
// ==========================================
window.listBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Browse Notes (Select Branch)</h2>`;
    html += `<button onclick="createBranch()" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add New Branch</button>`;
    html += data?.map(b => `<div class="branch-card" onclick="showBranch('${b.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">${b.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('branches', '${b.id}', '${b.name}', null, listBranches, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('branches', '${b.id}', '${b.name}', null, listBranches, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '<p>No branches.</p>';
    document.getElementById('allBranches').innerHTML = html;
}
window.showBranch = async function(id) {
    const { data } = await supabase.from('branches').select('*').eq('id', id).single(); currentBranch = data;
    let html = `<button onclick="showDashboard('allBranches')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>${data.name} Badges</h2><button onclick="createBatch('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Badge</button><div id="batchList"></div>`;
    document.getElementById('branchDetail').innerHTML = html; showDashboard('branchDetail');
    const { data: batches } = await supabase.from('batches').select('*').eq('branch_id', id).order('name', {ascending: false});
    document.getElementById('batchList').innerHTML = batches?.map(b => `<div class="branch-card" onclick="showBatch('${b.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">🎓 Badge: ${b.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('batches', '${b.id}', '${b.name}', '${id}', showBranch, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('batches', '${b.id}', '${b.name}', '${id}', showBranch, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '';
};
window.showBatch = async function(id) {
    const { data } = await supabase.from('batches').select('*').eq('id', id).single(); currentBatch = data;
    let html = `<button onclick="showBranch('${currentBranch.id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>Badge: ${data.name}</h2><button onclick="createSemester('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Semester</button><div id="semesterList"></div>`;
    document.getElementById('batchDetail').innerHTML = html; showDashboard('batchDetail');
    const { data: sems } = await supabase.from('semesters').select('*').eq('batch_id', id);
    document.getElementById('semesterList').innerHTML = sems?.map(s => `<div class="branch-card" onclick="showSemester('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">Sem: ${s.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('semesters', '${s.id}', '${s.name}', '${id}', showBatch, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('semesters', '${s.id}', '${s.name}', '${id}', showBatch, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '';
};
window.showSemester = async function(id) {
    const { data: sem } = await supabase.from('semesters').select('*').eq('id', id).single(); currentSemester = sem;
    let html = `<button onclick="showBatch('${sem.batch_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>${sem.name}</h2><button onclick="createSection('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Group</button><div id="sectionList"></div>`;
    document.getElementById('semesterDetail').innerHTML = html; showDashboard('semesterDetail');
    const { data: secs } = await supabase.from('sections').select('*').eq('semester_id', id);
    document.getElementById('sectionList').innerHTML = secs?.map(s => `<div class="branch-card" onclick="showSection('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">Group: ${s.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('sections', '${s.id}', '${s.name}', '${id}', showSemester, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('sections', '${s.id}', '${s.name}', '${id}', showSemester, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '';
};
window.showSection = async function(id) {
    const { data: sec } = await supabase.from('sections').select('*').eq('id', id).single(); currentSection = sec;
    let html = `<button onclick="showSemester('${sec.semester_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>Group: ${sec.name}</h2><button onclick="createSubject('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Subject</button><div id="subjectList"></div>`;
    document.getElementById('sectionDetail').innerHTML = html; showDashboard('sectionDetail');
    const { data: subs } = await supabase.from('subjects').select('*').eq('section_id', id);
    document.getElementById('subjectList').innerHTML = subs?.map(s => `<div class="branch-card" onclick="showSubject('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">${s.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('subjects', '${s.id}', '${s.name}', '${id}', showSection, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('subjects', '${s.id}', '${s.name}', '${id}', showSection, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '';
};
window.showSubject = async function(id) {
    const { data: sub } = await supabase.from('subjects').select('*').eq('id', id).single(); currentSubject = sub;
    let html = `<button onclick="showSection('${sub.section_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>${sub.name}</h2>
      <form onsubmit="uploadDocument(event)" style="margin-bottom: 2em; padding: 1em; border: 1px solid #e2e8f0; border-radius: 8px; background: #f7fafc;">
        <h3 style="margin-top:0;">Upload Notes</h3>
        <input id="docTitle" placeholder="Document Title" required style="margin-bottom: 10px; width: 100%; padding: 8px;" />
        <input id="docFile" type="file" required style="margin-bottom: 15px; width: 100%;" />
        <button class="btn-primary" type="submit" style="width: 100%;">Upload</button>
      </form><div id="documentList" style="margin-top: 1em; display: flex; flex-wrap: wrap; gap: 15px;"></div>`;
    document.getElementById('subjectDetail').innerHTML = html; showDashboard('subjectDetail'); loadDocuments(id); 
};

window.uploadDocument = async function(e) {
    e.preventDefault(); if(!currentUser) return alert("Please login to upload.");
    const title = document.getElementById('docTitle').value; const file = document.getElementById('docFile').files[0];
    try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_'); const fileName = `${Date.now()}_${cleanFileName}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        const { error } = await supabase.from('documents').insert([{
            subject_id: currentSubject.id, title: title, batch_year: currentBatch.name, file_url: fileUrl, file_type: file.type, uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error; alert("Upload Success!"); showSubject(currentSubject.id); 
    } catch(err) { alert("Upload failed!"); console.error(err); }
};
window.loadDocuments = async function(subId) {
    const { data } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('subject_id', subId).order('created_at', {ascending: false});
    document.getElementById('documentList').innerHTML = data?.map(d => `<div class="branch-card" style="width: 250px;"><h4>${d.title}</h4><button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary">👁️ View</button><button onclick="deleteItem('documents', '${d.id}', '${d.title}', '${subId}', () => loadDocuments('${subId}'), event)" style="background:transparent; color:#e53e3e; border:none; cursor:pointer;">🗑️ Delete</button></div>`).join('') || '<p>No documents.</p>';
}

// ==========================================
// SECTION 14 & 15: ADMIN NOTES CREATION/EDIT 
// ==========================================
window.createBranch = async function() { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Branch Name:"); if(n){await supabase.from('branches').insert([{name:n}]); listBranches();} };
window.createBatch = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Badge Year:"); if(n){await supabase.from('batches').insert([{branch_id:id, name:n}]); showBranch(id);} };
window.createSemester = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Semester Name:"); if(n){await supabase.from('semesters').insert([{batch_id:id, name:n}]); showBatch(id);} };
window.createSection = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Group Name:"); if(n){await supabase.from('sections').insert([{semester_id:id, name:n}]); showSemester(id);} };
window.createSubject = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Subject Name:"); if(n){await supabase.from('subjects').insert([{section_id:id, name:n}]); showSection(id);} };

window.editItem = async function(table, id, cName, parentId, refFunc, e) { e.stopPropagation(); const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("New name:", cName); if(n && n!==cName) {await supabase.from(table).update({name:n}).eq('id',id); if(parentId)refFunc(parentId); else refFunc();} };
window.deleteItem = async function(table, id, name, parentId, refFunc, e) { e.stopPropagation(); const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; if(confirm(`Delete ${name}?`)) {await supabase.from(table).delete().eq('id',id); if(parentId)refFunc(parentId); else refFunc();} };

// ==========================================
// SECTION 17: WORKSTATION ISOLATED FOLDERS
// ==========================================
window.wsListBranches = async function() {
    const { data } = await supabase.from('ws_branches').select('*').order('name');
    let html = `<h2>Workstation (Select Branch)</h2>`;
    html += `<button onclick="wsCreateBranch()" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add WS Branch</button>`;
    html += data?.map(b => `<div class="branch-card" onclick="wsShowBranch('${b.id}', '${b.name}')" style="display:flex; justify-content:space-between; align-items:center;"><h3>💻 ${b.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('ws_branches', '${b.id}', '${b.name}', null, wsListBranches, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('ws_branches', '${b.id}', '${b.name}', null, wsListBranches, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '<p>No workstation branches.</p>';
    document.getElementById('workstationHome').innerHTML = html;
}

window.wsShowBranch = async function(id, name) {
    wsBranch = {id: id, name: name};
    let html = `<button onclick="showDashboard('workstationHome')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Branches</button>`;
    
    // Assignment Search Grid specific to this Branch
    html += `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>💻 ${name} Assignments</h2>
            <button onclick="showAssignmentUploadForm('${id}')" class="btn-primary" style="background:#48bb78;">+ Upload Assignment</button>
        </div>
        <div class="search-grid">
            <div class="search-box-card">
                <h3>🔍 Specific Search</h3>
                <input id="wsSpecBadge" placeholder="Badge (Optional e.g. 2025)" style="margin-bottom:5px;"/>
                <input id="wsSpecGroup" placeholder="Group Name (Optional)" style="margin-bottom:5px;"/>
                <input id="wsSpecSub" placeholder="Subject Name (Optional)" style="margin-bottom:5px;"/>
                <input id="wsSpecNo" placeholder="Assignment No (Optional)" style="margin-bottom:5px;"/>
                <button onclick="wsSearchSpecific('${id}')" class="btn-primary" style="width:100%;">Search Specific</button>
            </div>
            <div class="search-box-card purple">
                <h3>🌐 All Selection Search</h3>
                <textarea id="wsAllQ" placeholder="Type question or topic..."></textarea>
                <button onclick="wsSearchAll('${id}')" class="btn-primary" style="width:100%; background:#8b5cf6;">Search Questions</button>
            </div>
        </div>
        <div id="wsResultsList" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 1em; margin-bottom: 3em;"></div>
        <hr>
    `;

    // Architecture Builder for Admins
    html += `<h3 style="margin-top:2em;">Admin Architecture (Build Folders)</h3>`;
    html += `<button onclick="wsCreateBatch('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add WS Badge</button><div id="wsBatchList"></div>`;
    
    document.getElementById('wsBranchDetail').innerHTML = html; showDashboard('wsBranchDetail');
    
    const { data: batches } = await supabase.from('ws_batches').select('*').eq('branch_id', id).order('name', {ascending: false});
    document.getElementById('wsBatchList').innerHTML = batches?.map(b => `<div class="branch-card" onclick="wsShowBatch('${b.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">🎓 Badge: ${b.name}</h3><div style="display: flex; gap: 5px;"><button onclick="editItem('ws_batches', '${b.id}', '${b.name}', '${id}', () => wsShowBranch('${id}','${name}'), event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button><button onclick="deleteItem('ws_batches', '${b.id}', '${b.name}', '${id}', () => wsShowBranch('${id}','${name}'), event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div></div>`).join('') || '';
};

// Folders Drilldown for WS
window.wsShowBatch = async function(id) {
    const { data } = await supabase.from('ws_batches').select('*').eq('id', id).single();
    let html = `<button onclick="wsShowBranch('${wsBranch.id}', '${wsBranch.name}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>WS Badge: ${data.name}</h2><button onclick="wsCreateSemester('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Semester</button><div id="wsSemesterList"></div>`;
    document.getElementById('wsBatchDetail').innerHTML = html; showDashboard('wsBatchDetail');
    const { data: sems } = await supabase.from('ws_semesters').select('*').eq('batch_id', id);
    document.getElementById('wsSemesterList').innerHTML = sems?.map(s => `<div class="branch-card" onclick="wsShowSemester('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">Sem: ${s.name}</h3><button onclick="deleteItem('ws_semesters', '${s.id}', '${s.name}', '${id}', wsShowBatch, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div>`).join('') || '';
};
window.wsShowSemester = async function(id) {
    const { data } = await supabase.from('ws_semesters').select('*').eq('id', id).single();
    let html = `<button onclick="wsShowBatch('${data.batch_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>${data.name}</h2><button onclick="wsCreateSection('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Group</button><div id="wsSectionList"></div>`;
    document.getElementById('wsSemesterDetail').innerHTML = html; showDashboard('wsSemesterDetail');
    const { data: secs } = await supabase.from('ws_sections').select('*').eq('semester_id', id);
    document.getElementById('wsSectionList').innerHTML = secs?.map(s => `<div class="branch-card" onclick="wsShowSection('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">Group: ${s.name}</h3><button onclick="deleteItem('ws_sections', '${s.id}', '${s.name}', '${id}', wsShowSemester, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div>`).join('') || '';
};
window.wsShowSection = async function(id) {
    const { data } = await supabase.from('ws_sections').select('*').eq('id', id).single();
    let html = `<button onclick="wsShowSemester('${data.semester_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>Group: ${data.name}</h2><button onclick="wsCreateSubject('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Subject</button><div id="wsSubjectList"></div>`;
    document.getElementById('wsSectionDetail').innerHTML = html; showDashboard('wsSectionDetail');
    const { data: subs } = await supabase.from('ws_subjects').select('*').eq('section_id', id);
    document.getElementById('wsSubjectList').innerHTML = subs?.map(s => `<div class="branch-card" style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">${s.name}</h3><button onclick="deleteItem('ws_subjects', '${s.id}', '${s.name}', '${id}', wsShowSection, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button></div>`).join('') || '';
};

// Workstation Admin Creation
window.wsCreateBranch = async function() { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Branch Name:"); if(n){await supabase.from('ws_branches').insert([{name:n}]); wsListBranches();} };
window.wsCreateBatch = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Badge Year:"); if(n){await supabase.from('ws_batches').insert([{branch_id:id, name:n}]); wsShowBranch(id, wsBranch.name);} };
window.wsCreateSemester = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Semester Name:"); if(n){await supabase.from('ws_semesters').insert([{batch_id:id, name:n}]); wsShowBatch(id);} };
window.wsCreateSection = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Group Name:"); if(n){await supabase.from('ws_sections').insert([{semester_id:id, name:n}]); wsShowSemester(id);} };
window.wsCreateSubject = async function(id) { const p=prompt("Admin Code:"); if(p!==ADMIN_CODE)return; const n=prompt("Subject Name:"); if(n){await supabase.from('ws_subjects').insert([{section_id:id, name:n}]); wsShowSection(id);} };

// ==========================================
// SECTION 18: ASSIGNMENT SEARCH & UPLOAD
// ==========================================
window.wsSearchSpecific = async function(branchId) {
    const badge = document.getElementById('wsSpecBadge').value; const group = document.getElementById('wsSpecGroup').value; const sub = document.getElementById('wsSpecSub').value; const num = document.getElementById('wsSpecNo').value;
    document.getElementById('wsResultsList').innerHTML = '<p>Searching...</p>';
    let query = supabase.from('assignments').select('*').eq('branch_id', branchId);
    if (badge) query = query.ilike('batch_name', `%${badge}%`);
    if (group) query = query.ilike('section_name', `%${group}%`);
    if (sub) query = query.ilike('subject_name', `%${sub}%`);
    if (num) query = query.eq('assignment_no', num);
    const { data, error } = await query; wsRenderAss(data, error);
}

window.wsSearchAll = async function(branchId) {
    const q = document.getElementById('wsAllQ').value; if (!q) return;
    document.getElementById('wsResultsList').innerHTML = '<p>Searching...</p>';
    const { data, error } = await supabase.from('assignments').select('*').eq('branch_id', branchId).ilike('question', `%${q}%`);
    wsRenderAss(data, error);
}

function wsRenderAss(data, error) {
    const list = document.getElementById('wsResultsList');
    if (error) return list.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    if (!data || data.length === 0) return list.innerHTML = `<p>No assignments found.</p>`;
    list.innerHTML = data.map(a => {
        const uploader = a.student_name ? `By: ${a.student_name}` : `By: ${a.uploader_email.split('@')[0]}`;
        return `
        <div class="branch-card" style="width: 300px; border-top: 4px solid #48bb78;">
            <span style="background: #edf2f7; padding: 2px 6px; font-size: 0.8em;">No: ${a.assignment_no}</span>
            <span style="background: #ebf4ff; padding: 2px 6px; font-size: 0.8em;">🎓 ${a.batch_name}</span>
            <h4 style="margin:10px 0;">${a.question}</h4>
            <p style="font-size: 0.8em; color: #718096;">Subject: ${a.subject_name} | Group: ${a.section_name}</p>
            <p style="font-size: 0.8em; color: #718096;">${uploader}</p>
            <button onclick="previewFile('${a.file_url}', '${a.file_type}', null)" class="btn-primary" style="width: 100%;">👁️ View</button>
        </div>`;
    }).join('');
}

window.showAssignmentUploadForm = async function(branchId) {
    if(!currentUser) return alert("Please login to upload an assignment.");
    let html = `
        <button onclick="wsShowBranch('${wsBranch.id}', '${wsBranch.name}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button>
        <h2>Upload Assignment</h2>
        <form onsubmit="submitAssignmentUpload(event, '${branchId}')" style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top:0;">1. Select Location</h3>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <select id="upWsBadge" onchange="wsLoadSems(this)" required style="flex:1;"><option value="">Select Badge...</option></select>
                <select id="upWsSem" onchange="wsLoadGroups(this)" required style="flex:1;" disabled><option value="">Select Semester...</option></select>
                <select id="upWsGroup" onchange="wsLoadSubs(this)" required style="flex:1;" disabled><option value="">Select Group...</option></select>
                <select id="upWsSub" required style="flex:1;" disabled><option value="">Select Subject...</option></select>
            </div>
            <h3>2. Details</h3>
            <input type="text" id="upAssNo" required placeholder="Assignment Number (e.g. 1)" />
            <textarea id="upQuestion" required placeholder="Assignment Question..."></textarea>
            <input type="text" id="upStudentName" placeholder="Your Name (Optional)" />
            <h3>3. File</h3>
            <input type="file" id="upAssFile" required />
            <button class="btn-primary" type="submit" style="width: 100%; background:#48bb78;">Upload Assignment</button>
        </form>
    `;
    document.getElementById('workstationUpload').innerHTML = html; showDashboard('workstationUpload');
    const { data: batches } = await supabase.from('ws_batches').select('*').eq('branch_id', branchId);
    const badgeSelect = document.getElementById('upWsBadge');
    batches?.forEach(b => badgeSelect.innerHTML += `<option value="${b.id}|${b.name}">${b.name}</option>`);
}

window.wsLoadSems = async function(sel) {
    const sem = document.getElementById('upWsSem'); sem.innerHTML = '<option value="">Select Semester...</option>';
    if(!sel.value) { sem.disabled = true; return; }
    const batchId = sel.value.split('|')[0];
    const { data } = await supabase.from('ws_semesters').select('*').eq('batch_id', batchId);
    data?.forEach(s => sem.innerHTML += `<option value="${s.id}|${s.name}">${s.name}</option>`); sem.disabled = false;
}
window.wsLoadGroups = async function(sel) {
    const grp = document.getElementById('upWsGroup'); grp.innerHTML = '<option value="">Select Group...</option>';
    if(!sel.value) { grp.disabled = true; return; }
    const semId = sel.value.split('|')[0];
    const { data } = await supabase.from('ws_sections').select('*').eq('semester_id', semId);
    data?.forEach(g => grp.innerHTML += `<option value="${g.id}|${g.name}">${g.name}</option>`); grp.disabled = false;
}
window.wsLoadSubs = async function(sel) {
    const sub = document.getElementById('upWsSub'); sub.innerHTML = '<option value="">Select Subject...</option>';
    if(!sel.value) { sub.disabled = true; return; }
    const grpId = sel.value.split('|')[0];
    const { data } = await supabase.from('ws_subjects').select('*').eq('section_id', grpId);
    data?.forEach(s => sub.innerHTML += `<option value="${s.id}|${s.name}">${s.name}</option>`); sub.disabled = false;
}

window.submitAssignmentUpload = async function(e, branchId) {
    e.preventDefault(); if(!currentUser) return;
    
    // Extract names from selection (value="id|name")
    const batchName = document.getElementById('upWsBadge').value.split('|')[1];
    const semName = document.getElementById('upWsSem').value.split('|')[1];
    const secName = document.getElementById('upWsGroup').value.split('|')[1];
    const subName = document.getElementById('upWsSub').value.split('|')[1];

    const file = document.getElementById('upAssFile').files[0];
    try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanFileName}`;
        await supabase.storage.from('university-assignments-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-assignments-files').getPublicUrl(fileName);

        const { error } = await supabase.from('assignments').insert([{
            branch_id: branchId, batch_name: batchName, semester_name: semName, section_name: secName, subject_name: subName,
            assignment_no: document.getElementById('upAssNo').value, question: document.getElementById('upQuestion').value,
            student_name: document.getElementById('upStudentName').value || null, file_url: fileUrl, file_type: file.type,
            uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error; alert("Assignment Uploaded! 📝"); wsShowBranch(wsBranch.id, wsBranch.name);
    } catch(err) { alert("Upload failed!"); console.error(err); }
}
