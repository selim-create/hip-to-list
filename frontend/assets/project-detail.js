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

    // --- GÖREV DETAY MODALI ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections }) => {
        const [title, setTitle] = useState(task.title);
        const [desc, setDesc] = useState(task.content || '');
        
        const handleSave = () => {
            if (title !== task.title || desc !== task.content) {
                onUpdate(task.id, { title, content: desc });
            }
        };

        const pId = parseInt(task.project_id || task.projectId);
        const sId = parseInt(task.section_id || task.sectionId);
        const project = projects.find(p => parseInt(p.id) === pId);
        const section = sections.find(s => parseInt(s.id) === sId);
        
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) {
            assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0]));
        }

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

    // --- HIZLI EKLE (INLINE) ---
    const QuickAdd = ({ sectionId, onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(title.trim()) { onAdd({ title, sectionId }); setTitle(''); } };

        if (!isEditing) return el('div', { className: 'h2l-quick-add-row' }, el('div', { className: 'h2l-quick-btn', onClick: () => setIsEditing(true) }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
        return el('div', { className: 'h2l-quick-form-wrapper' },
            el('form', { className: 'h2l-quick-form', onSubmit: handleSubmit },
                el('input', { className: 'h2l-quick-input', autoFocus: true, placeholder: 'Görevin adı ne?', value: title, onChange: e => setTitle(e.target.value), onKeyDown: e => { if(e.key==='Escape') setIsEditing(false); } }),
                el('div', { className: 'h2l-quick-actions' },
                    el('div', { className: 'h2l-quick-props' }, el('span', { className: 'h2l-prop-tag' }, el(Icon,{name:'calendar'}), 'Bugün'), el('span', { className: 'h2l-prop-tag' }, el(Icon,{name:'user'}), 'Ata')),
                    el('div', { style:{display:'flex', gap:10} }, el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'), el('button', { type:'submit', className: 'h2l-btn primary', disabled: !title.trim() }, 'Ekle'))
                )
            )
        );
    };

    // --- BÖLÜM EKLE (SEPARATOR STYLE) ---
    const SectionAdd = ({ onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(name.trim()) { onAdd({ name }); setName(''); setIsEditing(false); } };

        if (!isEditing) {
            return el('div', { className: 'h2l-section-separator', onClick: () => setIsEditing(true) },
                el('span', { className: 'h2l-separator-line' }),
                el('span', { className: 'h2l-separator-text' }, 'Bölüm ekle'),
                el('span', { className: 'h2l-separator-line' })
            );
        }

        return el('div', { className: 'h2l-section-add-form' },
            el('form', { onSubmit: handleSubmit },
                el('input', { 
                    className: 'h2l-section-input', 
                    autoFocus: true, 
                    placeholder: 'Bölüm adı', 
                    value: name, 
                    onChange: e => setName(e.target.value),
                    onBlur: () => !name.trim() && setIsEditing(false)
                }),
                el('div', { className: 'h2l-form-actions' },
                    el('button', { type:'submit', className: 'h2l-btn primary', disabled:!name.trim() }, 'Bölüm ekle'),
                    el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal')
                )
            )
        );
    };

    // --- GÖREV SATIRI ---
    const TaskRow = ({ task, users, onUpdateTask, onTaskClick, highlightToday }) => {
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); }
        
        const isToday = task.date_display === 'Bugün';
        const highlightClass = (highlightToday && isToday) ? 'h2l-highlight-today' : '';

        return el('div', { className: `h2l-task-row ${highlightClass}`, onClick: () => onTaskClick(task) },
            // Sol: Checkbox
            el('div', { className: 'h2l-task-left' },
                el('div', { className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status==='completed'?'open':'completed' }); } }, el(Icon, { name: 'check' }))
            ),
            // Orta: İçerik
            el('div', { className: 'h2l-task-content' },
                el('span', { className: `h2l-task-title ${task.status==='completed'?'completed':''}` }, task.title),
                el('div', { className: 'h2l-task-details' },
                    task.date_display && el('span', { className: `h2l-detail-item date ${isToday ? 'today' : ''}` }, el(Icon, {name:'calendar'}), task.date_display),
                )
            ),
            // Sağ: Atanan & Menü
            el('div', { className: 'h2l-task-right' },
                assignee && el('div', { className: 'h2l-assignee-wrapper' }, el(Avatar, { userId: assignee.id, users, size: 24 })),
                el('div', { className: 'h2l-task-menu' },
                    el('button', { className: 'h2l-icon-btn', onClick: (e) => { e.stopPropagation(); /* Menü aç */ } }, el(Icon, { name: 'ellipsis' }))
                )
            )
        );
    };

    // --- BÖLÜM GRUBU BİLEŞENİ (HOOK HATASINI ÇÖZEN YAPI) ---
    const SectionGroup = ({ section, tasks, users, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday }) => {
        const [isOpen, setIsOpen] = useState(true);

        return el('div', { className: 'h2l-section-container' },
            el('div', { className: 'h2l-section-header', onClick: () => setIsOpen(!isOpen) },
                el(Icon, { name: isOpen ? 'chevron-down' : 'chevron-right', className: 'h2l-section-toggle' }),
                el('span', { className: 'h2l-section-title' }, section.name),
                el('span', { className: 'h2l-section-count' }, tasks.length)
            ),
            isOpen && tasks.map(t => 
                el(TaskRow, { key: t.id, task: t, users, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })
            ),
            isOpen && el(QuickAdd, { sectionId: section.id, onAdd: onAddTask })
        );
    };

    // --- LİSTE GÖRÜNÜMÜ ---
    const ListView = ({ project, tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick, showCompleted, highlightToday }) => {
        // Tamamlananları filtrele
        let visibleTasks = tasks;
        if (!showCompleted) {
            visibleTasks = tasks.filter(t => t.status !== 'completed');
        }

        const rootTasks = visibleTasks.filter(t => { const sId = t.section_id || t.sectionId; return !sId || sId == 0; });

        return el('div', { className: 'h2l-list-view' },
            // PROJE BAŞLIĞI
            el('div', { className: 'h2l-project-content-header' },
                el('h1', null, 
                    el('span', { className:'h2l-hash', style: { color: project.color } }, '#'), 
                    project.title
                ),
                el('span', { className: 'h2l-project-badge', style: { backgroundColor: project.color, color: '#fff' } }, tasks.length)
            ),

            // BÖLÜMSÜZ GÖREVLER
            el('div', { className: 'h2l-section-container' }, 
                rootTasks.map(t => el(TaskRow, { key: t.id, task: t, users, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })), 
                el(QuickAdd, { sectionId: 0, onAdd: onAddTask })
            ),
            
            // BÖLÜMLER (DÖNGÜ İÇİNDE COMPONENT KULLANILARAK HATA ÖNLENİYOR)
            sections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id || t.sectionId) === parseInt(s.id));
                return el(SectionGroup, { 
                    key: s.id, 
                    section: s, 
                    tasks: sTasks, 
                    users, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday 
                });
            }),
            
            // BÖLÜM EKLE (EN ALT)
            el(SectionAdd, { onAdd: onAddSection })
        );
    };

    // --- BOARD VIEW ---
    const BoardView = ({ tasks, sections, onUpdateTask }) => { return el('div', { className: 'h2l-board-container' }, 'Board Görünümü (Yakında)'); };

    // --- MAIN EXPORT ---
    window.H2L.ProjectDetail = ({ project, folders, tasks, sections, users, navigate, onAddTask, onDeleteTask, onUpdateTask, onAddSection, onAction }) => {
        const [viewMode, setViewMode] = useState(project ? (project.view_type || 'list') : 'list');
        const [selectedTask, setSelectedTask] = useState(null);
        
        const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
        const [showCompleted, setShowCompleted] = useState(true);
        const [highlightToday, setHighlightToday] = useState(false);
        const [groupSubtasks, setGroupSubtasks] = useState(false);
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
        
        // Yöneticiler (Tümü)
        const managers = (project.managers || []).map(uid => users.find(u => parseInt(u.id) === parseInt(uid))).filter(Boolean);

        return el('div', { className: 'h2l-project-page' },
            // HEADER (Full Width)
            el('div', { className: 'h2l-project-header-wrapper' },
                el('div', { className: 'h2l-detail-header' },
                    el('div', { className: 'h2l-header-top' },
                        el('div', { className: 'h2l-breadcrumb' },
                            el('span', { className: 'link', onClick: () => navigate('') }, folderName),
                            el('span', { className: 'divider' }, '/'),
                            el('span', null, project.title)
                        ),
                        el('div', { className: 'h2l-header-actions' },
                            // AVATARLAR (HEPSİ)
                            managers.length > 0 && el('div', { className: 'h2l-avatars-stack' },
                                managers.map((u, i) => el(Avatar, { key: u.id, userId: u.id, users, size: 26, style:{marginLeft: i===0?0:-8} }))
                            ),
                            el('button', { className: 'h2l-action-btn', title: 'Üye Ekle' }, el(Icon, { name: 'user-plus' }), 'Paylaş'),
                            
                            // GÖRÜNÜM MENÜSÜ
                            el('div', { style: { position: 'relative' }, ref: viewMenuRef },
                                el('button', { className: 'h2l-action-btn', onClick: () => setIsViewMenuOpen(!isViewMenuOpen) }, 
                                    el(Icon, { name: 'sliders' }), 'Görünüm'
                                ),
                                isViewMenuOpen && el('div', { className: 'h2l-popover-menu right-aligned' },
                                    el('div', { className: 'h2l-menu-section' },
                                        el('span', { className: 'h2l-menu-title' }, 'DÜZEN'),
                                        el('div', { className: 'h2l-view-selector' },
                                            el('div', { className: `h2l-view-btn ${viewMode==='list'?'active':''}`, onClick: () => setViewMode('list') }, el(Icon, { name: 'list' }), ' Liste'),
                                            el('div', { className: `h2l-view-btn ${viewMode==='board'?'active':''}`, onClick: () => setViewMode('board') }, el(Icon, { name: 'table-columns' }), ' Pano')
                                        )
                                    ),
                                    el('div', { className: 'h2l-menu-section' },
                                        el('div', { className: 'h2l-switch-item', onClick:()=>setShowCompleted(!showCompleted) }, 
                                            el('span', null, 'Tamamlanan görevler'),
                                            el('div', { className: `h2l-toggle-switch ${showCompleted?'on':''}` }, el('div', {className:'knob'}))
                                        )
                                    )
                                )
                            ),

                            // DAHA FAZLA MENÜSÜ
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
            
            // CONTENT
            el('div', { className: 'h2l-project-content-wrapper' },
                viewMode === 'list' 
                    ? el(ListView, { 
                        project, tasks, sections, users, 
                        onUpdateTask, onDeleteTask, 
                        onAddTask: (opts) => onAddTask({ projectId: project.id, ...opts }), 
                        onAddSection: (data) => onAddSection({ projectId: project.id, ...data }), 
                        onTaskClick: setSelectedTask,
                        showCompleted, highlightToday
                    })
                    : el(BoardView, { tasks, sections, onUpdateTask })
            ),
            
            selectedTask && el(TaskDetailModal, { 
                task: selectedTask, 
                onClose: () => setSelectedTask(null), 
                onUpdate: (id, d) => { onUpdateTask(id, d); setSelectedTask(prev => ({...prev, ...d})); },
                users, projects: [project], sections 
            })
        );
    };
})(window.wp);