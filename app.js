// --- INITIALIZE SUPABASE HERE (Paste your keys) ---
// const supabaseUrl = 'YOUR_URL';
// const supabaseKey = 'YOUR_KEY';
// const supabase = supabase.createClient(supabaseUrl, supabaseKey);
const SUPABASE_URL = 'https://gcojuhkujvwuffzwuypt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjb2p1aGt1anZ3dWZmend1eXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxOTY4ODgsImV4cCI6MjA3ODc3Mjg4OH0.v9dNR9qXETtrqjxdvHLqrAWXjrF-6Aw36F6Ky1YSLdM';

const supabase = supabase.createClient(supabaseUrl, supabaseKey);

const ADMIN_CODE = "sahil12345"; 

let currentUser = null;
let currentBranch = null; let currentSemester = null;
let currentSection = null; let currentSubject = null;

// ==========================================
// 1. UI & MOBILE SETUP
// ==========================================
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
if (mobileBtn) mobileBtn.onclick = () => {
    sidebar.classList.toggle("open");
    sidebar.classList.toggle("closed");
};

// Close modal OR sidebar if clicking outside
window.onclick = e => { 
    if (e.target.classList.contains('modal-bg')) hideModal(); 
    
    // Close Sidebar on mobile if clicking the red area (outside)
    if (window.innerWidth <= 768) {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
            sidebar.classList.remove('open');
            sidebar.classList.add('closed');
        }
    }
};
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
        <input id="auth-email" type="email" placeholder="Email" required style="width:100%; padding:10px; margin-bottom:10px;"><br>
        <input id="auth-pass" type="password" placeholder="Password" required style="width:100%; padding:10px; margin-bottom:15px;"><br>
        <button class="btn-primary" type="submit" style="width:100%;">${tab === 'login' ? "Login" : "Sign Up"}</button>
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
                item.innerHTML = '🚪 Logout'; item.onclick = logout; item.style.color = "#ef4444";
            } else {
                item.innerHTML = '🔑 Login'; item.onclick = () => showAuthModal('login'); item.style.color = "#9ca3af";
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

window.logout = async function() { await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); }

supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    showDashboard('overview');
});

// ==========================================
// 3. NAVIGATION & DASHBOARD
// ==========================================
window.showDashboard = function(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    if (section === 'overview') { updateDashboardStats(); loadRecentlyViewed(); }
    if (section === 'allBranches') listBranches();
    if (section === 'myUploads') myUploads();
    if (section === 'savedNotes') loadBookmarks();
    if (section === 'searchSection') showSearchPage();

    // Auto-close sidebar on mobile when a link is clicked
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
    }
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
            <h2 style="margin-bottom: 20px;">Platform Overview</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h3 style="margin: 0; opacity: 0.9;">Total Documents Uploaded</h3>
                <p style="font-size: 3.5em; font-weight: bold; margin: 10px 0 0 0;">${total || 0}</p>
            </div>
            <h3>🏆 Top Contributors</h3>
            <ul style="list-style: none; padding: 0; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                ${sortedLeaderboard.length > 0 ? 
                    sortedLeaderboard.map((u, i) => `
                    <li style="padding: 15px; border-bottom: 1px solid #edf2f7; display: flex; justify-content: space-between;">
                        <b>#${i+1} &nbsp; ${u[0].split('@')[0]}</b> 
                        <span style="background: #ebf4ff; color: #3182ce; padding: 5px 10px; border-radius: 20px;">📄 ${u[1]}</span>
                    </li>`).join('') : '<li style="padding: 20px; text-align: center;">No contributors yet!</li>'
                }
            </ul>
            <div id="recent-views-container" style="margin-top: 30px; display: none;">
                <h3>🕒 Recently Viewed</h3>
                <div id="recentViews" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
        `;
    }
    loadRecentlyViewed();
}

// ==========================================
// 4. USER PERMISSIONS: EDIT & DELETE
// ==========================================
window.deleteDocument = async function(docId, uploadedBy, event) {
    event.stopPropagation();
    if (!currentUser) return alert("Please login.");

    // Check if the user owns the document OR has admin code
    if (currentUser.id === uploadedBy) {
        if (!confirm("Are you sure you want to delete your upload?")) return;
    } else {
        const pass = prompt("Enter Admin Code to delete someone else's file:");
        if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    }

    const { error } = await supabase.from('documents').delete().eq('id', docId);
    if (error) alert("Error: " + error.message);
    else {
        alert("Deleted successfully!");
        // Refresh the correct screen
        if (document.getElementById('myUploads').classList.contains('active')) myUploads();
        else if (document.getElementById('searchSection').classList.contains('active')) {
            const query = document.getElementById('searchInput').value;
            if(query) performLiveSearch(query);
        }
        else if (currentSubject) loadDocuments(currentSubject.id);
    }
};

window.editDocumentTitle = async function(docId, oldTitle, event) {
    event.stopPropagation();
    const newTitle = prompt("Edit Document Title:", oldTitle);
    if (!newTitle || newTitle === oldTitle) return;

    const { error } = await supabase.from('documents').update({ title: newTitle }).eq('id', docId);
    if (error) alert("Error updating: " + error.message);
    else {
        alert("Title updated!");
        if (document.getElementById('myUploads').classList.contains('active')) myUploads();
        else if (currentSubject) loadDocuments(currentSubject.id);
    }
};

// ==========================================
// 5. BROWSE & FOLDERS (With Admin Delete)
// ==========================================
window.deleteItem = async function(table, id, name, parentId, refreshFunction, event) {
    event.stopPropagation(); 
    const pass = prompt(`Enter Admin Code to delete folder "${name}":`);
    if (pass !== ADMIN_CODE) return alert("Unauthorized.");
    if (!confirm(`🚨 WARNING! Delete "${name}" and all contents?`)) return;
    
    await supabase.from(table).delete().eq('id', id);
    if (parentId) refreshFunction(parentId); else refreshFunction(); 
};

window.listBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Branches</h2><button onclick="createBranch()" class="btn-primary" style="margin-bottom: 1em; background:#28a745;">+ Add Branch</button>`;
    html += data?.map(b => `
       <div class="branch-card" onclick="showBranch('${b.id}')" style="display:flex; justify-content:space-between;">
        <h3 style="margin:0;">${b.name}</h3>
        <button onclick="deleteItem('branches', '${b.id}', '${b.name}', null, listBranches, event)" style="background:transparent; border:none; color:red; font-size:1.2em;">🗑️</button>
       </div>`).join('') || '<p>No branches.</p>';
    document.getElementById('allBranches').innerHTML = html;
}

