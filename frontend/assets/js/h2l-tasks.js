(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    // Bağımlılıkları kontrol et ve al
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { 
        renderRichText: (t) => t
    };
    const { renderRichText } = Reminders;

    // TaskInput modülünden bileşenleri al
    const TaskInput = window.H2L && window.H2L.TaskInput ? window.H2L.TaskInput : { InlineTaskEditor: () => null, QuickAdd: () => null };
    const { InlineTaskEditor, QuickAdd } = TaskInput;

    window.H2L = window.H2L || {};
    window.H2L.Tasks = window.H2L.Tasks || {};

    // --- 1. TASK ROW (Görev Satırı) ---
    const TaskRow = ({ task, users, onUpdateTask, onTaskClick, highlightToday }) => {
        const [isEditing, setIsEditing] = useState(false);
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); }
        const isToday = task.date_display === 'Bugün';
        const highlightClass = (highlightToday && isToday) ? 'h2l-highlight-today' : '';

        if (isEditing) {
            return el(InlineTaskEditor, { 
                task: task, 
                users: users, 
                onSave: (updatedData) => {
                    onUpdateTask(task.id, updatedData);
                    setIsEditing(false);
                },
                onCancel: () => setIsEditing(false)
            });
        }
        
        return el('div', { className: `h2l-task-row ${highlightClass}`, onClick: () => onTaskClick(task) },
            el('div', { className: 'h2l-task-left' },
                el('div', { className: `h2l-task-check p${task.priority} ${task.status==='completed'?'completed':''}`, onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: task.status==='completed'?'open':'completed' }); } }, el(Icon, { name: 'check' }))
            ),
            el('div', { className: 'h2l-task-content' },
                el('span', { className: `h2l-task-title ${task.status==='completed'?'completed':''}` }, renderRichText(task.title)),
                el('div', { className: 'h2l-task-details' },
                    task.date_display && el('span', { className: `h2l-detail-item date ${isToday ? 'today' : ''}` }, el(Icon, {name:'calendar'}), task.date_display),
                    assignee && el('span', { className: 'h2l-detail-item' }, assignee.name)
                )
            ),
            el('div', { className: 'h2l-task-right' },
                el('button', { className: 'h2l-icon-btn', title: 'Düzenle', onClick: (e) => { e.stopPropagation(); setIsEditing(true); } }, el(Icon, { name: 'pen' })),
                assignee ? el('div', { style:{margin:'0 4px'} }, el(Avatar, { userId: assignee.id, users, size: 24 })) : el('button', { className: 'h2l-icon-btn', title: 'Ata', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'user' })),
                el('button', { className: 'h2l-icon-btn', title: 'Diğer', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'ellipsis' }))
            )
        );
    };

    // --- 2. SECTIONS (Bölümler) ---
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
            isOpen && el(QuickAdd, { sectionId: section.id, onAdd: onAddTask, projectTitle, users }),

            showDeleteModal && el(DeleteSectionModal, { section: section, taskCount: tasks.length, onClose: () => setShowDeleteModal(false), onConfirm: () => { onDeleteSection(section.id); setShowDeleteModal(false); } })
        );
    };

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

    // --- 3. TASK DETAIL MODAL ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections }) => {
        const [title, setTitle] = useState(task.title);
        const [desc, setDesc] = useState(task.content || '');
        const [comments, setComments] = useState([]);
        const [newComment, setNewComment] = useState('');
        const [isCommentSending, setIsCommentSending] = useState(false);

        useEffect(() => {
            if (wp.apiFetch) {
                wp.apiFetch({ path: `/h2l/v1/comments?task_id=${task.id}` }).then(data => { if(Array.isArray(data)) setComments(data); }).catch(err => console.error("Hata:", err));
            }
        }, [task.id]);

        const handleSave = () => { if (title !== task.title || desc !== task.content) { onUpdate(task.id, { title, content: desc }); } };
        const handleSendComment = () => {
            if(!newComment.trim() || !wp.apiFetch) return;
            setIsCommentSending(true);
            wp.apiFetch({ path: '/h2l/v1/comments', method: 'POST', data: { task_id: task.id, content: newComment } }).then(res => { setComments([...comments, res]); setNewComment(''); setIsCommentSending(false); }).catch(err => { console.error(err); setIsCommentSending(false); });
        };

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
                    el('div', { className: 'h2l-comments-section' },
                        el('h4', { style:{marginBottom:15} }, 'Yorumlar'),
                        el('div', { className: 'h2l-comment-list' },
                            comments.map(c => {
                                const author = users.find(u => parseInt(u.id) === parseInt(c.user_id));
                                return el('div', { key: c.id, className: 'h2l-comment-item' },
                                    el(Avatar, { userId: c.user_id, users, size: 28, style:{marginTop:4} }),
                                    el('div', { className: 'h2l-comment-content-box' },
                                        el('div', { className: 'h2l-comment-header' }, el('span', { className: 'h2l-comment-author' }, author ? author.name : 'Bilinmeyen'), el('span', { className: 'h2l-comment-date' }, c.created_at)),
                                        el('div', { className: 'h2l-comment-text' }, c.content)
                                    )
                                );
                            })
                        ),
                        el('div', { className: 'h2l-comment-form' },
                            el(Avatar, { userId: window.h2lFrontendSettings?.currentUser?.ID, users, size: 28, style:{marginTop:4} }),
                            el('div', { className: 'h2l-comment-input-box' },
                                el('textarea', { className: 'h2l-comment-textarea', placeholder: 'Yorum yaz...', value: newComment, onChange: e => setNewComment(e.target.value) }),
                                el('div', { className: 'h2l-comment-toolbar' }, el('button', { className: 'h2l-btn primary', disabled: isCommentSending || !newComment.trim(), onClick: handleSendComment }, 'Gönder'))
                            )
                        )
                    )
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

    // --- 4. GÖRÜNÜMLER (List & Board) ---
    const ListView = ({ project, tasks, sections, users, onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick, showCompleted, highlightToday, onUpdateSection, onDeleteSection }) => {
        const isVirtualView = project.id === 0;
        let visibleTasks = tasks;
        if (!showCompleted) { visibleTasks = tasks.filter(t => t.status !== 'completed'); }
        
        const rootTasks = isVirtualView ? visibleTasks : visibleTasks.filter(t => !t.section_id || t.section_id == 0);

        return el('div', { className: 'h2l-list-view' },
            el('div', { className: 'h2l-project-content-header' },
                el('h1', null, 
                    !isVirtualView && el('span', { className:'h2l-hash', style: { color: project.color } }, '#'), 
                    project.title
                ),
                el('span', { className: 'h2l-project-badge', style: { backgroundColor: project.color, color: '#fff' } }, tasks.length)
            ),
            
            el('div', { className: 'h2l-section-container' }, 
                rootTasks.map(t => el(TaskRow, { key: t.id, task: t, users, onUpdateTask, onDeleteTask, onTaskClick, highlightToday })), 
                el(QuickAdd, { sectionId: 0, onAdd: onAddTask, projectTitle: project.title, users })
            ),

            !isVirtualView && sections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id) === parseInt(s.id));
                return el(SectionGroup, { key: s.id, section: s, tasks: sTasks, users, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection, projectTitle: project.title });
            }),

            !isVirtualView && el(SectionAdd, { onAdd: onAddSection })
        );
    };

    const BoardView = ({ tasks, sections, onUpdateTask }) => {
        return el('div', { className: 'h2l-board-container' }, 'Pano Görünümü (Yakında Gelecek)');
    };

    // Modülü Dışarı Aktar
    window.H2L.Tasks = {
        TaskDetailModal,
        ListView,
        BoardView,
        SectionGroup,
        SectionAdd,
        TaskRow
    };

})(window.wp);