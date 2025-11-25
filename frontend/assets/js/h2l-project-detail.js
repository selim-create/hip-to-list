(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const { Icon, Avatar } = window.H2L.Common;
    const { ListView, BoardView } = window.H2L.Tasks; 

    window.H2L = window.H2L || {};

    const MemberSelectMenu = ({ users, project, onUpdateMembers }) => {
        const [searchTerm, setSearchTerm] = useState('');
        let currentMemberIds = [];
        if (project && project.managers) { currentMemberIds = typeof project.managers === 'string' ? JSON.parse(project.managers) : project.managers; currentMemberIds = currentMemberIds.map(id => parseInt(id)); }
        const ownerId = parseInt(project.owner_id);
        if (!currentMemberIds.includes(ownerId)) { currentMemberIds.push(ownerId); }
        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => { const aid = parseInt(a.id); const bid = parseInt(b.id); if (aid === ownerId) return -1; if (bid === ownerId) return 1; const aIsMember = currentMemberIds.includes(aid); const bIsMember = currentMemberIds.includes(bid); if (aIsMember && !bIsMember) return -1; if (!aIsMember && bIsMember) return 1; return a.name.localeCompare(b.name); });
        const handleToggle = (userId) => { const uid = parseInt(userId); if (uid === ownerId) return; let newMembers = [...currentMemberIds]; if (newMembers.includes(uid)) { newMembers = newMembers.filter(id => id !== uid); } else { newMembers.push(uid); } onUpdateMembers(newMembers); };
        return el('div', { className: 'h2l-popover-menu right-aligned', style: { width: '280px', padding: '0', marginTop: '5px' } }, el('div', { style: { padding: '10px', borderBottom: '1px solid #f0f0f0' } }, el('input', { className: 'h2l-input', style: { padding: '6px 10px', fontSize: '13px', width: '100%', boxSizing: 'border-box' }, placeholder: 'Kişi ara...', value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), autoFocus: true, onClick: e => e.stopPropagation() })), el('div', { style: { maxHeight: '250px', overflowY: 'auto' } }, filteredUsers.map(u => { const uid = parseInt(u.id); const isMember = currentMemberIds.includes(uid); const isOwner = uid === ownerId; return el('div', { key: u.id, className: 'h2l-menu-item', onClick: (e) => { e.stopPropagation(); handleToggle(uid); }, style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isOwner ? 'default' : 'pointer', opacity: isOwner ? 0.7 : 1, backgroundColor: isOwner ? '#f9f9f9' : (isMember ? '#fffbfc' : 'transparent') } }, el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, el(Avatar, { userId: u.id, users, size: 24 }), el('div', { style: { display: 'flex', flexDirection: 'column' } }, el('span', { style: { fontSize: '13px', fontWeight: 500 } }, u.name), isOwner && el('span', { style: { fontSize: '10px', color: '#888' } }, 'Proje Sahibi'))), isOwner ? el(Icon, { name: 'lock', style: { color: '#999', fontSize: '12px' } }) : (isMember && el(Icon, { name: 'check', style: { color: '#db4c3f' } }))); }), filteredUsers.length === 0 && el('div', { style: { padding: '15px', textAlign: 'center', color: '#999', fontSize: '12px' } }, 'Kullanıcı bulunamadı')));
    };

    // --- ACCESS DENIED COMPONENT ---
    const AccessDenied = () => {
        return el('div', { className: 'h2l-access-denied' },
            el('div', { className: 'h2l-ad-icon' }, el(Icon, { name: 'lock' })),
            el('h2', null, 'Bu projeye erişim izniniz yok'),
            el('p', null, 'Bu projenin içeriğini görüntülemek için proje yöneticisi veya üyesi olmanız gerekmektedir. Erişim talep etmek için proje sahibi ile iletişime geçin.')
        );
    };

    window.H2L.ProjectDetail = ({ project, projects, folders, tasks, sections, users, navigate, onAddTask, onDeleteTask, onUpdateTask, onAddSection, onAction, onUpdateSection, onDeleteSection, labels, onTaskClick }) => {
        const [viewMode, setViewMode] = useState(project ? (project.view_type || 'list') : 'list');
        const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
        const [showCompleted, setShowCompleted] = useState(() => { const saved = localStorage.getItem('h2l_show_completed'); return saved !== 'false'; });
        const [highlightToday, setHighlightToday] = useState(false);
        const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
        const [isShareMenuOpen, setIsShareMenuOpen] = useState(false); 
        
        const viewMenuRef = useRef(null);
        const moreMenuRef = useRef(null);
        const shareMenuRef = useRef(null);

        useEffect(() => { localStorage.setItem('h2l_show_completed', showCompleted); }, [showCompleted]);
        useEffect(() => { const handleOpenShare = () => { setIsShareMenuOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }; document.addEventListener('h2l_open_share_menu', handleOpenShare); return () => document.removeEventListener('h2l_open_share_menu', handleOpenShare); }, []);
        useEffect(() => { const handleClickOutside = (event) => { if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) setIsViewMenuOpen(false); if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setIsMoreMenuOpen(false); if (shareMenuRef.current && !shareMenuRef.current.contains(event.target)) setIsShareMenuOpen(false); }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, [viewMenuRef, moreMenuRef, shareMenuRef]);

        if (!project) return el('div', null, 'Yükleniyor...');
        
        const folderId = parseInt(project.folderId || project.folder_id || 0);
        const folder = folders ? folders.find(f => parseInt(f.id) === folderId) : null;
        const folderName = folder ? folder.name : 'Projelerim';
        const isPrivateFolder = folder && folder.access_type === 'private';
        
        // YETKİ KONTROLÜ
        const isMember = project.is_member === true;

        let managerIds = [];
        if (project.managers) { managerIds = typeof project.managers === 'string' ? JSON.parse(project.managers) : project.managers; }
        const ownerId = parseInt(project.owner_id);
        if (!managerIds.map(id=>parseInt(id)).includes(ownerId)) { managerIds.unshift(ownerId); }
        const managers = managerIds.map(uid => users.find(u => parseInt(u.id) === parseInt(uid))).filter(Boolean);
        const handleUpdateMembers = (newMemberIds) => { const uniqueManagers = [...new Set(newMemberIds)].map(String); const payload = { ...project, managers: uniqueManagers, folderId: project.folderId || project.folder_id }; if (onAction) { onAction('update_project_members', payload); } };
        const availableProjects = (projects && projects.length > 0) ? projects : [project];

        return el('div', { className: 'h2l-project-page' },
            el('div', { className: 'h2l-project-header-wrapper' },
                el('div', { className: 'h2l-detail-header' },
                    el('div', { className: 'h2l-header-top' },
                        el('div', { className: 'h2l-breadcrumb' }, el('span', { className: 'link', onClick: () => navigate('') }, folderName), el('span', { className: 'divider' }, '/'), el('span', null, project.title)),
                        el('div', { className: 'h2l-header-actions' },
                            // Yetkili değilse sadece bazı aksiyonları göster veya gizle
                            isMember && managers.length > 0 && el('div', { className: 'h2l-avatars-stack' }, managers.slice(0, 5).map((u, i) => el(Avatar, { key: u.id, userId: u.id, users, size: 26, style:{marginLeft: i===0?0:-8} }))),
                            isMember && !isPrivateFolder && el('div', { style: { position: 'relative' }, ref: shareMenuRef }, el('button', { className: 'h2l-action-btn', title: 'Üye Ekle / Çıkar', onClick: () => setIsShareMenuOpen(!isShareMenuOpen) }, el(Icon, { name: 'user-plus' }), 'Paylaş'), isShareMenuOpen && el(MemberSelectMenu, { users, project, onUpdateMembers: handleUpdateMembers })),
                            isMember && el('div', { style: { position: 'relative' }, ref: viewMenuRef }, el('button', { className: 'h2l-action-btn', onClick: () => setIsViewMenuOpen(!isViewMenuOpen) }, el(Icon, { name: 'sliders' }), 'Görünüm'), isViewMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' }, el('div', { className: 'h2l-menu-section' }, el('span', { className: 'h2l-menu-title' }, 'DÜZEN'), el('div', { className: 'h2l-view-selector' }, el('div', { className: `h2l-view-btn ${viewMode==='list'?'active':''}`, onClick: () => setViewMode('list') }, el(Icon, { name: 'list' }), ' Liste'), el('div', { className: `h2l-view-btn ${viewMode==='board'?'active':''}`, onClick: () => setViewMode('board') }, el(Icon, { name: 'table-columns' }), ' Pano'))), el('div', { className: 'h2l-menu-section' }, el('div', { className: 'h2l-switch-item', onClick:()=>setShowCompleted(!showCompleted) }, el('span', null, 'Tamamlanan görevler'), el('div', { className: `h2l-toggle-switch ${showCompleted?'on':''}` }, el('div', {className:'knob'})))))),
                            isMember && el('div', { style: { position: 'relative' }, ref: moreMenuRef }, el('button', { className: 'h2l-action-btn', title: 'Diğer', onClick: () => setIsMoreMenuOpen(!isMoreMenuOpen) }, el(Icon, { name: 'ellipsis' })), isMoreMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' }, el('div', { className: 'h2l-menu-item', onClick: () => { if(onAction) onAction('edit_project', project); setIsMoreMenuOpen(false); } }, el(Icon, { name: 'pen' }), ' Projeyi düzenle'), el('div', { className: 'h2l-menu-item' }, el(Icon, { name: 'box-archive' }), ' Projeyi arşivle'), el('div', { className: 'h2l-menu-item text-danger', onClick: () => { if(onAction) onAction('delete_project', project.id); setIsMoreMenuOpen(false); } }, el(Icon, { name: 'trash' }), ' Projeyi sil')))
                        )
                    )
                )
            ),
            el('div', { className: 'h2l-project-content-wrapper' },
                // EĞER ÜYE DEĞİLSE ERİŞİM ENGELLENDİ GÖSTER
                !isMember 
                    ? el(AccessDenied) 
                    : (viewMode === 'list' 
                        ? el(ListView, { 
                            project, tasks, sections, users, projects: availableProjects, 
                            navigate, 
                            onUpdateTask, onDeleteTask, onAddTask: (opts) => onAddTask({ projectId: project.id, ...opts }), onAddSection: (data) => onAddSection({ projectId: project.id, ...data }), 
                            onTaskClick, 
                            showCompleted, highlightToday, onUpdateSection, onDeleteSection, labels 
                        }) 
                        : el(BoardView, { tasks, sections, onUpdateTask }))
            )
        );
    };
})(window.wp);