window.showBranch = async function(id) {
    const { data } = await supabase.from('branches').select('*').eq('id', id).single();
    let html = `<button onclick="showDashboard('allBranches')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button>
                <h2>${data.name}</h2>
                <button onclick="createSemester('${id}')" class="btn-primary" style="margin-bottom: 1em; background:#28a745;">+ Add Semester</button>
                <div id="semesterList"></div>`;
    document.getElementById('branchDetail').innerHTML = html;
    showDashboard('branchDetail');
    
    const { data: sems } = await supabase.from('semesters').select('*').eq('branch_id', id);
    document.getElementById('semesterList').innerHTML = sems?.map(s => `
        <div class="branch-card" onclick="showSemester('${s.id}')" style="display:flex; justify-content:space-between;">
            <h3 style="margin:0;">Sem ${s.semester_number}: ${s.name}</h3>
            <button onclick="deleteItem('semesters', '${s.id}', 'Sem ${s.semester_number}', '${id}', showBranch, event)" style="background:transparent; border:none; color:red; font-size:1.2em;">🗑️</button>
        </div>`).join('');
};

window.showSemester = async function(id) {
    const { data: sem } = await supabase.from('semesters').select('*').eq('id', id).single();
    let html = `<button onclick="showBranch('${sem.branch_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button>
                <h2>${sem.name}</h2>
                <button onclick="createSection('${id}')" class="btn-primary" style="margin-bottom: 1em; background:#28a745;">+ Add Section</button>
                <div id="sectionList"></div>`;
    document.getElementById('semesterDetail').innerHTML = html;
    showDashboard('semesterDetail');
    
    const { data: secs } = await supabase.from('sections').select('*').eq('semester_id', id);
    document.getElementById('sectionList').innerHTML = secs?.map(s => `
        <div class="branch-card" onclick="showSection('${s.id}')" style="display:flex; justify-content:space-between;">
            <h3 style="margin:0;">${s.name}</h3>
            <button onclick="deleteItem('sections', '${s.id}', '${s.name}', '${id}', showSemester, event)" style="background:transparent; border:none; color:red; font-size:1.2em;">🗑️</button>
        </div>`).join('');
};

window.showSection = async function(id) {
    const { data: sec } = await supabase.from('sections').select('*').eq('id', id).single();
    let html = `<button onclick="showSemester('${sec.semester_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button>
                <h2>${sec.name}</h2>
                <button onclick="createSubject('${id}')" class="btn-primary" style="margin-bottom: 1em; background:#28a745;">+ Add Subject</button>
                <div id="subjectList"></div>`;
    document.getElementById('sectionDetail').innerHTML = html;
    showDashboard('sectionDetail');
    
    const { data: subs } = await supabase.from('subjects').select('*').eq('section_id', id);
    document.getElementById('subjectList').innerHTML = subs?.map(s => `
        <div class="branch-card" onclick="showSubject('${s.id}')" style="display:flex; justify-content:space-between;">
            <h3 style="margin:0;">${s.name}</h3>
            <button onclick="deleteItem('subjects', '${s.id}', '${s.name}', '${id}', showSection, event)" style="background:transparent; border:none; color:red; font-size:1.2em;">🗑️</button>
        </div>`).join('');
};

