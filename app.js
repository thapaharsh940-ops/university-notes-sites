// ==========================================
// SECTION 1: GLOBAL VARIABLES & ADMIN SETUP
// ==========================================
const ADMIN_CODE = "sahil12345"; 

let currentUser = null;
let currentBranch = null; 
let currentBatch = null; 
let currentSemester = null;
let currentSection = null; 
let currentSubject = null;

let currentWorkstationBranch = null; // Used for Assignments

// ==========================================
// SECTION 2: SIDEBAR & MOBILE MENU CONTROLS
// ==========================================
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');

if (mobileBtn) mobileBtn.onclick = toggleSidebar;
if (sidebarToggle) sidebarToggle.onclick = toggleSidebar;

function toggleSidebar() {
    sidebar.classList.toggle("open");
    sidebar.classList.toggle("closed");
}

window.onclick = e => { 
    if (e.target.classList.contains('modal-bg')) hideModal(); 
    if (window.innerWidth <= 768) {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
            sidebar.classList.remove('open');
            sidebar.classList.add('closed');
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
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
    }
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
            if (user) {
                item.innerHTML = '🚪 Logout'; item.onclick = logout; item.classList.add('danger');
            } else {
                item.innerHTML = '🔑 Login'; item.onclick = () => showAuthModal('login'); item.classList.remove('danger');
            }
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

window.logout = async function() { 
    await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); 
}

supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    showDashboard('overview');
});

// ==========================================
// SECTION 5: NAVIGATION & ROUTING
// ==========================================
window.showDashboard = function(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    // Notes Routing
    if (section === 'overview') { updateDashboardStats(); loadRecentlyViewed(); }
    if (section === 'allBranches') listBranches();
    if (section === 'myUploads') myUploads();
    if (section === 'savedNotes') loadBookmarks();
    if (section === 'searchSection') showSearchPage();
    
    // Workstation Routing
    if (section === 'workstationHome') listWorkstationBranches();

    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
    }
}

