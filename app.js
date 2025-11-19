// ============================================
// COMPLETE APP.JS - University Notes Platform
// Mobile-friendly, Modals, File Preview, Analytics
// ============================================

const ADMIN_CODE = "sahil12345"; // Change this to your secret admin code

// Global state
let currentUser = null;
let currentBranch = null;
let currentSemester = null;
let currentSection = null;
let currentSubject = null;

// SIDEBAR & UI SETUP
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
};

// MODAL SYSTEM
function showModal(html, which = "#auth-modal") {
    document.getElementById('modal-bg').classList.add('active');
    document.querySelector(which).innerHTML = html;
    document.querySelector(which).classList.add('active');
}
function hideModal() {
    document.getElementById('modal-bg').classList.remove('active');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
}
function requireAdmin(action) {
    showModal(`
    <div>
        <h3>🔒 Admin Code Required</h3>
        <input id="admin-code-input" type="password" placeholder="Enter admin code" autofocus />
        <button onclick="checkAdminAndProceed('${action}')" class="btn-primary">Continue</button>
        <button onclick="hideModal()" class="btn-delete">Cancel</button>
    </div>`, "#admin-modal");
}
function checkAdminAndProceed(action) {
    const val = document.getElementById('admin-code-input').value;
    if (val !== ADMIN_CODE) {
        alert('❌ Incorrect admin code!');
        return;
    }
    hideModal();
    if (typeof window[action] === "function") window[action]();
}
function showAuthModal(tab = 'login') {
    showModal(`
      <div style="text-align:center">
      <button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>
      <h2>${tab === 'login' ? "Login" : "Sign Up"}</h2>
      <form onsubmit="${tab === 'login' ? 'doLogin(event)' : 'doSignup(event)'}">
        <input id="auth-email" type="email" placeholder="Email" required><br>
        <input id="auth-pass" type="password" placeholder="Password" required><br>
        ${tab === 'signup' ? '<input id="auth-confirm" type="password" placeholder="Confirm Password" required><br>' : ''}
        <button class="btn-primary" type="submit">${tab === 'login' ? "Login" : "Sign Up"}</button>
      </form>
      <div style="margin-top:1em;">
        <a onclick="showAuthModal('${tab === 'login' ? 'signup' : 'login'}')" class="link">
        ${tab === 'login' ? 'Create new account' : 'Already have an account?'}
        </a>
      </div>
      </div>
    `);
}
window.showAuthModal = showAuthModal;

// AUTH FUNCTIONS
function setUserInfo(user) {
    currentUser = user;
    const userBar = document.getElementById('user-bar');
    if (userBar) userBar.textContent = user ? ("👤 " + user.email) : '';
}

async function doSignup(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const confirm = document.getElementById('auth-confirm').value;
    if (pass !== confirm) return alert("Passwords do not match.");
    let { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) alert("Signup error: " + error.message);
    else { alert("✅ Check your email for verification!"); hideModal(); }
}
async function doLogin(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    let { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert("Login failed: " + error.message);
    else { setUserInfo(data.user); hideModal(); showDashboard('overview'); }
}
async function logout() {
    await supabase.auth.signOut();
    setUserInfo(null);
    showAuthModal('login');
}
window.logout = logout;

// Initialize auth on page load
supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    if (!session?.user) showAuthModal('login');
});
supabase.auth.onAuthStateChange((event, session) => setUserInfo(session?.user || null));

// DASHBOARD NAVIGATION
function showDashboard(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) headerTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    // Load dynamic content
    if (section === 'overview') updateDashboardStats();
    if (section === 'allBranches') listBranches();
    if (section === 'search') setupSearch();
    if (section === 'myUploads') myUploads();
}
window.showDashboard = showDashboard;

