const ADMIN_CODE = "sahil12345"; 

let currentUser = null;
let currentBranch = null; let currentSemester = null;
let currentSection = null; let currentSubject = null;

// ==========================================
// 1. UI & MODAL SETUP
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

// ==========================================
// 2. AUTHENTICATION
// ==========================================
function showAuthModal(tab = 'login') {
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
// 3. NAVIGATION & BEAUTIFUL DASHBOARD
// ==========================================
window.showDashboard = function(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    if (section === 'overview') { updateDashboardStats(); loadRecentlyViewed(); }
    if (section === 'allBranches') listBranches();
    if (section === 'myUploads') myUploads();
    if (section === 'savedNotes') loadBookmarks();
}

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
                    <small style="opacity: 0.8;">From all students combined</small>
                </div>
            </div>

            <h3 style="color: #2d3748; margin-bottom: 15px;">🏆 Top Contributors Leaderboard</h3>
            <ul style="list-style: none; padding: 0; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
                ${sortedLeaderboard.length > 0 ? 
                    sortedLeaderboard.map((user, i) => `
                    <li style="padding: 15px 20px; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 1.1em; color: ${i === 0 ? '#d69e2e' : '#4a5568'};">
                            #${i+1} &nbsp; ${user[0].split('@')[0]}
                        </span> 
                        <span style="background: #ebf4ff; color: #3182ce; padding: 5px 10px; border-radius: 20px; font-weight: bold;">
                            📄 ${user[1]} uploads
                        </span>
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
// 4. NEW FEATURES (RECENT, UPVOTE, BOOKMARK, COMMENT)
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
        </div>
    `).join('');
}

window.toggleUpvote = async function(docId) {
    if(!currentUser) return alert("Please login to upvote.");
    const { data } = await supabase.from('upvotes').select('*').eq('user_id', currentUser.id).eq('document_id', docId);
    if(data && data.length > 0) await supabase.from('upvotes').delete().eq('id', data[0].id);
    else await supabase.from('upvotes').insert([{ user_id: currentUser.id, document_id: docId }]);
    if(currentSubject) loadDocuments(currentSubject.id);
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
    if(currentSubject) loadDocuments(currentSubject.id);
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
        </div>
    `).join('') || '<p><small>No comments yet.</small></p>';
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
// 5. BROWSE & PREVIEW (WITH ADMIN TRASH CANS)
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
            </div>
        `;
    }
    showModal(contentHtml, '#preview-modal');
    if(docId) loadComments(docId);
}

window.listBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Branches</h2>`;
    html += `<button onclick="createBranch()" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add New Branch</button>`;
    html += data?.map(b => `
       <div class="branch-card" onclick="showBranch('${b.id}')" style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">${b.name}</h3>
        <button onclick="deleteItem('branches', '${b.id}', '${b.name}', null, listBranches, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
       </div>`).join('') || '<p>No branches.</p>';
    document.getElementById('allBranches').innerHTML = html;
}

window.showBranch = async function(id) {
    const { data } = await supabase.from('branches').select('*').eq('id', id).single();
    currentBranch = data;
    let html = `<button onclick="showDashboard('allBranches')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to All Branches</button>`;
    html += `<h2>${data.name}</h2>`;
    html += `<button onclick="createSemester('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Semester</button>`;
    html += `<div id="semesterList"></div>`;
    
    document.getElementById('branchDetail').innerHTML = html;
    showDashboard('branchDetail');
    
    const { data: sems } = await supabase.from('semesters').select('*').eq('branch_id', id);
    document.getElementById('semesterList').innerHTML = sems?.map(s => `
        <div class="branch-card" onclick="showSemester('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">Sem ${s.semester_number}: ${s.name}</h3>
            <button onclick="deleteItem('semesters', '${s.id}', 'Semester ${s.semester_number}', '${id}', showBranch, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
        </div>`).join('') || '';
};

window.showSemester = async function(id) {
    const { data: sem } = await supabase.from('semesters').select('*').eq('id', id).single();
    currentSemester = sem;
    let html = `<button onclick="showBranch('${sem.branch_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Branch</button>`;
    html += `<h2>${sem.name}</h2>`;
    html += `<button onclick="createSection('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Section</button>`;
    html += `<div id="sectionList"></div>`;
    
    document.getElementById('semesterDetail').innerHTML = html;
    showDashboard('semesterDetail');
    
    const { data: secs } = await supabase.from('sections').select('*').eq('semester_id', id);
    document.getElementById('sectionList').innerHTML = secs?.map(s => `
        <div class="branch-card" onclick="showSection('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">${s.name}</h3>
            <button onclick="deleteItem('sections', '${s.id}', '${s.name}', '${id}', showSemester, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
        </div>`).join('') || '';
};

window.showSection = async function(id) {
    const { data: sec } = await supabase.from('sections').select('*').eq('id', id).single();
    currentSection = sec;
    let html = `<button onclick="showSemester('${sec.semester_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Semester</button>`;
    html += `<h2>${sec.name}</h2>`;
    html += `<button onclick="createSubject('${id}')" class="btn-primary" style="margin-bottom: 1em; background-color: #28a745;">+ Add Subject</button>`;
    html += `<div id="subjectList"></div>`;
    
    document.getElementById('sectionDetail').innerHTML = html;
    showDashboard('sectionDetail');
    
    const { data: subs } = await supabase.from('subjects').select('*').eq('section_id', id);
    document.getElementById('subjectList').innerHTML = subs?.map(s => `
        <div class="branch-card" onclick="showSubject('${s.id}')" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">${s.name}</h3>
            <button onclick="deleteItem('subjects', '${s.id}', '${s.name}', '${id}', showSection, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
        </div>`).join('') || '';
};

