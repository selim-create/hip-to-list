(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null, TASK_STATUSES: {} };
    const { Icon, Avatar, TASK_STATUSES, MultiSelect } = Common;
    
    // GÜNCELLEME: ContentEditable bileşenini import ediyoruz
    const TaskInput = window.H2L && window.H2L.TaskInput ? window.H2L.TaskInput : { TaskEditor: () => null, QuickAddTrigger: () => null, ContentEditable: () => null };
    const { TaskEditor, QuickAddTrigger, ContentEditable } = TaskInput;

    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { getPriorityColor: () => '#808080' };
    const { getPriorityColor } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.Tasks = window.H2L.Tasks || {};

    // DRAG & DROP STATE (Global)
    let currentDraggedId = null;
    let currentDraggedType = null; // 'task' | 'section'

    // --- 0. HELPER: SMART DATE FORMATTER ---
    const getSmartDateDisplay = (dateStr, isRecurring = false) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const target = new Date(date);
        target.setHours(0,0,0,0); 
        
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const hasTime = dateStr.includes(' ') && !dateStr.endsWith('00:00:00');
        const timeStr = hasTime ? dateStr.split(' ')[1].substring(0, 5) : '';

        let text = '';
        let color = '#e67e22'; // Varsayılan Gelecek Tarih Rengi
        let icon = 'calendar';

        if (diffDays === 0) {
            text = 'Bugün';
            color = '#058527'; // Yeşil
            icon = 'calendar-day';
        } else if (diffDays === 1) {
            text = 'Yarın';
            color = '#e67e22'; // Turuncu
            icon = 'sun';
        } else if (diffDays === -1) {
            text = 'Dün';
            color = '#d1453b'; // Kırmızı
        } else if (diffDays < -1) {
            text = target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            color = '#d1453b'; 
        } else if (diffDays > 1 && diffDays < 7) {
            text = dayNames[target.getDay()];
            color = '#692fc2'; // Mor
            icon = 'calendar-week';
        } else {
            text = target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
            if (target.getFullYear() !== today.getFullYear()) {
                text += ` ${target.getFullYear()}`;
            }
            color = '#e67e22';
        }

        return { 
            text: timeStr ? `${text} ${timeStr}` : text, 
            color, 
            icon,
            isRecurring 
        };
    };

    // --- 1. DELETE CONFIRM MODAL ---
    const DeleteTaskModal = ({ task, onClose, onConfirm }) => {
        return el('div', { className: 'h2l-detail-overlay', style: { zIndex: 20050 }, onClick: onClose },
            el('div', { className: 'h2l-confirm-modal', onClick: e => e.stopPropagation() },
                el('div', { style: { textAlign: 'center', marginBottom: 10 } },
                    el(Icon, { name: 'triangle-exclamation', style: { fontSize: 40, color: '#d1453b' } })
                ),
                el('h3', { className: 'h2l-confirm-title', style: { textAlign: 'center' } }, 'Görevi sil?'),
                el('p', { className: 'h2l-confirm-desc', style: { textAlign: 'center' } }, 
                    el('strong', null, task.title.replace(/<[^>]*>/g, '')), 
                    ' görevi kalıcı olarak silinecek.'
                ),
                el('div', { className: 'h2l-confirm-footer', style: { justifyContent: 'center' } },
                    el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'),
                    el('button', { className: 'h2l-btn danger-filled', onClick: onConfirm }, 'Evet, Sil')
                )
            )
        );
    };

    // --- 2. TASK DETAIL MODAL (GÜNCELLENMİŞ - ContentEditable ile) ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections, labels = [], navigate }) => {
        const [comments, setComments] = useState([]);
        const [newComment, setNewComment] = useState('');
        const [loadingComments, setLoadingComments] = useState(true);
        const [desc, setDesc] = useState(task.content || '');
        const [title, setTitle] = useState(task.title || '');
        const [priority, setPriority] = useState(task.priority || 4);
        const [dueDate, setDueDate] = useState(task.due_date || '');
        const [status, setStatus] = useState(task.status || 'open');
        
        // Etiket Yönetimi için State
        const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false);
        const [labelSearch, setLabelSearch] = useState('');
        const labelMenuRef = useRef(null);

        useEffect(() => {
            apiFetch({ path: `/h2l/v1/comments?task_id=${task.id}` }).then(data => {
                setComments(data);
                setLoadingComments(false);
            });
        }, [task.id]);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (labelMenuRef.current && !labelMenuRef.current.contains(event.target)) {
                    setIsLabelMenuOpen(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [labelMenuRef]);

        const handleAddComment = () => {
            if(!newComment.trim()) return;
            const tempId = 'temp_' + Date.now();
            const optimistic = { id: tempId, content: newComment, user_id: window.h2lFrontendSettings.currentUser.ID, created_at: new Date().toISOString() };
            setComments([...comments, optimistic]);
            setNewComment('');
            apiFetch({ path: '/h2l/v1/comments', method: 'POST', data: { task_id: task.id, content: optimistic.content } }).then(realComment => {
                setComments(prev => prev.map(c => c.id === tempId ? realComment : c));
            });
        };

        const updateField = (field, value) => {
            onUpdate(task.id, { [field]: value });
            if(field === 'priority') setPriority(value);
            if(field === 'status') setStatus(value);
            if(field === 'due_date') setDueDate(value);
        };

        // GÜNCELLEME: ContentEditable onBlur handler'ları
        const handleTitleBlur = () => { if(title !== task.title) updateField('title', title); };
        const handleDescBlur = () => { if(desc !== task.content) updateField('content', desc); };

        const currentProject = projects.find(p => p.id == task.project_id) || {};
        const currentSection = sections.find(s => s.id == task.section_id);

        const smartDate = getSmartDateDisplay(dueDate, !!task.recurrence_rule);

        // Etiket Menüsü
        const renderLabelMenu = () => {
            const taskLabelNames = task.labels ? task.labels.map(l => l.name || l) : [];
            const filteredLabels = labels.filter(l => l.name.toLowerCase().includes(labelSearch.toLowerCase()));

            return el('div', { className: 'h2l-popover-menu', style: { width: 220, zIndex: 100 }, ref: labelMenuRef },
                el('div', { className: 'h2l-popover-header' }, 
                    el('input', { className: 'h2l-search-input', placeholder: 'Etiket ara...', value: labelSearch, onChange: e => setLabelSearch(e.target.value), autoFocus: true, onClick: e => e.stopPropagation() })
                ),
                el('div', { className: 'h2l-popover-list' },
                    filteredLabels.map(l => {
                        const isSelected = taskLabelNames.includes(l.name);
                        return el('div', { key: l.id, className: 'h2l-menu-item', onClick: (e) => { 
                            e.stopPropagation(); 
                            let newLabels;
                            if (isSelected) {
                                newLabels = taskLabelNames.filter(name => name !== l.name);
                            } else {
                                if (taskLabelNames.length >= 3) {
                                    alert('Maksimum 3 etiket!');
                                    return;
                                }
                                newLabels = [...taskLabelNames, l.name];
                            }
                            onUpdate(task.id, { labels: newLabels });
                        } },
                            el(Icon, { name: 'tag', style: { color: l.color || '#808080', marginRight: 8, fontSize: 12 } }),
                            l.name,
                            isSelected && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f', fontSize: 12 } })
                        );
                    }),
                    filteredLabels.length === 0 && labelSearch.trim() !== '' && el('div', { className: 'h2l-menu-item', onClick: (e) => { 
                        e.stopPropagation(); 
                        if (taskLabelNames.length >= 3) {
                            alert('Maksimum 3 etiket!');
                            return;
                        }
                        const newLabels = [...taskLabelNames, labelSearch];
                        onUpdate(task.id, { labels: newLabels });
                        setLabelSearch('');
                    } }, el(Icon, { name: 'plus', style: { marginRight: 8 } }), `"${labelSearch}" oluştur`)
                )
            );
        };

        return el('div', { className: 'h2l-detail-overlay', onClick: onClose },
            el('div', { className: 'h2l-task-modal', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-tm-header' },
                    el('div', { className: 'h2l-tm-project-info' },
                        el('span', { style: { color: currentProject.color || '#888' } }, '#'),
                        el('span', null, currentProject.title || 'Projesiz'),
                        currentSection && el('span', { className: 'h2l-tm-section-sep' }, '/'),
                        currentSection && el('span', null, currentSection.name)
                    ),
                    el('div', { className: 'h2l-tm-actions' }, el('button', { className: 'h2l-icon-btn', onClick: onClose }, el(Icon, { name: 'xmark' })))
                ),
                el('div', { className: 'h2l-tm-body' },
                    el('div', { className: 'h2l-tm-main' },
                        el('div', { className: 'h2l-tm-title-row' },
                            el('div', { className: `h2l-task-check large p${priority} ${status === 'completed' ? 'completed' : ''}`, onClick: () => updateField('status', status === 'completed' ? 'in_progress' : 'completed') }, el(Icon, { name: 'check' })),
                            // GÜNCELLEME: Başlık için ContentEditable kullanımı
                            el(ContentEditable, { 
                                html: title, 
                                onChange: setTitle, 
                                onBlur: handleTitleBlur,
                                className: 'title-mode h2l-tm-title-editor', 
                                placeholder: 'Görev adı' 
                            })
                        ),
                        el('div', { className: 'h2l-tm-desc-box' },
                            el(Icon, { name: 'align-left', className: 'h2l-tm-icon' }),
                            // GÜNCELLEME: Açıklama için ContentEditable kullanımı
                            el(ContentEditable, { 
                                html: desc, 
                                onChange: setDesc, 
                                onBlur: handleDescBlur,
                                className: 'desc-mode h2l-tm-desc-editor', 
                                placeholder: 'Açıklama ekle...' 
                            })
                        ),
                        el('div', { className: 'h2l-tm-comments' },
                            el('div', { className: 'h2l-tm-section-title' }, 'Yorumlar'),
                            loadingComments ? el('div', {className:'h2l-spinner'}, 'Yükleniyor...') : 
                            el('div', { className: 'h2l-comment-list' },
                                comments.map(c => el('div', { key: c.id, className: 'h2l-comment-item' },
                                    el(Avatar, { userId: c.user_id, users, size: 32 }),
                                    el('div', { className: 'h2l-comment-content-box' },
                                        el('div', { className: 'h2l-comment-header' }, el('span', { className: 'h2l-comment-author' }, users.find(u => u.id == c.user_id)?.name || 'Bilinmeyen'), el('span', { className: 'h2l-comment-date' }, c.created_at.split('T')[0])),
                                        el('div', { className: 'h2l-comment-text', dangerouslySetInnerHTML: { __html: c.content } })
                                    )
                                ))
                            ),
                            el('div', { className: 'h2l-comment-form' },
                                el(Avatar, { userId: window.h2lFrontendSettings.currentUser.ID, users, size: 32 }),
                                el('div', { className: 'h2l-comment-input-box' },
                                    el('textarea', { className: 'h2l-comment-textarea', placeholder: 'Yorum yaz...', value: newComment, onChange: e => setNewComment(e.target.value), onKeyDown: e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } } }),
                                    el('div', { className: 'h2l-comment-toolbar' },
                                        el('div', { className: 'h2l-comment-tools' }, el(Icon, {name:'paperclip'}), el(Icon, {name:'face-smile'})),
                                        el('button', { className: `h2l-btn primary small ${!newComment.trim() ? 'disabled' : ''}`, onClick: handleAddComment }, 'Yorumla')
                                    )
                                )
                            )
                        )
                    ),
                    el('div', { className: 'h2l-tm-sidebar' },
                        el('div', { className: 'h2l-tm-meta-group' }, el('label', null, 'Proje'), el('div', { className: 'h2l-tm-meta-val' }, el('span', {style:{color:currentProject.color}}, '#'), currentProject.title)),
                        el('div', { className: 'h2l-tm-meta-group' }, el('label', null, 'Son Tarih'), 
                            el('div', { className: 'h2l-tm-meta-val clickable' }, 
                                el(Icon, { name: smartDate ? smartDate.icon : 'calendar', style: {color: smartDate ? smartDate.color : '#ccc'} }), 
                                smartDate ? smartDate.text : 'Tarih yok',
                                task.recurrence_rule && el(Icon, { name: 'arrows-rotate', style: { fontSize: 11, marginLeft: 5, color: '#888' }, title: 'Tekrarlı' })
                            )
                        ),
                        el('div', { className: 'h2l-tm-meta-group' }, el('label', null, 'Öncelik'), el('div', { className: 'h2l-tm-meta-val clickable', onClick: () => { const nextP = priority === 1 ? 4 : priority - 1; updateField('priority', nextP); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(priority) } }), `P${priority}`)),
                        el('div', { className: 'h2l-tm-meta-group' }, el('label', null, 'Atanan'), el('div', { className: 'h2l-tm-meta-val' }, task.assignees && task.assignees.length > 0 ? [el(Avatar, { userId: task.assignees[0], users, size: 20 }), users.find(u=>u.id==task.assignees[0])?.name] : 'Kimse atanmamış')),
                        
                        el('div', { className: 'h2l-tm-meta-group', style: { position: 'relative' } }, 
                            el('label', null, 'Etiketler'), 
                            el('div', { 
                                className: 'h2l-tm-meta-val clickable', 
                                style: { flexWrap: 'wrap', height: 'auto', gap: '4px' },
                                onClick: (e) => { e.stopPropagation(); setIsLabelMenuOpen(!isLabelMenuOpen); }
                            }, 
                                (task.labels && task.labels.length > 0) 
                                ? task.labels.map(lbl => {
                                    const isString = typeof lbl === 'string';
                                    const labelName = isString ? lbl : lbl.name;
                                    const foundLabel = labels.find(l => l.name === labelName);
                                    const labelSlug = foundLabel ? foundLabel.slug : (isString ? labelName.toLowerCase() : lbl.slug);

                                    return el('span', { 
                                        key: labelName, 
                                        className: 'h2l-label-pill', 
                                        style: { cursor: 'pointer' },
                                        onClick: (e) => {
                                            e.stopPropagation();
                                            if (navigate) {
                                                navigate('/etiket/' + labelSlug);
                                            }
                                        }
                                    }, el(Icon, {name:'hashtag', style:{fontSize:10, marginRight:2}}), labelName);
                                }) 
                                : el('span', { style: { color: '#999', fontSize: 12 } }, 'Etiket ekle...')
                            ),
                            isLabelMenuOpen && renderLabelMenu()
                        ),

                        el('div', { className: 'h2l-tm-separator' }),
                        el('button', { className: 'h2l-btn-text-icon danger full-width', onClick: () => { if(confirm('Bu görevi silmek istediğinize emin misiniz?')) { onClose(); onUpdate(task.id, {status:'trash'}); } } }, el(Icon, {name:'trash'}), ' Görevi Sil')
                    )
                )
            )
        );
    };

    // --- 3. TASK ROW (DRAGGABLE) ---
    const TaskRow = ({ task, users, projects = [], sections = [], onUpdateTask, onDeleteTask, onTaskClick, highlightToday, onMoveTask, onAddTask, labels, navigate }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [isStatusHovered, setIsStatusHovered] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
        const [showDeleteModal, setShowDeleteModal] = useState(false);
        const [assigneeSearch, setAssigneeSearch] = useState('');
        const [dragOverState, setDragOverState] = useState(null); // 'top' | 'bottom' | null

        const hoverTimeoutRef = useRef(null);
        const menuRef = useRef(null);
        const assigneeRef = useRef(null);
        
        // Drag Event Handlers (TASK)
        const handleDragStart = (e) => {
            currentDraggedId = task.id;
            currentDraggedType = 'task'; // SÜRÜKLENEN TÜRÜ BELİRLE
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.classList.add('h2l-is-dragging'), 0);
        };

        const handleDragEnd = (e) => {
            currentDraggedId = null;
            currentDraggedType = null;
            e.target.classList.remove('h2l-is-dragging');
            setDragOverState(null);
        };

        const handleDragOver = (e) => {
            e.preventDefault(); 
            if (currentDraggedId === task.id || currentDraggedType !== 'task') return; // Sadece task ise izin ver

            const rect = e.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            setDragOverState(e.clientY < midY ? 'top' : 'bottom');
        };

        const handleDragLeave = () => {
            setDragOverState(null);
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setDragOverState(null);
            if (currentDraggedId && currentDraggedId !== task.id && onMoveTask && currentDraggedType === 'task') {
                const position = dragOverState === 'top' ? 'before' : 'after';
                onMoveTask(currentDraggedId, task.id, position);
            }
        };

        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { 
            assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); 
        }
        
        const smartDate = getSmartDateDisplay(task.due_date, !!task.recurrence_rule);
        const highlightClass = (highlightToday && smartDate && smartDate.text.includes('Bugün')) ? 'h2l-highlight-today' : '';
        const plainDesc = task.content ? task.content.replace(/<[^>]*>/g, ' ').trim() : '';

        const handleMouseEnter = () => { if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; } setIsStatusHovered(true); };
        const handleMouseLeave = () => { hoverTimeoutRef.current = setTimeout(() => { setIsStatusHovered(false); }, 250); };

        useEffect(() => {
            const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); if (assigneeRef.current && !assigneeRef.current.contains(event.target)) setIsAssigneeMenuOpen(false); };
            document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [menuRef, assigneeRef]);

        const handleAssigneeToggle = (userId) => {
            const currentIds = task.assignees ? task.assignees.map(Number) : [];
            let newIds = [];
            if (currentIds.includes(userId)) { newIds = currentIds.filter(id => id !== userId); } else { newIds = [userId]; }
            onUpdateTask(task.id, { assignees: newIds });
        };

        if (isEditing) {
            const editData = { ...task, dueDate: task.due_date ? task.due_date.split(' ')[0] : '' };
            // TaskEditor'e 'labels' verisini geçirin
            return el('div', { style: { marginLeft: 28, marginBottom: 10 } }, el(TaskEditor, { mode: 'edit', initialData: editData, users, projects, sections, onSave: (updatedData) => { onUpdateTask(task.id, updatedData); setIsEditing(false); }, onCancel: () => setIsEditing(false), labels })); 
        }
        
        const renderStatusMenu = () => {
            if (!TASK_STATUSES) return null;
            return el('div', { className: 'h2l-status-hover-menu', onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }, Object.entries(TASK_STATUSES).map(([key, val]) => {
                const isActive = task.status === key;
                return el('div', { key: key, className: `h2l-status-menu-item ${isActive ? 'active' : ''}`, onClick: (e) => { e.stopPropagation(); onUpdateTask(task.id, { status: key }); setIsStatusHovered(false); } }, el(Icon, { name: val.icon, style: { color: val.color, width: 16, marginRight: 8 } }), val.label);
            }));
        };

        const renderAssigneeMenu = () => {
            const sortedUsers = [...users].sort((a, b) => {
                const isA = task.assignees && task.assignees.map(Number).includes(Number(a.id));
                const isB = task.assignees && task.assignees.map(Number).includes(Number(b.id));
                if (isA && !isB) return -1; if (!isA && isB) return 1; return a.name.localeCompare(b.name);
            });
            const filteredUsers = sortedUsers.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()));
            return el('div', { className: 'h2l-popover-menu assignee-menu', style: { width: 260 }, onClick: e => e.stopPropagation() },
                el('div', { style: { padding: '8px 12px 4px' } }, el('input', { type: 'text', placeholder: 'Kişi ara...', value: assigneeSearch, autoFocus: true, onChange: e => setAssigneeSearch(e.target.value), onClick: e => e.stopPropagation(), className: 'h2l-input' })),
                el('div', { style: { maxHeight: '200px', overflowY: 'auto' } },
                    el('div', { className: 'h2l-menu-item', onClick: () => onUpdateTask(task.id, { assignees: [] }) }, el(Icon, { name: 'user-xmark', style: { marginRight: 8, color: '#888' } }), 'Atanmamış', (!task.assignees || task.assignees.length === 0) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })),
                    filteredUsers.map(u => { const isSelected = task.assignees && task.assignees.map(Number).includes(Number(u.id)); return el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => handleAssigneeToggle(u.id) }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, isSelected && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })); }),
                    filteredUsers.length === 0 && el('div', { style: { padding: '10px', fontSize: '12px', color: '#999', textAlign: 'center' } }, 'Kullanıcı bulunamadı')
                )
            );
        };

        const renderMoreMenu = () => {
            return el('div', { className: 'h2l-popover-menu top-right', style: { width: 250, paddingBottom: 8 }, onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-menu-item', onClick: () => { setIsMenuOpen(false); }, title: 'Bu göreve bir alt görev ekle' }, el(Icon, { name: 'arrow-turn-down-right', style:{marginRight:10, color:'#666', fontSize:14} }), 'Alt görev ekle'),
                el('div', { className: 'h2l-menu-separator' }),
                el('span', { className: 'h2l-menu-label' }, 'Tarih'),
                el('div', { className: 'h2l-menu-row' },
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Bugün', onClick: () => { setIsMenuOpen(false); } }, el(Icon, {name:'calendar-day', style:{color:'#058527'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Yarın', onClick: () => { setIsMenuOpen(false); } }, el(Icon, {name:'sun', style:{color:'#ad6200'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Hafta Sonu', onClick: () => { setIsMenuOpen(false); } }, el(Icon, {name:'couch', style:{color:'#246fe0'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Gelecek Hafta', onClick: () => { setIsMenuOpen(false); } }, el(Icon, {name:'calendar-week', style:{color:'#692fc2'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Tarih Yok', onClick: () => { setIsMenuOpen(false); } }, el(Icon, {name:'ban', style:{color:'#808080'}}))
                ),
                el('span', { className: 'h2l-menu-label' }, 'Öncelik'),
                el('div', { className: 'h2l-menu-row' },
                    el('div', { className: 'h2l-menu-icon-btn p1', title: 'Öncelik 1', onClick: () => { onUpdateTask(task.id, {priority:1}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'})),
                    el('div', { className: 'h2l-menu-icon-btn p2', title: 'Öncelik 2', onClick: () => { onUpdateTask(task.id, {priority:2}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'})),
                    el('div', { className: 'h2l-menu-icon-btn p3', title: 'Öncelik 3', onClick: () => { onUpdateTask(task.id, {priority:3}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'})),
                    el('div', { className: 'h2l-menu-icon-btn p4', title: 'Öncelik 4', onClick: () => { onUpdateTask(task.id, {priority:4}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'}))
                ),
                el('div', { className: 'h2l-menu-separator' }),
                el('div', { className: 'h2l-menu-item', title: 'Hatırlatıcı ekle' }, el(Icon, { name: 'bell', style:{marginRight:10, color:'#666', fontSize:14} }), 'Hatırlatıcı'),
                el('div', { className: 'h2l-menu-item', title: 'Etiketleri yönet' }, el(Icon, { name: 'tag', style:{marginRight:10, color:'#666', fontSize:14} }), 'Etiketler'),
                el('div', { className: 'h2l-menu-item', title: 'Konum ekle' }, el(Icon, { name: 'location-dot', style:{marginRight:10, color:'#666', fontSize:14} }), 'Konum'),
                el('div', { className: 'h2l-menu-separator' }),
                el('div', { className: 'h2l-menu-item', title: 'Başka projeye taşı' }, el(Icon, { name: 'arrow-right-to-bracket', style:{marginRight:10, color:'#666', fontSize:14} }), 'Taşı'),
                el('div', { className: 'h2l-menu-item', title: 'Görevin kopyasını oluştur' }, el(Icon, { name: 'copy', style:{marginRight:10, color:'#666', fontSize:14} }), 'Kopya oluştur'),
                el('div', { className: 'h2l-menu-item', title: 'Bağlantıyı panoya kopyala' }, el(Icon, { name: 'link', style:{marginRight:10, color:'#666', fontSize:14} }), 'Görev bağlantısını kopyala')
            );
        };

        const isDoneLike = ['completed', 'cancelled'].includes(task.status);
        const checkClass = task.status === 'cancelled' ? 'cancelled' : (task.status === 'completed' ? 'completed' : '');
        const checkIcon = task.status === 'cancelled' ? 'ban' : 'check';
        
        let rowClassName = `h2l-task-row ${highlightClass} ${isMenuOpen || isAssigneeMenuOpen ? 'menu-open' : ''}`;
        if (dragOverState === 'top') rowClassName += ' h2l-drag-over-top';
        if (dragOverState === 'bottom') rowClassName += ' h2l-drag-over-bottom';

        return el('div', { 
            className: rowClassName, 
            // GÜNCELLEME: Navigasyon fonksiyonunu çağır
            onClick: () => onTaskClick ? onTaskClick(task) : null,
            draggable: true,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop
        },
            showDeleteModal && el(DeleteTaskModal, { task, onClose: () => setShowDeleteModal(false), onConfirm: () => { onDeleteTask(task.id); setShowDeleteModal(false); } }),
            
            el('div', { className: 'h2l-task-left', onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave },
                el('div', { className: 'h2l-status-wrapper' },
                    el('div', { className: `h2l-task-check p${task.priority} ${checkClass}`, onClick: (e) => { e.stopPropagation(); setIsStatusHovered(false); const newStatus = (task.status === 'completed' || task.status === 'cancelled') ? 'in_progress' : 'completed'; onUpdateTask(task.id, { status: newStatus }); } }, el(Icon, { name: checkIcon })),
                    isStatusHovered && renderStatusMenu()
                )
            ),
            el('div', { className: 'h2l-task-content' },
                el('span', { className: `h2l-task-title ${isDoneLike ? 'completed' : ''} ${task.status === 'cancelled' ? 'cancelled' : ''}`, dangerouslySetInnerHTML: { __html: task.title } }),
                plainDesc && el('div', { className: 'h2l-task-desc' }, plainDesc),
                el('div', { className: 'h2l-task-details' },
                    smartDate && el('span', { className: 'h2l-detail-item date', style: { color: smartDate.color } }, el(Icon, {name: smartDate.icon, style:{color: smartDate.color}}), smartDate.text, smartDate.isRecurring && el(Icon, { name: 'arrows-rotate', style: { fontSize: 10, marginLeft: 4, color: smartDate.color }, title: 'Tekrarlı' })),
                    (task.reminder_enabled == 1) && el('span', { className: 'h2l-detail-item', title: 'Hatırlatıcı açık' }, el(Icon, {name:'bell', style:{color:'#888', fontSize:12}})),
                    (parseInt(task.comment_count || 0) > 0) && el('span', { className: 'h2l-detail-item comments', style: { cursor: 'pointer', color: '#888' }, onClick: (e) => { e.stopPropagation(); onTaskClick(task); } }, el(Icon, {name:'comment', style:{fontSize:11}}), ' ', task.comment_count),
                    (task.labels && task.labels.length > 0) && task.labels.map(lbl => {
                        const isString = typeof lbl === 'string';
                        const labelName = isString ? lbl : lbl.name;
                        // Mevcut 'labels' listesinden slug'ı bulmaya çalış
                        const foundLabel = labels ? labels.find(l => l.name === labelName) : null;
                        const labelSlug = foundLabel ? foundLabel.slug : (isString ? labelName.toLowerCase() : lbl.slug);

                        return el('span', { 
                            key: lbl.id || labelName, 
                            className: 'h2l-detail-item', 
                            style: { color: '#246fe0', fontSize: 11, cursor: 'pointer' },
                            onClick: (e) => {
                                e.stopPropagation();
                                if (navigate) {
                                    navigate('/etiket/' + labelSlug);
                                }
                            }
                        }, el(Icon, {name:'hashtag', style:{fontSize:10, marginRight:1}}), labelName);
                    }),
                    (task.status !== 'open' && task.status !== 'in_progress' && TASK_STATUSES[task.status]) && el('span', { className: 'h2l-detail-item status-badge', style: { color: TASK_STATUSES[task.status].color, fontSize: '11px', fontWeight: 600 } }, task.status === 'completed' ? null : [el(Icon, {name: TASK_STATUSES[task.status].icon}), ' ', TASK_STATUSES[task.status].label])
                )
            ),
            
            el('div', { className: `h2l-task-right ${isMenuOpen || isAssigneeMenuOpen ? 'active' : ''}` },
                el('button', { className: 'h2l-action-icon', title: 'Düzenle', onClick: (e) => { e.stopPropagation(); setIsEditing(true); } }, el(Icon, { name: 'pen' })),
                el('button', { className: 'h2l-action-icon', title: 'Yorum yap', onClick: (e) => { e.stopPropagation(); onTaskClick(task); } }, el(Icon, { name: 'comment' }), (task.comment_count > 0) && el('span', { className: 'h2l-comment-count' }, task.comment_count)),
                el('div', { className: 'h2l-action-menu-wrapper', ref: assigneeRef },
                    el('button', { className: 'h2l-action-icon user', title: 'Atanan', onClick: (e) => { e.stopPropagation(); setIsAssigneeMenuOpen(!isAssigneeMenuOpen); setIsMenuOpen(false); } }, assignee ? el(Avatar, { userId: assignee.id, users, size: 24 }) : el(Icon, { name: 'user' })),
                    isAssigneeMenuOpen && renderAssigneeMenu()
                ),
                el('button', { className: 'h2l-action-icon delete', title: 'Sil', onClick: (e) => { e.stopPropagation(); setShowDeleteModal(true); } }, el(Icon, { name: 'trash' })),
                el('div', { className: 'h2l-action-menu-wrapper', ref: menuRef },
                    el('button', { className: 'h2l-action-icon', title: 'Diğer', onClick: (e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); setIsAssigneeMenuOpen(false); } }, el(Icon, { name: 'ellipsis' })),
                    isMenuOpen && renderMoreMenu()
                )
            )
        );
    };

    // --- 3. QUICK ADD CONTAINER (GÜNCELLENMİŞ) ---
    const QuickAddContainer = ({ sectionId, projectId, users, projects, sections, onAdd, labels }) => {
        const [isOpen, setIsOpen] = useState(false);
        if (!isOpen) return el('div', { style: { marginLeft: 28 } }, el(QuickAddTrigger, { onOpen: () => setIsOpen(true) }));
        
        // YENİ: Editöre başlangıç verisi olarak mevcut proje ve bölümü gönderiyoruz
        const initData = { project_id: projectId, section_id: sectionId };

        return el('div', { style: { marginLeft: 28 } },
            // TaskEditor'e 'labels' verisini geçirin
            el(TaskEditor, {
                mode: 'add', users, projects, sections, activeProjectId: projectId,
                initialData: initData, // <-- EKLENDİ
                onSave: (data) => { 
                    // DÜZELTME: Burada ...data, projectId sıralaması yerine sadece data gönderiyoruz.
                    // Böylece editörde seçilen proje (data.projectId) geçerli olur.
                    onAdd(data); 
                },
                onCancel: () => setIsOpen(false),
                labels
            })
        );
    };

    // --- 4. SECTION GROUP (DRAGGABLE) ---
    const SectionGroup = ({ section, tasks, users, projects, sections, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection, onMoveTask, onMoveSection, labels, navigate }) => {
        const [isOpen, setIsOpen] = useState(true);
        const [isEditing, setIsEditing] = useState(false);
        const [secName, setSecName] = useState(section.name);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showDeleteModal, setShowDeleteModal] = useState(false); 
        const [dragOver, setDragOver] = useState(false);
        const [sectionDragOverState, setSectionDragOverState] = useState(null); // For section reordering
        const menuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [menuRef]);

        const handleSaveName = () => { if (secName.trim() && secName !== section.name) { onUpdateSection(section.id, { name: secName, projectId: section.project_id }); } else { setSecName(section.name); } setIsEditing(false); };

        // SECTION DRAG EVENTS
        const handleSectionDragStart = (e) => {
            // Eğer editör açıksa sürüklemeyi engelle
            if (isEditing) {
                e.preventDefault();
                return;
            }
            // Sadece section-header'dan sürüklendiğinde
            currentDraggedId = section.id;
            currentDraggedType = 'section';
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => e.target.closest('.h2l-section-container').classList.add('h2l-section-is-dragging'), 0);
        };

        const handleSectionDragEnd = (e) => {
            currentDraggedId = null;
            currentDraggedType = null;
            e.target.closest('.h2l-section-container').classList.remove('h2l-section-is-dragging');
            setSectionDragOverState(null);
        };

        const handleContainerDragOver = (e) => {
            e.preventDefault();
            
            if (currentDraggedType === 'section') {
                // Section Reordering Logic
                if (currentDraggedId === section.id) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                setSectionDragOverState(e.clientY < midY ? 'top' : 'bottom');
                e.stopPropagation();
            } else if (currentDraggedType === 'task') {
                // Task Dropping Logic (Empty Section)
                if (tasks.length === 0 && !dragOver) setDragOver(true);
            }
        };

        const handleContainerDrop = (e) => {
            e.preventDefault();
            setDragOver(false);
            
            if (currentDraggedType === 'section' && currentDraggedId !== section.id && onMoveSection) {
                e.stopPropagation();
                setSectionDragOverState(null);
                const position = sectionDragOverState === 'top' ? 'before' : 'after';
                onMoveSection(currentDraggedId, section.id, position);
            } else if (currentDraggedType === 'task' && tasks.length === 0 && currentDraggedId && onMoveTask) {
                // Boş bölüme görev bırakma
                onMoveTask(currentDraggedId, null, null, section.id);
            }
        };

        const handleContainerDragLeave = () => {
            setDragOver(false);
            setSectionDragOverState(null);
        };

        if (isEditing) {
            return el('div', { className: 'h2l-section-edit-mode' },
                el('input', { className: 'h2l-section-edit-input', value: secName, autoFocus: true, onChange: e => setSecName(e.target.value), onKeyDown: e => { if(e.key==='Enter') handleSaveName(); if(e.key==='Escape') { setSecName(section.name); setIsEditing(false); } } }),
                el('div', { className: 'h2l-section-edit-actions' }, el('button', { className: 'h2l-btn primary', onClick: handleSaveName }, 'Kaydet'), el('button', { className: 'h2l-btn text-cancel', onClick: () => { setSecName(section.name); setIsEditing(false); } }, 'İptal'))
            );
        }

        let containerClass = `h2l-section-container ${dragOver ? 'h2l-drag-over' : ''}`;
        if (sectionDragOverState === 'top') containerClass += ' h2l-section-drag-over-top';
        if (sectionDragOverState === 'bottom') containerClass += ' h2l-section-drag-over-bottom';

        return el('div', { 
            className: containerClass,
            onDragOver: handleContainerDragOver,
            onDragLeave: handleContainerDragLeave,
            onDrop: handleContainerDrop
        },
            // HEADER (Draggable Handle)
            el('div', { 
                className: 'h2l-section-header-row',
                draggable: true,
                onDragStart: handleSectionDragStart,
                onDragEnd: handleSectionDragEnd
            },
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
            isOpen && tasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, highlightToday, onMoveTask, onAddTask, labels, navigate })), // <-- NAVIGATE BURADA İLETİLİYOR
            isOpen && el(QuickAddContainer, { sectionId: section.id, projectId: section.project_id, users, projects, sections, onAdd: onAddTask, labels })
        );
    };

    // --- SECTION ADD ---
    const SectionAdd = ({ onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(name.trim()) { onAdd({ name }); setName(''); setIsEditing(false); } };
        if (!isEditing) { return el('div', { className: 'h2l-section-separator', onClick: () => setIsEditing(true) }, el('span', { className: 'h2l-separator-line' }), el('span', { className: 'h2l-separator-text' }, 'Bölüm ekle'), el('span', { className: 'h2l-separator-line' })); }
        return el('div', { className: 'h2l-section-add-form' }, el('form', { onSubmit: handleSubmit }, el('input', { className: 'h2l-section-input', autoFocus: true, placeholder: 'Bölüm adı', value: name, onChange: e => setName(e.target.value), onBlur: () => !name.trim() && setIsEditing(false) }), el('div', { className: 'h2l-form-actions' }, el('button', { type:'submit', className: 'h2l-btn primary', disabled:!name.trim() }, 'Bölüm ekle'), el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'))));
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

    // --- 5. LIST VIEW ---
    const ListView = ({ project, tasks, sections, users, projects = [], onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick, showCompleted, highlightToday, onUpdateSection, onDeleteSection, labels, navigate }) => {
        const [localTasks, setLocalTasks] = useState(tasks);
        const [localSections, setLocalSections] = useState(sections);

        useEffect(() => {
            // Sort tasks by sort_order initially
            const sorted = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            setLocalTasks(sorted);
        }, [tasks]);

        useEffect(() => {
            const sortedSecs = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            setLocalSections(sortedSecs);
        }, [sections]);

        const isVirtualView = project.id === 0;
        
        let visibleTasks = [...localTasks]; 

        // 1. Parent Task Filtresi: Sadece ana görevleri göster (parent_task_id = 0 veya null)
        visibleTasks = visibleTasks.filter(t => !t.parent_task_id || t.parent_task_id == 0);

        if (!showCompleted) { 
            visibleTasks = visibleTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled'); 
        }

        // Sorting Logic for Render
        visibleTasks.sort((a, b) => {
            const isADone = a.status === 'completed' || a.status === 'cancelled';
            const isBDone = b.status === 'completed' || b.status === 'cancelled';
            if (isADone && !isBDone) return 1;
            if (!isADone && isBDone) return -1;
            // Sort by sort_order
            return (a.sort_order || 0) - (b.sort_order || 0); 
        });

        // Bölümsüz Görevler (Section ID = 0)
        const rootTasks = visibleTasks.filter(t => !t.section_id || t.section_id == 0);

        const handleMoveTask = (draggedId, targetId, position, targetSectionId = null) => {
            const draggedTaskIndex = localTasks.findIndex(t => t.id === draggedId);
            if (draggedTaskIndex === -1) return;

            const newTasks = [...localTasks];
            const [draggedTask] = newTasks.splice(draggedTaskIndex, 1);

            // Update Section ID if moved to empty section
            if (targetSectionId !== null) {
                draggedTask.section_id = targetSectionId;
                // Add to end of section
                newTasks.push(draggedTask);
            } else if (targetId) {
                // Find target index in the current visual list (not raw list)
                const targetIndex = newTasks.findIndex(t => t.id === targetId);
                if (targetIndex !== -1) {
                    // Also update section_id to match target
                    draggedTask.section_id = newTasks[targetIndex].section_id;
                    
                    if (position === 'before') {
                        newTasks.splice(targetIndex, 0, draggedTask);
                    } else {
                        newTasks.splice(targetIndex + 1, 0, draggedTask);
                    }
                }
            }

            // Re-calculate sort_order for all tasks in the affected section(s)
            newTasks.forEach((t, index) => {
                t.sort_order = index;
            });

            // Optimistic Update
            setLocalTasks(newTasks);

            // Call API to save order
            const itemsToUpdate = newTasks.map(t => ({
                id: t.id,
                order: t.sort_order,
                section_id: t.section_id
            }));

            apiFetch({
                path: '/h2l/v1/reorder',
                method: 'POST',
                data: { type: 'task', items: itemsToUpdate }
            }).catch(err => {
                console.error("Reorder failed:", err);
                setLocalTasks(tasks); 
            });
        };

        const handleMoveSection = (draggedId, targetId, position) => {
            const draggedIndex = localSections.findIndex(s => s.id === draggedId);
            const targetIndex = localSections.findIndex(s => s.id === targetId);
            if (draggedIndex === -1 || targetIndex === -1) return;

            const newSections = [...localSections];
            const [draggedSection] = newSections.splice(draggedIndex, 1);
            
            // Insert at new position
            // Since we spliced, indices might shift. But targetIndex refers to old array.
            // Simple way: if moving down, we need to adjust target index.
            // Let's re-find target index in modified array? No, splice messes it up.
            // Better approach: swap or insert logic.
            
            // Re-calculate insertion index based on current state
            let insertIndex = newSections.findIndex(s => s.id === targetId);
            if (position === 'after') insertIndex++;
            
            newSections.splice(insertIndex, 0, draggedSection);

            // Re-index sort_order
            newSections.forEach((s, index) => {
                s.sort_order = index;
            });

            setLocalSections(newSections);

            // API Call
            const itemsToUpdate = newSections.map(s => ({
                id: s.id,
                order: s.sort_order
            }));

            apiFetch({
                path: '/h2l/v1/reorder',
                method: 'POST',
                data: { type: 'section', items: itemsToUpdate }
            }).catch(err => console.error(err));
        };

        return el('div', { className: 'h2l-list-view' },
            el('div', { className: 'h2l-project-content-header' },
                el('h1', null, !isVirtualView && el('span', { className:'h2l-hash', style: { color: project.color } }, '#'), project.title),
                el('span', { className: 'h2l-project-badge', style: { backgroundColor: project.color, color: '#fff' } }, tasks.length)
            ),
            el('div', { className: 'h2l-section-container' }, 
                rootTasks.map(t => el(TaskRow, { 
                    key: t.id, task: t, users, projects, sections, 
                    onUpdateTask, onDeleteTask, onTaskClick, highlightToday, 
                    onMoveTask: handleMoveTask, onAddTask,
                    labels, navigate // <-- NAVIGATE BURADA İLETİLİYOR
                })), 
                el(QuickAddContainer, { sectionId: 0, projectId: project.id, users, projects: projects.length ? projects : [project], sections, onAdd: onAddTask, labels }) // <-- EKLENDİ
            ),
            !isVirtualView && localSections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id) === parseInt(s.id));
                return el(SectionGroup, { 
                    key: s.id, section: s, tasks: sTasks, users, projects, sections, 
                    onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, 
                    onUpdateSection, onDeleteSection, 
                    onMoveTask: handleMoveTask,
                    onMoveSection: handleMoveSection,
                    labels, navigate // <-- NAVIGATE BURADA İLETİLİYOR
                });
            }),
            !isVirtualView && el(SectionAdd, { onAdd: onAddSection })
        );
    };

    window.H2L.Tasks = {
        TaskDetailModal,
        ListView,
        BoardView: () => el('div', { className: 'h2l-board-placeholder' }, el(Icon, {name: 'table-columns', style: {fontSize: 40, color: '#ddd'}}), el('p', null, 'Pano görünümü yapım aşamasında...')),
        SectionGroup,
        TaskRow
    };

})(window.wp);