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
        render() { return this.state.hasError ? el('div', {className:'h2l-error-box'}, 'Beklenmedik bir hata oluştu.') : this.props.children; }
    }

    // --- HELPER COMPONENTS ---
    const Icon = ({ name, className = "", style = {}, onClick }) => 
        el('i', { className: `fa-solid fa-${name} ${className}`, style: style, onClick });
    
    const Avatar = ({ userId, users, size = 24 }) => {
        if (!users || !Array.isArray(users)) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        if (!user) return el('div', { className: 'h2l-avatar-ph', style: { width: size, height: size } });
        return el('img', { src: user.avatar, className: 'h2l-avatar', style: { width: size, height: size }, title: user.name });
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
                        el(Avatar, { userId: u.id, users: users, size: 20 }), el('span', { style: { marginLeft: 8, flex:1 } }, u.name), selected.includes(u.id) && el(Icon, { name: 'check', style: { color: '#db4c3f' } })))
                )
            )
        );
    };

    // --- GÖREV DETAY MODALI (YENİ EKLENDİ) ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections }) => {
        const [title, setTitle] = useState(task.title);
        const [desc, setDesc] = useState(task.content || '');
        // Proje ve Bölüm isimlerini bul
        const project = projects.find(p => parseInt(p.id) === parseInt(task.projectId || task.project_id));
        const section = sections.find(s => parseInt(s.id) === parseInt(task.sectionId || task.section_id));

        const handleSave = () => {
            if(title !== task.title || desc !== task.content) {
                onUpdate(task.id, { title, content: desc });
            }
        };

        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal large', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-task-modal-content' },
                    // Sol: İçerik
                    el('div', { className: 'h2l-tm-main' },
                        el('div', { className: 'h2l-tm-header' },
                            el('div', { className: `h2l-task-check p${task.priority}`, onClick: () => onUpdate(task.id, { status: task.status==='completed'?'open':'completed' }) }, 
                                task.status==='completed' && el(Icon, {name:'check'})
                            ),
                            el('textarea', { 
                                className: 'h2l-tm-title-input', value: title, 
                                onChange: e => setTitle(e.target.value), onBlur: handleSave, rows: 1
                            })
                        ),
                        el('textarea', { 
                            className: 'h2l-tm-desc-input', placeholder: 'Açıklama ekle...', 
                            value: desc, onChange: e => setDesc(e.target.value), onBlur: handleSave 
                        }),
                        // Alt Görevler ve Yorumlar burada olabilir (MVP için yer tutucu)
                        el('div', { className: 'h2l-tm-section' },
                            el('h4', null, el(Icon, {name:'list-check'}), ' Alt Görevler'),
                            el('button', { className: 'h2l-btn-text' }, '+ Alt görev ekle')
                        ),
                        el('div', { className: 'h2l-tm-section' },
                            el('h4', null, 'Yorumlar'),
                            el('div', { className: 'h2l-comment-box' },
                                el(Avatar, { userId: settings.currentUser.id, users: users, size: 30 }),
                                el('input', { type:'text', placeholder:'Yorum yaz...' })
                            )
                        )
                    ),
                    // Sağ: Sidebar
                    el('div', { className: 'h2l-tm-sidebar' },
                        el('div', { className: 'h2l-tm-close' }, el(Icon, { name: 'xmark', onClick: onClose })),
                        el('div', { className: 'h2l-prop-box' },
                            el('label', null, 'Proje'),
                            el('div', { className: 'h2l-prop-val' }, 
                                el('span', {className:'h2l-dot', style:{background:project?.color||'#888'}}), 
                                project?.title || 'Projesiz',
                                section ? ` / ${section.name}` : ''
                            )
                        ),
                        el('div', { className: 'h2l-prop-box' },
                            el('label', null, 'Atanan'),
                            el('div', { className: 'h2l-prop-val' }, el(Icon, {name:'user-plus'}), 'Atanan Ekle')
                        ),
                        el('div', { className: 'h2l-prop-box' },
                            el('label', null, 'Son Tarih'),
                            el('div', { className: 'h2l-prop-val' }, el(Icon, {name:'calendar'}), task.date_display || 'Tarih Ekle')
                        ),
                        el('div', { className: 'h2l-prop-box' },
                            el('label', null, 'Öncelik'),
                            el('div', { className: 'h2l-prop-val' }, el(Icon, {name:'flag'}), `P${task.priority}`)
                        )
                    )
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
                            el('input', { className: 'h2l-input with-counter', value: form.title, onChange: e => e.target.value.length <= MAX_CHAR && setForm({...form, title:e.target.value}), placeholder: 'Projenin adı', autoFocus: true }),
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

    // --- QUICK ADD ---
    const QuickAdd = ({ sectionId, onAdd }) => {
        const [title, setTitle] = useState('');
        const [isEdit, setIsEdit] = useState(false);
        
        const handleSubmit = (e) => { e.preventDefault(); if(title.trim()) { onAdd({ title, sectionId }); setTitle(''); setIsEdit(false); } };
        
        if(!isEdit) return el('div', { className: 'h2l-quick-add-row' }, el('div', { className: 'h2l-quick-btn', onClick:()=>setIsEdit(true) }, el('span', {className:'plus-icon'}, el(Icon,{name:'plus'})), ' Görev ekle'));

        return el('form', { className: 'h2l-quick-form', onSubmit: handleSubmit },
            el('input', { className: 'h2l-quick-input', autoFocus: true, placeholder: 'Görev adı...', value: title, onChange: e=>setTitle(e.target.value) }),
            el('div', { className: 'h2l-quick-actions' },
                el('div', { className: 'h2l-quick-props' }, el('span', {className:'h2l-prop-tag'}, el(Icon,{name:'calendar'}), 'Bugün'), el('span', {className:'h2l-prop-tag'}, el(Icon,{name:'user'}), 'Ata')),
                el('div', {style:{display:'flex', gap:5}}, el('button', {type:'button', className:'h2l-btn', onClick:()=>setIsEdit(false)}, 'İptal'), el('button', {type:'submit', className:'h2l-btn primary', disabled:!title.trim()}, 'Ekle'))
            )
        );
    };

    // --- DASHBOARD (Projeler Listesi) ---
    const ProjectsDashboard = ({ data, navigate, onAction }) => {
        const [search, setSearch] = useState('');
        const [filterTab, setFilterTab] = useState('all');
        const [expandedFolders, setExpandedFolders] = useState({}); 

        useEffect(() => {
            if(data.folders && Array.isArray(data.folders)) {
                const initial = {}; data.folders.forEach(f => initial[f.id] = true); setExpandedFolders(initial);
            }
        }, [data.folders]);

        const toggleFolder = (fid) => setExpandedFolders(prev => ({ ...prev, [fid]: !prev[fid] }));

        const projects = Array.isArray(data.projects) ? data.projects : [];
        const folders = Array.isArray(data.folders) ? data.folders : [];
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];

        const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
        const rootProjects = filteredProjects.filter(p => parseInt(getFolderId(p)) === 0);
        const folderGroups = folders.map(f => ({...f, projects: filteredProjects.filter(p => parseInt(getFolderId(p)) === parseInt(f.id)) }));

        const ProjectRow = ({ project, nested }) => {
            const pTasks = tasks.filter(t => parseInt(t.projectId || t.project_id) === parseInt(project.id));
            const completed = pTasks.filter(t => t.status === 'completed').length;
            return el('div', { className: `h2l-row-item ${nested ? 'nested' : ''}`, onClick: () => navigate(`/proje/${project.id}`) },
                el('div', { className: 'h2l-cell-name' }, el('span', { className: 'h2l-hash', style: { color: project.color } }, '#'), el('span', { className: 'h2l-row-title' }, project.title)),
                el('div', { className: 'h2l-cell-right' }, el('div', { className: 'h2l-cell-stats' }, el(Icon, { name: 'check-circle', style: { marginRight: 6, color:'#ccc' } }), completed), el('div', { className: 'h2l-cell-actions', onClick: e => e.stopPropagation() }, el(Icon, { name: 'ellipsis', onClick: () => onAction('edit_project', project) })))
            );
        };

        return el('div', { className: 'h2l-dashboard' },
            el('div', { className: 'h2l-header-area' }, el('div', { className: 'h2l-title-box' }, el('span', { className: 'h2l-project-count-badge' }, projects.length), el('h1', null, 'Projeler')), el('p', { className: 'h2l-subtitle' }, 'Ekip çalışma alanı • Geri bildirim gönder')),
            el('div', { className: 'h2l-controls' },
                el('div', { className: 'h2l-search-bar' }, el(Icon, { name: 'magnifying-glass' }), el('input', { type: 'text', placeholder: 'Projeleri ara', value: search, onChange: e => setSearch(e.target.value) })),
                el('div', { className: 'h2l-filter-bar' }, 
                    el('div', { className: 'h2l-tabs' }, el('button', { className: filterTab==='all'?'active':'', onClick:()=>setFilterTab('all') }, 'Tümü'), el('button', { className: filterTab==='joined'?'active':'', onClick:()=>setFilterTab('joined') }, 'Katıldığım projeler'), el('button', { className: filterTab==='not_joined'?'active':'', onClick:()=>setFilterTab('not_joined') }, 'Katılmadığım projeler')),
                    el('div', { className: 'h2l-right-controls' }, el('span', { className: 'h2l-archive-text' }, 'Sadece arşivlenen projeler'), el('div', { className: 'h2l-toggle' }), el('div', { className: 'h2l-add-wrapper' }, el('button', { className: 'h2l-btn-add' }, el(Icon, { name: 'plus' }), ' Ekle', el(Icon, { name: 'angle-down', style:{marginLeft:5, fontSize:10} })), el('div', { className: 'h2l-dropdown' }, el('div', { onClick: ()=>onAction('add_project') }, el(Icon,{name:'list-check'}), ' Proje Ekle'), el('div', { onClick: ()=>onAction('add_folder') }, el(Icon,{name:'folder'}), ' Klasör Ekle'))))
            )),
            el('div', { className: 'h2l-list-header' }, el('span', { className: 'h2l-count-text' }, `${filteredProjects.length} proje`), el('div', { className: 'h2l-sort-btn' }, 'Sırala: Manuel ', el(Icon, { name: 'angle-down' }))),
            el('div', { className: 'h2l-list-content' },
                rootProjects.map(p => el(ProjectRow, { key: p.id, project: p })),
                folderGroups.map(f => [
                    el('div', { key: `f-${f.id}`, className: 'h2l-folder-row', onClick: () => toggleFolder(f.id) },
                        el('div', { className: 'h2l-folder-left' }, el(Icon, { name: expandedFolders[f.id] ? 'angle-down' : 'angle-right', style: { width: 20, color: '#666' } }), el(Icon, { name: 'folder-open', style: { marginRight: 8, color: '#888' } }), el('span', { className: 'h2l-folder-name' }, f.name)),
                        el('div', { className: 'h2l-folder-right' }, el('span', { className: 'h2l-folder-count' }, `${f.projects.length} proje`), el(Icon, { name: 'ellipsis', onClick: (e)=>{e.stopPropagation(); onAction('edit_folder', f)} }))
                    ),
                    expandedFolders[f.id] && f.projects.map(p => el(ProjectRow, { key: p.id, project: p, nested: true }))
                ])
            )
        );
    };

    // --- PROJECT DETAIL & APP ---
    const ProjectDetail = ({ project, tasks, sections, users, navigate, onAddTask, onDeleteTask, onUpdateTask, onTaskClick }) => {
        const [viewMode, setViewMode] = useState(project.view_type || 'list');
        const ProjectDetail = window.H2L && window.H2L.ProjectDetail ? window.H2L.ProjectDetail : () => el('div', null, 'Loading...');
        const TaskRow = ({ task }) => el('div', { className: 'h2l-task-row', onClick: () => onTaskClick(task) },
             el('div', { className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status==='completed'?'open':'completed' }); } }, el(Icon, { name: 'check' })),
             el('div', { className: 'h2l-task-content' }, el('span', { className: `h2l-task-name ${task.status==='completed'?'completed':''}` }, task.title), el('div', { className: 'h2l-task-meta' }, task.date_display && el('span', { className: 'h2l-task-date' }, el(Icon, { name: 'calendar' }), task.date_display))),
             el('div', { className: 'h2l-task-actions' }, el('button', { className: 'h2l-icon-btn danger', onClick: (e) => { e.stopPropagation(); onDeleteTask(task.id); } }, el(Icon, { name: 'trash' })))
        );

        return el('div', { className: 'h2l-detail' },
            el('div', { className: 'h2l-detail-header' },
                el('div', { className: 'h2l-detail-title-group' }, el('button', { className: 'h2l-back-link', onClick: () => navigate('') }, el(Icon,{name:'arrow-left'})), el('h1', null, el('span', {className:'h2l-dot large', style:{background:project.color}}), project.title)),
                el('div', { className: 'h2l-view-toggles' }, el('button', { className: viewMode==='list'?'active':'', onClick:()=>setViewMode('list') }, el(Icon,{name:'list'}), ' Liste'), el('button', { className: viewMode==='board'?'active':'', onClick:()=>setViewMode('board') }, el(Icon,{name:'table-columns'}), ' Pano'))
            ),
            el('div', { className: 'h2l-task-list' },
                (sections||[]).map(s => {
                    const sTasks = tasks.filter(t => parseInt(t.sectionId || t.section_id) === parseInt(s.id));
                    return el('div', { key: s.id, className: 'h2l-section' }, el('div', {className:'h2l-section-header'}, s.name), sTasks.map(t => TaskRow({task:t})), el(QuickAdd, { sectionId: s.id, onAdd: onAddTask }));
                }),
                el('div', { className: 'h2l-section' }, tasks.filter(t => !t.sectionId || t.sectionId==0).map(t => TaskRow({task:t})), el(QuickAdd, { sectionId: 0, onAdd: onAddTask }))
            )
        );
    };

