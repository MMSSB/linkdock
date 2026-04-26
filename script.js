// === THEME ENGINE ===
function applyTheme(theme) {
    if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}
const savedTheme = localStorage.getItem('portal_theme') || 'system';
applyTheme(savedTheme);

// === APP STATE ===
let profile = {
    name: "Link Dock",
    bio: "",
    image: "",
    links: [
        // { id: "1", title: "Primary Portfolio", url: "https://portfolio.eth.link", active: true },
        // { id: "2", title: "Mirror Blog", url: "https://mirror.xyz", active: true },
        // { id: "3", title: "NFT Gallery", url: "https://opensea.io", active: false }
    ]
};

let editingLinkId = null;
let draggedItemIndex = null; 

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    
    if (data) {
        try {
            const decoded = JSON.parse(decodeURIComponent(atob(data)));
            if (Array.isArray(decoded)) profile.links = decoded; else profile = { ...profile, ...decoded };
            
            const appLayout = document.getElementById('appLayout');
            if(appLayout) appLayout.style.display = 'none';
            const pubView = document.getElementById('publicView');
            if(pubView) pubView.style.display = 'flex';
            
            renderPublicView();
        } catch (e) { 
            if(document.getElementById('builderList')) initBuilder(); 
        }
    } else if (document.getElementById('builderList')) {
        initBuilder();
    }
});

// Click outside to close dropdowns
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-container')) {
        if(typeof window.closeAllDropdowns === 'function') window.closeAllDropdowns();
    }
});

function initBuilder() {
    initPreviewState();
    const iName = document.getElementById('inputName');
    if(iName) {
        iName.value = profile.name || "";
        document.getElementById('inputBio').value = profile.bio || "";
        document.getElementById('inputImage').value = profile.image || "";
    }
    updateProfileState();
}

function showToast(msg, icon = '<i class="ph ph-check-circle"></i>') {
    const toast = document.getElementById('toastMsg');
    if(!toast) return;
    toast.innerHTML = `${icon} ${msg}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// === LIVE PREVIEW TOGGLE (DESKTOP) ===
window.togglePreviewState = function() {
    const pane = document.querySelector('.preview-pane');
    const builder = document.querySelector('.builder-area');
    const btn = document.getElementById('togglePreviewBtn');

    if(!pane || !builder) return;
    
    const isCollapsed = pane.classList.toggle('collapsed');
    builder.classList.toggle('expanded', isCollapsed);
    localStorage.setItem('preview_collapsed', isCollapsed);
    
    if (btn) {
        btn.innerHTML = isCollapsed 
            ? '<i class="ph ph-eye"></i> Show Preview' 
            : '<i class="ph ph-eye-slash"></i> Hide Preview';
    }
};

function initPreviewState() {
    const isCollapsed = localStorage.getItem('preview_collapsed') === 'true';
    const pane = document.querySelector('.preview-pane');
    const builder = document.querySelector('.builder-area');
    const btn = document.getElementById('togglePreviewBtn');

    if (isCollapsed && pane && builder) {
        pane.classList.add('collapsed');
        builder.classList.add('expanded');
    }
    if (btn) {
        btn.innerHTML = isCollapsed 
            ? '<i class="ph ph-eye"></i> Show Preview' 
            : '<i class="ph ph-eye-slash"></i> Hide Preview';
    }
}

// === ROBUST FAVICON CASCADE ENGINE ===
// Attempts: 1. Exact Page -> 2. Domain API -> 3. Root .ico -> 4. Local images/logo.png -> 5. Letter Avatar
function getNodeIconHtml(urlStr, titleStr) {
    let domain = "";
    let rootIco = "";
    try { 
        const u = new URL(urlStr);
        domain = u.hostname;
        rootIco = `${u.protocol}//${u.hostname}/favicon.ico`;
    } catch(e) { 
        domain = "link"; 
    }

    const pageFavicon = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(urlStr)}&size=128`;
    const domainFavicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    const defaultLogo = `images/logo.png`;
    const letterAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(titleStr || 'L')}&background=f3f4f6&color=6b7280&bold=true`;

    return `<img src="${pageFavicon}" 
                 alt="icon"
                 style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" 
                 onerror="
                    if (!this.dataset.triedDomain) {
                        this.dataset.triedDomain = 'true';
                        this.src = '${domainFavicon}';
                    } else if (!this.dataset.triedRoot) {
                        this.dataset.triedRoot = 'true';
                        this.src = '${rootIco}';
                    } else if (!this.dataset.triedDefault) {
                        this.dataset.triedDefault = 'true';
                        this.src = '${defaultLogo}';
                    } else if (!this.dataset.triedAvatar) {
                        this.dataset.triedAvatar = 'true';
                        this.src = '${letterAvatar}';
                    } else {
                        this.onerror = null;
                        this.style.display = 'none';
                    }
                 ">`;
}

