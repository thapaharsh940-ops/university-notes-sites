const ADMIN_CODE = "sahil12345"; 

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

async function logout() { await supabase.auth.signOut(); setUserInfo(null); showDashboard('overview'); }

// Initialize
supabase.auth.getSession().then(({ data: { session } }) => {
    setUserInfo(session?.user || null);
    showDashboard('overview');
});

// --- NAVIGATION ---
function showDashboard(section) {
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    
    if (section === 'overview') { updateDashboardStats(); loadRecentlyViewed(); }
    if (section === 'allBranches') listBranches();
    if (section === 'myUploads') myUploads();
    if (section === 'savedNotes') loadBookmarks();
}
window.showDashboard = showDashboard;

// --- DASHBOARD STATS & LEADERBOARD ---
async function updateDashboardStats() {
    const { count: total } = await supabase.from("documents").select("*", { count: "exact", head: true });
    document.getElementById("totalDocs").innerText = total || 0;
    
    const { data: docs } = await supabase.from("documents").select("uploader_email");
    if(docs) {
        let counts = {};
        docs.forEach(d => { if(d.uploader_email) counts[d.uploader_email] = (counts[d.uploader_email] || 0) + 1; });
        let sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
        document.getElementById("leaderboard-list").innerHTML = sorted.map((u, i) => `<li><b>#${i+1}</b> ${u[0].split('@')[0]} <span style="float:right">📄 ${u[1]}</span></li>`).join('');
    }
}

// --- BROWSE & UPLOAD LOGIC (FIXED) ---
async function listBranches() {
    const { data } = await supabase.from('branches').select('*').order('name');
    document.getElementById('allBranches').innerHTML = `<h2>Branches</h2>` + (data?.map(b => `
       <div class="branch-card" onclick="showBranch('${b.id}')">
        <h3>${b.name}</h3>
        <p>${b.description || ''}</p>
       </div>`).join('') || '<p>No branches.</p>');
}

window.showBranch = async function(id) {
    const { data } = await supabase.from('branches').select('*').eq('id', id).single();
    document.getElementById('branchDetail').innerHTML = `<h2>${data.name}</h2><div id="semesterList"></div>`;
    showDashboard('branchDetail');
    const { data: sems } = await supabase.from('semesters').select('*').eq('branch_id', id);
    document.getElementById('semesterList').innerHTML = sems.map(s => `<div class="branch-card" onclick="showSemester('${s.id}')"><h3>Sem ${s.semester_number}</h3></div>`).join('');
};

window.showSemester = async function(id) {
    const { data: sem } = await supabase.from('semesters').select('*').eq('id', id).single();
    document.getElementById('semesterDetail').innerHTML = `<h2>${sem.name}</h2><div id="sectionList"></div>`;
    showDashboard('semesterDetail');
    const { data: secs } = await supabase.from('sections').select('*').eq('semester_id', id);
    document.getElementById('sectionList').innerHTML = secs.map(s => `<div class="branch-card" onclick="showSection('${s.id}')"><h3>${s.name}</h3></div>`).join('');
};

window.showSection = async function(id) {
    const { data: sec } = await supabase.from('sections').select('*').eq('id', id).single();
    document.getElementById('sectionDetail').innerHTML = `<h2>${sec.name}</h2><div id="subjectList"></div>`;
    showDashboard('sectionDetail');
    const { data: subs } = await supabase.from('subjects').select('*').eq('section_id', id);
    document.getElementById('subjectList').innerHTML = subs.map(s => `<div class="branch-card" onclick="showSubject('${s.id}')"><h3>${s.name}</h3></div>`).join('');
};

window.showSubject = async function(id) {
    const { data: sub } = await supabase.from('subjects').select('*').eq('id', id).single();
    currentSubject = sub;
    document.getElementById('subjectDetail').innerHTML = `
      <h2>${sub.name}</h2>
      <form onsubmit="uploadDocument(event)">
        <input id="docTitle" placeholder="Title" required />
        <input id="docFile" type="file" required />
        <button class="btn-primary">Upload</button>
      </form>
      <div id="documentList"></div>`;
    showDashboard('subjectDetail');
    loadDocuments(id);
};

// --- UPLOAD & LOAD DOCUMENTS ---
window.uploadDocument = async function(e) {
    e.preventDefault();
    if(!currentUser) return alert("Please login to upload.");
    const title = document.getElementById('docTitle').value;
    const file = document.getElementById('docFile').files[0];
    
    try {
        const fileName = `${Date.now()}_${file.name}`;
        await supabase.storage.from('university-notes-files').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('university-notes-files').getPublicUrl(fileName);
        
        await supabase.from('documents').insert([{
            subject_id: currentSubject.id, 
            title: title,
            file_url: publicUrl, 
            file_type: file.type, 
            file_size: file.size,
            uploaded_by: currentUser.id,
            uploader_email: currentUser.email
        }]);
        
        alert("Success!");
        loadDocuments(currentSubject.id);
    } catch(err) { alert("Upload failed"); }
};

async function loadDocuments(subId) {
    const { data } = await supabase.from('documents').select('*').eq('subject_id', subId);
    const list = document.getElementById('documentList');
    list.innerHTML = data?.map(d => `
        <div class="branch-card">
            <h4>${d.title}</h4>
            <button onclick="previewFile('${d.file_url}', '${d.file_type}', '${d.id}')" class="btn-primary">View</button>
        </div>`).join('') || 'No docs.';
}

async function myUploads() {
    if(!currentUser) return;
    const { data } = await supabase.from('documents').select('*').eq('uploaded_by', currentUser.id);
    document.getElementById('myUploads').innerHTML = `<h2>My Uploads</h2>` + data.map(d => `<div class="branch-card"><h4>${d.title}</h4></div>`).join('');
}