// --- APP ---
    const App = () => {
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [] });
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null);

        // External Module (project-detail.js'den gelir)
        const ProjectDetail = window.H2L && window.H2L.ProjectDetail 
            ? window.H2L.ProjectDetail 
            : () => el('div', {className:'h2l-loading'}, 'Detay modülü yükleniyor...');

        const loadData = () => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => { setData(res); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        };

        useEffect(() => { loadData(); }, []);

        // Router
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

        // Actions
        const handleAction = (act, item) => { 
            if(act === 'add_project' || act === 'edit_project') setModal({ type: 'project', data: item });
            if(act === 'add_folder' || act === 'edit_folder') setModal({ type: 'folder', data: item });
        };

        // API Calls
        const handleSaveProject = (f) => apiFetch({ path: '/h2l/v1/projects'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteProject = (id) => apiFetch({ path: `/h2l/v1/projects/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); navigate(''); });
        const handleSaveFolder = (f) => apiFetch({ path: '/h2l/v1/folders'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteFolder = (id) => apiFetch({ path: `/h2l/v1/folders/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); });
        
       // Yeni: Task Actions
        const handleAddTask = (d) => apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data: d }).then(loadData);
        const handleUpdateTask = (id, d) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'POST', data: d }).then(loadData);
        const handleDeleteTask = (id) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' }).then(loadData);
        // Section Actions
        const handleAddSection = (d) => {
            // { projectId: 12, name: "Yeni Bölüm" }
            apiFetch({ path: '/h2l/v1/sections', method: 'POST', data: d })
                .then(res => {
                    loadData(); // Listeyi yenile
                })
                .catch(err => console.error("Bölüm eklenemedi:", err));
        };
        
        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

        return el('div', { id: 'h2l-app-container', className: 'h2l-flex-root' },
            // Sidebar (Kısaltıldı)
            el('div', { className: 'h2l-sidebar' }, 
                 el('div', {className:'h2l-sidebar-head'}, 'Adbreak'),
                 el('div', {className:'h2l-nav-item active', onClick:()=>navigate('')}, el(Icon,{name:'layer-group'}), ' Projeler')
            ),
            
            // Main Content
            el('div', { className: 'h2l-main-wrapper' },
                viewState.type === 'projects' 
                    ? el(ProjectsDashboard, { data, navigate, onAction: handleAction }) 
                    : el(ProjectDetail, { 
                        project: data.projects.find(p=>parseInt(p.id)===viewState.id), 
                        tasks: data.tasks.filter(t=>parseInt(t.projectId || t.project_id)===viewState.id && t.status!=='trash'),
                        sections: data.sections.filter(s=>parseInt(s.projectId)===viewState.id),
                        users: data.users,
                        navigate, 
                        onAddTask: handleAddTask, 
                        onUpdateTask: handleUpdateTask, 
                        onDeleteTask: handleDeleteTask,
                        onAddSection: handleAddSection // Fonksiyonu geçiyoruz

                    })
            ),

            // Modals
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