// === MAIN MODAL ENGINE ===
window.openModal = function(mode, id = null, copyData = null) {
    const modalOverlay = document.getElementById('customModal');
    if(!modalOverlay) return;
    
    const titleEl = document.getElementById('modalTitle');
    const inputCont = document.getElementById('modalInputs');
    const resultBox = document.getElementById('modalUrlResult');
    const confirmBtn = document.getElementById('modalBtnConfirm');
    const actionSheet = document.getElementById('modalActionSheet');
    
    inputCont.style.display = 'none';
    if(resultBox) resultBox.style.display = 'none';
    if(actionSheet) actionSheet.style.display = 'none';
    confirmBtn.style.display = 'flex';
    
    document.getElementById('nodeTitle').style.display = 'block';
    document.getElementById('nodeUrl').placeholder = "https://...";

    if (mode === 'add') {
        titleEl.innerHTML = '<i class="ph ph-link"></i> Append Node';
        inputCont.style.display = 'block';
        document.getElementById('nodeTitle').value = ''; document.getElementById('nodeUrl').value = '';
        confirmBtn.innerHTML = '<i class="ph ph-plus-circle"></i> Save Node';
        editingLinkId = null;
    } else if (mode === 'edit') {
        titleEl.innerHTML = '<i class="ph ph-pencil-simple"></i> Edit Node';
        inputCont.style.display = 'block';
        const link = profile.links.find(l => l.id === id);
        document.getElementById('nodeTitle').value = link.title; document.getElementById('nodeUrl').value = link.url;
        confirmBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Update';
        editingLinkId = id;
    } else if (mode === 'import') {
        titleEl.innerHTML = '<i class="ph ph-download-simple"></i> Import Profile';
        inputCont.style.display = 'block';
        document.getElementById('nodeTitle').style.display = 'none'; 
        document.getElementById('nodeUrl').value = '';
        document.getElementById('nodeUrl').placeholder = "Paste your generated URL here...";
        confirmBtn.innerHTML = '<i class="ph ph-check"></i> Load Data';
        confirmBtn.onclick = processImport;
        editingLinkId = null;
    } else if (mode === 'deploy') {
        titleEl.innerHTML = '<i class="ri-rocket-fill"></i> Portal Deployed';
        if(resultBox) {
            resultBox.style.display = 'block';
            resultBox.innerText = copyData;
        }
        confirmBtn.innerHTML = '<i class="ph ph-copy"></i> Copy Link';
        confirmBtn.onclick = () => {
            navigator.clipboard.writeText(copyData).then(() => {
                confirmBtn.innerHTML = '<i class="ph ph-check-circle"></i> Copied!';
                confirmBtn.style.background = "var(--success)";
                setTimeout(closeModal, 1500);
            });
            return;
        };
    }
    
    if(mode !== 'deploy' && mode !== 'import') confirmBtn.onclick = saveModalData;
    confirmBtn.style.background = "var(--black-btn)";
    modalOverlay.classList.add('show');
};