window.showSubject = async function(id) {
    const { data: sub } = await supabase.from('subjects').select('*').eq('id', id).single();
    currentSubject = sub;
    let html = `<button onclick="showSection('${sub.section_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button>
                <h2>${sub.name}</h2>
                <div id="documentList" style="display: flex; flex-wrap: wrap; gap: 15px;"></div>`;
    document.getElementById('subjectDetail').innerHTML = html;
    showDashboard('subjectDetail');
    loadDocuments(id);
};

// ==========================================
// 6. GLOBAL QUICK UPLOAD FEATURE (CASCADING)
// ==========================================
window.initGlobalUpload = async function() {
    showDashboard('globalUpload');
    if (!currentUser) return document.getElementById('globalUpload').innerHTML = `<h2>Quick Upload</h2><p>Please login first.</p>`;
    
    const { data } = await supabase.from('branches').select('*').order('name');
    
    let html = `
        <h2>☁️ Quick Upload</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <label style="font-weight:bold; margin-bottom:5px; display:block;">1. Search & Select Branch</label>
            <select id="gu-branch" onchange="guLoadSemesters()" style="width:100%; padding:10px; margin-bottom:15px;">
                <option value="">-- Choose Branch --</option>
                ${data.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
            
            <div id="gu-sem-container"></div>
            <div id="gu-sec-container"></div>
            <div id="gu-sub-container"></div>
            <div id="gu-form-container"></div>
        </div>
    `;
    document.getElementById('globalUpload').innerHTML = html;
};

window.guLoadSemesters = async function() {
    const branchId = document.getElementById('gu-branch').value;
    if(!branchId) return;
    const { data } = await supabase.from('semesters').select('*').eq('branch_id', branchId);
    
    document.getElementById('gu-sem-container').innerHTML = `
        <label style="font-weight:bold; margin-bottom:5px; display:block;">2. Select Semester</label>
        <select id="gu-semester" onchange="guLoadSections()" style="width:100%; padding:10px; margin-bottom:15px;">
            <option value="">-- Choose Semester --</option>
            ${data.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>`;
    document.getElementById('gu-sec-container').innerHTML = '';
    document.getElementById('gu-sub-container').innerHTML = '';
    document.getElementById('gu-form-container').innerHTML = '';
};

window.guLoadSections = async function() {
    const semId = document.getElementById('gu-semester').value;
    if(!semId) return;
    const { data } = await supabase.from('sections').select('*').eq('semester_id', semId);
    
    document.getElementById('gu-sec-container').innerHTML = `
        <label style="font-weight:bold; margin-bottom:5px; display:block;">3. Select Section</label>
        <select id="gu-section" onchange="guLoadSubjects()" style="width:100%; padding:10px; margin-bottom:15px;">
            <option value="">-- Choose Section --</option>
            ${data.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>`;
    document.getElementById('gu-sub-container').innerHTML = '';
    document.getElementById('gu-form-container').innerHTML = '';
};

window.guLoadSubjects = async function() {
    const secId = document.getElementById('gu-section').value;
    if(!secId) return;
    const { data } = await supabase.from('subjects').select('*').eq('section_id', secId);
    
    document.getElementById('gu-sub-container').innerHTML = `
        <label style="font-weight:bold; margin-bottom:5px; display:block;">4. Search & Select Subject</label>
        <select id="gu-subject" onchange="guShowForm()" style="width:100%; padding:10px; margin-bottom:15px;">
            <option value="">-- Choose Subject --</option>
            ${data.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>`;
    document.getElementById('gu-form-container').innerHTML = '';
};

window.guShowForm = function() {
    const subId = document.getElementById('gu-subject').value;
    if(!subId) return;
    document.getElementById('gu-form-container').innerHTML = `
        <div style="margin-top:20px; padding-top:20px; border-top: 2px dashed #cbd5e0;">
            <label style="font-weight:bold; margin-bottom:5px; display:block;">Document Title *</label>
            <input id="gu-title" required placeholder="e.g., Midterm Notes" style="width:100%; padding:10px; margin-bottom:15px;" />
            
            <label style="font-weight:bold; margin-bottom:5px; display:block;">Main File (PDF/Image) *</label>
            <input type="file" id="gu-file" required style="width:100%; margin-bottom:15px;" />
            
            <label style="font-weight:bold; margin-bottom:5px; display:block;">Custom Thumbnail (Optional)</label>
            <input type="file" id="gu-thumb" accept="image/*" style="width:100%; margin-bottom:20px;" />
            
            <button onclick="guSubmitUpload(event)" class="btn-primary" style="width:100%; padding: 15px; font-size:1.1em; background:#28a745;">Upload Now</button>
        </div>
    `;
};