// ==========================================
// SECTION 6: ENHANCED DASHBOARD STATS
// ==========================================
window.updateDashboardStats = async function() {
    // Fetch counts from both tables
    const { count: totalNotes } = await supabase.from("documents").select("*", { count: "exact", head: true });
    const { count: totalAssignments } = await supabase.from("assignments").select("*", { count: "exact", head: true });
    
    // Top Contributors Logic
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
            <h2 style="margin-bottom: 25px; color: #2d3748;">Platform Overview</h2>
            
            <div class="dash-grid">
                <div class="dash-card-premium bg-purple">
                    <h3>📚 Total Notes Uploaded</h3>
                    <div class="number">${totalNotes || 0}</div>
                </div>
                <div class="dash-card-premium bg-green">
                    <h3>💻 Total Assignments</h3>
                    <div class="number">${totalAssignments || 0}</div>
                </div>
            </div>

            <h3 style="color: #2d3748; margin-bottom: 15px;">🏆 Top Notes Contributors</h3>
            <ul style="list-style: none; padding: 0; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                ${sortedLeaderboard.length > 0 ? 
                    sortedLeaderboard.map((user, i) => `
                    <li style="padding: 15px 20px; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 1.1em; color: ${i === 0 ? '#d69e2e' : '#4a5568'};">#${i+1} &nbsp; ${user[0].split('@')[0]}</span> 
                        <span style="background: #ebf4ff; color: #3182ce; padding: 5px 10px; border-radius: 20px; font-weight: bold;">📄 ${user[1]} uploads</span>
                    </li>`).join('') 
                    : '<li style="padding: 20px; text-align: center; color: #a0aec0;">No contributors yet. Be the first!</li>'
                }
            </ul>
            
            <div id="recent-views-container" style="margin-top: 30px; display: none;">
                <h3 style="color: #2d3748;">🕒 Recently Viewed</h3>
                <div id="recentViews" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        `;
    }
    loadRecentlyViewed();
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
    list.innerHTML = recent.map(d => `
        <div class="stat-card" style="cursor:pointer; padding: 1em; background: #f7fafc; border-left: 4px solid #4299e1;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')">
            <h4 style="margin:0; color:#2d3748;">${d.title}</h4>
        </div>`).join('');
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
    if(data && data.length > 0) {
        await supabase.from('bookmarks').delete().eq('id', data[0].id);
        alert("Removed from Saved Notes");
    } else {
        await supabase.from('bookmarks').insert([{ user_id: currentUser.id, document_id: docId }]);
        alert("Added to Saved Notes 🔖");
    }
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
        let d = b.documents;
        if(!d) return '';
        return `
        <div class="branch-card">
            <h4>🔖 ${d.title}</h4>
            <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary">👁️ View</button>
            <button onclick="toggleBookmark('${d.id}')" class="btn-action active-bookmark">Unsave</button>
        </div>`
    }).join('');
}

async function loadComments(docId) {
    const { data } = await supabase.from('comments').select('*').eq('document_id', docId).order('created_at', { ascending: true });
    let html = data?.map(c => `
        <div class="comment-box">
            <div class="comment-author">${c.user_email.split('@')[0]} <small style="color:gray">${new Date(c.created_at).toLocaleDateString()}</small></div>
            <div>${c.content}</div>
        </div>`).join('') || '<p><small>No comments yet.</small></p>';
    const commentList = document.getElementById('comment-list');
    if(commentList) commentList.innerHTML = html;
}

window.postComment = async function(docId) {
    if(!currentUser) return alert("Login to comment.");
    const content = document.getElementById('new-comment-input').value;
    if(!content) return;
    await supabase.from('comments').insert([{ document_id: docId, user_id: currentUser.id, user_email: currentUser.email, content }]);
    document.getElementById('new-comment-input').value = '';
    loadComments(docId);
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
// SECTION 10: BROWSE HIERARCHY (NOTES)
// ==========================================
window.listBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Browse Notes (Select Branch)</h2>`;
    html += `<button onclick="createBranch()" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add New Branch</button>`;
    html += data?.map(b => `
       <div class="branch-card" onclick="showBranch('${b.id}')" style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">${b.name}</h3>
        <div style="display: flex; gap: 5px;">
            <button onclick="editItem('branches', '${b.id}', '${b.name}', null, listBranches, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button>
            <button onclick="deleteItem('branches', '${b.id}', '${b.name}', null, listBranches, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
        </div>
       </div>`).join('') || '<p>No branches.</p>';
    document.getElementById('allBranches').innerHTML = html;
}

window.showBranch = async function(id) {
    const { data } = await supabase.from('branches').select('*').eq('id', id).single();
    currentBranch = data;
    let html = `<button onclick="showDashboard('allBranches')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to All Branches</button>`;
    html += `<h2>${data.name} Badges/Years</h2>`;
    html += `<button onclick="createBatch('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Badge (Year)</button>`;
    html += `<div id="batchList"></div>`;
    document.getElementById('branchDetail').innerHTML = html;
    showDashboard('branchDetail');
    
    const { data: batches } = await supabase.from('batches').select('*').eq('branch_id', id).order('name', {ascending: false});
    document.getElementById('batchList').innerHTML = batches?.map(b => `
        <div class="branch-card" onclick="showBatch('${b.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">🎓 Badge: ${b.name}</h3>
            <div style="display: flex; gap: 5px;">
                <button onclick="editItem('batches', '${b.id}', '${b.name}', '${id}', showBranch, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button>
                <button onclick="deleteItem('batches', '${b.id}', '${b.name}', '${id}', showBranch, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>
        </div>`).join('') || '';
};