// DASHBOARD ANALYTICS
async function updateDashboardStats() {
    const { count: total } = await supabase.from("documents").select("*", { count: "exact", head: true });
    document.getElementById("totalDocs").innerText = total || 0;
    const today = new Date(), fdm = new Date(today.getFullYear(), today.getMonth(), 1);
    const { count: monthly } = await supabase.from("documents").select("*", { count: "exact", head: true }).gte('created_at', fdm.toISOString());
    document.getElementById("monthlyUploads").innerText = monthly || 0;
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase.from("documents").select("*", { count: "exact", head: true }).gte('created_at', today.toISOString());
    document.getElementById("todayUploads").innerText = todayCount || 0;
    if (currentUser) {
        const { count: mine } = await supabase.from("documents").select("*", { count: "exact", head: true }).eq("uploaded_by", currentUser.id);
        document.getElementById("myUploadsCount").innerText = mine || 0;
    }
    const { data: recent } = await supabase.from("documents").select("title,created_at").order("created_at", { ascending: false }).limit(10);
    const log = recent ? recent.map(x => `<li>${x.title} <small>(${new Date(x.created_at).toLocaleString()})</small></li>`).join('') : '<li>No recent activity</li>';
    document.getElementById("activity-log").innerHTML = log;
}

// BRANCH CRUD
async function listBranches() {
    const { data } = await supabase.from('branches').select('*').order('name');
    let html = `<h2>Branches</h2><button class="btn-primary" onclick="requireAdmin('createBranch')">+ Branch</button>`;
    html += data?.map(b => `
       <div class="branch-card" onclick="showBranch('${b.id}')">
        <h3>${b.name}</h3>
        <p>${b.description || ''}</p>
        <button onclick="event.stopPropagation(); requireAdmin('delBranch_${b.id}')" class="btn-delete">Delete</button>
       </div>`).join('') || '<p>No branches yet.</p>';
    document.getElementById('allBranches').innerHTML = html;
}
window.delBranch = async function(id) {
    if (!confirm('Delete branch?')) return;
    await supabase.from('branches').delete().eq('id', id);
    listBranches();
};
window.createBranch = function() {
    showModal(`
      <h3>New Branch</h3>
      <input id="branch-name" placeholder="Branch Name"><br>
      <textarea id="branch-desc" placeholder="Description"></textarea><br>
      <button onclick="confirmCreateBranch()" class="btn-primary">Create</button>
      <button onclick="hideModal()" class="btn-delete">Cancel</button>
    `, "#admin-modal");
}
window.confirmCreateBranch = async function() {
    let name = document.getElementById('branch-name').value, desc = document.getElementById('branch-desc').value;
    if (!name) return alert('Enter branch name');
    await supabase.from('branches').insert([{ name, description: desc }]);
    hideModal();
    listBranches();
}
window.showBranch = async function(branchId) {
    const { data: branch } = await supabase.from('branches').select('*').eq('id', branchId).single();
    currentBranch = branch;
    document.getElementById('branchDetail').innerHTML = `<h2>${branch.name}</h2>
        <button class="btn-primary" onclick="requireAdmin('createSemester')">+ New Semester</button>
        <div id="semesterList"></div>
    `;
    showDashboard('branchDetail');
    loadSemesters(branchId);
};

// SEMESTER CRUD
window.createSemester = function() {
    showModal(`
      <h3>Create New Semester</h3>
      <input id="semester-number" type="number" placeholder="Semester Number" />
      <input id="semester-name" type="text" placeholder="Semester Name" />
      <button onclick="confirmCreateSemester()" class="btn-primary">Create</button>
      <button onclick="hideModal()" class="btn-delete">Cancel</button>
    `, "#admin-modal");
};
window.confirmCreateSemester = async function() {
    const num = Number(document.getElementById('semester-number').value);
    const name = document.getElementById('semester-name').value.trim();
    if (!num || !name || !currentBranch) return alert('Fill all fields!');
    await supabase.from('semesters').insert([{ branch_id: currentBranch.id, semester_number: num, name }]);
    hideModal();
    loadSemesters(currentBranch.id);
};
async function loadSemesters(branchId) {
    const { data } = await supabase.from('semesters').select('*').eq('branch_id', branchId).order('semester_number');
    const list = document.getElementById('semesterList');
    if (!data || data.length === 0) list.innerHTML = '<p>No semesters yet.</p>';
    else list.innerHTML = data.map(s => `<div class="branch-card" onclick="showSemester('${s.id}')">
        <h3>Semester ${s.semester_number}: ${s.name}</h3>
        <button onclick="event.stopPropagation(); requireAdmin('delSemester_${s.id}')" class="btn-delete">Delete</button></div>`).join('');
}
window.delSemester = async function(id) {
    if (!confirm('Delete semester?')) return;
    await supabase.from('semesters').delete().eq('id', id);
    loadSemesters(currentBranch.id);
};
window.showSemester = async function(semesterId) {
    const { data: semester } = await supabase.from('semesters').select('*').eq('id', semesterId).single();
    currentSemester = semester;
    document.getElementById('semesterDetail').innerHTML = `<h2>Semester ${semester.semester_number}: ${semester.name}</h2>
      <button class="btn-primary" onclick="requireAdmin('addSection')">+ Add Section</button>
      <div id="sectionList"></div>`;
    showDashboard('semesterDetail');
    loadSections(semester.id);
};