window.showSubject = async function(id) {
    const { data: sub } = await supabase.from('subjects').select('*').eq('id', id).single();
    currentSubject = sub;
    
    let html = `<button onclick="showSection('${sub.section_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Section</button>`;
    html += `<h2>${sub.name}</h2>
      <form onsubmit="uploadDocument(event)" style="margin-bottom: 2em; padding: 1em; border: 1px solid #ccc; border-radius: 8px;">
        <h3>Upload a Document</h3>
        <input id="docTitle" placeholder="Document Title" required style="margin-bottom: 10px; width: 100%;" />
        <input id="docFile" type="file" required style="margin-bottom: 10px; width: 100%;" />
        <button class="btn-primary" type="submit">Upload</button>
      </form>
      <div id="documentList" style="margin-top: 1em;"></div>`;
      
    document.getElementById('subjectDetail').innerHTML = html;
    showDashboard('subjectDetail');
    loadDocuments(id);
};

// ==========================================
// 6. UPLOAD & LOAD DOCUMENTS
// ==========================================
window.uploadDocument = async function(e) {
    e.preventDefault();
    if(!currentUser) return alert("Please login to upload.");
    const title = document.getElementById('docTitle').value;
    const file = document.getElementById('docFile').files[0];
    
    try {
        const fileName = `${Date.now()}_${file.name}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        
        const { error } = await supabase.from('documents').insert([{
            subject_id: currentSubject.id, 
            title: title,
            file_url: publicUrl, 
            file_type: file.type, 
            file_size: file.size,
            uploaded_by: currentUser.id,
            uploader_email: currentUser.email
        }]);
        
        if (error) throw error;

        alert("Upload Success!");
        document.getElementById('docTitle').value = '';
        document.getElementById('docFile').value = '';
        loadDocuments(currentSubject.id);
    } catch(err) { 
        alert("Upload failed! Check the browser console (F12) for the exact error."); 
        console.error("UPLOAD ERROR DETAILS:", err); 
    }
};

async function loadDocuments(subId) {
    const { data } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('subject_id', subId).order('created_at', {ascending: false});
    const list = document.getElementById('documentList');
    list.innerHTML = data?.map(d => {
        const upvotes = d.upvotes ? d.upvotes.length : 0;
        return `
        <div class="branch-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4 style="margin:0;">${d.title}</h4>
                <button onclick="deleteItem('documents', '${d.id}', '${d.title}', '${subId}', showSubject, event)" style="background:#e53e3e; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>
            <div style="margin-top: 1em;">
                <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary">👁️ Open</button>
                <button onclick="toggleUpvote('${d.id}')" class="btn-action">👍 (${upvotes})</button>
                <button onclick="toggleBookmark('${d.id}')" class="btn-action">🔖 Save</button>
            </div>
        </div>`
    }).join('') || '<p>No docs here yet.</p>';
}

window.myUploads = async function() {
    if(!currentUser) return;
    const { data } = await supabase.from('documents').select('*').eq('uploaded_by', currentUser.id);
    document.getElementById('myUploads').innerHTML = `<h2>My Uploads</h2>` + (data?.map(d => `<div class="branch-card"><h4>${d.title}</h4></div>`).join('') || '<p>No uploads yet.</p>');
}

// ==========================================
// 7. ADMIN CREATION FUNCTIONS
// ==========================================
window.createBranch = async function() {
    const pass = prompt("Enter Admin Code to create a Branch:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized or wrong code.");
    
    const name = prompt("Enter Branch Name (e.g., Computer Science):");
    if (!name) return;
    
    const { error } = await supabase.from('branches').insert([{ name: name }]);
    if (error) alert("Error creating branch: " + error.message);
    else { alert("Branch created!"); listBranches(); }
};

window.createSemester = async function(branchId) {
    const pass = prompt("Enter Admin Code to create a Semester:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    
    const num = prompt("Enter Semester Number (e.g., 1):");
    const name = prompt("Enter Semester Name (e.g., Fall 2024):");
    if (!num || !name) return;
    
    const { error } = await supabase.from('semesters').insert([{ branch_id: branchId, semester_number: num, name: name }]);
    if (error) alert("Error: " + error.message);
    else { alert("Semester created!"); showBranch(branchId); }
};

window.createSection = async function(semesterId) {
    const pass = prompt("Enter Admin Code to create a Section:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    
    const name = prompt("Enter Section Name (e.g., Section A):");
    if (!name) return;
    
    const { error } = await supabase.from('sections').insert([{ semester_id: semesterId, name: name }]);
    if (error) alert("Error: " + error.message);
    else { alert("Section created!"); showSemester(semesterId); }
};

window.createSubject = async function(sectionId) {
    const pass = prompt("Enter Admin Code to create a Subject:");
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    
    const name = prompt("Enter Subject Name (e.g., Quantum Physics):");
    if (!name) return;
    
    const { error } = await supabase.from('subjects').insert([{ section_id: sectionId, name: name }]);
    if (error) alert("Error: " + error.message);
    else { alert("Subject created!"); showSection(sectionId); }
};

// ==========================================
// 8. ADMIN DELETE FUNCTIONS
// ==========================================
window.deleteItem = async function(table, id, name, parentId, refreshFunction, event) {
    event.stopPropagation(); 
    
    const pass = prompt(`Enter Admin Code to delete "${name}":`);
    if (pass !== ADMIN_CODE) return alert("Unauthorized or wrong code.");
    
    const confirmDelete = confirm(`🚨 WARNING! Are you SURE you want to delete "${name}"? This cannot be undone!`);
    if (!confirmDelete) return;
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        alert("Error deleting: " + error.message);
    } else {
        alert("🗑️ Deleted successfully!");
        if (parentId) refreshFunction(parentId);
        else refreshFunction(); 
    }
};