// === MOBILE ACTION SHEET ENGINE (3-DOTS) ===
window.openActionModal = function(id, index) {
    const modalOverlay = document.getElementById('customModal');
    if(!modalOverlay) return;
    
    document.getElementById('modalTitle').innerHTML = '<i class="ph ph-gear"></i> Node Actions';
    document.getElementById('modalInputs').style.display = 'none';
    const resultBox = document.getElementById('modalUrlResult');
    if(resultBox) resultBox.style.display = 'none';
    document.getElementById('modalBtnConfirm').style.display = 'none'; 
    
    const actionSheet = document.getElementById('modalActionSheet');
    if(actionSheet) {
        actionSheet.style.display = 'flex';
        actionSheet.innerHTML = `
            <button class="action-sheet-btn" onclick="window.moveLinkUp(${index}); window.closeModal();" ${index === 0 ? 'disabled' : ''}><i class="ph ph-arrow-up"></i> Move Node Up</button>
            <button class="action-sheet-btn" onclick="window.moveLinkDown(${index}); window.closeModal();" ${index === profile.links.length - 1 ? 'disabled' : ''}><i class="ph ph-arrow-down"></i> Move Node Down</button>
            <button class="action-sheet-btn" onclick="window.openModal('edit', '${id}');"><i class="ph ph-pencil-simple"></i> Edit Configuration</button>
            <button class="action-sheet-btn danger" onclick="window.deleteLink('${id}'); window.closeModal();"><i class="ph ph-trash"></i> Delete Node</button>
        `;
    }
    
    modalOverlay.classList.add('show');
};

window.closeModal = function() { 
    const modalOverlay = document.getElementById('customModal');
    if(modalOverlay) modalOverlay.classList.remove('show'); 
};

function processImport() {
    const pastedUrl = document.getElementById('nodeUrl').value;
    try {
        const data = new URL(pastedUrl).searchParams.get('data');
        if (!data) throw new Error("No data");
        const decoded = JSON.parse(decodeURIComponent(atob(data)));
        if (Array.isArray(decoded)) profile.links = decoded; else profile = { ...profile, ...decoded };
        initBuilder();
        showToast("Profile Imported Successfully");
        closeModal();
    } catch(e) { 
        showToast("Invalid URL format", '<i class="ph ph-warning-circle"></i>'); 
    }
}

function saveModalData() {
    const title = document.getElementById('nodeTitle').value;
    let url = document.getElementById('nodeUrl').value;
    if(!title || !url) return showToast("Fields required", '<i class="ph ph-warning-circle"></i>');
    if (!url.startsWith('http') && !url.startsWith('ipfs://')) url = 'https://' + url;

    if (editingLinkId) {
        const link = profile.links.find(l => l.id === editingLinkId);
        link.title = title; link.url = url;
        showToast("Node Updated");
    } else {
        profile.links.unshift({ id: Date.now().toString(), title, url, active: true });
        showToast("Node Appended");
    }
    closeModal(); updateProfileState();
}

// === SORTING ACTIONS ===
window.moveLinkUp = function(index) {
    if (index > 0) {
        const temp = profile.links[index];
        profile.links[index] = profile.links[index - 1];
        profile.links[index - 1] = temp;
        updateProfileState();
    }
};

window.moveLinkDown = function(index) {
    if (index < profile.links.length - 1) {
        const temp = profile.links[index];
        profile.links[index] = profile.links[index + 1];
        profile.links[index + 1] = temp;
        updateProfileState();
    }
};

