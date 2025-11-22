(function(wp) {
    const { createElement: el, useState } = wp.element;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { renderRichText: (t) => t };
    const { renderRichText } = Reminders;

    const TaskInput = window.H2L && window.H2L.TaskInput ? window.H2L.TaskInput : { TaskEditor: () => null, QuickAddTrigger: () => null };
    const { TaskEditor, QuickAddTrigger } = TaskInput;

    window.H2L = window.H2L || {};
    window.H2L.Tasks = window.H2L.Tasks || {};

    // --- 1. TASK ROW (Liste düzenine dokunulmadı) ---
    const TaskRow = ({ task, users, projects = [], onUpdateTask, onTaskClick, highlightToday }) => {
        const [isEditing, setIsEditing] = useState(false);
        
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { 
            assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); 
        }
        
        const isToday = task.date_display === 'Bugün';
        const highlightClass = (highlightToday && isToday) ? 'h2l-highlight-today' : '';

        // SADECE DÜZENLEME MODUNDA YENİ EDİTÖR ÇALIŞIR
        if (isEditing) {
            return el('div', { style: { marginLeft: 28, marginBottom: 10 } },
                el(TaskEditor, {
                    mode: 'edit',
                    initialData: task,
                    users: users,
                    projects: projects,
                    onSave: (updatedData) => {
                        onUpdateTask(task.id, updatedData);
                        setIsEditing(false);
                    },
                    onCancel: () => setIsEditing(false)
                })
            );
        }
        
        // NORMAL GÖRÜNÜM (ORİJİNALİ İLE BİREBİR AYNI)
        return el('div', { className: `h2l-task-row ${highlightClass}`, onClick: () => onTaskClick(task) },
            el('div', { className: 'h2l-task-left' },
                el('div', { 
                    className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, 
                    onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status==='completed'?'open':'completed' }); } 
                }, el(Icon, { name: 'check' }))
            ),
            el('div', { className: 'h2l-task-content' },
                el('span', { className: `h2l-task-title ${task.status==='completed'?'completed':''}` }, renderRichText(task.title)),
                el('div', { className: 'h2l-task-details' },
                    task.date_display && el('span', { className: `h2l-detail-item date ${isToday ? 'today' : ''}` }, el(Icon, {name:'calendar'}), task.date_display),
                    assignee && el('span', { className: 'h2l-detail-item' }, assignee.name)
                    // Proje başlığı kaldırıldı (Orijinalde yoktu)
                )
            ),
            el('div', { className: 'h2l-task-right' },
                el('button', { className: 'h2l-icon-btn', title: 'Düzenle', onClick: (e) => { e.stopPropagation(); setIsEditing(true); } }, el(Icon, { name: 'pen' })),
                assignee ? el('div', { style:{margin:'0 4px'} }, el(Avatar, { userId: assignee.id, users, size: 24 })) : el('button', { className: 'h2l-icon-btn', title: 'Ata', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'user' })),
                el('button', { className: 'h2l-icon-btn', title: 'Diğer', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'ellipsis' }))
            )
        );
    };

    // --- 2. QUICK ADD CONTAINER (Yeni Editör) ---
    const QuickAddContainer = ({ sectionId, projectId, users, projects, onAdd }) => {
        const [isOpen, setIsOpen] = useState(false);

        if (!isOpen) {
            return el('div', { style: { marginLeft: 28 } },
                el(QuickAddTrigger, { onOpen: () => setIsOpen(true) })
            );
        }

        return el('div', { style: { marginLeft: 28 } },
            el(TaskEditor, {
                mode: 'add',
                users: users,
                projects: projects,
                activeProjectId: projectId,
                onSave: (data) => {
                    onAdd({ ...data, sectionId, projectId }); 
                },
                onCancel: () => setIsOpen(false)
            })
        );
    };

    // --- 3. SECTION GROUP ---
    // (Burada sadece QuickAddContainer değiştirildi, liste yapısı korundu)
    const SectionGroup = ({ section, tasks, users, projects, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection }) => {
        const [isOpen, setIsOpen] = useState(true);
        const [isEditing, setIsEditing] = useState(false);
        const [secName, setSecName] = useState(section.name);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showDeleteModal, setShowDeleteModal] = useState(false); 
        const menuRef = wp.element.useRef(null);

        // ... (Section düzenleme logic'i aynen korunuyor)
        const handleSaveName = () => { if (secName.trim() && secName !== section.name) { onUpdateSection(section.id, { name: secName, projectId: section.project_id }); } else { setSecName(section.name); } setIsEditing(false); };

        if (isEditing) {
            return el('div', { className: 'h2l-section-edit-mode' },
                el('input', { className: 'h2l-section-edit-input', value: secName, autoFocus: true, onChange: e => setSecName(e.target.value), onKeyDown: e => { if(e.key==='Enter') handleSaveName(); if(e.key==='Escape') { setSecName(section.name); setIsEditing(false); } } }),
                el('div', { className: 'h2l-section-edit-actions' }, el('button', { className: 'h2l-btn primary', onClick: handleSaveName }, 'Kaydet'), el('button', { className: 'h2l-btn text-cancel', onClick: () => { setSecName(section.name); setIsEditing(false); } }, 'İptal'))
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
                        el('div', { className: 'h2l-menu-section' }, el('div', { className: 'h2l-menu-item text-danger', onClick: () => { setShowDeleteModal(true); setIsMenuOpen(false); } }, el(Icon, { name: 'trash' }), ' Sil'))
                    )
                )
            ),
            isOpen && tasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })),
            isOpen && el(QuickAddContainer, { sectionId: section.id, projectId: section.project_id, users, projects, onAdd: onAddTask })
        );
    };

    const SectionAdd = ({ onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(name.trim()) { onAdd({ name }); setName(''); setIsEditing(false); } };
        if (!isEditing) { return el('div', { className: 'h2l-section-separator', onClick: () => setIsEditing(true) }, el('span', { className: 'h2l-separator-line' }), el('span', { className: 'h2l-separator-text' }, 'Bölüm ekle'), el('span', { className: 'h2l-separator-line' })); }
        return el('div', { className: 'h2l-section-add-form' }, el('form', { onSubmit: handleSubmit }, el('input', { className: 'h2l-section-input', autoFocus: true, placeholder: 'Bölüm adı', value: name, onChange: e => setName(e.target.value), onBlur: () => !name.trim() && setIsEditing(false) }), el('div', { className: 'h2l-form-actions' }, el('button', { type:'submit', className: 'h2l-btn primary', disabled:!name.trim() }, 'Bölüm ekle'), el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'))));
    };

    // --- 4. LIST VIEW ---
    const ListView = ({ project, tasks, sections, users, projects = [], onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick, showCompleted, highlightToday, onUpdateSection, onDeleteSection }) => {
        const isVirtualView = project.id === 0;
        let visibleTasks = tasks;
        if (!showCompleted) { visibleTasks = tasks.filter(t => t.status !== 'completed'); }
        const rootTasks = isVirtualView ? visibleTasks : visibleTasks.filter(t => !t.section_id || t.section_id == 0);

        return el('div', { className: 'h2l-list-view' },
            el('div', { className: 'h2l-project-content-header' },
                el('h1', null, !isVirtualView && el('span', { className:'h2l-hash', style: { color: project.color } }, '#'), project.title),
                el('span', { className: 'h2l-project-badge', style: { backgroundColor: project.color, color: '#fff' } }, tasks.length)
            ),
            el('div', { className: 'h2l-section-container' }, 
                rootTasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })), 
                el(QuickAddContainer, { sectionId: 0, projectId: project.id, users, projects: projects.length ? projects : [project], onAdd: onAddTask })
            ),
            !isVirtualView && sections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id) === parseInt(s.id));
                return el(SectionGroup, { key: s.id, section: s, tasks: sTasks, users, projects, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection });
            }),
            !isVirtualView && el(SectionAdd, { onAdd: onAddSection })
        );
    };

    // TaskDetailModal (Orijinal, değişmedi)
    const TaskDetailModal = window.H2L.Tasks.TaskDetailModal || (()=>null); 

    window.H2L.Tasks = {
        TaskDetailModal,
        ListView,
        BoardView: () => el('div', null, 'Pano'),
        SectionGroup,
        TaskRow
    };

})(window.wp);