window.showBatch = async function(id) {
    const { data } = await supabase.from('batches').select('*').eq('id', id).single();
    currentBatch = data;
    let html = `<button onclick="showBranch('${currentBranch.id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Branch</button>`;
    html += `<h2>Badge: ${data.name}</h2>`;
    html += `<button onclick="createSemester('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Semester</button>`;
    html += `<div id="semesterList"></div>`;
    document.getElementById('batchDetail').innerHTML = html;
    showDashboard('batchDetail');
    
    const { data: sems } = await supabase.from('semesters').select('*').eq('batch_id', id);
    document.getElementById('semesterList').innerHTML = sems?.map(s => `
        <div class="branch-card" onclick="showSemester('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">Sem ${s.semester_number}: ${s.name}</h3>
            <div style="display: flex; gap: 5px;">
                <button onclick="editItem('semesters', '${s.id}', '${s.name}', '${id}', showBatch, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button>
                <button onclick="deleteItem('semesters', '${s.id}', 'Semester ${s.semester_number}', '${id}', showBatch, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>
        </div>`).join('') || '';
};

window.showSemester = async function(id) {
    const { data: sem } = await supabase.from('semesters').select('*').eq('id', id).single();
    currentSemester = sem;
    let html = `<button onclick="showBatch('${sem.batch_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Badge</button>`;
    html += `<h2>${sem.name}</h2>`;
    html += `<button onclick="createSection('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Group</button>`;
    html += `<div id="sectionList"></div>`;
    document.getElementById('semesterDetail').innerHTML = html;
    showDashboard('semesterDetail');
    
    const { data: secs } = await supabase.from('sections').select('*').eq('semester_id', id);
    document.getElementById('sectionList').innerHTML = secs?.map(s => `
        <div class="branch-card" onclick="showSection('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">Group: ${s.name}</h3>
            <div style="display: flex; gap: 5px;">
                <button onclick="editItem('sections', '${s.id}', '${s.name}', '${id}', showSemester, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button>
                <button onclick="deleteItem('sections', '${s.id}', '${s.name}', '${id}', showSemester, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>
        </div>`).join('') || '';
};

window.showSection = async function(id) {
    const { data: sec } = await supabase.from('sections').select('*').eq('id', id).single();
    currentSection = sec;
    let html = `<button onclick="showSemester('${sec.semester_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Semester</button>`;
    html += `<h2>Group: ${sec.name}</h2>`;
    html += `<button onclick="createSubject('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Subject</button>`;
    html += `<div id="subjectList"></div>`;
    document.getElementById('sectionDetail').innerHTML = html;
    showDashboard('sectionDetail');
    
    const { data: subs } = await supabase.from('subjects').select('*').eq('section_id', id);
    document.getElementById('subjectList').innerHTML = subs?.map(s => `
        <div class="branch-card" onclick="showSubject('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">${s.name}</h3>
            <div style="display: flex; gap: 5px;">
                <button onclick="editItem('subjects', '${s.id}', '${s.name}', '${id}', showSection, event)" style="background:#3182ce; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✏️</button>
                <button onclick="deleteItem('subjects', '${s.id}', '${s.name}', '${id}', showSection, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>
        </div>`).join('') || '';
};

window.showSubject = async function(id) {
    const { data: sub } = await supabase.from('subjects').select('*').eq('id', id).single();
    currentSubject = sub;
    let html = `<button onclick="showSection('${sub.section_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Group</button>`;
    html += `<h2>${sub.name}</h2>
      <form onsubmit="uploadDocument(event)" style="margin-bottom: 2em; padding: 1em; border: 1px solid #e2e8f0; border-radius: 8px; background: #f7fafc;">
        <h3 style="margin-top:0;">Upload Notes</h3>
        <p style="font-size: 0.9em; color: #4a5568;"><em>Note: This document will automatically be tagged as Badge ${currentBatch.name}</em></p>
        <input id="docTitle" placeholder="Document Title (e.g., Chapter 1 Notes)" required style="margin-bottom: 10px; width: 100%; padding: 8px;" />
        <label style="font-weight: bold; font-size: 0.9em; display:block; margin-bottom: 5px;">Main File (PDF, Image, etc.): *</label>
        <input id="docFile" type="file" required style="margin-bottom: 15px; width: 100%;" />
        <label style="font-weight: bold; font-size: 0.9em; display:block; margin-bottom: 5px;">Thumbnail Image (Optional):</label>
        <input id="docThumb" type="file" accept="image/*" style="margin-bottom: 15px; width: 100%;" />
        <button class="btn-primary" type="submit" style="width: 100%;">Upload</button>
      </form>
      <div id="documentList" style="margin-top: 1em; display: flex; flex-wrap: wrap; gap: 15px;"></div>`;
    document.getElementById('subjectDetail').innerHTML = html;
    showDashboard('subjectDetail');
    loadDocuments(id); 
};

