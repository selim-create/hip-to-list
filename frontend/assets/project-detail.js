(function(wp) {
    const { createElement: el, useState, useEffect } = wp.element;
    window.H2L = window.H2L || {};

    const Icon = ({ name, className = "", onClick, style }) => 
        el('i', { className: `fa-solid fa-${name} ${className}`, onClick, style });

    const Avatar = ({ userId, users, size = 24 }) => {
        if(!users) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        if(!user) return el('div', {className:'h2l-avatar-ph', style:{width:size, height:size, background:'#ccc', borderRadius:'50%'}});
        return el('img', { src: user.avatar, style: { width: size, height: size, borderRadius: '50%', objectFit:'cover' }, title: user.name });
    };

    // --- GÖREV DETAY MODALI ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections }) => {
        const [title, setTitle] = useState(task.title);
        const [desc, setDesc] = useState(task.content || '');
        const [comment, setComment] = useState('');
        
        const handleSave = () => {
            if (title !== task.title || desc !== task.content) {
                onUpdate(task.id, { title, content: desc });
            }
        };

        const project = projects.find(p => p.id === parseInt(task.projectId || task.project_id));
        const section = sections.find(s => s.id === parseInt(task.sectionId || task.section_id));
        const assignee = task.assignees && task.assignees.length > 0 ? users.find(u => u.id === task.assignees[0]) : null;

        return el('div', { className: 'h2l-detail-overlay', onClick: onClose },
            el('div', { className: 'h2l-detail-modal', onClick: e => e.stopPropagation() },
                // SOL
                el('div', { className: 'h2l-dm-main' },
                    el('div', { className: 'h2l-dm-header' },
                        el('div', { className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, onClick: () => onUpdate(task.id, { status: task.status==='completed'?'open':'completed' }) }, task.status==='completed' && el(Icon,{name:'check'})),
                        el('textarea', { className: 'h2l-dm-title', value: title, onChange: e => setTitle(e.target.value), onBlur: handleSave, rows: 1 })
                    ),
                    el('textarea', { className: 'h2l-dm-desc', placeholder: 'Açıklama ekle...', value: desc, onChange: e => setDesc(e.target.value), onBlur: handleSave }),
                    el('div', { className: 'h2l-dm-section' }, el('h4', null, el(Icon, {name:'list-check', style:{marginRight:8}}), 'Alt görevler'), el('button', { className: 'h2l-btn-text' }, '+ Alt görev ekle')),
                ),
                // SAĞ
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

    // --- HIZLI EKLE ---
    const QuickAdd = ({ sectionId, onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(title.trim()) { onAdd({ title, sectionId }); setTitle(''); } };

        if (!isEditing) return el('div', { className: 'h2l-quick-add-row' }, el('div', { className: 'h2l-quick-btn', onClick: () => setIsEditing(true) }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
        return el('div', { className: 'h2l-quick-form-wrapper' },
            el('form', { className: 'h2l-quick-form', onSubmit: handleSubmit },
                el('input', { className: 'h2l-quick-input', autoFocus: true, placeholder: 'Görevin adı ne?', value: title, onChange: e => setTitle(e.target.value) }),
                el('div', { className: 'h2l-quick-actions' },
                    el('div', { className: 'h2l-quick-props' }, el('span', { className: 'h2l-prop-tag' }, el(Icon,{name:'calendar'}), 'Bugün'), el('span', { className: 'h2l-prop-tag' }, el(Icon,{name:'user'}), 'Ata')),
                    el('div', { style:{display:'flex', gap:10} }, el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'), el('button', { type:'submit', className: 'h2l-btn primary', disabled: !title.trim() }, 'Ekle'))
                )
            )
        );
    };

    // --- BÖLÜM EKLE ---
    const SectionAdd = ({ onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState('');
        const handleSubmit = (e) => { 
            e.preventDefault(); 
            if(name.trim()) { 
                onAdd({ name }); // Obje olarak gönderiyoruz: { name: "Bölüm Adı" }
                setName(''); 
                setIsEditing(false); 
            } 
        };

        if (!isEditing) return el('div', { className: 'h2l-add-section-area', onClick: () => setIsEditing(true) }, 'Bölüm ekle');

        return el('form', { className: 'h2l-quick-form', onSubmit: handleSubmit, style:{marginTop:30, borderTop:'1px solid #db4c3f', paddingTop:10} },
            el('input', { className: 'h2l-quick-input', autoFocus: true, placeholder: 'Bölüm adı', value: name, onChange: e => setName(e.target.value) }),
            el('div', { className: 'h2l-quick-actions' },
                el('div', null),
                el('div', { style:{display:'flex', gap:10} },
                    el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'),
                    el('button', { type:'submit', className: 'h2l-btn primary', disabled:!name.trim() }, 'Bölüm ekle')
                )
            )
        );
    };

    // --- LİSTE GÖRÜNÜMÜ ---
    const ListView = ({ tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick }) => {
        const rootTasks = tasks.filter(t => !t.sectionId || t.sectionId == 0);

        const TaskRow = ({ task }) => {
            const assignee = (task.assignees && task.assignees.length) ? users.find(u=>u.id===task.assignees[0]) : null;
            return el('div', { key: task.id, className: 'h2l-task-row', onClick: () => onTaskClick(task) },
                el('div', { className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status==='completed'?'open':'completed' }); } }, el(Icon, { name: 'check' })),
                el('div', { className: 'h2l-task-content' },
                    el('span', { className: `h2l-task-title ${task.status==='completed'?'completed':''}` }, task.title),
                    el('div', { className: 'h2l-task-meta' },
                        task.date_display && el('span', { className: 'h2l-meta-item date' }, el(Icon, {name:'calendar'}), task.date_display),
                        assignee && el('span', { className: 'h2l-meta-item' }, el(Avatar, { userId: assignee.id, users, size: 16 }), assignee.name)
                    )
                ),
                el('div', { className: 'h2l-task-actions' },
                    el('button', { className: 'h2l-icon-btn' }, el(Icon, { name: 'pen' })),
                    el('button', { className: 'h2l-icon-btn danger', onClick: (e) => { e.stopPropagation(); if(confirm('Sil?')) onDeleteTask(task.id); } }, el(Icon, { name: 'trash' }))
                )
            );
        };

        return el('div', { className: 'h2l-list-view' },
            // Bölümsüz
            el('div', { className: 'h2l-section-container' },
                rootTasks.map(t => TaskRow({ task: t })),
                el(QuickAdd, { sectionId: 0, onAdd: onAddTask })
            ),
            // Bölümler
            sections.map(s => {
                const sTasks = tasks.filter(t => parseInt(t.sectionId) === parseInt(s.id));
                const [isOpen, setIsOpen] = useState(true);
                return el('div', { key: s.id, className: 'h2l-section-container' },
                    el('div', { className: 'h2l-section-header', onClick: () => setIsOpen(!isOpen) },
                        el(Icon, { name: 'chevron-down', className: `h2l-section-toggle ${!isOpen?'closed':''}` }),
                        el('span', { className: 'h2l-section-title' }, s.name),
                        el('span', { className: 'h2l-section-count' }, sTasks.length)
                    ),
                    isOpen && sTasks.map(t => TaskRow({ task: t })),
                    isOpen && el(QuickAdd, { sectionId: s.id, onAdd: onAddTask })
                );
            }),
            // Bölüm Ekle (Liste Sonunda)
            el(SectionAdd, { onAdd: onAddSection })
        );
    };

    // --- BOARD VIEW ---
    const BoardView = ({ tasks, sections, onUpdateTask }) => {
        // ... (Board logic - Placeholder for now) ...
        return el('div', { className: 'h2l-board-container' }, 'Board Görünümü');
    };

    // --- MAIN EXPORT ---
    window.H2L.ProjectDetail = ({ project, tasks, sections, users, navigate, onAddTask, onDeleteTask, onUpdateTask, onAddSection }) => {
        const [viewMode, setViewMode] = useState(project.view_type || 'list');
        const [selectedTask, setSelectedTask] = useState(null);

        if (!project) return null;

        return el('div', { className: 'h2l-project-detail-wrapper' },
            el('div', { className: 'h2l-detail-header' },
                el('div', { className: 'h2l-head-left' },
                    el('div', { className: 'h2l-breadcrumb', onClick: () => navigate('') }, 'Projelerim', el(Icon,{name:'angle-right'}), project.title),
                    el('div', { className: 'h2l-project-title-row' },
                        el('h1', null, el('span', { style: { color: project.color, marginRight: 10 } }, '#'), project.title),
                        el('span', { className: 'h2l-project-count' }, tasks.length)
                    )
                ),
                el('div', { className: 'h2l-head-actions' },
                     el('div', { className: 'h2l-avatars-stack' }, (project.managers||[]).slice(0,3).map(u => el(Avatar, { key: u, userId: u, users, size: 26 }))),
                     el('button', {className:'h2l-action-btn'}, el(Icon,{name:'user-plus'})),
                     el('div', { className: 'h2l-view-toggle' },
                        el('button', { className: viewMode==='list'?'active':'', onClick:()=>setViewMode('list') }, el(Icon,{name:'list'}), 'Liste'),
                        el('button', { className: viewMode==='board'?'active':'', onClick:()=>setViewMode('board') }, el(Icon,{name:'table-columns'}), 'Pano')
                     ),
                     el('button', {className:'h2l-action-btn'}, el(Icon,{name:'ellipsis'}))
                )
            ),
            
            viewMode === 'list' 
                ? el(ListView, { tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask: (opts) => onAddTask({ projectId: project.id, ...opts }), onAddSection: (data) => onAddSection({ projectId: project.id, ...data }), onTaskClick: setSelectedTask })
                : el(BoardView, { tasks, sections, onUpdateTask }),
            
            selectedTask && el(TaskDetailModal, { 
                task: selectedTask, 
                onClose: () => setSelectedTask(null), 
                onUpdate: (id, d) => { onUpdateTask(id, d); setSelectedTask({...selectedTask, ...d}); },
                users, projects: [project], sections 
            })
        );
    };
})(window.wp);