// SECTION CRUD
window.addSection = async function() {
    const name = prompt('New Section Name');
    if (!name) return;
    await supabase.from('sections').insert([{ semester_id: currentSemester.id, name }]);
    loadSections(currentSemester.id);
};
async function loadSections(semesterId) {
    const { data } = await supabase.from('sections').select('*').eq('semester_id', semesterId);
    const list = document.getElementById('sectionList');
    if (!data || data.length === 0) list.innerHTML = '<p>No sections yet.</p>';
    else list.innerHTML = data.map(s => `<div class="branch-card" onclick="showSection('${s.id}')">
      <h3>Section: ${s.name}</h3>
      <button onclick="event.stopPropagation(); requireAdmin('delSection_${s.id}')" class="btn-delete">Delete</button></div>`).join('');
}
window.delSection = async function(id) {
    if (!confirm('Delete section?')) return;
    await supabase.from('sections').delete().eq('id', id);
    loadSections(currentSemester.id);
};
window.showSection = async function(sectionId) {
    const { data: section } = await supabase.from('sections').select('*').eq('id', sectionId).single();
    currentSection = section;
    document.getElementById('sectionDetail').innerHTML = `<h2>Section: ${section.name}</h2>
      <button class="btn-primary" onclick="requireAdmin('addSubject')">+ Add Subject</button>
      <div id="subjectList"></div>`;
    showDashboard('sectionDetail');
    loadSubjects(section.id);
};

// SUBJECT CRUD
window.addSubject = async function() {
    const name = prompt("New Subject Name");
    if (!name) return;
    await supabase.from('subjects').insert([{ section_id: currentSection.id, name }]);
    loadSubjects(currentSection.id);
};
async function loadSubjects(sectionId) {
    const { data } = await supabase.from('subjects').select('*').eq('section_id', sectionId);
    const list = document.getElementById('subjectList');
    if (!data || data.length === 0) list.innerHTML = '<p>No subjects yet.</p>';
    else list.innerHTML = data.map(s => `<div class="branch-card" onclick="showSubject('${s.id}')">
      <h3>Subject: ${s.name}</h3>
      <button onclick="event.stopPropagation(); requireAdmin('delSubject_${s.id}')" class="btn-delete">Delete</button></div>`).join('');
}
window.delSubject = async function(id) {
    if (!confirm('Delete subject?')) return;
    await supabase.from('subjects').delete().eq('id', id);
    loadSubjects(currentSection.id);
};
window.showSubject = async function(subjectId) {
    const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).single();
    currentSubject = subject;
    document.getElementById('subjectDetail').innerHTML = `
      <h2>Subject: ${subject.name}</h2>
      <form onsubmit="uploadDocument(event)">
        <input id="docTitle" placeholder="Document Title" required />
        <textarea id="docDesc" placeholder="Description"></textarea>
        <input id="docFile" type="file" required />
        <button class="btn-primary">Upload</button>
      </form>
      <div id="documentList"></div>`;
    showDashboard('subjectDetail');
    loadDocuments(subject.id);
};