// ==========================================
// SECTION 11: NOTES UPLOAD LOGIC
// ==========================================
window.uploadDocument = async function(e) {
    e.preventDefault();
    if(!currentUser) return alert("Please login to upload.");
    const title = document.getElementById('docTitle').value;
    const batchYear = currentBatch.name; 
    const file = document.getElementById('docFile').files[0];
    const thumbFile = document.getElementById('docThumb').files[0];
    
    try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanFileName}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        
        let finalThumbUrl = null;
        if (thumbFile) {
            const cleanThumbName = thumbFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const thumbName = `thumb_${Date.now()}_${cleanThumbName}`;
            await supabase.storage.from('university-notes-files').upload(thumbName, thumbFile);
            const { data: { publicUrl: uploadedThumb } } = supabase.storage.from('university-notes-files').getPublicUrl(thumbName);
            finalThumbUrl = uploadedThumb;
        } else if (file.type.startsWith('image/')) { finalThumbUrl = fileUrl; } 
        else { finalThumbUrl = 'https://placehold.co/400x300/e2e8f0/4a5568?text=Document\nNo+Thumbnail'; }
        
        const { error } = await supabase.from('documents').insert([{
            subject_id: currentSubject.id, title: title, batch_year: batchYear, file_url: fileUrl, file_type: file.type, file_size: file.size, thumbnail_url: finalThumbUrl, uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error;
        alert("Upload Success!"); showSubject(currentSubject.id); 
    } catch(err) { alert("Upload failed!"); console.error(err); }
};

// ==========================================
// SECTION 12: LOAD DOCUMENTS
// ==========================================
window.loadDocuments = async function(subId) {
    const { data } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('subject_id', subId).order('created_at', {ascending: false});
    const list = document.getElementById('documentList');
    list.innerHTML = data?.map(d => {
        const upvotes = d.upvotes ? d.upvotes.length : 0;
        const thumb = d.thumbnail_url || 'https://placehold.co/400x300/e2e8f0/4a5568?text=No+Thumbnail';
        const yearBadge = d.batch_year ? `<span style="background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; display: inline-block;">🎓 ${d.batch_year} Badge</span>` : '';
        return `
        <div class="branch-card" style="width: 250px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px;">
            <img src="${thumb}" style="width: 100%; height: 140px; object-fit: cover; cursor: pointer;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" />
            <div style="padding: 15px;">
                ${yearBadge}
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                    <h4 style="margin:0; font-size: 1.1em;">${d.title}</h4>
                    <button onclick="deleteItem('documents', '${d.id}', '${d.title}', '${subId}', () => loadDocuments('${subId}'), event)" style="background:transparent; color:#e53e3e; border:none; cursor:pointer; font-size: 1.2em;">🗑️</button>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary" style="flex: 1; padding: 5px;">👁️ View</button>
                    <button onclick="toggleUpvote('${d.id}')" class="btn-action" style="flex: 1; padding: 5px;">👍 (${upvotes})</button>
                    <button onclick="toggleBookmark('${d.id}')" class="btn-action" style="flex: 1; padding: 5px;">🔖</button>
                </div>
            </div>
        </div>`
    }).join('') || '<p style="width: 100%;">No documents uploaded yet.</p>';
}

// ==========================================
// SECTION 13: MY UPLOADS
// ==========================================
window.myUploads = async function() {
    if(!currentUser) { document.getElementById('myUploads').innerHTML = `<p>Please <span class="link" onclick="showAuthModal('login')">login</span> to view your uploads.</p>`; return; }
    const { data } = await supabase.from('documents').select('*').eq('uploaded_by', currentUser.id).order('created_at', {ascending: false});
    let html = `<h2>My Uploads</h2><div style="display: flex; flex-wrap: wrap; gap: 15px;">`;
    html += data?.map(d => {
        const thumb = d.thumbnail_url || 'https://placehold.co/400x300/e2e8f0/4a5568?text=No+Thumbnail';
        return `
        <div class="branch-card" style="width: 250px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px;">
            <img src="${thumb}" style="width: 100%; height: 140px; object-fit: cover; cursor: pointer;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" />
            <div style="padding: 15px;">
                <h4 style="margin:0 0 10px 0;">${d.title}</h4>
                <div style="display: flex; gap: 5px;">
                    <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary" style="flex: 1; padding: 5px; margin: 0;">👁️ View</button>
                    <button onclick="editMyDocument('${d.id}', '${d.title}', null, event)" class="btn-action" style="flex: 1; padding: 5px; margin: 0; color: #3182ce;">✏️ Edit</button>
                    <button onclick="deleteMyDocument('${d.id}', '${d.title}', null, event)" class="btn-action" style="flex: 1; padding: 5px; margin: 0; color: #e53e3e;">🗑️ Delete</button>
                </div>
            </div>
        </div>`
    }).join('') || '<p style="width: 100%;">You haven\'t uploaded any documents yet.</p>';
    document.getElementById('myUploads').innerHTML = html + `</div>`;
}
window.editMyDocument = async function(docId, oldTitle, subId, event) {
    event.stopPropagation();
    if(!currentUser) return;
    const newTitle = prompt("Enter a new title for this document:", oldTitle); if(!newTitle || newTitle === oldTitle) return;
    const { error } = await supabase.from('documents').update({ title: newTitle }).eq('id', docId).eq('uploaded_by', currentUser.id);
    if (!error) { alert("✅ Title updated!"); if (subId) loadDocuments(subId); else myUploads(); }
};
window.deleteMyDocument = async function(docId, title, subId, event) {
    event.stopPropagation();
    if(!currentUser) return;
    if(!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    const { error } = await supabase.from('documents').delete().eq('id', docId).eq('uploaded_by', currentUser.id);
    if (!error) { alert("🗑️ Deleted!"); if (subId) loadDocuments(subId); else myUploads(); }
};

// ==========================================
// SECTION 14 & 15: ADMIN CREATION & EDIT TOOLS
// ==========================================
window.createBranch = async function() {
    const pass = prompt("Admin Code to create Branch:"); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Branch Name:"); if (!name) return;
    const { error } = await supabase.from('branches').insert([{ name: name }]); if (!error) listBranches();
};
window.createBatch = async function(branchId) {
    const pass = prompt("Admin Code to create Badge:"); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Badge Year (e.g. 2025):"); if (!name) return;
    const { error } = await supabase.from('batches').insert([{ branch_id: branchId, name: name }]); if (!error) showBranch(branchId);
};
window.createSemester = async function(batchId) {
    const pass = prompt("Admin Code to create Semester:"); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const num = prompt("Semester No:"); const name = prompt("Semester Name:"); if (!num || !name) return;
    const { error } = await supabase.from('semesters').insert([{ batch_id: batchId, semester_number: num, name: name }]); if (!error) showBatch(batchId);
};
window.createSection = async function(semesterId) {
    const pass = prompt("Admin Code to create Group:"); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Group Name:"); if (!name) return;
    const { error } = await supabase.from('sections').insert([{ semester_id: semesterId, name: name }]); if (!error) showSemester(semesterId);
};
window.createSubject = async function(sectionId) {
    const pass = prompt("Admin Code to create Subject:"); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Subject Name:"); if (!name) return;
    const { error } = await supabase.from('subjects').insert([{ section_id: sectionId, name: name }]); if (!error) showSection(sectionId);
};
window.editItem = async function(table, id, currentName, parentId, refreshFunction, event) {
    event.stopPropagation(); 
    const pass = prompt(`Admin Code to edit:`); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const newName = prompt(`New name:`, currentName); if (!newName || newName === currentName) return; 
    const { error } = await supabase.from(table).update({ name: newName }).eq('id', id);
    if (!error) { if (parentId) refreshFunction(parentId); else refreshFunction(); }
};
window.deleteItem = async function(table, id, name, parentId, refreshFunction, event) {
    event.stopPropagation(); 
    const pass = prompt(`Admin Code to delete:`); if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    if (!confirm(`Delete "${name}"?`)) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) { if (parentId) refreshFunction(parentId); else refreshFunction(); }
};

// ==========================================
// SECTION 16: NOTES SEARCH
// ==========================================
window.showSearchPage = function() {
    let yrOptions = '<option value="">-- Select a Badge (Year) --</option>';
    for(let y=2100; y>=1900; y--) yrOptions += `<option value="${y}">${y}</option>`;
    document.getElementById('searchSection').innerHTML = `
        <h2>Search Notes</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <select id="searchBadge" onchange="unlockSearch(this.value)" style="margin-bottom: 15px;">${yrOptions}</select>
            <input type="text" id="searchInput" placeholder="Select a badge above to unlock search..." disabled onkeyup="performNotesSearch(this.value)" />
        </div>
        <div id="searchResults" style="display: flex; flex-wrap: wrap; gap: 15px;"></div>
    `;
}
let notesSearchBadge = null;
window.unlockSearch = function(val) {
    notesSearchBadge = val;
    const searchInput = document.getElementById('searchInput');
    if(val) { searchInput.disabled = false; searchInput.placeholder = `Search notes for ${val}...`; } 
    else { searchInput.disabled = true; searchInput.placeholder = "Select a badge to unlock..."; }
}
window.performNotesSearch = async function(query) {
    if (query.length < 2) return;
    const { data } = await supabase.from('documents').select('*').ilike('title', `%${query}%`).eq('batch_year', notesSearchBadge).order('created_at', { ascending: false });
    document.getElementById('searchResults').innerHTML = data?.map(d => `<div class="branch-card" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')"><h4>${d.title}</h4></div>`).join('') || '<p>No results.</p>';
};

// ==========================================
// SECTION 17: WORKSTATION / ASSIGNMENTS DASHBOARD
// ==========================================
window.listWorkstationBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Workstation (Select Branch)</h2>`;
    html += data?.map(b => `<div class="branch-card" onclick="showAssignmentDashboard('${b.id}', '${b.name}')"><h3>💻 ${b.name}</h3></div>`).join('') || '<p>No branches.</p>';
    document.getElementById('workstationHome').innerHTML = html;
    showDashboard('workstationHome');
}

window.showAssignmentDashboard = async function(branchId, branchName) {
    currentWorkstationBranch = branchId;
    
    // Fetch Badges for the specific search dropdown
    const { data: batches } = await supabase.from('batches').select('*').eq('branch_id', branchId);
    let batchOptions = '<option value="">All Badges</option>';
    batches?.forEach(b => batchOptions += `<option value="${b.id}">${b.name}</option>`);

    let html = `
        <button onclick="showDashboard('workstationHome')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Branches</button>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2>💻 ${branchName} Assignments</h2>
            <button onclick="showAssignmentUploadForm('${branchId}')" class="btn-primary" style="background:#48bb78;">+ Upload Assignment</button>
        </div>

        <div class="search-grid">
            <div class="search-box-card">
                <h3>🔍 Specific Search</h3>
                <label style="font-size:0.9em; font-weight:bold;">Badge (Optional):</label>
                <select id="specBadge">${batchOptions}</select>
                
                <label style="font-size:0.9em; font-weight:bold;">Group Name (Optional):</label>
                <input id="specGroup" placeholder="e.g. Group A" />
                
                <label style="font-size:0.9em; font-weight:bold;">Subject Name (Optional):</label>
                <input id="specSubject" placeholder="e.g. Physics" />
                
                <label style="font-size:0.9em; font-weight:bold;">Assignment No (Optional):</label>
                <input id="specNo" placeholder="e.g. 1" />
                
                <button onclick="performSpecificAssignmentSearch()" class="btn-primary" style="width:100%;">Search Specific</button>
            </div>

            <div class="search-box-card purple">
                <h3>🌐 All Selection Search</h3>
                <label style="font-size:0.9em; font-weight:bold;">Search by Question / Topic:</label>
                <textarea id="allQuestionSearch" placeholder="Type the question or topic here..."></textarea>
                <button onclick="performAllAssignmentSearch()" class="btn-primary" style="width:100%; background:#8b5cf6;">Search All Questions</button>
            </div>
        </div>
        <div id="assignmentResultsList" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 2em;"></div>
    `;
    document.getElementById('workstationDashboard').innerHTML = html;
    showDashboard('workstationDashboard');
}

window.performSpecificAssignmentSearch = async function() {
    const badgeId = document.getElementById('specBadge').value;
    const groupName = document.getElementById('specGroup').value;
    const subName = document.getElementById('specSubject').value;
    const assNo = document.getElementById('specNo').value;

    document.getElementById('assignmentResultsList').innerHTML = '<p>Searching...</p>';

    let query = supabase.from('assignments').select('*, batches!inner(name), sections!inner(name), subjects!inner(name)').eq('branch_id', currentWorkstationBranch);
    if (badgeId) query = query.eq('batch_id', badgeId);
    if (groupName) query = query.ilike('sections.name', `%${groupName}%`);
    if (subName) query = query.ilike('subjects.name', `%${subName}%`);
    if (assNo) query = query.eq('assignment_no', assNo);

    const { data, error } = await query;
    renderAssignments(data, error);
}

window.performAllAssignmentSearch = async function() {
    const question = document.getElementById('allQuestionSearch').value;
    if (!question) return alert("Please enter a question to search.");
    document.getElementById('assignmentResultsList').innerHTML = '<p>Searching...</p>';
    
    const { data, error } = await supabase.from('assignments').select('*, batches(name), sections(name), subjects(name)').eq('branch_id', currentWorkstationBranch).ilike('question', `%${question}%`);
    renderAssignments(data, error);
}

function renderAssignments(data, error) {
    const list = document.getElementById('assignmentResultsList');
    if (error) return list.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
    if (!data || data.length === 0) return list.innerHTML = `<p>No assignments found matching that search.</p>`;

    list.innerHTML = data.map(a => {
        const uploader = a.student_name ? `By: ${a.student_name}` : `By: ${a.uploader_email.split('@')[0]}`;
        const badgeName = a.batches?.name ? `🎓 ${a.batches.name}` : '';
        return `
        <div class="branch-card" style="width: 300px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px; border-top: 4px solid #48bb78;">
            <div style="padding: 15px;">
                <span style="background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; display: inline-block;">Assign. No: ${a.assignment_no}</span>
                <span style="background: #ebf4ff; color: #3182ce; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; display: inline-block;">${badgeName}</span>
                <h4 style="margin:10px 0; color:#2d3748;">${a.question}</h4>
                <p style="font-size: 0.85em; color: #718096; margin-bottom: 15px;">${uploader}</p>
                <button onclick="previewFile('${a.file_url}', '${a.file_type}', null)" class="btn-primary" style="width: 100%;">👁️ View Assignment</button>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// SECTION 18: ASSIGNMENT UPLOAD WIZARD
// ==========================================
window.showAssignmentUploadForm = async function(branchId) {
    if(!currentUser) return alert("Please login to upload an assignment.");
    let html = `
        <button onclick="showAssignmentDashboard('${branchId}', 'Branch')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Search</button>
        <h2>Upload Assignment</h2>
        <form onsubmit="submitAssignmentUpload(event, '${branchId}')" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <h3 style="color:#2d3748; margin-top:0;">1. Select Location</h3>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
                <select id="upBadge" onchange="assLoadSems(this.value)" required style="flex:1;"><option value="">Select Badge...</option></select>
                <select id="upSem" onchange="assLoadGroups(this.value)" required style="flex:1;" disabled><option value="">Select Semester...</option></select>
                <select id="upGroup" onchange="assLoadSubjects(this.value)" required style="flex:1;" disabled><option value="">Select Group...</option></select>
                <select id="upSubject" required style="flex:1;" disabled><option value="">Select Subject...</option></select>
            </div>
            <h3 style="color:#2d3748;">2. Assignment Details</h3>
            <label style="font-weight:bold; font-size:0.9em;">Assignment Number: *</label>
            <input type="text" id="upAssNo" required placeholder="e.g. 1" />
            <label style="font-weight:bold; font-size:0.9em;">Assignment Question / Topic: *</label>
            <textarea id="upQuestion" required placeholder="Write the assignment question here..."></textarea>
            <label style="font-weight:bold; font-size:0.9em;">Your Name (Optional):</label>
            <input type="text" id="upStudentName" placeholder="e.g. John Doe" />
            <h3 style="color:#2d3748;">3. Attach File</h3>
            <label style="font-weight:bold; font-size:0.9em;">Assignment File (PDF, Image): *</label>
            <input type="file" id="upAssFile" required />
            <button class="btn-primary" type="submit" style="width: 100%; font-size: 1.1em; padding: 15px; margin-top: 20px; background:#48bb78;">Upload Assignment</button>
        </form>
    `;
    document.getElementById('workstationUpload').innerHTML = html;
    showDashboard('workstationUpload');

    const { data: batches } = await supabase.from('batches').select('*').eq('branch_id', branchId);
    const badgeSelect = document.getElementById('upBadge');
    batches?.forEach(b => badgeSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`);
}

window.assLoadSems = async function(batchId) {
    const semSelect = document.getElementById('upSem'); semSelect.innerHTML = '<option value="">Select Semester...</option>';
    if(!batchId) { semSelect.disabled = true; return; }
    const { data } = await supabase.from('semesters').select('*').eq('batch_id', batchId);
    data?.forEach(s => semSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    semSelect.disabled = false;
}
window.assLoadGroups = async function(semId) {
    const grpSelect = document.getElementById('upGroup'); grpSelect.innerHTML = '<option value="">Select Group...</option>';
    if(!semId) { grpSelect.disabled = true; return; }
    const { data } = await supabase.from('sections').select('*').eq('semester_id', semId);
    data?.forEach(g => grpSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`);
    grpSelect.disabled = false;
}
window.assLoadSubjects = async function(groupId) {
    const subSelect = document.getElementById('upSubject'); subSelect.innerHTML = '<option value="">Select Subject...</option>';
    if(!groupId) { subSelect.disabled = true; return; }
    const { data } = await supabase.from('subjects').select('*').eq('section_id', groupId);
    data?.forEach(s => subSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    subSelect.disabled = false;
}

window.submitAssignmentUpload = async function(e, branchId) {
    e.preventDefault();
    if(!currentUser) return alert("Please login to upload.");
    const batch_id = document.getElementById('upBadge').value;
    const sem_id = document.getElementById('upSem').value;
    const sec_id = document.getElementById('upGroup').value;
    const sub_id = document.getElementById('upSubject').value;
    const assNo = document.getElementById('upAssNo').value;
    const question = document.getElementById('upQuestion').value;
    const studentName = document.getElementById('upStudentName').value;
    const file = document.getElementById('upAssFile').files[0];

    try {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanFileName}`;
        await supabase.storage.from('university-assignments-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-assignments-files').getPublicUrl(fileName);

        const { error } = await supabase.from('assignments').insert([{
            branch_id: branchId, batch_id: batch_id, semester_id: sem_id, section_id: sec_id, subject_id: sub_id,
            assignment_no: assNo, question: question, student_name: studentName || null,
            file_url: fileUrl, file_type: file.type, file_size: file.size,
            uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error;
        alert("Assignment Uploaded Successfully! 📝");
        showAssignmentDashboard(branchId, 'Branch'); 
    } catch(err) { alert("Upload failed! Check console."); console.error(err); }
}
