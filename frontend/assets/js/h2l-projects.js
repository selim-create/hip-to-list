(function(wp) {
    const { createElement: el, useState, useEffect } = wp.element;
    const { Icon, Avatar, MultiSelect, getFolderId, PROJECT_COLORS } = window.H2L.Common;

    window.H2L = window.H2L || {};
    window.H2L.Projects = window.H2L.Projects || {};

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
        
        const ownerId = initialData ? parseInt(initialData.owner_id) : (window.h2lFrontendSettings ? parseInt(window.h2lFrontendSettings.currentUser.ID) : 0);
        const currentManagerIds = Array.isArray(form.managers) ? form.managers.map(id => parseInt(id)) : [];
        
        // --- ÖZEL KLASÖR KONTROLÜ ---
        const selectedFolder = folders ? folders.find(f => parseInt(f.id) === parseInt(form.folderId)) : null;
        const isPrivateFolder = selectedFolder && selectedFolder.access_type === 'private';

        // --- KULLANICI SIRALAMA MANTIĞI ---
        const sortedUsers = [...users].sort((a, b) => {
            const aid = parseInt(a.id);
            const bid = parseInt(b.id);

            if (aid === ownerId) return -1;
            if (bid === ownerId) return 1;

            const aIsMgr = currentManagerIds.includes(aid);
            const bIsMgr = currentManagerIds.includes(bid);
            
            if (aIsMgr && !bIsMgr) return -1;
            if (!aIsMgr && bIsMgr) return 1;

            return a.name.localeCompare(b.name);
        });

        const handleSave = () => {
            // Eğer özel klasör seçildiyse, yönetici listesini temizle
            const dataToSave = { ...form };
            if (isPrivateFolder) {
                dataToSave.managers = [];
            }
            onSave(dataToSave);
        };

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
                                (folders||[]).map(f => el('option', {key:f.id, value:f.id}, f.name + (f.access_type === 'private' ? ' (Özel)' : '')))
                            )
                        )
                    ),
                    el('div', { className: 'h2l-form-group' }, 
                        el('label', {className:'h2l-label'}, 'Yöneticiler'),
                        // ÖZEL KLASÖR KONTROLÜ: Eğer özelse MultiSelect yerine uyarı göster
                        isPrivateFolder 
                            ? el('div', { className: 'h2l-info-box', style: { padding: '10px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '13px', display:'flex', alignItems:'center', gap:'8px' } }, 
                                el(Icon, {name:'lock'}), 'Bu proje özel bir klasörde olduğu için üye eklenemez.')
                            : el(MultiSelect, { 
                                users: sortedUsers, 
                                selected: Array.isArray(form.managers) ? form.managers : [], 
                                onChange: (ids) => setForm({...form, managers: ids}),
                                ownerId: ownerId 
                            })
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
                        el('button', { className: 'h2l-btn primary', onClick: handleSave, disabled: !form.title.trim() }, initialData ? 'Kaydet' : 'Ekle')
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

    window.H2L.Projects = {
        ProjectModal,
        FolderModal,
        ProjectsDashboard
    };

})(window.wp);