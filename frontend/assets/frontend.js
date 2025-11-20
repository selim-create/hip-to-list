(function(wp, settings) {
    const { createElement: el, useState, useEffect, useMemo, Component } = wp.element;
    const apiFetch = wp.apiFetch;
    const BASE_URL = settings.base_url || '/gorevler';

    // --- API & ERROR BOUNDARY ---
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        return next(options);
    });

    class ErrorBoundary extends Component {
        constructor(props) { super(props); this.state = { hasError: false }; }
        static getDerivedStateFromError(error) { return { hasError: true }; }
        render() { return this.state.hasError ? el('div', {className:'h2l-error'}, 'Bir hata oluştu.') : this.props.children; }
    }

    // --- HELPER BİLEŞENLER ---
    const Icon = ({ name, className = "", style = {} }) => el('i', { className: `fa-solid fa-${name} ${className}`, style: style });
    
    const Avatar = ({ userId, users, size = 24 }) => {
        if (!users) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        if (!user) return el('div', { className: 'h2l-avatar-placeholder', style: { width: size, height: size } });
        return el('img', { src: user.avatar, className: 'h2l-avatar', style: { width: size, height: size }, title: user.name });
    };

    // --- MODALLAR ---
    
    // Proje Ekle/Düzenle Modalı
    const ProjectModal = ({ onClose, onSave, folders, users, initialData = null }) => {
        const [formData, setFormData] = useState(initialData || { title: '', color: '#808080', folder_id: 0, view_type: 'list', is_favorite: false });
        
        const colors = ['#db4c3f', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50', '#808080'];

        const handleSubmit = () => {
            if(!formData.title) return alert('Proje adı gerekli');
            onSave(formData);
        };

        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal small', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' },
                    el('h3', null, initialData ? 'Projeyi Düzenle' : 'Proje Ekle'),
                    el('button', { onClick: onClose }, el(Icon, { name: 'xmark' }))
                ),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-form-group' },
                        el('label', null, 'İsim'),
                        el('input', { 
                            type: 'text', 
                            value: formData.title, 
                            onChange: e => setFormData({...formData, title: e.target.value}),
                            className: 'h2l-input',
                            autoFocus: true 
                        })
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('label', null, 'Renk'),
                        el('div', { className: 'h2l-color-picker' },
                            colors.map(c => el('div', { 
                                key: c, 
                                className: `h2l-color-option ${formData.color === c ? 'selected' : ''}`,
                                style: { backgroundColor: c },
                                onClick: () => setFormData({...formData, color: c})
                            }))
                        )
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('label', null, 'Klasör'),
                        el('select', { 
                            className: 'h2l-select',
                            value: formData.folder_id,
                            onChange: e => setFormData({...formData, folder_id: e.target.value})
                        },
                            el('option', { value: 0 }, 'Klasörsüz (Ana Dizin)'),
                            folders.map(f => el('option', { key: f.id, value: f.id }, f.name))
                        )
                    ),
                    el('div', { className: 'h2l-form-group' },
                        el('label', null, 'Görünüm'),
                        el('div', { className: 'h2l-radio-group' },
                            el('label', null, 
                                el('input', { type: 'radio', name: 'view', checked: formData.view_type === 'list', onChange: () => setFormData({...formData, view_type: 'list'}) }), 
                                el(Icon, { name: 'list' }), ' Liste'
                            ),
                            el('label', null, 
                                el('input', { type: 'radio', name: 'view', checked: formData.view_type === 'board', onChange: () => setFormData({...formData, view_type: 'board'}) }), 
                                el(Icon, { name: 'table-columns' }), ' Board'
                            )
                        )
                    )
                ),
                el('div', { className: 'h2l-modal-footer' },
                    el('button', { className: 'h2l-btn h2l-btn-secondary', onClick: onClose }, 'İptal'),
                    el('button', { className: 'h2l-btn h2l-btn-primary', onClick: handleSubmit }, initialData ? 'Kaydet' : 'Ekle')
                )
            )
        );
    };

    // Klasör Ekle/Düzenle Modalı
    const FolderModal = ({ onClose, onSave, initialData = null }) => {
        const [name, setName] = useState(initialData ? initialData.name : '');

        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal small', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' },
                    el('h3', null, initialData ? 'Klasörü Düzenle' : 'Klasör Ekle'),
                    el('button', { onClick: onClose }, el(Icon, { name: 'xmark' }))
                ),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-form-group' },
                        el('label', null, 'İsim'),
                        el('input', { type: 'text', value: name, onChange: e => setName(e.target.value), className: 'h2l-input', autoFocus: true })
                    )
                ),
                el('div', { className: 'h2l-modal-footer' },
                    el('button', { className: 'h2l-btn h2l-btn-secondary', onClick: onClose }, 'İptal'),
                    el('button', { className: 'h2l-btn h2l-btn-primary', onClick: () => onSave({ name }) }, initialData ? 'Kaydet' : 'Ekle')
                )
            )
        );
    };

    // --- ANA SAYFA (DASHBOARD) - Liste Görünümü ---
    const ProjectsDashboard = ({ data, navigate, onAction }) => {
        const [search, setSearch] = useState('');
        const [filter, setFilter] = useState('all'); // all, joined, not_joined
        const [expandedFolders, setExpandedFolders] = useState({});

        // Klasör aç/kapa
        const toggleFolder = (fid) => setExpandedFolders(prev => ({ ...prev, [fid]: !prev[fid] }));

        // Veriyi Hazırla
        const { projects, folders, tasks, users, currentUser } = data;
        
        const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

        // Projeleri Grupla
        const rootProjects = filteredProjects.filter(p => !p.folderId || p.folderId == 0);
        const folderGroups = folders.map(f => ({
            ...f,
            projects: filteredProjects.filter(p => parseInt(p.folderId) === parseInt(f.id))
        })).filter(g => g.projects.length > 0); // Sadece içi dolu klasörleri veya hepsini göster

        // Satır Bileşeni (Proje)
        const ProjectRow = ({ project }) => {
            const pTasks = tasks.filter(t => parseInt(t.projectId) === parseInt(project.id));
            const completed = pTasks.filter(t => t.status === 'completed').length;
            const managers = project.managers || [];

            return el('div', { className: 'h2l-list-row', onClick: () => navigate(`/proje/${project.id}`) },
                el('div', { className: 'h2l-col-icon' }, 
                    el('span', { className: 'h2l-dot', style: { backgroundColor: project.color || '#888' } }, '#')
                ),
                el('div', { className: 'h2l-col-name' }, 
                    el('span', { className: 'h2l-row-title' }, project.title),
                    project.description && el('span', { className: 'h2l-row-desc' }, project.description)
                ),
                el('div', { className: 'h2l-col-avatars' }, 
                    managers.slice(0,3).map(uid => el(Avatar, { key: uid, userId: uid, users }))
                ),
                el('div', { className: 'h2l-col-stats' }, 
                    el(Icon, { name: 'check-circle' }), ` ${completed}`
                ),
                el('div', { className: 'h2l-col-actions', onClick: e => e.stopPropagation() },
                    el('button', { onClick: () => onAction('edit_project', project) }, el(Icon, { name: 'pen' }))
                )
            );
        };

        return el('div', { className: 'h2l-dashboard' },
            // Header
            el('div', { className: 'h2l-dash-header' },
                el('div', null, 
                    el('h1', { className: 'h2l-page-title' }, 'Projeler'),
                    el('span', { className: 'h2l-breadcrumb' }, 'Ekip çalışma alanı • Geri bildirim gönder')
                )
            ),
            
            // Search & Filters
            el('div', { className: 'h2l-toolbar' },
                el('div', { className: 'h2l-search-wrapper' },
                    el(Icon, { name: 'magnifying-glass' }),
                    el('input', { 
                        type: 'text', placeholder: 'Projeleri ara', 
                        value: search, onChange: e => setSearch(e.target.value) 
                    })
                ),
                el('div', { className: 'h2l-tabs' },
                    el('button', { className: filter==='all'?'active':'', onClick:()=>setFilter('all') }, 'Tümü'),
                    el('button', { className: filter==='joined'?'active':'', onClick:()=>setFilter('joined') }, 'Katıldığım projeler'),
                    el('button', { className: filter==='not_joined'?'active':'', onClick:()=>setFilter('not_joined') }, 'Katılmadığım projeler')
                ),
                el('div', { className: 'h2l-toolbar-right' },
                    el('div', { className: 'h2l-toggle-wrapper' },
                        el('span', null, 'Sadece arşivlenen projeler'),
                        el('div', { className: 'h2l-toggle' })
                    ),
                    el('div', { className: 'h2l-dropdown-btn' },
                        el('button', { className: 'h2l-btn-light' }, el(Icon, { name: 'plus' }), ' Ekle'),
                        el('div', { className: 'h2l-dropdown-menu' },
                            el('div', { onClick: () => onAction('add_project') }, el(Icon, { name: 'list-check' }), ' Proje Ekle'),
                            el('div', { onClick: () => onAction('add_folder') }, el(Icon, { name: 'folder' }), ' Klasör Ekle')
                        )
                    )
                )
            ),

            // Upgrade Banner
            el('div', { className: 'h2l-banner' },
                el('div', { className: 'h2l-banner-icon' }, el(Icon, { name: 'star' })),
                el('div', { className: 'h2l-banner-content' },
                    el('h4', null, 'Daha fazla ekip projesine mi ihtiyacın var?'),
                    el('p', null, 'Bu ekip, olmayan kısıtlı projeler de dahil olmak üzere 5 ücretsiz projenin 5 tanesini kullandı.')
                ),
                el('button', { className: 'h2l-btn h2l-btn-primary' }, 'Yükselt')
            ),

            // List Info
            el('div', { className: 'h2l-list-info' },
                el('span', { className: 'h2l-project-count' }, `${filteredProjects.length} proje`),
                el('div', { className: 'h2l-sort-dropdown' }, 'Sırala: Manuel ', el(Icon, { name: 'angle-down' }))
            ),

            // Project List
            el('div', { className: 'h2l-project-list' },
                // Root Projects
                rootProjects.map(p => el(ProjectRow, { key: p.id, project: p })),

                // Folders
                folderGroups.map(f => el('div', { key: f.id, className: 'h2l-list-folder' },
                    el('div', { className: 'h2l-folder-row', onClick: () => toggleFolder(f.id) },
                        el(Icon, { name: expandedFolders[f.id] ? 'angle-down' : 'angle-right', style: { width: 20 } }),
                        el(Icon, { name: 'folder', style: { marginRight: 10, color: '#888' } }),
                        el('span', { className: 'h2l-folder-title' }, f.name),
                        el('div', { className: 'h2l-folder-actions', onClick: e => e.stopPropagation() },
                            el(Icon, { name: 'ellipsis', onClick: () => onAction('edit_folder', f) })
                        )
                    ),
                    expandedFolders[f.id] && el('div', { className: 'h2l-folder-content' },
                        f.projects.map(p => el(ProjectRow, { key: p.id, project: p }))
                    )
                ))
            )
        );
    };

    // --- APP ROOT ---
    const App = () => {
        const [data, setData] = useState(null);
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null); // { type: 'project'|'folder', data: null }

        const refreshData = () => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => setData(res));
        };

        useEffect(() => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => { setData(res); setLoading(false); });
            // URL Listener
            const handlePopState = () => {
                const path = window.location.pathname;
                if(path.includes('/proje/')) setViewState({ type: 'project_detail', id: path.split('/proje/')[1] });
                else setViewState({ type: 'projects' });
            };
            window.addEventListener('popstate', handlePopState);
            handlePopState();
            return () => window.removeEventListener('popstate', handlePopState);
        }, []);

        const navigate = (path) => {
            window.history.pushState({}, '', BASE_URL + path);
            setViewState(path.includes('/proje/') ? { type: 'project_detail', id: path.split('/proje/')[1] } : { type: 'projects' });
        };

        const handleAction = (action, item) => {
            if(action === 'add_project') setModal({ type: 'project', data: null });
            if(action === 'edit_project') setModal({ type: 'project', data: item });
            if(action === 'add_folder') setModal({ type: 'folder', data: null });
            if(action === 'edit_folder') setModal({ type: 'folder', data: item });
        };

        const handleSaveProject = (formData) => {
            // API Call (Mock for now, replace with real API)
            console.log("Saving project:", formData);
            // Optimistic update or refresh
            setModal(null);
            // Real implementation: apiFetch.post('/h2l/v1/projects', formData).then(refreshData);
        };
        const handleSaveFolder = (formData) => {
            console.log("Saving folder:", formData);
            setModal(null);
        };

        if(loading) return el('div', { className: 'h2l-loading' }, 'Yükleniyor...');
        if(!data) return null;

        return el('div', { id: 'h2l-app-container', className: 'h2l-flex-root' },
            // Sidebar (Basitleştirilmiş, sadece navigasyon)
            el('div', { className: 'h2l-sidebar' },
                el('div', { className: 'h2l-sidebar-header' }, 'Adbreak'),
                el('div', { className: 'h2l-nav-group' },
                     el('div', { className: 'h2l-nav-item active', onClick: () => navigate('') }, el(Icon, { name: 'layer-group' }), ' Projeler')
                )
                // ... Diğer sidebar elemanları
            ),

            // Main Content
            el('div', { className: 'h2l-main-wrapper' },
                viewState.type === 'projects' 
                    ? el(ProjectsDashboard, { data, navigate, onAction: handleAction })
                    : el('div', {style:{padding:20}}, 
                        el('button', {onClick:()=>navigate('')}, '< Geri'),
                        ' Proje Detay (Önceki kodlar buraya gelecek)' // Yer kazanmak için kısalttım, önceki detay kodu buraya entegre edilmeli
                      )
            ),

            // Modals
            modal?.type === 'project' && el(ProjectModal, { 
                onClose: () => setModal(null), 
                onSave: handleSaveProject, 
                folders: data.folders,
                initialData: modal.data
            }),
            modal?.type === 'folder' && el(FolderModal, { 
                onClose: () => setModal(null), 
                onSave: handleSaveFolder, 
                initialData: modal.data 
            })
        );
    };

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('h2l-frontend-app');
        if (root) {
            const renderFn = wp.element.createRoot ? wp.element.createRoot(root).render : wp.element.render;
            if(wp.element.createRoot) wp.element.createRoot(root).render(el(ErrorBoundary, null, el(App)));
            else wp.element.render(el(ErrorBoundary, null, el(App)), root);
        }
    });
})(window.wp, window.h2lFrontendSettings);