// DOCUMENTS UPLOAD + CRUD
window.uploadDocument = async function(e) {
    e.preventDefault();
    const title = document.getElementById('docTitle').value;
    const description = document.getElementById('docDesc').value;
    const fileInput = document.getElementById('docFile');
    const file = fileInput.files[0];
    if (!file || !title) return alert("Select file and enter title.");
    if (file.size > 52428800) return alert("Maximum file size is 50MB.");
    try {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('university-notes-files').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        const { error } = await supabase.from('documents').insert([{
            subject_id: currentSubject.id,
            title,
            description,
            file_url: publicUrl,
            file_type: file.type || 'unknown',
            file_size: file.size,
            uploaded_by: currentUser.id
        }]);
        if (error) throw error;
        alert("Upload successful!");
        document.getElementById('docTitle').value = '';
        document.getElementById('docDesc').value = '';
        fileInput.value = '';
        loadDocuments(currentSubject.id);
    } catch(err) {
        alert("Upload failed: " + err.message);
    }
};
async function loadDocuments(subjectId) {
    const { data } = await supabase.from('documents').select('*').eq('subject_id', subjectId).order('created_at', {ascending: false});
    const list = document.getElementById('documentList');
    if (!data || data.length === 0) {
        list.innerHTML = "<p>No documents uploaded.</p>";
        return;
    }
    list.innerHTML = data.map(d => `
        <div class="branch-card">
            <h4>${d.title}</h4>
            <p>${d.description || ""}</p>
            <p><small>${(d.file_size/1024/1024).toFixed(2)} MB | ${d.file_type}</small></p>
            <button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">Preview / Download</button>
            <button onclick="requireAdmin('delDocument_${d.id}')" class="btn-delete">Delete</button>
        </div>
    `).join('');
}
window.delDocument = async function(id) {
    if (!confirm('Delete document?')) return;
    await supabase.from('documents').delete().eq('id', id);
    loadDocuments(currentSubject.id);
};

// FILE PREVIEW
function previewFile(url, type) {
    let contentHtml = '<button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>';
    if (type.startsWith('image/')) {
        contentHtml += `<img src="${url}" alt="Image Preview" class="preview-image"/>`;
    } else if (type === 'application/pdf') {
        contentHtml += `<embed src="${url}" type="application/pdf" class="preview-pdf" />`;
    } else if (type.startsWith('video/')) {
        contentHtml += `<video src="${url}" controls class="preview-video"></video>`;
    } else {
        contentHtml += `<p>Preview not available for this file type.</p><a href="${url}" target="_blank" class="btn-primary">Download File</a>`;
    }
    showModal(contentHtml, '#preview-modal');
}

// SEARCH
function setupSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('subjectResults').innerHTML = '';
    document.getElementById('searchResults').innerHTML = '';
}
async function searchContent() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return alert("Please enter a search term.");
    const { data: subjects } = await supabase.from('subjects').select('id, name').ilike('name', `%${query}%`);
    let subjectHtml = '<strong>Matching Subjects:</strong><br/>';
    if (subjects && subjects.length > 0) {
        subjectHtml += subjects.map(s =>
            `<p class="search-subject" onclick="showSubject('${s.id}')">${s.name}</p>`
        ).join('');
    } else {
        subjectHtml += '<p>No matching subjects.</p>';
    }
    document.getElementById('subjectResults').innerHTML = subjectHtml;
    const { data: documents } = await supabase.from('documents').select('*, subjects(name)').or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    let docsHtml = '<strong>Matching Documents:</strong><br/>';
    if (documents && documents.length > 0) {
        docsHtml += documents.map(d => `
            <div class="branch-card">
                <h4>${d.title}</h4>
                <p>${d.description || ''}</p>
                <p><small>Subject: ${d.subjects?.name || 'Unknown'}</small></p>
                <button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">Preview / Download</button>
            </div>
        `).join('');
    } else {
        docsHtml += '<p>No matching documents found.</p>';
    }
    document.getElementById('searchResults').innerHTML = docsHtml;
}

// MY UPLOADS
async function myUploads() {
    if (!currentUser) {
        document.getElementById('myUploads').innerHTML = '<p>Please login to see your uploads.</p>';
        return;
    }
    const { data } = await supabase.from('documents').select('*, subjects(name)').eq('uploaded_by', currentUser.id).order('created_at', { ascending: false });
    const list = document.getElementById('myUploads');
    if (!data || data.length === 0) {
        list.innerHTML = '<h2>My Uploads</h2><p>You haven\'t uploaded any documents yet.</p>';
        return;
    }
    list.innerHTML = '<h2>My Uploads</h2>' + data.map(d => `
        <div class="branch-card">
            <h4>📄 ${d.title}</h4>
            <p>${d.description || ""}</p>
            <p><small>Subject: ${d.subjects?.name || 'Unknown'} | ${(d.file_size / 1024 / 1024).toFixed(2)} MB</small></p>
            <button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">👁️ Preview</button>
            <button onclick="requireAdmin('delDocument_${d.id}')" class="btn-delete">🗑️ Delete</button>
        </div>
    `).join('');
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
});

document.addEventListener('DOMContentLoaded', () => {
    // complete
});
