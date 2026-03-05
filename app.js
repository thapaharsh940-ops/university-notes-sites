// =========================================
// SECTION 1: GLOBAL VARIABLES & ADMIN SETUP
// ==========================================
const ADMIN_CODE = "sahil12345"; 

let currentUser = null;
let currentBranch = null; let currentBatch = null; let currentSemester = null; let currentSection = null; let currentSubject = null;
let wsBranch = null; 

// ==========================================
// SECTION 2: SIDEBAR & MOBILE MENU
// ==========================================
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
if (mobileBtn) mobileBtn.onclick = () => { sidebar.classList.toggle("open"); sidebar.classList.toggle("closed"); };

window.onclick = e => { 
    if (e.target.classList.contains('modal-bg')) hideModal(); 
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!mobileBtn || !mobileBtn.contains(e.target))) {
        sidebar.classList.remove('open'); sidebar.classList.add('closed');
    }
};

// ==========================================
// SECTION 3: MODALS & AUTHENTICATION
// ==========================================
function showModal(html, which = "#auth-modal") {
    document.getElementById('modal-bg').classList.add('active');
    document.querySelector(which).innerHTML = html; document.querySelector(which).classList.add('active');
}
function hideModal() {
    document.getElementById('modal-bg').classList.remove('active');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
}

function showAuthModal(tab = 'login') {
    if (window.innerWidth <= 768) { sidebar.classList.remove('open'); sidebar.classList.add('closed'); }
    showModal(`
      <div style="text-align:center">
      <h2>${tab === 'login' ? "Login" : "Sign Up"}</h2>
      <form onsubmit="${tab === 'login' ? 'doLogin(event)' : 'doSignup(event)'}">
        <input id="auth-email" type="email" placeholder="Email" required><br>
        <input id="auth-pass" type="password" placeholder="Password" required><br>
        <button class="btn-primary" type="submit">${tab === 'login' ? "Login" : "Sign Up"}</button>
      </form></div>`);
}

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

