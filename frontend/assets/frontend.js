(function(wp, settings) {
    const { createElement: el, useState, useEffect, useMemo, Component, useRef } = wp.element;
    const apiFetch = wp.apiFetch;
    const BASE_URL = settings.base_url || '/gorevler';

    // --- API CONFIG ---
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        return next(options);
    });

    class ErrorBoundary extends Component {
        constructor(props) { super(props); this.state = { hasError: false }; }
        static getDerivedStateFromError(error) { return { hasError: true }; }
        componentDidCatch(error, errorInfo) { console.error("H2L Error:", error, errorInfo); }
        render() { return this.state.hasError ? el('div', {className:'h2l-error-box'}, 'Beklenmedik bir hata oluştu. Lütfen sayfayı yenileyiniz.') : this.props.children; }
    }

    // --- HELPER COMPONENTS ---
    const Icon = ({ name, className = "", style = {}, onClick, title }) => 
        el('i', { className: `fa-solid fa-${name} ${className}`, style: style, onClick, title });
    
    const Avatar = ({ userId, users, size = 24, style = {} }) => {
        if (!users || !Array.isArray(users)) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        const finalStyle = { width: size, height: size, minWidth: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', ...style };
        if (!user) return el('div', { className: 'h2l-avatar-ph', style: { ...finalStyle, background:'#eee' } });
        return el('img', { src: user.avatar, className: 'h2l-avatar', style: finalStyle, title: user.name });
    };

    const getFolderId = (p) => p.folderId || p.folder_id || 0;

    const PROJECT_COLORS = [
        { name: 'Gri', code: '#808080' }, { name: 'Kırmızı', code: '#db4c3f' }, { name: 'Turuncu', code: '#e67e22' }, 
        { name: 'Sarı', code: '#f1c40f' }, { name: 'Yeşil', code: '#27ae60' }, { name: 'Mavi', code: '#2980b9' }, 
        { name: 'Mor', code: '#8e44ad' }, { name: 'Pembe', code: '#e84393' }, { name: 'Menekşe', code: '#b8255f' }, 
        { name: 'Nane', code: '#6accbc' }, { name: 'Turkuaz', code: '#158fad' }, { name: 'Koyu Gri', code: '#2c3e50' }
    ];

    // --- MULTI SELECT ---
    const MultiSelect = ({ users, selected, onChange }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const wrapperRef = useRef(null);
        useEffect(() => {
            const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);
        const toggleSelection = (id) => onChange(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return el('div', { className: 'h2l-multi-select', ref: wrapperRef },
            el('div', { className: 'h2l-multi-trigger', onClick: () => setIsOpen(!isOpen) }, 
                el('span', { style: { color: selected.length ? '#333' : '#999' } }, selected.length > 0 ? `${selected.length} kişi` : 'Seç...'), el(Icon, { name: 'angle-down' })),
            isOpen && el('div', { className: 'h2l-multi-dropdown' },
                el('div', { className: 'h2l-multi-search' }, el('input', { type: 'text', placeholder: 'Ara...', value: searchTerm, onChange: e => setSearchTerm(e.target.value) })),
                el('div', { className: 'h2l-multi-list' },
                    filteredUsers.map(u => el('div', { key: u.id, className: `h2l-multi-item ${selected.includes(u.id)?'selected':''}`, onClick: () => toggleSelection(u.id) },
                        el(Avatar, { userId: u.id, users: users, size: 24 }), 
                        el('span', { style: { flex:1 } }, u.name), 
                        selected.includes(u.id) && el(Icon, { name: 'check', style: { color: '#db4c3f' } })))
                )
            )
        );
    };

    // --- PROJE MODALI ---
    const ProjectModal = ({ onClose, onSave, onDelete, folders, users, initialData }) => {
        const [form, setForm] = useState({
            id: initialData?.id || null,
            title: initialData?.title || '',
            color: initialData?.color || '#808080',
            folderId: getFolderId(initialData || {}),
            view_type: initialData?.view_type || 'list',
            is_favorite: initialData?.is_favorite || false,
            description: initialData?.description || '',
            managers: initialData?.managers || []
        });
        const MAX_CHAR = 120;

        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal medium', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, 
                    el('h3', null, initialData ? 'Düzenle' : 'Proje Ekle'), 
                    el(Icon, { name: 'xmark', onClick: onClose, className: 'h2l-close-icon' })
                ),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-form-group' },
                        el('div', { className: 'h2l-input-wrapper' },
                            el('input', { className: 'h2l-input with-counter', value: form.title, onChange: e => setForm({...form, title:e.target.value}), placeholder: 'Projenin adı', autoFocus: true }),
                            el('span', { className: 'h2l-char-counter' }, `${form.title.length}/${MAX_CHAR}`)
                        )
                    ),
                    el('div', { className: 'h2l-form-row' },
                        el('div', { className: 'h2l-color-input-wrapper', style:{flex:1} },
                            el('span', { className: 'h2l-color-dot', style: { backgroundColor: form.color } }),
                            el('select', { className: 'h2l-select padded', value: form.color, onChange: e => setForm({...form, color:e.target.value}) }, 
                                PROJECT_COLORS.map(c => el('option', { key: c.code, value: c.code }, c.name))
                            )
                        ),
                        el('div', { style:{flex:1, marginLeft:10} },
                             el('select', { className: 'h2l-select', value: form.folderId, onChange: e => setForm({...form, folderId:e.target.value}) },
                                el('option', {value:0}, 'Klasörsüz'),
                                (folders||[]).map(f => el('option', {key:f.id, value:f.id}, f.name))
                            )
                        )
                    ),
                    el('div', { className: 'h2l-form-group' }, 
                        el('label', {className:'h2l-label'}, 'Yöneticiler'),
                        el(MultiSelect, { users: users || [], selected: Array.isArray(form.managers) ? form.managers : [], onChange: (ids) => setForm({...form, managers: ids}) })
                    ),
                    el('div', { className: 'h2l-form-group switch-row' },
                        el('label', { className: 'h2l-switch' },
                            el('input', { type: 'checkbox', checked: form.is_favorite, onChange: e => setForm({...form, is_favorite: e.target.checked}) }),
                            el('span', { className: 'h2l-slider round' })
                        ),
                        el('span', { className: 'h2l-switch-label' }, 'Favorilere ekle')
                    ),
                    el('div', { className: 'h2l-form-group' }, 
                        el('label', {className:'h2l-label small-caps'}, 'Görünüm'),
                        el('div', { className: 'h2l-view-options' },
                            el('div', { className: `h2l-view-card ${form.view_type === 'list' ? 'selected' : ''}`, onClick: () => setForm({...form, view_type: 'list'}) }, el(Icon, { name: 'list' }), 'Liste'),
                            el('div', { className: `h2l-view-card ${form.view_type === 'board' ? 'selected' : ''}`, onClick: () => setForm({...form, view_type: 'board'}) }, el(Icon, { name: 'table-columns' }), 'Pano')
                        )
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('textarea', { className: 'h2l-textarea', value: form.description, onChange: e => setForm({...form, description: e.target.value}), placeholder: 'Açıklama...', rows: 2 })
                    )
                ),
                el('div', { className: 'h2l-modal-footer spaced' },
                    initialData ? el('button', { className: 'h2l-btn text-danger', onClick: () => { if(confirm('Sil?')) onDelete(form.id); } }, 'Projeyi Sil') : el('div'),
                    el('div', { className: 'h2l-footer-right' },
                        el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'),
                        el('button', { className: 'h2l-btn primary', onClick: () => onSave(form), disabled: !form.title.trim() }, initialData ? 'Kaydet' : 'Ekle')
                    )
                )
            )
        );
    };

    // --- KLASÖR MODALI ---
    const FolderModal = ({ onClose, onSave, onDelete, initialData }) => {
        const [form, setForm] = useState({ id: initialData?.id, name: initialData?.name || '', access_type: initialData?.access_type || 'private', description: initialData?.description || '' });
        const MAX_CHAR = 120;
        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal small', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, initialData?'Klasör Düzenle':'Klasör Ekle'), el(Icon, { name: 'xmark', onClick: onClose })),
                el('div', { className: 'h2l-modal-body compact' },
                    el('div', { className: 'h2l-form-group' },
                        el('div', { className: 'h2l-input-wrapper' }, el('input', { className: 'h2l-input with-counter', value: form.name, onChange: e => e.target.value.length <= MAX_CHAR && setForm({...form, name:e.target.value}), placeholder: 'Klasör adı...', autoFocus: true }), el('span', { className: 'h2l-char-counter' }, `${form.name.length}/${MAX_CHAR}`))
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('div', { className: 'h2l-access-options' },
                            el('button', { className: `h2l-access-btn ${form.access_type === 'private' ? 'selected' : ''}`, onClick: () => setForm({...form, access_type: 'private'}) }, el(Icon, { name: 'lock' }), ' Özel'),
                            el('button', { className: `h2l-access-btn ${form.access_type === 'public' ? 'selected' : ''}`, onClick: () => setForm({...form, access_type: 'public'}) }, el(Icon, { name: 'globe' }), ' Herkese Açık')
                        )
                    ),
                    el('div', { className: 'h2l-form-group' }, el('textarea', { className: 'h2l-textarea', value: form.description, onChange: e => setForm({...form, description: e.target.value}), placeholder: 'Açıklama...', rows: 2 }))
                ),
                el('div', { className: 'h2l-modal-footer spaced' },
                    initialData ? el('button', { className: 'h2l-btn text-danger', onClick: () => { if(confirm('Sil?')) onDelete(initialData.id); } }, 'Sil') : el('div'),
                    el('div', { className: 'h2l-footer-right' }, el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'), el('button', { className: 'h2l-btn primary', onClick: () => onSave({ name: form.name, access_type: form.access_type, description: form.description, id: form.id }), disabled: !form.name.trim() }, 'Kaydet'))
                )
            )
        );
    };

    // --- DASHBOARD (PROJELER LİSTESİ) ---
    const ProjectsDashboard = ({ data, navigate, onAction }) => {
        const [search, setSearch] = useState('');
        const [filterTab, setFilterTab] = useState('all');
        const [showFavorites, setShowFavorites] = useState(false); 
        const [expandedFolders, setExpandedFolders] = useState({}); 

        useEffect(() => {
            if(data.folders && Array.isArray(data.folders)) {
                const initial = {}; data.folders.forEach(f => initial[f.id] = true); setExpandedFolders(initial);
            }
        }, [data.folders]);

        const toggleFolder = (fid) => setExpandedFolders(prev => ({ ...prev, [fid]: !prev[fid] }));

        const projects = Array.isArray(data.projects) ? data.projects : [];
        const folders = Array.isArray(data.folders) ? data.folders : [];
        
        let filteredProjects = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
        
        if (showFavorites) {
            filteredProjects = filteredProjects.filter(p => parseInt(p.is_favorite) === 1);
        }

        const rootProjects = filteredProjects.filter(p => parseInt(getFolderId(p)) === 0);
        const folderGroups = folders.map(f => ({...f, projects: filteredProjects.filter(p => parseInt(getFolderId(p)) === parseInt(f.id)) }));

        const ProjectRow = ({ project, nested }) => {
            const total = project.total_count || 0;
            const completed = project.completed_count || 0;
            
            const managers = (project.managers || []).map(uid => 
                data.users.find(u => parseInt(u.id) === parseInt(uid))
            ).filter(Boolean);

            return el('div', { className: `h2l-row-item ${nested ? 'nested' : ''}`, onClick: () => navigate(`/proje/${project.id}`) },
                el('div', { className: 'h2l-cell-name' }, 
                    el('span', { className: 'h2l-hash', style: { color: project.color } }, '#'), 
                    el('span', { className: 'h2l-row-title' }, project.title),
                    managers.length > 0 && el('div', { className: 'h2l-row-avatars' },
                        managers.slice(0, 4).map((u, index) => 
                            el(Avatar, { 
                                key: u.id, 
                                userId: u.id, 
                                users: data.users, 
                                size: 20, 
                                style: { marginLeft: index === 0 ? 0 : -6, border: '1px solid #fff' } 
                            })
                        )
                    )
                ),
                el('div', { className: 'h2l-cell-right' }, 
                    el('div', { className: 'h2l-cell-stats' }, 
                        el(Icon, { name: 'check-circle', style: { marginRight: 6, color:'#ccc' } }), 
                        `${completed} / ${total}`
                    ), 
                    el('div', { className: 'h2l-cell-actions', onClick: e => e.stopPropagation() }, 
                        el(Icon, { name: 'ellipsis', onClick: () => onAction('edit_project', project) })
                    )
                )
            );
        };

        return el('div', { className: 'h2l-dashboard' },
            el('div', { className: 'h2l-header-area' }, 
                el('div', { className: 'h2l-title-box' }, 
                    el('span', { className: 'h2l-project-count-badge' }, projects.length), 
                    el('h1', null, 'Projeler')
                )
            ),
            el('div', { className: 'h2l-controls' },
                el('div', { className: 'h2l-search-bar' }, el(Icon, { name: 'magnifying-glass' }), el('input', { type: 'text', placeholder: 'Projeleri ara', value: search, onChange: e => setSearch(e.target.value) })),
                el('div', { className: 'h2l-filter-bar' }, 
                    el('div', { className: 'h2l-tabs' }, 
                        el('button', { className: filterTab==='all'?'active':'', onClick:()=>setFilterTab('all') }, 'Tümü'), 
                        el('button', { className: filterTab==='joined'?'active':'', onClick:()=>setFilterTab('joined') }, 'Katıldığım projeler'), 
                        el('button', { className: filterTab==='not_joined'?'active':'', onClick:()=>setFilterTab('not_joined') }, 'Katılmadığım projeler'),
                        el('div', { className: 'switch-row', style: { marginLeft: 15, display: 'inline-flex', marginTop: 0 } },
                            el('label', { className: 'h2l-switch', style: { width: 30, height: 18 } },
                                el('input', { type: 'checkbox', checked: showFavorites, onChange: e => setShowFavorites(e.target.checked) }),
                                el('span', { className: 'h2l-slider round' })
                            ),
                            el('span', { className: 'h2l-switch-label', style: { fontSize: 13, fontWeight: 500, marginLeft: 8 } }, 'Favorilerim')
                        )
                    ),
                    el('div', { className: 'h2l-right-controls' }, 
                        el('div', { className: 'h2l-add-wrapper' }, 
                            el('button', { className: 'h2l-btn-add' }, el(Icon, { name: 'plus' }), ' Ekle'), 
                            el('div', { className: 'h2l-dropdown' }, 
                                el('div', { onClick: ()=>onAction('add_project') }, el(Icon,{name:'list-check'}), ' Proje Ekle'), 
                                el('div', { onClick: ()=>onAction('add_folder') }, el(Icon,{name:'folder'}), ' Klasör Ekle')
                            )
                        )
                    )
                )
            ),
            el('div', { className: 'h2l-list-content' },
                rootProjects.map(p => el(ProjectRow, { key: p.id, project: p })),
                folderGroups.map(f => [
                    el('div', { key: `f-${f.id}`, className: 'h2l-folder-row', onClick: () => toggleFolder(f.id) },
                        el('div', { className: 'h2l-folder-left' }, 
                            el(Icon, { name: expandedFolders[f.id] ? 'angle-down' : 'angle-right', style: { width: 20, color: '#666' } }), 
                            el(Icon, { name: 'folder-open', style: { marginRight: 8, color: '#888' } }), 
                            el('span', { className: 'h2l-folder-name' }, f.name),
                            el(Icon, { name: f.access_type === 'private' ? 'lock' : 'globe', style: { fontSize: 12, marginLeft: 10, color: '#aaa' } })
                        ),
                        el('div', { className: 'h2l-folder-right' }, 
                            el(Icon, { name: 'ellipsis', onClick: (e)=>{e.stopPropagation(); onAction('edit_folder', f)} })
                        )
                    ),
                    expandedFolders[f.id] && f.projects.map(p => el(ProjectRow, { key: p.id, project: p, nested: true }))
                ])
            )
        );
    };

    // --- APP (ANA BİLEŞEN) ---
    const App = () => {
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [] });
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null);

        const ProjectDetail = window.H2L && window.H2L.ProjectDetail 
            ? window.H2L.ProjectDetail 
            : () => el('div', {className:'h2l-loading'}, 'Detay modülü yükleniyor...');

        const loadData = () => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => { setData(res); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        };

        useEffect(() => { loadData(); }, []);

        const navigate = (path) => {
            window.history.pushState({}, '', BASE_URL + path);
            if(path === '' || path === '/') setViewState({ type: 'projects' });
            else if(path.includes('/proje/')) setViewState({ type: 'project_detail', id: parseInt(path.split('/proje/')[1]) });
        };
        
        useEffect(() => {
            const path = window.location.pathname;
            if(path.includes('/proje/')) {
                const pid = parseInt(path.split('/proje/')[1]);
                if(!isNaN(pid)) setViewState({ type: 'project_detail', id: pid });
            }
        }, []);

        const handleAction = (act, item) => { 
            if(act === 'add_project' || act === 'edit_project') setModal({ type: 'project', data: item });
            if(act === 'add_folder' || act === 'edit_folder') setModal({ type: 'folder', data: item });
        };

        const handleSaveProject = (f) => apiFetch({ path: '/h2l/v1/projects'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteProject = (id) => apiFetch({ path: `/h2l/v1/projects/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); navigate(''); });
        const handleSaveFolder = (f) => apiFetch({ path: '/h2l/v1/folders'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteFolder = (id) => apiFetch({ path: `/h2l/v1/folders/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); });
        
        const handleAddTask = (d) => apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data: d }).then(loadData);
        const handleUpdateTask = (id, d) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'POST', data: d }).then(res => { loadData(); });
        const handleDeleteTask = (id) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' }).then(() => { loadData(); });
        
        // YENİ: Bölüm Ekleme (Crash Önleyici)
        const handleAddSection = (d) => {
            apiFetch({ path: '/h2l/v1/sections', method: 'POST', data: d })
                .then(newSection => {
                    if (!newSection || typeof newSection !== 'object') return;
                    setData(prev => ({
                        ...prev,
                        sections: [...prev.sections, newSection]
                    }));
                })
                .catch(err => console.error("Bölüm eklenemedi:", err));
        };

        // YENİ: Bölüm Güncelleme ve Silme
        const handleUpdateSection = (id, data) => {
            apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'POST', data: data }).then(loadData);
        };

        const handleDeleteSection = (id) => {
            apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'DELETE' }).then(loadData);
        };
        
        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

        const activeProject = data.projects.find(p => parseInt(p.id) === viewState.id);
        const activeTasks = data.tasks.filter(t => {
            const pid = parseInt(t.projectId || t.project_id);
            return pid === viewState.id && t.status !== 'trash';
        });
        const activeSections = data.sections.filter(s => {
            const pid = parseInt(s.projectId || s.project_id);
            return pid === viewState.id;
        });

        return el('div', { id: 'h2l-app-container', className: 'h2l-flex-root' },
            el('div', { className: 'h2l-sidebar' }, 
                 el('div', {className:'h2l-sidebar-head'}, 'Adbreak'),
                 el('div', {className:'h2l-nav-item active', onClick:()=>navigate('')}, el(Icon,{name:'layer-group'}), ' Projeler')
            ),
            
            el('div', { className: 'h2l-main-wrapper' },
                viewState.type === 'projects' 
                    ? el(ProjectsDashboard, { data, navigate, onAction: handleAction }) 
                    : el(ProjectDetail, { 
                        project: activeProject, 
                        tasks: activeTasks,
                        sections: activeSections,
                        users: data.users,
                        navigate, 
                        onAddTask: handleAddTask, 
                        onUpdateTask: handleUpdateTask, 
                        onDeleteTask: handleDeleteTask,
                        onAddSection: handleAddSection,
                        onUpdateSection: handleUpdateSection,
                        onDeleteSection: handleDeleteSection
                    })
            ),

            modal?.type === 'project' && el(ProjectModal, { onClose:()=>setModal(null), onSave:handleSaveProject, onDelete:handleDeleteProject, folders:data.folders, users:data.users, initialData:modal.data }),
            modal?.type === 'folder' && el(FolderModal, { onClose:()=>setModal(null), onSave:handleSaveFolder, onDelete:handleDeleteFolder, initialData:modal.data })
        );
    };

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('h2l-frontend-app');
        if (root && wp.element) {
            const renderFn = wp.element.createRoot ? wp.element.createRoot(root).render : wp.element.render;
            if(wp.element.createRoot) wp.element.createRoot(root).render(el(ErrorBoundary, null, el(App)));
            else wp.element.render(el(ErrorBoundary, null, el(App)), root);
        }
    });
})(window.wp, window.h2lFrontendSettings);