window.guSubmitUpload = async function(e) {
    e.preventDefault();
    const subId = document.getElementById('gu-subject').value;
    const title = document.getElementById('gu-title').value;
    const file = document.getElementById('gu-file').files[0];
    const thumbFile = document.getElementById('gu-thumb').files[0];
    
    if(!title || !file) return alert("Please provide a title and file.");
    
    document.querySelector('#gu-form-container button').innerHTML = "Uploading... Please wait";
    
    try {
        const fileName = `${Date.now()}_${file.name}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        
        let finalThumbUrl = 'https://placehold.co/400x300/e2e8f0/4a5568?text=Document';
        if (thumbFile) {
            const thumbName = `thumb_${Date.now()}_${thumbFile.name}`;
            await supabase.storage.from('university-notes-files').upload(thumbName, thumbFile);
            const { data: { publicUrl: uploadedThumb } } = supabase.storage.from('university-notes-files').getPublicUrl(thumbName);
            finalThumbUrl = uploadedThumb;
        } else if (file.type.startsWith('image/')) {
            finalThumbUrl = fileUrl;
        }
        
        const { error } = await supabase.from('documents').insert([{
            subject_id: subId, title: title, file_url: fileUrl, file_type: file.type, 
            file_size: file.size, thumbnail_url: finalThumbUrl, uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error;

        alert("Upload Success!");
        showSubject(subId); // Take them right to the subject to see their upload!
    } catch(err) { 
        alert("Upload failed! " + err.message); 
        document.querySelector('#gu-form-container button').innerHTML = "Upload Now";
    }
};

// ==========================================
// 7. RENDER DOCUMENTS (MY UPLOADS & SEARCH)
// ==========================================
function createDocCardHTML(d, context = 'browse') {
    const upvotes = d.upvotes ? d.upvotes.length : 0;
    const thumb = d.thumbnail_url || 'https://placehold.co/400x300/e2e8f0/4a5568?text=No+Thumbnail';
    const isOwner = currentUser && d.uploaded_by === currentUser.id;
    
    let deleteBtnHtml = `<button onclick="deleteDocument('${d.id}', '${d.uploaded_by}', event)" style="background:transparent; color:#e53e3e; border:none; cursor:pointer; font-size:1.2em;">🗑️</button>`;
    
    // If we are looking at My Uploads, show the Edit button!
    let editBtnHtml = '';
    if (context === 'myUploads' && isOwner) {
        editBtnHtml = `<button onclick="editDocumentTitle('${d.id}', '${d.title}', event)" class="btn-action" style="margin-right: 5px;">✏️ Rename</button>`;
    }

    return `
    <div class="branch-card" style="width: 250px; padding: 0; overflow: hidden; display: flex; flex-direction: column; background: white; border-radius: 8px;">
        <img src="${thumb}" alt="Thumbnail" style="width: 100%; height: 140px; object-fit: cover; cursor: pointer;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" />
        <div style="padding: 15px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                <h4 style="margin:0; font-size: 1.1em; line-height: 1.3;">${d.title}</h4>
                ${deleteBtnHtml}
            </div>
            <div style="margin-bottom: 10px;">${editBtnHtml}</div>
            <div style="display: flex; gap: 5px;">
                <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary" style="flex:1;">👁️</button>
                <button onclick="toggleUpvote('${d.id}')" class="btn-action" style="flex:1;">👍 (${upvotes})</button>
                <button onclick="toggleBookmark('${d.id}')" class="btn-action" style="flex:1;">🔖</button>
            </div>
        </div>
    </div>`;
}

window.loadDocuments = async function(subId) {
    const { data } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('subject_id', subId).order('created_at', {ascending: false});
    document.getElementById('documentList').innerHTML = data?.map(d => createDocCardHTML(d, 'browse')).join('') || '<p style="width: 100%;">No documents yet.</p>';
}

window.myUploads = async function() {
    if(!currentUser) return document.getElementById('myUploads').innerHTML = `<h2>My Uploads</h2><p>Please login first.</p>`;
    const { data } = await supabase.from('documents').select('*, upvotes(id), bookmarks(id)').eq('uploaded_by', currentUser.id).order('created_at', {ascending: false});
    
    document.getElementById('myUploads').innerHTML = `
        <h2>📤 My Uploads</h2>
        <p style="color: #718096; margin-bottom: 20px;">Manage, edit, or delete the files you have contributed.</p>
        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
            ${data?.map(d => createDocCardHTML(d, 'myUploads')).join('') || '<p>No uploads yet.</p>'}
        </div>
    `;
}

// Search and Preview features remain exactly the same as previously built!
// [Code omitted for brevity in response, ensure you copy your existing Preview and Search functions here]
// ...
