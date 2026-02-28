// ==========================================
// SECTION 1: GLOBAL VARIABLES & ADMIN SETUP
// ==========================================
const ADMIN_CODE = "sahil12345"; 

let currentUser = null;
let currentBranch = null; 
let currentBatch = null; // NEW: Tracks the current Badge/Year folder
let currentSemester = null;
let currentSection = null; 
let currentSubject = null;

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
    
    if (section === 'overview') { updateDashboardStats(); loadRecentlyViewed(); }
    if (section === 'allBranches') listBranches();
    if (section === 'myUploads') myUploads();
    if (section === 'savedNotes') loadBookmarks();
    if (section === 'searchSection') showSearchPage();

    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
    }
}

// ==========================================
// SECTION 6: DASHBOARD STATS & LEADERBOARD
// ==========================================
window.updateDashboardStats = async function() {
    const { count: total } = await supabase.from("documents").select("*", { count: "exact", head: true });
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
            <h2 style="margin-bottom: 20px; color: #2d3748;">Platform Overview</h2>
            <div style="display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); text-align: center;">
                    <h3 style="margin: 0; font-size: 1.2em; opacity: 0.9;">Total Documents Uploaded</h3>
                    <p style="font-size: 3.5em; font-weight: bold; margin: 10px 0 0 0;">${total || 0}</p>
                </div>
            </div>
            <h3 style="color: #2d3748; margin-bottom: 15px;">🏆 Top Contributors Leaderboard</h3>
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
// SECTION 10: NEW BROWSE HIERARCHY (BRANCH -> BADGE -> SEM -> GROUP -> SUB)
// ==========================================
window.listBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Branches</h2>`;
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

// Shows Badges inside a Branch
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

// Shows Semesters inside a Badge
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

// Shows Groups inside a Semester
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
        <h3 style="margin-top:0;">Upload a Document</h3>
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
// SECTION 11: DOCUMENT UPLOAD LOGIC
// ==========================================
window.uploadDocument = async function(e) {
    e.preventDefault();
    if(!currentUser) return alert("Please login to upload.");
    
    const title = document.getElementById('docTitle').value;
    const batchYear = currentBatch.name; // AUTO-TAGGED!
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
        } else if (file.type.startsWith('image/')) {
            finalThumbUrl = fileUrl; 
        } else {
            finalThumbUrl = 'https://placehold.co/400x300/e2e8f0/4a5568?text=Document\nNo+Thumbnail'; 
        }
        
        const { error } = await supabase.from('documents').insert([{
            subject_id: currentSubject.id, 
            title: title,
            batch_year: batchYear, 
            file_url: fileUrl, 
            file_type: file.type, 
            file_size: file.size,
            thumbnail_url: finalThumbUrl,
            uploaded_by: currentUser.id,
            uploader_email: currentUser.email
        }]);
        
        if (error) throw error;
        alert("Upload Success!");
        showSubject(currentSubject.id); 
    } catch(err) { 
        alert("Upload failed! Check console."); 
        console.error("UPLOAD ERROR:", err); 
    }
};

// ==========================================
// SECTION 12: LOAD DOCUMENTS & RENDER CARDS
// ==========================================
window.loadDocuments = async function(subId) {
    const { data } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('subject_id', subId).order('created_at', {ascending: false});
    const list = document.getElementById('documentList');
    
    list.innerHTML = data?.map(d => {
        const upvotes = d.upvotes ? d.upvotes.length : 0;
        const thumb = d.thumbnail_url || 'https://placehold.co/400x300/e2e8f0/4a5568?text=No+Thumbnail';
        const yearBadge = d.batch_year ? `<span style="background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; display: inline-block;">🎓 ${d.batch_year} Badge</span>` : '';
        
        return `
        <div class="branch-card" style="width: 250px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <img src="${thumb}" alt="Thumbnail" style="width: 100%; height: 140px; object-fit: cover; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" />
            
            <div style="padding: 15px;">
                ${yearBadge}
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                    <h4 style="margin:0; font-size: 1.1em; line-height: 1.3;">${d.title}</h4>
                    <button onclick="deleteItem('documents', '${d.id}', '${d.title}', '${subId}', () => loadDocuments('${subId}'), event)" style="background:transparent; color:#e53e3e; border:none; cursor:pointer; font-size: 1.2em;">🗑️</button>
                </div>
                
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary" style="flex: 1; padding: 5px; font-size: 0.9em;">👁️ Open</button>
                    <button onclick="toggleUpvote('${d.id}')" class="btn-action" style="flex: 1; padding: 5px; font-size: 0.9em;">👍 (${upvotes})</button>
                    <button onclick="toggleBookmark('${d.id}')" class="btn-action" style="flex: 1; padding: 5px; font-size: 0.9em;">🔖</button>
                </div>
            </div>
        </div>`
    }).join('') || '<p style="width: 100%;">No documents uploaded yet.</p>';
}

// ==========================================
// SECTION 13: USER SPECIFIC ACTIONS (MY UPLOADS, EDIT, DELETE)
// ==========================================
window.myUploads = async function() {
    if(!currentUser) {
        document.getElementById('myUploads').innerHTML = `<p>Please <span class="link" onclick="showAuthModal('login')">login</span> to view your uploads.</p>`;
        return;
    }
    const { data } = await supabase.from('documents').select('*').eq('uploaded_by', currentUser.id).order('created_at', {ascending: false});
    let html = `<h2>My Uploads</h2><div style="display: flex; flex-wrap: wrap; gap: 15px;">`;
    
    html += data?.map(d => {
        const thumb = d.thumbnail_url || 'https://placehold.co/400x300/e2e8f0/4a5568?text=No+Thumbnail';
        const yearBadge = d.batch_year ? `<span style="background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; display: inline-block;">🎓 ${d.batch_year} Badge</span>` : '';

        return `
        <div class="branch-card" style="width: 250px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <img src="${thumb}" alt="Thumbnail" style="width: 100%; height: 140px; object-fit: cover; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" />
            <div style="padding: 15px;">
                ${yearBadge}
                <h4 style="margin:0 0 10px 0; font-size: 1.1em; line-height: 1.3;">${d.title}</h4>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary" style="flex: 1; padding: 5px; font-size: 0.9em; margin: 0;">👁️ View</button>
                    <button onclick="editMyDocument('${d.id}', '${d.title}', null, event)" class="btn-action" style="flex: 1; padding: 5px; font-size: 0.9em; margin: 0; color: #3182ce;">✏️ Edit</button>
                    <button onclick="deleteMyDocument('${d.id}', '${d.title}', null, event)" class="btn-action" style="flex: 1; padding: 5px; font-size: 0.9em; margin: 0; color: #e53e3e;">🗑️ Delete</button>
                </div>
            </div>
        </div>`
    }).join('') || '<p style="width: 100%;">You haven\'t uploaded any documents yet.</p>';
    
    html += `</div>`;
    document.getElementById('myUploads').innerHTML = html;
}

window.editMyDocument = async function(docId, oldTitle, subId, event) {
    event.stopPropagation();
    if(!currentUser) return alert("Please login to edit.");
    const newTitle = prompt("Enter a new title for this document:", oldTitle);
    if(!newTitle || newTitle === oldTitle) return;
    const { error } = await supabase.from('documents').update({ title: newTitle }).eq('id', docId).eq('uploaded_by', currentUser.id);
    if (error) alert("Error updating: " + error.message);
    else {
        alert("✅ Title updated successfully!");
        if (document.getElementById('subjectDetail').classList.contains('active') && subId) loadDocuments(subId);
        else myUploads();
    }
};

window.deleteMyDocument = async function(docId, title, subId, event) {
    event.stopPropagation();
    if(!currentUser) return alert("Please login to delete.");
    const confirmDelete = confirm(`Are you sure you want to permanently delete "${title}"?`);
    if(!confirmDelete) return;
    const { error } = await supabase.from('documents').delete().eq('id', docId).eq('uploaded_by', currentUser.id);
    if (error) alert("Error deleting: " + error.message);
    else {
        alert("🗑️ Document deleted!");
        if (document.getElementById('subjectDetail').classList.contains('active') && subId) loadDocuments(subId);
        else myUploads();
    }
};

// ==========================================
// SECTION 14: ADMIN CREATION TOOLS
// ==========================================
window.createBranch = async function() {
    const pass = prompt("Enter Admin Code to create a Branch:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Enter Branch Name (e.g., Computer Science):");
    if (!name) return;
    const { error } = await supabase.from('branches').insert([{ name: name }]);
    if (error) alert("Error: " + error.message); else listBranches();
};

window.createBatch = async function(branchId) {
    const pass = prompt("Enter Admin Code to create a Badge/Year:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Enter Badge Year (e.g., 2025):");
    if (!name) return;
    const { error } = await supabase.from('batches').insert([{ branch_id: branchId, name: name }]);
    if (error) alert("Error: " + error.message); else showBranch(branchId);
};

window.createSemester = async function(batchId) {
    const pass = prompt("Enter Admin Code to create a Semester:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const num = prompt("Enter Semester Number (e.g., 1):");
    const name = prompt("Enter Semester Name (e.g., Fall 2024):");
    if (!num || !name) return;
    const { error } = await supabase.from('semesters').insert([{ batch_id: batchId, semester_number: num, name: name }]);
    if (error) alert("Error: " + error.message); else showBatch(batchId);
};

window.createSection = async function(semesterId) {
    const pass = prompt("Enter Admin Code to create a Group:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Enter Group Name (e.g., Group A):");
    if (!name) return;
    const { error } = await supabase.from('sections').insert([{ semester_id: semesterId, name: name }]);
    if (error) alert("Error: " + error.message); else showSemester(semesterId);
};

window.createSubject = async function(sectionId) {
    const pass = prompt("Enter Admin Code to create a Subject:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    const name = prompt("Enter Subject Name (e.g., Quantum Physics):");
    if (!name) return;
    const { error } = await supabase.from('subjects').insert([{ section_id: sectionId, name: name }]);
    if (error) alert("Error: " + error.message); else showSection(sectionId);
};

// ==========================================
// SECTION 15: ADMIN EDIT & DELETION TOOLS
// ==========================================
window.editItem = async function(table, id, currentName, parentId, refreshFunction, event) {
    event.stopPropagation(); 
    const pass = prompt(`Enter Admin Code to edit "${currentName}":`);
    if (pass !== ADMIN_CODE) return alert("Unauthorized or wrong code.");
    const newName = prompt(`Enter a new name for "${currentName}":`, currentName);
    if (!newName || newName === currentName) return; 
    const { error } = await supabase.from(table).update({ name: newName }).eq('id', id);
    if (error) alert("Error updating: " + error.message);
    else {
        alert("✅ Updated successfully!");
        if (parentId) refreshFunction(parentId); else refreshFunction(); 
    }
};

window.deleteItem = async function(table, id, name, parentId, refreshFunction, event) {
    event.stopPropagation(); 
    const pass = prompt(`Enter Admin Code to delete "${name}":`);
    if (pass !== ADMIN_CODE) return alert("Unauthorized or wrong code.");
    const confirmDelete = confirm(`🚨 WARNING! Are you SURE you want to delete "${name}"?`);
    if (!confirmDelete) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert("Error deleting: " + error.message);
    else {
        alert("🗑️ Deleted successfully!");
        if (parentId) refreshFunction(parentId); else refreshFunction(); 
    }
};

// ==========================================
// SECTION 16: ADVANCED LIVE SEARCH
// Select Badge FIRST, then unlock search bar
// ==========================================
let searchBadgeVal = null;

window.showSearchPage = function() {
    let yearOptions = '<option value="">-- Select a Badge (Year) --</option>';
    for(let y=2100; y>=1900; y--) yearOptions += `<option value="${y}">${y}</option>`;

    document.getElementById('searchSection').innerHTML = `
        <h2>Search Notes</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
            <label style="font-weight:bold; color:#2d3748; display:block; margin-bottom: 8px;">1. Which Badge are you looking for?</label>
            <select id="searchBadge" onchange="unlockSearch(this.value)" style="width:100%; padding:12px; border-radius:6px; border:2px solid #cbd5e0; margin-bottom: 15px;">
                ${yearOptions}
            </select>
            
            <label style="font-weight:bold; color:#2d3748; display:block; margin-bottom: 8px;">2. Search Documents:</label>
            <input type="text" id="searchInput" placeholder="Select a badge above to unlock search..." 
                   style="width: 100%; padding: 15px; font-size: 1.1em; border: 2px solid #cbd5e0; border-radius: 6px; background: #e2e8f0; cursor: not-allowed;"
                   onkeyup="performLiveSearch(this.value)" disabled />
        </div>
        <div id="searchResults" style="display: flex; flex-wrap: wrap; gap: 15px;">
            <p style="color: #718096;">Please select a badge and start typing...</p>
        </div>
    `;
}

window.unlockSearch = function(val) {
    searchBadgeVal = val;
    const searchInput = document.getElementById('searchInput');
    if(val) {
        searchInput.disabled = false;
        searchInput.style.background = '#ffffff';
        searchInput.style.borderColor = '#3182ce';
        searchInput.style.cursor = 'text';
        searchInput.placeholder = `Start typing a document title for ${val} badge...`;
        if(searchInput.value) performLiveSearch(searchInput.value);
    } else {
        searchInput.disabled = true;
        searchInput.style.background = '#e2e8f0';
        searchInput.style.borderColor = '#cbd5e0';
        searchInput.style.cursor = 'not-allowed';
        searchInput.placeholder = "Select a badge above to unlock search...";
        document.getElementById('searchResults').innerHTML = '<p style="color: #718096;">Please select a badge and start typing...</p>';
    }
}

window.performLiveSearch = async function(query) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '<p style="color: #718096;">Type at least 2 letters to start searching...</p>';
        return;
    }

    resultsContainer.innerHTML = '<p>Searching...</p>';

    const { data, error } = await supabase.from('documents')
        .select('*, upvotes(id), bookmarks(id)')
        .ilike('title', `%${query}%`)
        .eq('batch_year', searchBadgeVal) // STRICT FILTER BY BADGE!
        .order('created_at', { ascending: false });

    if (error) {
        resultsContainer.innerHTML = `<p style="color: red;">Search error: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; width: 100%; padding: 20px;">
                <h3 style="color: #4a5568;">No notes found for "${query}" in ${searchBadgeVal}</h3>
                <p style="color: #718096;">Try a different keyword or check your spelling.</p>
            </div>`;
        return;
    }

    resultsContainer.innerHTML = data.map(d => {
        const upvotes = d.upvotes ? d.upvotes.length : 0;
        const thumb = d.thumbnail_url || 'https://placehold.co/400x300/e2e8f0/4a5568?text=No+Thumbnail';
        const yearBadge = `<span style="background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-bottom: 8px; display: inline-block;">🎓 ${d.batch_year} Badge</span>`;

        return `
        <div class="branch-card" style="width: 250px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <img src="${thumb}" style="width: 100%; height: 140px; object-fit: cover; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" />
            <div style="padding: 15px;">
                ${yearBadge}
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                    <h4 style="margin:0; font-size: 1.1em; line-height: 1.3;">${d.title}</h4>
                    <button onclick="deleteItem('documents', '${d.id}', '${d.title}', null, () => performLiveSearch('${query}'), event)" style="background:transparent; color:#e53e3e; border:none; cursor:pointer;">🗑️</button>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary" style="flex: 1; padding: 5px;">👁️ Open</button>
                    <button onclick="toggleUpvote('${d.id}')" class="btn-action" style="flex: 1; padding: 5px;">👍 (${upvotes})</button>
                    <button onclick="toggleBookmark('${d.id}')" class="btn-action" style="flex: 1; padding: 5px;">🔖</button>
                </div>
            </div>
        </div>`
    }).join('');
};
