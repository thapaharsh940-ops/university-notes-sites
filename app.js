// ============================================
// UNIVERSITY NOTES PLATFORM - app.js
// Complete JavaScript with all features
// ============================================

const ADMIN_CODE = "admin2025"; // Change this to your secret admin code

// Global state variables
let currentUser = null;
let currentBranch = null;
let currentSemester = null;
let currentSection = null;
let currentSubject = null;

// ========== SIDEBAR MOBILE TOGGLE ==========
const sidebar = document.getElementById('sidebar');
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebarToggle = document.getElementById('sidebar-toggle');

if (mobileBtn) {
    mobileBtn.onclick = function() {
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('closed');
    };
}

if (sidebarToggle) {
    sidebarToggle.onclick = function() {
        sidebar.classList.toggle('open');
        sidebar.classList.toggle('closed');
    };
}

// Close modal on background click
window.onclick = function(e) {
    if (e.target.classList.contains('modal-bg')) {
        hideModal();
    }
};

// ========== MODAL SYSTEM ==========
function showModal(html, which = "#auth-modal") {
    document.getElementById('modal-bg').classList.add('active');
    const modalEl = document.querySelector(which);
    modalEl.innerHTML = html;
    modalEl.classList.add('active');
}

function hideModal() {
    document.getElementById('modal-bg').classList.remove('active');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.remove('active'));
}

// Admin verification
function requireAdmin(action) {
    showModal(`
        <div>
            <h3>🔒 Admin Code Required</h3>
            <p>Enter admin code to perform this action</p>
            <input id="admin-code-input" type="password" placeholder="Admin code" autofocus>
            <button onclick="checkAdminAndProceed('${action}')" class="btn-primary">Continue</button>
            <button onclick="hideModal()" class="btn-delete">Cancel</button>
        </div>
    `, "#admin-modal");
}

function checkAdminAndProceed(action) {
    const val = document.getElementById('admin-code-input').value;
    if (val !== ADMIN_CODE) {
        alert('❌ Invalid admin code!');
        return;
    }
    hideModal();
    if (typeof window[action] === "function") {
        window[action]();
    }
}

// Auth modal
function showAuthModal(tab = 'login') {
    showModal(`
        <div style="text-align:center">
            <button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>
            <h2>${tab === 'login' ? 'Login' : 'Create Account'}</h2>
            <form onsubmit="${tab === 'login' ? 'doLogin(event)' : 'doSignup(event)'}">
                <input id="auth-email" type="email" placeholder="Email" required>
                <input id="auth-pass" type="password" placeholder="Password" required>
                ${tab === 'signup' ? '<input id="auth-confirm" type="password" placeholder="Confirm Password" required>' : ''}
                <button class="btn-primary" type="submit">${tab === 'login' ? 'Login' : 'Sign Up'}</button>
            </form>
            <p style="margin-top:1rem;">
                <a onclick="showAuthModal('${tab === 'login' ? 'signup' : 'login}')" class="link">
                    ${tab === 'login' ? 'Create new account' : 'Already have an account? Login'}
                </a>
            </p>
        </div>
    `);
}
window.showAuthModal = showAuthModal;

// ========== AUTHENTICATION ==========
function setUserInfo(user) {
    currentUser = user;
    const userBar = document.getElementById('user-bar');
    if (userBar) {
        userBar.textContent = user ? `👤 ${user.email}` : '';
    }
}

async function doSignup(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const confirm = document.getElementById('auth-confirm')?.value;
    
    if (confirm && pass !== confirm) {
        alert('Passwords do not match!');
        return;
    }
    
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) {
        alert('Signup error: ' + error.message);
    } else {
        alert('✅ Account created! Check your email to verify.');
        hideModal();
    }
}

async function doLogin(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password: pass 
    });
    
    if (error) {
        alert('Login failed: ' + error.message);
    } else {
        setUserInfo(data.user);
        hideModal();
        showDashboard('overview');
    }
}