window.doSignup = async function(e) { e.preventDefault(); const { error } = await supabase.auth.signUp({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-pass').value }); if (error) alert(error.message); else { alert("Check email to verify!"); hideModal(); } }
window.doLogin = async function(e) { e.preventDefault(); const { data, error } = await supabase.auth.signInWithPassword({ email: document.getElementById('auth-email').value, password: document.getElementById('auth-pass').value }); if (error) alert(error.message); else { setUserInfo(data.user); hideModal(); showDashboard('overview'); } }
window.logout = async function() { await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); }
supabase.auth.getSession().then(({ data: { session } }) => { setUserInfo(session?.user || null); showDashboard('overview'); });

// ==========================================
// SECTION 4: SAFE ROUTING (NO CRASHES!)
// ==========================================
window.showDashboard = async function(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(section);
    if(target) target.classList.add('active');
    
    try {
        if (section === 'overview') { await updateNotesStats(); loadRecentlyViewed(); }
        if (section === 'allBranches') listBranches();
        if (section === 'myUploads') myUploads();
        if (section === 'searchSection') showSearchPage();
        if (section === 'workstationHome') wsListBranches();
    } catch(err) { console.error("Routing error:", err); }

    if (window.innerWidth <= 768) { sidebar.classList.remove('open'); sidebar.classList.add('closed'); }
}

// ==========================================
// SECTION 5: NOTES OVERVIEW & RECENT
// ==========================================
window.updateNotesStats = async function() {
    const { count: totalNotes } = await supabase.from("documents").select("*", { count: "exact", head: true });
    const { count: totalAssignments } = await supabase.from("assignments").select("*", { count: "exact", head: true });
    
    document.getElementById('overview').innerHTML = `
        <h2 style="margin-bottom: 25px; color: #2d3748;">Platform Overview</h2>
        <div class="dash-grid">
            <div class="dash-card-premium bg-purple"><h3>📚 Total Notes</h3><div class="number">${totalNotes || 0}</div></div>
            <div class="dash-card-premium bg-green"><h3>💻 Total Assignments</h3><div class="number">${totalAssignments || 0}</div></div>
        </div>
        <div id="recent-views-container" style="margin-top: 30px; display: none;">
            <h3 style="color: #2d3748;">🕒 Recently Viewed</h3><div id="recentViews" style="display: flex; flex-direction: column; gap: 10px;"></div>
        </div>`;
}

function trackRecentView(doc) {
    let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
    recent = recent.filter(d => d.id !== doc.id); 
    recent.unshift({ id: doc.id, title: doc.title, file_url: doc.file_url, file_type: doc.file_type });
    if(recent.length > 4) recent.pop(); localStorage.setItem('recentViews', JSON.stringify(recent)); loadRecentlyViewed();
}

function loadRecentlyViewed() {
    let recent = JSON.parse(localStorage.getItem('recentViews') || '[]');
    const container = document.getElementById('recent-views-container');
    if(!container) return;
    if(recent.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    document.getElementById('recentViews').innerHTML = (recent || []).map(d => `<div class="branch-card" style="padding:1em; margin-bottom:5px;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')"><h4>${d.title}</h4></div>`).join('');
}

// ==========================================
// SECTION 6: FILE PREVIEW 
// ==========================================
window.previewFile = async function(url, type, docId) {
    if(docId) { const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single(); if(doc) trackRecentView(doc); }
    let contentHtml = '<button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>';
    if (type && type.startsWith('image/')) contentHtml += `<img src="${url}" style="max-width:100%;"/>`;
    else if (type === 'application/pdf') contentHtml += `<embed src="${url}" type="application/pdf" style="width:100%; height:60vh;" />`;
    else contentHtml += `<p>Preview not available.</p><a href="${url}" target="_blank" download class="btn-primary">📥 Download File</a>`;
    showModal(contentHtml, '#preview-modal');
}

// ==========================================
// SECTION 7: NOTES BROWSE HIERARCHY
// (Fixed mapping logic to prevent crashes)
// ==========================================
window.listBranches = async function() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Browse Notes</h2><button onclick="createFolder('branches', null, listBranches)" class="btn-primary" style="background:#28a745;">+ Add Branch</button>`;
    html += (data || []).map(b => `<div class="branch-card" onclick="showBranch('${b.id}')" style="display:flex; justify-content:space-between;"><h3>${b.name}</h3><div><button onclick="deleteFolder('branches', '${b.id}', listBranches, event)" class="btn-delete">🗑️</button></div></div>`).join('') || '<p>No branches.</p>';
    document.getElementById('allBranches').innerHTML = html;
}
window.showBranch = async function(id) {
    const { data } = await supabase.from('branches').select('*').eq('id', id).single(); currentBranch = data;
    let html = `<button onclick="showDashboard('allBranches')" class="btn-action">⬅ Back</button><h2>${data.name} Badges</h2><button onclick="createFolder('batches', '${id}', () => showBranch('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Badge</button><div id="batchList"></div>`;
    document.getElementById('branchDetail').innerHTML = html; showDashboard('branchDetail');
    const { data: batches } = await supabase.from('batches').select('*').eq('branch_id', id);
    document.getElementById('batchList').innerHTML = (batches || []).map(b => `<div class="branch-card" onclick="showBatch('${b.id}')" style="display:flex; justify-content:space-between;"><h3>🎓 ${b.name}</h3><button onclick="deleteFolder('batches', '${b.id}', () => showBranch('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No badges.</p>';
};
window.showBatch = async function(id) {
    const { data } = await supabase.from('batches').select('*').eq('id', id).single(); currentBatch = data;
    let html = `<button onclick="showBranch('${currentBranch.id}')" class="btn-action">⬅ Back</button><h2>Badge: ${data.name}</h2><button onclick="createFolder('semesters', '${id}', () => showBatch('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Semester</button><div id="semList"></div>`;
    document.getElementById('batchDetail').innerHTML = html; showDashboard('batchDetail');
    const { data: sems } = await supabase.from('semesters').select('*').eq('batch_id', id);
    document.getElementById('semList').innerHTML = (sems || []).map(s => `<div class="branch-card" onclick="showSemester('${s.id}')" style="display:flex; justify-content:space-between;"><h3>${s.name}</h3><button onclick="deleteFolder('semesters', '${s.id}', () => showBatch('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No semesters.</p>';
};
window.showSemester = async function(id) {
    const { data } = await supabase.from('semesters').select('*').eq('id', id).single(); currentSemester = data;
    let html = `<button onclick="showBatch('${currentSemester.batch_id}')" class="btn-action">⬅ Back</button><h2>${data.name}</h2><button onclick="createFolder('sections', '${id}', () => showSemester('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Group</button><div id="secList"></div>`;
    document.getElementById('semesterDetail').innerHTML = html; showDashboard('semesterDetail');
    const { data: secs } = await supabase.from('sections').select('*').eq('semester_id', id);
    document.getElementById('secList').innerHTML = (secs || []).map(s => `<div class="branch-card" onclick="showSection('${s.id}')" style="display:flex; justify-content:space-between;"><h3>${s.name}</h3><button onclick="deleteFolder('sections', '${s.id}', () => showSemester('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No groups.</p>';
};
window.showSection = async function(id) {
    const { data } = await supabase.from('sections').select('*').eq('id', id).single(); currentSection = data;
    let html = `<button onclick="showSemester('${currentSection.semester_id}')" class="btn-action">⬅ Back</button><h2>Group: ${data.name}</h2><button onclick="createFolder('subjects', '${id}', () => showSection('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Subject</button><div id="subList"></div>`;
    document.getElementById('sectionDetail').innerHTML = html; showDashboard('sectionDetail');
    const { data: subs } = await supabase.from('subjects').select('*').eq('section_id', id);
    document.getElementById('subList').innerHTML = (subs || []).map(s => `<div class="branch-card" onclick="showSubject('${s.id}')" style="display:flex; justify-content:space-between;"><h3>${s.name}</h3><button onclick="deleteFolder('subjects', '${s.id}', () => showSection('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No subjects.</p>';
};

window.showSubject = async function(id) {
    const { data } = await supabase.from('subjects').select('*').eq('id', id).single(); currentSubject = data;
    let html = `<button onclick="showSection('${currentSubject.section_id}')" class="btn-action" style="margin-bottom: 1em;">⬅ Back</button><h2>${data.name}</h2>
      <form onsubmit="uploadDocument(event)" style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3>Upload Notes</h3>
        <input id="docTitle" placeholder="Document Title" required />
        <input id="docFile" type="file" required />
        <button class="btn-primary" type="submit" style="width: 100%;">Upload Notes</button>
      </form><div id="documentList" style="display: flex; flex-wrap: wrap; gap: 15px;"></div>`;
    document.getElementById('subjectDetail').innerHTML = html; showDashboard('subjectDetail'); loadDocuments(id); 
};

window.uploadDocument = async function(e) {
    e.preventDefault(); if(!currentUser) return alert("Please login to upload.");
    const title = document.getElementById('docTitle').value; const file = document.getElementById('docFile').files[0];
    try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        const { error } = await supabase.from('documents').insert([{
            subject_id: currentSubject.id, title: title, batch_year: currentBatch.name, file_url: fileUrl, file_type: file.type, uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error; alert("Uploaded!"); showSubject(currentSubject.id); 
    } catch(err) { alert("Upload failed!"); console.error(err); }
};

window.loadDocuments = async function(subId) {
    const { data } = await supabase.from('documents').select('*').eq('subject_id', subId).order('created_at', {ascending: false});
    document.getElementById('documentList').innerHTML = (data || []).map(d => `<div class="branch-card" style="width: 250px;"><h4>${d.title}</h4><button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary">👁️ View</button><button onclick="deleteFolder('documents', '${d.id}', () => loadDocuments('${subId}'), event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No documents.</p>';
}

// ==========================================
// SECTION 8: NOTES SEARCH & MY UPLOADS
// ==========================================
window.showSearchPage = function() {
    let yrOptions = '<option value="All">Search All Badges</option>';
    for(let y=2100; y>=1900; y--) yrOptions += `<option value="${y}">${y}</option>`;
    document.getElementById('searchSection').innerHTML = `
        <h2>🔍 Search Notes</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <select id="searchBadge" style="margin-bottom: 15px;">${yrOptions}</select>
            <input type="text" id="searchInput" placeholder="Type document name..." onkeyup="performNotesSearch()" />
        </div>
        <div id="searchResults" style="display: flex; flex-wrap: wrap; gap: 15px;"></div>
    `;
}
window.performNotesSearch = async function() {
    const badge = document.getElementById('searchBadge').value;
    const query = document.getElementById('searchInput').value;
    if (query.length < 2) return;
    
    let dbQuery = supabase.from('documents').select('*').ilike('title', `%${query}%`).order('created_at', { ascending: false });
    if (badge && badge !== "All") dbQuery = dbQuery.eq('batch_year', badge);
    
    const { data, error } = await dbQuery;
    if (error) return console.error(error);
    document.getElementById('searchResults').innerHTML = (data || []).map(d => `<div class="branch-card" style="width:250px;" onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')"><h4>${d.title}</h4><p style="font-size:0.8em; color:gray;">🎓 ${d.batch_year || 'Unknown'}</p></div>`).join('') || '<p>No results found.</p>';
};

window.myUploads = async function() {
    if(!currentUser) { document.getElementById('myUploads').innerHTML = `<p>Please login.</p>`; return; }
    const { data } = await supabase.from('documents').select('*').eq('uploaded_by', currentUser.id);
    document.getElementById('myUploads').innerHTML = `<h2>My Uploads</h2><div style="display:flex; flex-wrap:wrap; gap:15px;">` + ((data || []).map(d => `<div class="branch-card" style="width:250px;"><h4>${d.title}</h4><button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">View</button><button onclick="deleteFolder('documents', '${d.id}', myUploads, event)" class="btn-delete">Delete</button></div>`).join('') || '<p>No uploads.</p>') + `</div>`;
}

// ==========================================
// SECTION 9: ADMIN FOLDER CREATOR TOOL
// ==========================================
window.createFolder = async function(table, parentId, refreshFunc) {
    const p = prompt("Admin Code:"); if(p !== ADMIN_CODE) return;
    const n = prompt("Enter Name/Number:"); if(!n) return;
    
    let insertData = { name: n };
    if (table === 'batches') insertData = { branch_id: parentId, name: n };
    if (table === 'semesters') insertData = { batch_id: parentId, name: n };
    if (table === 'sections') insertData = { semester_id: parentId, name: n };
    if (table === 'subjects') insertData = { section_id: parentId, name: n };
    if (table === 'ws_batches') insertData = { branch_id: parentId, name: n };
    if (table === 'ws_semesters') insertData = { batch_id: parentId, name: n };
    if (table === 'ws_sections') insertData = { semester_id: parentId, name: n };
    if (table === 'ws_subjects') insertData = { section_id: parentId, name: n };

    await supabase.from(table).insert([insertData]); refreshFunc();
};

window.deleteFolder = async function(table, id, refreshFunc, e) {
    e.stopPropagation(); const p = prompt("Admin Code:"); if(p !== ADMIN_CODE) return;
    if(confirm("Delete this?")) { await supabase.from(table).delete().eq('id', id); refreshFunc(); }
};

// ==========================================
// SECTION 10: WORKSTATION (ASSIGNMENTS)
// ==========================================
window.wsListBranches = async function() {
    const { data } = await supabase.from('ws_branches').select('*').order('name');
    let html = `<h2>Workstation (Select Branch)</h2>`;
    html += `<button onclick="createFolder('ws_branches', null, wsListBranches)" class="btn-primary" style="background:#28a745;">+ Add WS Branch (Admin)</button>`;
    html += (data || []).map(b => `<div class="branch-card" onclick="wsShowBranch('${b.id}', '${b.name}')" style="display:flex; justify-content:space-between;"><h3>💻 ${b.name}</h3><button onclick="deleteFolder('ws_branches', '${b.id}', wsListBranches, event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No branches.</p>';
    document.getElementById('workstationHome').innerHTML = html;
}

window.wsShowBranch = async function(id, name) {
    wsBranch = {id: id, name: name};
    
    let batchOptions = '<option value="">All Badges</option>';
    const { data: batches } = await supabase.from('ws_batches').select('*').eq('branch_id', id);
    (batches || []).forEach(b => batchOptions += `<option value="${b.name}">${b.name}</option>`);

    let html = `
        <button onclick="showDashboard('workstationHome')" class="btn-action" style="margin-bottom: 1em;">⬅ Back to Branches</button>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <h2 style="margin:0;">📝 ${name} Assignments</h2>
            <button onclick="showAssignmentUploadForm('${id}')" class="btn-primary" style="background:#48bb78; margin:0;">+ Upload Assignment</button>
        </div>

        <div class="search-grid">
            <div class="search-box-card">
                <h3>🔍 Specific Search</h3>
                <select id="wsSpecBadge" style="margin-bottom:10px;">${batchOptions}</select>
                <input id="wsSpecGroup" placeholder="Group Name (e.g. Group A)" />
                <input id="wsSpecSub" placeholder="Subject Name" />
                <input id="wsSpecNo" placeholder="Assignment No" />
                <button onclick="wsSearchSpecific('${id}')" class="btn-primary" style="width:100%;">Search</button>
            </div>
            <div class="search-box-card purple">
                <h3>🌐 Search All Questions</h3>
                <textarea id="wsAllQ" placeholder="Type assignment question..."></textarea>
                <button onclick="wsSearchAll('${id}')" class="btn-primary" style="width:100%; background:#8b5cf6;">Search</button>
            </div>
        </div>
        <div id="wsResultsList" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 1em; margin-bottom: 2em;"></div>
        
        <hr>
        <h3 style="margin-top:2em; color:#718096;">Admin Folder Builder</h3>
        <button onclick="createFolder('ws_batches', '${id}', () => wsShowBranch('${id}','${name}'))" class="btn-primary" style="background:#28a745;">+ Add WS Badge</button>
        <div id="wsBatchList"></div>
    `;
    document.getElementById('wsBranchDetail').innerHTML = html; showDashboard('wsBranchDetail');
    
    document.getElementById('wsBatchList').innerHTML = (batches || []).map(b => `<div class="branch-card" onclick="wsShowBatch('${b.id}')" style="display:flex; justify-content:space-between;"><h4>🎓 ${b.name}</h4><button onclick="deleteFolder('ws_batches', '${b.id}', () => wsShowBranch('${id}','${name}'), event)" class="btn-delete">🗑️</button></div>`).join('') || '<p>No folders.</p>';
};

// Drilldown logic so admins can build the paths for the upload form
window.wsShowBatch = async function(id) {
    const { data } = await supabase.from('ws_batches').select('*').eq('id', id).single();
    let html = `<button onclick="wsShowBranch('${wsBranch.id}', '${wsBranch.name}')" class="btn-action">⬅ Back</button><h2>WS Badge: ${data.name}</h2><button onclick="createFolder('ws_semesters', '${id}', () => wsShowBatch('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Semester</button><div id="wsSemList"></div>`;
    document.getElementById('wsBatchDetail').innerHTML = html; showDashboard('wsBatchDetail');
    const { data: sems } = await supabase.from('ws_semesters').select('*').eq('batch_id', id);
    document.getElementById('wsSemList').innerHTML = (sems || []).map(s => `<div class="branch-card" onclick="wsShowSemester('${s.id}')" style="display:flex; justify-content:space-between;"><h4>${s.name}</h4><button onclick="deleteFolder('ws_semesters', '${s.id}', () => wsShowBatch('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('');
};
window.wsShowSemester = async function(id) {
    const { data } = await supabase.from('ws_semesters').select('*').eq('id', id).single();
    let html = `<button onclick="wsShowBatch('${data.batch_id}')" class="btn-action">⬅ Back</button><h2>${data.name}</h2><button onclick="createFolder('ws_sections', '${id}', () => wsShowSemester('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Group</button><div id="wsGrpList"></div>`;
    document.getElementById('wsSemesterDetail').innerHTML = html; showDashboard('wsSemesterDetail');
    const { data: secs } = await supabase.from('ws_sections').select('*').eq('semester_id', id);
    document.getElementById('wsGrpList').innerHTML = (secs || []).map(s => `<div class="branch-card" onclick="wsShowSection('${s.id}')" style="display:flex; justify-content:space-between;"><h4>${s.name}</h4><button onclick="deleteFolder('ws_sections', '${s.id}', () => wsShowSemester('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('');
};
window.wsShowSection = async function(id) {
    const { data } = await supabase.from('ws_sections').select('*').eq('id', id).single();
    let html = `<button onclick="wsShowSemester('${data.semester_id}')" class="btn-action">⬅ Back</button><h2>${data.name}</h2><button onclick="createFolder('ws_subjects', '${id}', () => wsShowSection('${id}'))" class="btn-primary" style="background:#28a745;">+ Add Subject</button><div id="wsSubList"></div>`;
    document.getElementById('wsSectionDetail').innerHTML = html; showDashboard('wsSectionDetail');
    const { data: subs } = await supabase.from('ws_subjects').select('*').eq('section_id', id);
    document.getElementById('wsSubList').innerHTML = (subs || []).map(s => `<div class="branch-card" style="display:flex; justify-content:space-between;"><h4>${s.name}</h4><button onclick="deleteFolder('ws_subjects', '${s.id}', () => wsShowSection('${id}'), event)" class="btn-delete">🗑️</button></div>`).join('');
};

// ==========================================
// SECTION 11: ASSIGNMENT SEARCH RESULTS
// ==========================================
window.wsSearchSpecific = async function(branchId) {
    const badge = document.getElementById('wsSpecBadge').value; const group = document.getElementById('wsSpecGroup').value; const sub = document.getElementById('wsSpecSub').value; const num = document.getElementById('wsSpecNo').value;
    document.getElementById('wsResultsList').innerHTML = '<p>Searching...</p>';
    let query = supabase.from('assignments').select('*').eq('branch_id', branchId);
    if (badge) query = query.ilike('batch_name', `%${badge}%`);
    if (group) query = query.ilike('section_name', `%${group}%`);
    if (sub) query = query.ilike('subject_name', `%${sub}%`);
    if (num) query = query.eq('assignment_no', num);
    const { data } = await query; wsRenderAss(data);
}
window.wsSearchAll = async function(branchId) {
    const q = document.getElementById('wsAllQ').value; if (!q) return;
    document.getElementById('wsResultsList').innerHTML = '<p>Searching...</p>';
    const { data } = await supabase.from('assignments').select('*').eq('branch_id', branchId).ilike('question', `%${q}%`);
    wsRenderAss(data);
}
function wsRenderAss(data) {
    document.getElementById('wsResultsList').innerHTML = (data || []).map(a => `
        <div class="branch-card" style="width: 300px; border-top: 4px solid #48bb78;">
            <span style="background: #edf2f7; padding: 2px 6px; font-size: 0.8em;">No: ${a.assignment_no}</span>
            <span style="background: #ebf4ff; padding: 2px 6px; font-size: 0.8em;">🎓 ${a.batch_name}</span>
            <h4 style="margin:10px 0;">${a.question}</h4>
            <p style="font-size: 0.8em; color: #718096;">Subject: ${a.subject_name} | Group: ${a.section_name}</p>
            <p style="font-size: 0.8em; color: #718096;">By: ${a.student_name || a.uploader_email}</p>
            <button onclick="previewFile('${a.file_url}', '${a.file_type}', null)" class="btn-primary" style="width: 100%;">👁️ View</button>
        </div>`).join('') || `<p>No assignments found.</p>`;
}

// ==========================================
// SECTION 12: ASSIGNMENT UPLOAD WIZARD
// ==========================================
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
        </form>`;
    document.getElementById('workstationUpload').innerHTML = html; showDashboard('workstationUpload');
    const { data: batches } = await supabase.from('ws_batches').select('*').eq('branch_id', branchId);
    const badgeSelect = document.getElementById('upWsBadge');
    (batches || []).forEach(b => badgeSelect.innerHTML += `<option value="${b.id}|${b.name}">${b.name}</option>`);
}

window.wsLoadSems = async function(sel) {
    const sem = document.getElementById('upWsSem'); sem.innerHTML = '<option value="">Select Semester...</option>';
    if(!sel.value) { sem.disabled = true; return; }
    const { data } = await supabase.from('ws_semesters').select('*').eq('batch_id', sel.value.split('|')[0]);
    (data || []).forEach(s => sem.innerHTML += `<option value="${s.id}|${s.name}">${s.name}</option>`); sem.disabled = false;
}
window.wsLoadGroups = async function(sel) {
    const grp = document.getElementById('upWsGroup'); grp.innerHTML = '<option value="">Select Group...</option>';
    if(!sel.value) { grp.disabled = true; return; }
    const { data } = await supabase.from('ws_sections').select('*').eq('semester_id', sel.value.split('|')[0]);
    (data || []).forEach(g => grp.innerHTML += `<option value="${g.id}|${g.name}">${g.name}</option>`); grp.disabled = false;
}
window.wsLoadSubs = async function(sel) {
    const sub = document.getElementById('upWsSub'); sub.innerHTML = '<option value="">Select Subject...</option>';
    if(!sel.value) { sub.disabled = true; return; }
    const { data } = await supabase.from('ws_subjects').select('*').eq('section_id', sel.value.split('|')[0]);
    (data || []).forEach(s => sub.innerHTML += `<option value="${s.id}|${s.name}">${s.name}</option>`); sub.disabled = false;
}

window.submitAssignmentUpload = async function(e, branchId) {
    e.preventDefault(); if(!currentUser) return;
    const file = document.getElementById('upAssFile').files[0];
    try {
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        await supabase.storage.from('university-assignments-files').upload(fileName, file);
        const { data: { publicUrl: fileUrl } } = supabase.storage.from('university-assignments-files').getPublicUrl(fileName);

        const { error } = await supabase.from('assignments').insert([{
            branch_id: branchId, 
            batch_name: document.getElementById('upWsBadge').value.split('|')[1], 
            semester_name: document.getElementById('upWsSem').value.split('|')[1], 
            section_name: document.getElementById('upWsGroup').value.split('|')[1], 
            subject_name: document.getElementById('upWsSub').value.split('|')[1],
            assignment_no: document.getElementById('upAssNo').value, question: document.getElementById('upQuestion').value,
            student_name: document.getElementById('upStudentName').value || null, file_url: fileUrl, file_type: file.type,
            uploaded_by: currentUser.id, uploader_email: currentUser.email
        }]);
        if (error) throw error; alert("Assignment Uploaded! 📝"); wsShowBranch(wsBranch.id, wsBranch.name);
    } catch(err) { alert("Upload failed!"); console.error(err); }
}