// === MAIN UI UPDATES ===
window.updateProfileState = function() {
    const iName = document.getElementById('inputName');
    if(iName) {
        profile.name = iName.value;
        profile.bio = document.getElementById('inputBio').value;
        profile.image = document.getElementById('inputImage').value;
    }
    
    const pName = document.getElementById('phoneName');
    if(pName) {
        pName.innerText = profile.name;
        document.getElementById('phoneBio').innerText = profile.bio;
        const imgUrl = profile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || "U")}&background=111827&color=fff&size=200&bold=true`;
        document.getElementById('phoneImage').src = imgUrl;
    }
    renderBuilder();
};

window.toggleLink = function(id) { const link = profile.links.find(l => l.id === id); if (link) link.active = !link.active; updateProfileState(); };
window.deleteLink = function(id) { profile.links = profile.links.filter(l => l.id !== id); showToast("Node Deleted", '<i class="ph ph-trash"></i>'); updateProfileState(); };

// === RENDER ENGINE ===
function renderBuilder() {
    const builderList = document.getElementById('builderList');
    const phoneLinks = document.getElementById('phoneLinks');
    if(!builderList || !phoneLinks) return;
    
    builderList.innerHTML = ''; phoneLinks.innerHTML = '';

    profile.links.forEach((link, index) => {
        const card = document.createElement('div');
        card.className = `node-card ${link.active ? '' : 'disabled'}`;
        card.draggable = true;
        card.dataset.index = index;
        
        // HTML5 Drag & Drop (Desktop)
        card.addEventListener('dragstart', (e) => { draggedItemIndex = index; setTimeout(() => card.classList.add('dragging'), 0); });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); document.querySelectorAll('.node-card').forEach(c => c.classList.remove('drag-over')); });
        card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedItemIndex !== null && draggedItemIndex !== index) {
                const draggedItem = profile.links.splice(draggedItemIndex, 1)[0];
                profile.links.splice(index, 0, draggedItem);
                updateProfileState();
            }
        });

        // Builder Card HTML
        card.innerHTML = `
            <div class="drag-handle desktop-only"><i class="ph ph-dots-six-vertical"></i></div>

            <div class="node-icon-wrapper" style="overflow:hidden;">
                ${getNodeIconHtml(link.url, link.title)}
            </div>
            <div class="node-info">
                <div class="node-title-input">${link.title}</div>
                <div class="node-url-input">${link.url}</div>
            </div>
            <div class="node-actions">
                
                <div class="desktop-only" style="align-items:center; gap:8px;">
                    <button class="btn-icon" onclick="window.openModal('edit', '${link.id}')" title="Edit"><i class="ph ph-pencil-simple"></i></button>
                    <div class="divider"></div>
                    <button class="btn-icon delete" onclick="window.deleteLink('${link.id}')" title="Delete"><i class="ph ph-trash"></i></button>
                    <div class="divider"></div>
                </div>

                <div class="mobile-only" style="align-items:center; gap:8px;">
                    <button class="btn-icon" onclick="window.openActionModal('${link.id}', ${index})" title="Actions"><i class="ph ph-dots-three-vertical"></i></button>
                    <div class="divider"></div>
                </div>

                <div class="toggle-switch ${link.active ? '' : 'off'}" onclick="window.toggleLink('${link.id}')"><div class="toggle-knob"></div></div>
            </div>
        `;
        builderList.appendChild(card);

        // Phone Preview HTML
        if (link.active) {
            const btn = document.createElement('a'); btn.className = 'phone-link'; btn.href = link.url; btn.target = "_blank";
            btn.innerHTML = `
                <div class="node-icon-wrapper" style="width:32px; height:32px; flex-shrink:0; margin-right:12px; overflow:hidden;">
                    ${getNodeIconHtml(link.url, link.title)}
                </div>
                <span>${link.title}</span>
            `;
            phoneLinks.appendChild(btn);
        }
    });
}

// === URL GENERATOR ===
window.generatePortal = function() {
    if (profile.links.length === 0) return showToast("Add a link first", '<i class="ph ph-warning-circle"></i>');
    const encoded = btoa(encodeURIComponent(JSON.stringify(profile)));
    
    // Switch the URL to point to page.html
    let basePath = window.location.pathname;
    basePath = basePath.substring(0, basePath.lastIndexOf('/')) + '/page.html';
    
    const finalUrl = window.location.origin + basePath + '?data=' + encoded;
    window.openModal('deploy', null, finalUrl);
};

// === PUBLIC VIEWER RENDERER ===
function renderPublicView() {
    document.getElementById('pubName').innerText = profile.name;
    document.getElementById('pubBio').innerText = profile.bio;
    document.getElementById('pubImage').src = profile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=111827&color=fff&size=200&bold=true`;
    
    const pLinks = document.getElementById('pubLinks');
    profile.links.forEach((link, index) => {
        if(link.active) {
            const a = document.createElement('a'); a.className = 'phone-link'; a.href = link.url; a.target = '_blank';
            a.style.animationDelay = `${index * 0.1}s`;
            a.innerHTML = `
                <div class="node-icon-wrapper" style="width:36px; height:36px; flex-shrink:0; margin-right:12px; overflow:hidden;">
                    ${getNodeIconHtml(link.url, link.title)}
                </div>
                <span>${link.title}</span>
            `;
            pLinks.appendChild(a);
        }
    });

    const select = document.getElementById('publicThemeSelect');
    if(select) {
        select.value = savedTheme;
        select.addEventListener('change', (e) => {
            localStorage.setItem('portal_theme', e.target.value); applyTheme(e.target.value);
        });
    }
}