async function logout() {
    await supabase.auth.signOut();
    setUserInfo(null);
    showAuthModal('login');
}
window.logout = logout;

// Initialize auth
supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    if (!session?.user) {
        showAuthModal('login');
    } else {
        showDashboard('overview');
    }
});

supabase.auth.onAuthStateChange((event, session) => {
    setUserInfo(session?.user || null);
});

// ========== NAVIGATION ==========
function showDashboard(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');
    
    const headerTitle = document.getElementById('header-title');
    if (headerTitle) {
        headerTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    }
    
    // Load section content
    if (section === 'overview') updateDashboardStats();
    if (section === 'allBranches') listBranches();
    if (section === 'search') setupSearch();
    if (section === 'myUploads') loadMyUploads();
}
window.showDashboard = showDashboard;

// ========== DASHBOARD STATS ==========
async function updateDashboardStats() {
    try {
        // Total uploads
        const { count: total } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true });
        document.getElementById('totalDocs').textContent = total || 0;
        
        // Monthly uploads
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const { count: monthly } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth.toISOString());
        document.getElementById('monthlyUploads').textContent = monthly || 0;
        
        // Today's uploads
        today.setHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());
        document.getElementById('todayUploads').textContent = todayCount || 0;
        
        // User's uploads
        if (currentUser) {
            const { count: mine } = await supabase
                .from('documents')
                .select('*', { count: 'exact', head: true })
                .eq('uploaded_by', currentUser.id);
            document.getElementById('myUploadsCount').textContent = mine || 0;
        }
        
        // Recent activity
        const { data: recent } = await supabase
            .from('documents')
            .select('title, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
        
        const activityLog = document.getElementById('activity-log');
        if (recent && recent.length > 0) {
            activityLog.innerHTML = recent.map(doc => 
                `<li>${doc.title} <small>(${new Date(doc.created_at).toLocaleString()})</small></li>`
            ).join('');
        } else {
            activityLog.innerHTML = '<li>No recent activity</li>';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========== BRANCH CRUD ==========
async function listBranches() {
    const { data: branches } = await supabase
        .from('branches')
        .select('*')
        .order('name');
    
    let html = `
        <h2>All Branches</h2>
        <button class="btn-primary" onclick="requireAdmin('createBranch')">+ New Branch</button>
    `;
    
    if (branches && branches.length > 0) {
        html += branches.map(b => `
            <div class="branch-card" onclick="showBranch('${b.id}')">
                <h3>${b.name}</h3>
                <p>${b.description || 'No description'}</p>
                <button onclick="event.stopPropagation(); requireAdmin('delBranch_${b.id}')" class="btn-delete">Delete</button>
            </div>
        `).join('');
    } else {
        html += '<p>No branches yet. Create one to get started!</p>';
    }
    
    document.getElementById('allBranches').innerHTML = html;
}

window.delBranch = async function(id) {
    if (!confirm('Delete this branch and all its contents?')) return;
    await supabase.from('branches').delete().eq('id', id);
    listBranches();
};

window.createBranch = function() {
    showModal(`
        <h3>Create New Branch</h3>
        <input id="branch-name" placeholder="Branch Name (e.g., Computer Science)">
        <textarea id="branch-desc" placeholder="Description"></textarea>
        <button onclick="confirmCreateBranch()" class="btn-primary">Create</button>
        <button onclick="hideModal()" class="btn-delete">Cancel</button>
    `, "#admin-modal");
};

window.confirmCreateBranch = async function() {
    const name = document.getElementById('branch-name').value.trim();
    const desc = document.getElementById('branch-desc').value.trim();
    
    if (!name) {
        alert('Please enter branch name');
        return;
    }
    
    await supabase.from('branches').insert([{ name, description: desc }]);
    hideModal();
    listBranches();
};

window.showBranch = async function(branchId) {
    const { data: branch } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();
    
    currentBranch = branch;
    
    document.getElementById('branchDetail').innerHTML = `
        <button onclick="showDashboard('allBranches')" class="btn-delete">← Back</button>
        <h2>${branch.name}</h2>
        <p>${branch.description || ''}</p>
        <button class="btn-primary" onclick="requireAdmin('createSemester')">+ New Semester</button>
        <div id="semesterList"></div>
    `;
    
    showDashboard('branchDetail');
    loadSemesters(branchId);
};

// ========== SEMESTER CRUD ==========
window.createSemester = function() {
    showModal(`
        <h3>Create New Semester</h3>
        <input id="semester-number" type="number" placeholder="Semester Number (1, 2, 3...)">
        <input id="semester-name" placeholder="Semester Name (e.g., Fall 2024)">
        <button onclick="confirmCreateSemester()" class="btn-primary">Create</button>
        <button onclick="hideModal()" class="btn-delete">Cancel</button>
    `, "#admin-modal");
};

window.confirmCreateSemester = async function() {
    const num = Number(document.getElementById('semester-number').value);
    const name = document.getElementById('semester-name').value.trim();
    
    if (!num || !name || !currentBranch) {
        alert('Please fill all fields');
        return;
    }
    
    await supabase.from('semesters').insert([{
        branch_id: currentBranch.id,
        semester_number: num,
        name
    }]);
    
    hideModal();
    loadSemesters(currentBranch.id);
};

async function loadSemesters(branchId) {
    const { data: semesters } = await supabase
        .from('semesters')
        .select('*')
        .eq('branch_id', branchId)
        .order('semester_number');
    
    const list = document.getElementById('semesterList');
    
    if (semesters && semesters.length > 0) {
        list.innerHTML = semesters.map(s => `
            <div class="branch-card" onclick="showSemester('${s.id}')">
                <h3>Semester ${s.semester_number}: ${s.name}</h3>
                <button onclick="event.stopPropagation(); requireAdmin('delSemester_${s.id}')" class="btn-delete">Delete</button>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p>No semesters yet</p>';
    }
}

window.delSemester = async function(id) {
    if (!confirm('Delete this semester?')) return;
    await supabase.from('semesters').delete().eq('id', id);
    loadSemesters(currentBranch.id);
};

window.showSemester = async function(semesterId) {
    const { data: semester } = await supabase
        .from('semesters')
        .select('*')
        .eq('id', semesterId)
        .single();
    
    currentSemester = semester;
    
    document.getElementById('semesterDetail').innerHTML = `
        <button onclick="showBranch('${currentBranch.id}')" class="btn-delete">← Back</button>
        <h2>Semester ${semester.semester_number}: ${semester.name}</h2>
        <button class="btn-primary" onclick="requireAdmin('addSection')">+ Add Section</button>
        <div id="sectionList"></div>
    `;
    
    showDashboard('semesterDetail');
    loadSections(semester.id);
};

// ========== SECTION CRUD ==========
window.addSection = async function() {
    const name = prompt('Section name:');
    if (!name) return;
    
    await supabase.from('sections').insert([{
        semester_id: currentSemester.id,
        name
    }]);
    
    loadSections(currentSemester.id);
};

async function loadSections(semesterId) {
    const { data: sections } = await supabase
        .from('sections')
        .select('*')
        .eq('semester_id', semesterId);
    
    const list = document.getElementById('sectionList');
    
    if (sections && sections.length > 0) {
        list.innerHTML = sections.map(s => `
            <div class="branch-card" onclick="showSection('${s.id}')">
                <h3>Section: ${s.name}</h3>
                <button onclick="event.stopPropagation(); requireAdmin('delSection_${s.id}')" class="btn-delete">Delete</button>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p>No sections yet</p>';
    }
}

window.delSection = async function(id) {
    if (!confirm('Delete this section?')) return;
    await supabase.from('sections').delete().eq('id', id);
    loadSections(currentSemester.id);
};

window.showSection = async function(sectionId) {
    const { data: section } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single();
    
    currentSection = section;
    
    document.getElementById('sectionDetail').innerHTML = `
        <button onclick="showSemester('${currentSemester.id}')" class="btn-delete">← Back</button>
        <h2>Section: ${section.name}</h2>
        <button class="btn-primary" onclick="requireAdmin('addSubject')">+ Add Subject</button>
        <div id="subjectList"></div>
    `;
    
    showDashboard('sectionDetail');
    loadSubjects(section.id);
};

// ========== SUBJECT CRUD ==========
window.addSubject = async function() {
    const name = prompt('Subject name:');
    if (!name) return;
    
    await supabase.from('subjects').insert([{
        section_id: currentSection.id,
        name
    }]);
    
    loadSubjects(currentSection.id);
};

async function loadSubjects(sectionId) {
    const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('section_id', sectionId);
    
    const list = document.getElementById('subjectList');
    
    if (subjects && subjects.length > 0) {
        list.innerHTML = subjects.map(s => `
            <div class="branch-card" onclick="showSubject('${s.id}')">
                <h3>📖 ${s.name}</h3>
                <button onclick="event.stopPropagation(); requireAdmin('delSubject_${s.id}')" class="btn-delete">Delete</button>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p>No subjects yet</p>';
    }
}

window.delSubject = async function(id) {
    if (!confirm('Delete this subject?')) return;
    await supabase.from('subjects').delete().eq('id', id);
    loadSubjects(currentSection.id);
};

window.showSubject = async function(subjectId) {
    const { data: subject } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();
    
    currentSubject = subject;
    
    document.getElementById('subjectDetail').innerHTML = `
        <button onclick="showSection('${currentSection.id}')" class="btn-delete">← Back</button>
        <h2>📖 ${subject.name}</h2>
        
        <form onsubmit="uploadDocument(event)" style="background:#fff; padding:1.5rem; border-radius:8px; margin:1rem 0;">
            <h3>Upload Document</h3>
            <input id="docTitle" placeholder="Document Title" required>
            <textarea id="docDesc" placeholder="Description (optional)"></textarea>
            <input id="docFile" type="file" required>
            <button class="btn-primary" type="submit">⬆️ Upload</button>
        </form>
        
        <h3>Documents</h3>
        <div id="documentList"></div>
    `;
    
    showDashboard('subjectDetail');
    loadDocuments(subject.id);
};

// ========== DOCUMENT UPLOAD ==========
window.uploadDocument = async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('docTitle').value;
    const description = document.getElementById('docDesc').value;
    const fileInput = document.getElementById('docFile');
    const file = fileInput.files[0];
    
    if (!file || !title) {
        alert('Please select a file and enter a title');
        return;
    }
    
    if (file.size > 52428800) {
        alert('File size must be less than 50MB');
        return;
    }
    
    try {
        alert('⏳ Uploading...');
        
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('university-notes-files')
            .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
            .from('university-notes-files')
            .getPublicUrl(fileName);
        
        await supabase.from('documents').insert([{
            subject_id: currentSubject.id,
            title,
            description,
            file_url: publicUrl,
            file_type: file.type || 'unknown',
            file_size: file.size,
            uploaded_by: currentUser.id
        }]);
        
        alert('✅ Upload successful!');
        document.getElementById('docTitle').value = '';
        document.getElementById('docDesc').value = '';
        fileInput.value = '';
        loadDocuments(currentSubject.id);
    } catch (error) {
        alert('❌ Upload failed: ' + error.message);
    }
};

async function loadDocuments(subjectId) {
    const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
    
    const list = document.getElementById('documentList');
    
    if (documents && documents.length > 0) {
        list.innerHTML = documents.map(d => `
            <div class="branch-card">
                <h4>📄 ${d.title}</h4>
                <p>${d.description || 'No description'}</p>
                <p><small>${(d.file_size / 1024 / 1024).toFixed(2)} MB | ${d.file_type}</small></p>
                <button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">👁️ Preview/Download</button>
                <button onclick="requireAdmin('delDocument_${d.id}')" class="btn-delete">🗑️ Delete</button>
            </div>
        `).join('');
    } else {
        list.innerHTML = '<p>No documents yet</p>';
    }
}

window.delDocument = async function(id) {
    if (!confirm('Delete this document?')) return;
    await supabase.from('documents').delete().eq('id', id);
    loadDocuments(currentSubject.id);
};

// ========== FILE PREVIEW ==========
function previewFile(url, type) {
    let html = '<button onclick="hideModal()" style="float:right; border:none; background:transparent; font-size:1.5em; cursor:pointer">×</button>';
    
    if (type.startsWith('image/')) {
        html += `<img src="${url}" style="max-width:100%; border-radius:8px;">`;
    } else if (type === 'application/pdf') {
        html += `<embed src="${url}" type="application/pdf" style="width:100%; height:500px;">`;
    } else if (type.startsWith('video/')) {
        html += `<video src="${url}" controls style="max-width:100%;"></video>`;
    } else {
        html += `<p>Preview not available</p><a href="${url}" target="_blank" class="btn-primary">Download File</a>`;
    }
    
    showModal(html, '#preview-modal');
}

// ========== SEARCH ==========
function setupSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        input.addEventListener('input', debounce(performSearch, 500));
    }
    document.getElementById('subjectResults').innerHTML = '';
    document.getElementById('searchResults').innerHTML = '';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        document.getElementById('subjectResults').innerHTML = '';
        document.getElementById('searchResults').innerHTML = '';
        return;
    }
    
    // Search subjects
    const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .ilike('name', `%${query}%`);
    
    let subjectHtml = '<strong>📚 Matching Subjects:</strong><br>';
    if (subjects && subjects.length > 0) {
        subjectHtml += subjects.map(s => 
            `<p style="cursor:pointer; padding:0.75rem; background:#fff; margin:0.5rem 0; border-radius:6px;" onclick="showSubject('${s.id}')">➤ ${s.name}</p>`
        ).join('');
    } else {
        subjectHtml += '<p>No matching subjects</p>';
    }
    document.getElementById('subjectResults').innerHTML = subjectHtml;
    
    // Search documents
    const { data: documents } = await supabase
        .from('documents')
        .select('*, subjects(name)')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    
    let docsHtml = '<strong>📄 Matching Documents:</strong><br>';
    if (documents && documents.length > 0) {
        docsHtml += documents.map(d => `
            <div class="branch-card">
                <h4>${d.title}</h4>
                <p>${d.description || ''}</p>
                <p><small>Subject: ${d.subjects?.name || 'Unknown'}</small></p>
                <button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">👁️ View</button>
            </div>
        `).join('');
    } else {
        docsHtml += '<p>No matching documents</p>';
    }
    document.getElementById('searchResults').innerHTML = docsHtml;
}

// ========== MY UPLOADS ==========
async function loadMyUploads() {
    if (!currentUser) {
        document.getElementById('myUploads').innerHTML = '<p>Please login to see your uploads</p>';
        return;
    }
    
    const { data: documents } = await supabase
        .from('documents')
        .select('*, subjects(name)')
        .eq('uploaded_by', currentUser.id)
        .order('created_at', { ascending: false });
    
    const section = document.getElementById('myUploads');
    
    if (documents && documents.length > 0) {
        section.innerHTML = '<h2>My Uploads</h2>' + documents.map(d => `
            <div class="branch-card">
                <h4>📄 ${d.title}</h4>
                <p>${d.description || ''}</p>
                <p><small>Subject: ${d.subjects?.name || 'Unknown'} | ${(d.file_size / 1024 / 1024).toFixed(2)} MB</small></p>
                <button onclick="previewFile('${d.file_url}', '${d.file_type}')" class="btn-primary">👁️ View</button>
                <button onclick="requireAdmin('delDocument_${d.id}')" class="btn-delete">🗑️ Delete</button>
            </div>
        `).join('');
    } else {
        section.innerHTML = '<h2>My Uploads</h2><p>You haven\'t uploaded any documents yet</p>';
    }
}

// ========== KEYBOARD SHORTCUTS ==========
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
});

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('University Notes Platform loaded');
});
