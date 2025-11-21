(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    window.H2L = window.H2L || {};

    // --- HELPER COMPONENTS ---
    const Icon = ({ name, className = "", onClick, style, title }) => 
        el('i', { className: `fa-solid fa-${name} ${className}`, onClick, style, title });

    const Avatar = ({ userId, users, size = 24, style={} }) => {
        if(!users) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        const finalStyle = { width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, display:'block', ...style };
        if(!user) return el('div', {className:'h2l-avatar-ph', style:{...finalStyle, background:'#ccc'}});
        return el('img', { src: user.avatar, style: finalStyle, title: user.name });
    };

    // --- DELETE SECTION MODAL ---
    const DeleteSectionModal = ({ section, taskCount, onClose, onConfirm }) => {
        return el('div', { className: 'h2l-detail-overlay', style: { zIndex: 20010 }, onClick: onClose },
            el('div', { className: 'h2l-confirm-modal', onClick: e => e.stopPropagation() },
                el('h3', { className: 'h2l-confirm-title' }, 'Bölüm silinsin mi?'),
                el('p', { className: 'h2l-confirm-desc' }, el('strong', null, section.name), ` bölümü ve ${taskCount} görevi kalıcı olarak silinecek.`),
                el('div', { className: 'h2l-confirm-footer' },
                    el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'),
                    el('button', { className: 'h2l-btn danger-filled', onClick: onConfirm }, 'Sil')
                )
            )
        );
    };

    // --- GÖREV SATIRI BİLEŞENİ ---
    const TaskRow = ({ task, users, onUpdateTask, onTaskClick, highlightToday }) => {
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { 
            assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); 
        }
        
        const isToday = task.date_display === 'Bugün';
        const highlightClass = (highlightToday && isToday) ? 'h2l-highlight-today' : '';

        return el('div', { className: `h2l-task-row ${highlightClass}`, onClick: () => onTaskClick(task) },
            el('div', { className: 'h2l-task-left' },
                el('div', { 
                    className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, 
                    onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status==='completed'?'open':'completed' }); } 
                }, el(Icon, { name: 'check' }))
            ),
            el('div', { className: 'h2l-task-content' },
                el('span', { className: `h2l-task-title ${task.status==='completed'?'completed':''}` }, task.title),
                el('div', { className: 'h2l-task-details' },
                    task.date_display && el('span', { className: `h2l-detail-item date ${isToday ? 'today' : ''}` }, el(Icon, {name:'calendar'}), task.date_display),
                    assignee && el('span', { className: 'h2l-detail-item' }, assignee.name)
                )
            ),
            el('div', { className: 'h2l-task-right' },
                el('button', { className: 'h2l-icon-btn', title: 'Düzenle', onClick: (e) => { e.stopPropagation(); onTaskClick(task); } }, el(Icon, { name: 'pen' })),
                el('button', { className: 'h2l-icon-btn', title: 'Tarih', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'calendar' })),
                el('button', { className: 'h2l-icon-btn', title: 'Yorumlar', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'comment' })),
                assignee 
                    ? el('div', { style:{margin:'0 4px'} }, el(Avatar, { userId: assignee.id, users, size: 24 }))
                    : el('button', { className: 'h2l-icon-btn', title: 'Ata', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'user' })),
                el('button', { className: 'h2l-icon-btn', title: 'Diğer', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'ellipsis' }))
            )
        );
    };

    // --- PARSER ---
    const parseTaskInput = (text) => {
        let priority = 4;
        let cleanText = text;
        const pMatch = text.match(/\b(p[1-4])\b/i);
        if (pMatch) {
            priority = parseInt(pMatch[1].charAt(1));
            cleanText = cleanText.replace(pMatch[0], '').replace(/\s+/g, ' ').trim();
        }
        return { title: cleanText, priority };
    };

    // --- HIZLI EKLE (GELİŞMİŞ EDITOR - YENİ SINIFLAR) ---
    const QuickAdd = ({ sectionId, onAdd, projectTitle = 'Proje Adı' }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const [description, setDescription] = useState('');
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const menuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [menuRef]);
        
        const handleSubmit = () => { 
            if(title.trim()) { 
                const { title: cleanTitle, priority } = parseTaskInput(title);
                onAdd({ title: cleanTitle, content: description, sectionId, priority }); 
                setTitle(''); 
                setDescription('');
            } 
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') { setIsEditing(false); setTitle(''); setDescription(''); }
        };

        if (!isEditing) return el('div', { className: 'h2l-todoist-add-trigger', onClick: () => setIsEditing(true) }, 
            el('div', { className: 'h2l-todoist-btn-content' }, 
                el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 
                'Görev ekle'
            )
        );
        
        // YENİ SINIF İSİMLERİ İLE YAPILANDIRILDI
        return el('div', { className: 'h2l-todoist-editor-wrapper' },
            el('div', { className: 'h2l-todoist-editor-body' },
                el('textarea', { 
                    className: 'h2l-todoist-input-title', 
                    placeholder: 'Görev adı (Örn: Toplantı p1 yarın)', 
                    value: title, 
                    onChange: e => setTitle(e.target.value), 
                    onKeyDown: handleKeyDown,
                    autoFocus: true,
                    rows: 1
                }),
                el('textarea', { 
                    className: 'h2l-todoist-input-desc', 
                    placeholder: 'Açıklama', 
                    value: description, 
                    onChange: e => setDescription(e.target.value), 
                    rows: 1
                }),
                el('div', { className: 'h2l-todoist-chips-area' },
                    el('button', { className: 'h2l-todoist-chip' }, el(Icon, {name:'calendar'}), ' Tarih'),
                    el('button', { className: 'h2l-todoist-chip' }, el(Icon, {name:'user'}), ' Atanan'),
                    el('button', { className: 'h2l-todoist-chip' }, el(Icon, {name:'flag'}), ' Öncelik'),
                    el('button', { className: 'h2l-todoist-chip' }, el(Icon, {name:'clock'}), ' Hatırlatıcı'),
                    
                    el('div', { style:{position:'relative'}, ref: menuRef },
                        el('button', { className: 'h2l-todoist-chip', onClick: () => setIsMenuOpen(!isMenuOpen) }, el(Icon, {name:'ellipsis'})),
                        isMenuOpen && el('div', { className: 'h2l-popover-menu top-aligned' },
                            el('div', { className: 'h2l-menu-item' }, el(Icon,{name:'tag'}), ' Etiketler'),
                            el('div', { className: 'h2l-menu-item' }, el(Icon,{name:'location-dot'}), ' Konum'),
                            el('div', { className: 'h2l-menu-item' }, el(Icon,{name:'plug'}), ' Uzantı ekle...')
                        )
                    )
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-todoist-project-selector', onClick: () => alert('Proje değiştirme henüz aktif değil.') }, 
                    el(Icon, {name:'list-check', style:{marginRight:5}}), projectTitle || 'Proje',
                    el(Icon, {name:'caret-down', style:{marginLeft:4, fontSize:10}})
                ),
                el('div', { className: 'h2l-todoist-footer-actions' },
                    el('button', { className: 'h2l-todoist-btn-cancel', onClick: () => setIsEditing(false) }, 'İptal'),
                    el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !title.trim() }, 'Görev ekle')
                )
            )
        );
    };

    // --- BÖLÜM GRUBU BİLEŞENİ ---
    const SectionGroup = ({ section, tasks, users, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection, projectTitle }) => {
        const [isOpen, setIsOpen] = useState(true);
        const [isEditing, setIsEditing] = useState(false);
        const [secName, setSecName] = useState(section.name);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showDeleteModal, setShowDeleteModal] = useState(false); 
        const menuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [menuRef]);

        const handleSaveName = () => {
            if (secName.trim() && secName !== section.name) {
                onUpdateSection(section.id, { name: secName, projectId: section.project_id });
            } else {
                setSecName(section.name);
            }
            setIsEditing(false);
        };

        if (isEditing) {
            return el('div', { className: 'h2l-section-edit-mode' },
                el('input', { 
                    className: 'h2l-section-edit-input', value: secName, autoFocus: true,
                    onChange: e => setSecName(e.target.value),
                    onKeyDown: e => { if(e.key==='Enter') handleSaveName(); if(e.key==='Escape') { setSecName(section.name); setIsEditing(false); } }
                }),
                el('div', { className: 'h2l-section-edit-actions' },
                    el('button', { className: 'h2l-btn primary', onClick: handleSaveName }, 'Kaydet'),
                    el('button', { className: 'h2l-btn text-cancel', onClick: () => { setSecName(section.name); setIsEditing(false); } }, 'İptal')
                )
            );
        }

        return el('div', { className: 'h2l-section-container' },
            el('div', { className: 'h2l-section-header-row' },
                el('div', { className: 'h2l-section-left' },
                    el('div', { className: 'h2l-section-toggle-btn', onClick: () => setIsOpen(!isOpen) }, el(Icon, { name: isOpen ? 'chevron-down' : 'chevron-right' })),
                    el('span', { className: 'h2l-section-title', onClick: () => setIsEditing(true) }, section.name),
                    el('span', { className: 'h2l-section-count' }, tasks.length)
                ),
                el('div', { className: 'h2l-section-right', ref: menuRef },
                    el('button', { className: 'h2l-section-menu-btn', onClick: () => setIsMenuOpen(!isMenuOpen) }, el(Icon, { name: 'ellipsis' })),
                    isMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' },
                        el('div', { className: 'h2l-menu-item', onClick: () => { setIsEditing(true); setIsMenuOpen(false); } }, el(Icon, { name: 'pen' }), ' Düzenle'),
                        el('div', { className: 'h2l-menu-section' }, 
                            el('div', { className: 'h2l-menu-item text-danger', onClick: () => { setShowDeleteModal(true); setIsMenuOpen(false); } }, el(Icon, { name: 'trash' }), ' Sil')
                        )
                    )
                )
            ),
            isOpen && tasks.map(t => el(TaskRow, { key: t.id, task: t, users, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })),
            isOpen && el(QuickAdd, { sectionId: section.id, onAdd: onAddTask, projectTitle }),

            showDeleteModal && el(DeleteSectionModal, { section: section, taskCount: tasks.length, onClose: () => setShowDeleteModal(false), onConfirm: () => { onDeleteSection(section.id); setShowDeleteModal(false); } })
        );
    };

    // --- BÖLÜM EKLE (SEPARATOR) ---
    const SectionAdd = ({ onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(name.trim()) { onAdd({ name }); setName(''); setIsEditing(false); } };

        if (!isEditing) {
            return el('div', { className: 'h2l-section-separator', onClick: () => setIsEditing(true) },
                el('span', { className: 'h2l-separator-line' }), el('span', { className: 'h2l-separator-text' }, 'Bölüm ekle'), el('span', { className: 'h2l-separator-line' })
            );
        }
        return el('div', { className: 'h2l-section-add-form' },
            el('form', { onSubmit: handleSubmit },
                el('input', { className: 'h2l-section-input', autoFocus: true, placeholder: 'Bölüm adı', value: name, onChange: e => setName(e.target.value), onBlur: () => !name.trim() && setIsEditing(false) }),
                el('div', { className: 'h2l-form-actions' }, el('button', { type:'submit', className: 'h2l-btn primary', disabled:!name.trim() }, 'Bölüm ekle'), el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'))
            )
        );
    };

    // --- GÖREV DETAY MODALI ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections }) => {
        const [title, setTitle] = useState(task.title);
        const [desc, setDesc] = useState(task.content || '');
        const handleSave = () => { if (title !== task.title || desc !== task.content) { onUpdate(task.id, { title, content: desc }); } };
        const pId = parseInt(task.project_id || task.projectId);
        const sId = parseInt(task.section_id || task.sectionId);
        const project = projects.find(p => parseInt(p.id) === pId);
        const section = sections.find(s => parseInt(s.id) === sId);
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); }

        return el('div', { className: 'h2l-detail-overlay', onClick: onClose },
            el('div', { className: 'h2l-detail-modal', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-dm-main' },
                    el('div', { className: 'h2l-dm-header' },
                        el('div', { className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, onClick: () => onUpdate(task.id, { status: task.status==='completed'?'open':'completed' }) }, task.status==='completed' && el(Icon,{name:'check'})),
                        el('textarea', { className: 'h2l-dm-title', value: title, onChange: e => setTitle(e.target.value), onBlur: handleSave, rows: 1 })
                    ),
                    el('textarea', { className: 'h2l-dm-desc', placeholder: 'Açıklama ekle...', value: desc, onChange: e => setDesc(e.target.value), onBlur: handleSave }),
                    el('div', { className: 'h2l-dm-section' }, el('h4', null, el(Icon, {name:'list-check', style:{marginRight:8}}), 'Alt görevler'), el('button', { className: 'h2l-btn-text' }, '+ Alt görev ekle')),
                ),
                el('div', { className: 'h2l-dm-sidebar' },
                    el('div', { style:{textAlign:'right',marginBottom:20} }, el(Icon, { name: 'xmark', className: 'h2l-close-icon', onClick: onClose })),
                    el('div', { className: 'h2l-prop-group' }, el('span', { className: 'h2l-dm-label' }, 'Proje'), el('div', { className: 'h2l-dm-value' }, el('span', { style: { color: project?.color||'#888', marginRight:6 } }, '#'), project?.title, section ? ` / ${section.name}` : '')),
                    el('div', { className: 'h2l-prop-group' }, el('span', { className: 'h2l-dm-label' }, 'Atanan'), el('div', { className: 'h2l-dm-value' }, assignee ? el(Avatar, {userId:assignee.id, users, size:20}) : el(Icon, {name:'user-plus'}), assignee ? assignee.name : 'Ata')),
                    el('div', { className: 'h2l-prop-group' }, el('span', { className: 'h2l-dm-label' }, 'Tarih'), el('div', { className: 'h2l-dm-value' }, el(Icon,{name:'calendar'}), task.date_display || 'Tarih Ekle')),
                    el('div', { className: 'h2l-prop-group' }, el('span', { className: 'h2l-dm-label' }, 'Öncelik'), el('div', { className: 'h2l-dm-value' }, el(Icon,{name:'flag'}), `P${task.priority}`))
                )
            )
        );
    };

    // --- LİSTE GÖRÜNÜMÜ ---
    const ListView = ({ project, tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick, showCompleted, highlightToday, onUpdateSection, onDeleteSection }) => {
        let visibleTasks = tasks;
        if (!showCompleted) { visibleTasks = tasks.filter(t => t.status !== 'completed'); }
        const rootTasks = visibleTasks.filter(t => { const sId = t.section_id || t.sectionId; return !sId || sId == 0; });

        return el('div', { className: 'h2l-list-view' },
            el('div', { className: 'h2l-project-content-header' },
                el('h1', null, el('span', { className:'h2l-hash', style: { color: project.color } }, '#'), project.title),
                el('span', { className: 'h2l-project-badge', style: { backgroundColor: project.color, color: '#fff' } }, tasks.length)
            ),
            el('div', { className: 'h2l-section-container' }, 
                rootTasks.map(t => el(TaskRow, { key: t.id, task: t, users, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })), 
                el(QuickAdd, { sectionId: 0, onAdd: onAddTask, projectTitle: project.title })
            ),
            sections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id || t.sectionId) === parseInt(s.id));
                return el(SectionGroup, { key: s.id, section: s, tasks: sTasks, users, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection, projectTitle: project.title });
            }),
            el(SectionAdd, { onAdd: onAddSection })
        );
    };
    const BoardView = ({ tasks, sections, onUpdateTask }) => { return el('div', { className: 'h2l-board-container' }, 'Board Görünümü (Yakında)'); };
    
    // --- MAIN EXPORT ---
    window.H2L.ProjectDetail = ({ project, folders, tasks, sections, users, navigate, onAddTask, onDeleteTask, onUpdateTask, onAddSection, onAction, onUpdateSection, onDeleteSection }) => {
        const [viewMode, setViewMode] = useState(project ? (project.view_type || 'list') : 'list');
        const [selectedTask, setSelectedTask] = useState(null);
        const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
        const [showCompleted, setShowCompleted] = useState(true);
        const [highlightToday, setHighlightToday] = useState(false);
        const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
        const viewMenuRef = useRef(null);
        const moreMenuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => { 
                if (viewMenuRef.current && !viewMenuRef.current.contains(event.target)) setIsViewMenuOpen(false);
                if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setIsMoreMenuOpen(false);
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [viewMenuRef, moreMenuRef]);

        if (!project) return el('div', null, 'Yükleniyor...');
        const folderId = parseInt(project.folderId || project.folder_id || 0);
        const folder = folders ? folders.find(f => parseInt(f.id) === folderId) : null;
        const folderName = folder ? folder.name : 'Projelerim';
        const managers = (project.managers || []).map(uid => users.find(u => parseInt(u.id) === parseInt(uid))).filter(Boolean);

        return el('div', { className: 'h2l-project-page' },
            el('div', { className: 'h2l-project-header-wrapper' },
                el('div', { className: 'h2l-detail-header' },
                    el('div', { className: 'h2l-header-top' },
                        el('div', { className: 'h2l-breadcrumb' },
                            el('span', { className: 'link', onClick: () => navigate('') }, folderName), el('span', { className: 'divider' }, '/'), el('span', null, project.title)
                        ),
                        el('div', { className: 'h2l-header-actions' },
                            managers.length > 0 && el('div', { className: 'h2l-avatars-stack' }, managers.map((u, i) => el(Avatar, { key: u.id, userId: u.id, users, size: 26, style:{marginLeft: i===0?0:-8} }))),
                            el('button', { className: 'h2l-action-btn', title: 'Üye Ekle' }, el(Icon, { name: 'user-plus' }), 'Paylaş'),
                            el('div', { style: { position: 'relative' }, ref: viewMenuRef },
                                el('button', { className: 'h2l-action-btn', onClick: () => setIsViewMenuOpen(!isViewMenuOpen) }, el(Icon, { name: 'sliders' }), 'Görünüm'),
                                isViewMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' },
                                    el('div', { className: 'h2l-menu-section' }, el('span', { className: 'h2l-menu-title' }, 'DÜZEN'), el('div', { className: 'h2l-view-selector' }, el('div', { className: `h2l-view-btn ${viewMode==='list'?'active':''}`, onClick: () => setViewMode('list') }, el(Icon, { name: 'list' }), ' Liste'), el('div', { className: `h2l-view-btn ${viewMode==='board'?'active':''}`, onClick: () => setViewMode('board') }, el(Icon, { name: 'table-columns' }), ' Pano'))),
                                    el('div', { className: 'h2l-menu-section' }, el('div', { className: 'h2l-switch-item', onClick:()=>setShowCompleted(!showCompleted) }, el('span', null, 'Tamamlanan görevler'), el('div', { className: `h2l-toggle-switch ${showCompleted?'on':''}` }, el('div', {className:'knob'}))))
                                )
                            ),
                            el('div', { style: { position: 'relative' }, ref: moreMenuRef },
                                el('button', { className: 'h2l-action-btn', title: 'Diğer', onClick: () => setIsMoreMenuOpen(!isMoreMenuOpen) }, el(Icon, { name: 'ellipsis' })),
                                isMoreMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' },
                                    el('div', { className: 'h2l-menu-item', onClick: () => { if(onAction) onAction('edit_project', project); setIsMoreMenuOpen(false); } }, el(Icon, { name: 'pen' }), ' Projeyi düzenle'),
                                    el('div', { className: 'h2l-menu-item' }, el(Icon, { name: 'box-archive' }), ' Projeyi arşivle'),
                                    el('div', { className: 'h2l-menu-item text-danger', onClick: () => { if(onAction) onAction('delete_project', project.id); setIsMoreMenuOpen(false); } }, el(Icon, { name: 'trash' }), ' Projeyi sil')
                                )
                            )
                        )
                    )
                )
            ),
            el('div', { className: 'h2l-project-content-wrapper' },
                viewMode === 'list' 
                    ? el(ListView, { project, tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask: (opts) => onAddTask({ projectId: project.id, ...opts }), onAddSection: (data) => onAddSection({ projectId: project.id, ...data }), onTaskClick: setSelectedTask, showCompleted, highlightToday, onUpdateSection, onDeleteSection })
                    : el(BoardView, { tasks, sections, onUpdateTask })
            ),
            selectedTask && el(TaskDetailModal, { task: selectedTask, onClose: () => setSelectedTask(null), onUpdate: (id, d) => { onUpdateTask(id, d); setSelectedTask(prev => ({...prev, ...d})); }, users, projects: [project], sections })
        );
    };
})(window.wp);