(function(wp) {
    const { createElement: el, useState, useEffect, useRef, Fragment } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null, TASK_STATUSES: {} };
    const { Icon, Avatar, TASK_STATUSES, MultiSelect } = Common;
    
    const TaskInput = window.H2L && window.H2L.TaskInput ? window.H2L.TaskInput : { TaskEditor: () => null, QuickAddTrigger: () => null, ContentEditable: () => null };
    const { TaskEditor, QuickAddTrigger } = TaskInput;

    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { getPriorityColor: () => '#808080' };
    const { getPriorityColor } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.Tasks = window.H2L.Tasks || {};

    let currentDraggedId = null;
    let currentDraggedType = null; 

    // --- HELPERS ---
    const getSmartDateDisplay = (dateStr, isRecurring = false) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(date); target.setHours(0,0,0,0); 
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const hasTime = dateStr.includes(' ') && !dateStr.endsWith('00:00:00');
        const timeStr = hasTime ? dateStr.split(' ')[1].substring(0, 5) : '';
        let text = ''; let color = '#e67e22'; let icon = 'calendar';
        if (diffDays === 0) { text = 'Bugün'; color = '#058527'; icon = 'calendar-day'; } 
        else if (diffDays === 1) { text = 'Yarın'; color = '#e67e22'; icon = 'sun'; } 
        else if (diffDays === -1) { text = 'Dün'; color = '#d1453b'; } 
        else if (diffDays < -1) { text = target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); color = '#d1453b'; } 
        else if (diffDays > 1 && diffDays < 7) { text = dayNames[target.getDay()]; color = '#692fc2'; icon = 'calendar-week'; } 
        else { text = target.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); if (target.getFullYear() !== today.getFullYear()) { text += ` ${target.getFullYear()}`; } color = '#e67e22'; }
        return { text: timeStr ? `${text} ${timeStr}` : text, color, icon, isRecurring };
    };

    const getDateString = (offsetDays) => {
        const d = new Date(); d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
    };

    const formatDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getDayName = (date) => {
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return days[date.getDay()];
    };

    const getMonthName = (date) => {
        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        return months[date.getMonth()];
    };

    // --- TOAST NOTIFICATION ---
    const Toast = ({ message, onClose }) => {
        useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
        return el('div', { 
            style: { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '10px 20px', borderRadius: 5, zIndex: 99999, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } 
        }, message);
    };

    const DeleteTaskModal = ({ task, onClose, onConfirm }) => {
        return el('div', { className: 'h2l-detail-overlay', style: { zIndex: 20050 }, onClick: onClose },
            el('div', { className: 'h2l-confirm-modal', onClick: e => e.stopPropagation() },
                el('div', { style: { textAlign: 'center', marginBottom: 10 } }, el(Icon, { name: 'triangle-exclamation', style: { fontSize: 40, color: '#d1453b' } })),
                el('h3', { className: 'h2l-confirm-title', style: { textAlign: 'center' } }, 'Görevi sil?'),
                el('p', { className: 'h2l-confirm-desc', style: { textAlign: 'center' } }, el('strong', null, task.title.replace(/<[^>]*>/g, '')), ' görevi kalıcı olarak silinecek.'),
                el('div', { className: 'h2l-confirm-footer', style: { justifyContent: 'center' } }, el('button', { className: 'h2l-btn', onClick: onClose }, 'İptal'), el('button', { className: 'h2l-btn danger-filled', onClick: onConfirm }, 'Evet, Sil'))
            )
        );
    };

    const TaskRow = ({ task, users, projects = [], sections = [], onUpdateTask, onDeleteTask, onTaskClick, highlightToday, onMoveTask, onAddTask, labels, navigate }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editorOpenMenu, setEditorOpenMenu] = useState(null); 
        const [isStatusHovered, setIsStatusHovered] = useState(false);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
        const [showDeleteModal, setShowDeleteModal] = useState(false);
        const [assigneeSearch, setAssigneeSearch] = useState('');
        const [dragOverState, setDragOverState] = useState(null);
        const [toastMsg, setToastMsg] = useState(null);

        const hoverTimeoutRef = useRef(null);
        const menuRef = useRef(null);
        const assigneeRef = useRef(null);
        
        const handleDragStart = (e) => { currentDraggedId = task.id; currentDraggedType = 'task'; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.classList.add('h2l-is-dragging'), 0); };
        const handleDragEnd = (e) => { currentDraggedId = null; currentDraggedType = null; e.target.classList.remove('h2l-is-dragging'); setDragOverState(null); };
        const handleDragOver = (e) => { e.preventDefault(); if (currentDraggedId === task.id || currentDraggedType !== 'task') return; const rect = e.currentTarget.getBoundingClientRect(); const midY = rect.top + rect.height / 2; setDragOverState(e.clientY < midY ? 'top' : 'bottom'); };
        const handleDragLeave = () => { setDragOverState(null); };
        const handleDrop = (e) => { e.preventDefault(); setDragOverState(null); if (currentDraggedId && currentDraggedId !== task.id && onMoveTask && currentDraggedType === 'task') { const position = dragOverState === 'top' ? 'before' : 'after'; onMoveTask(currentDraggedId, task.id, position); } };

        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); }
        
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

        const handleDuplicate = () => {
            const copy = { ...task };
            delete copy.id; delete copy.created_at; delete copy.updated_at; delete copy.comment_count;
            onAddTask(copy);
            setIsMenuOpen(false);
        };

        const handleCopyLink = () => {
            const url = `${window.location.origin}/gorevler/gorev/${task.id}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => setToastMsg('Bağlantı kopyalandı!'));
            } else {
                const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
                setToastMsg('Bağlantı kopyalandı!');
            }
            setIsMenuOpen(false);
        };

        if (isEditing) {
            const editData = { ...task, dueDate: task.due_date ? task.due_date.split(' ')[0] : '' };
            return el('div', { style: { marginLeft: 28, marginBottom: 10 } }, 
                el(TaskEditor, { 
                    mode: 'edit', initialData: editData, users, projects, sections, 
                    initialOpenMenu: editorOpenMenu, 
                    onSave: (updatedData) => { onUpdateTask(task.id, updatedData); setIsEditing(false); setEditorOpenMenu(null); }, 
                    onCancel: () => { setIsEditing(false); setEditorOpenMenu(null); }, 
                    labels 
                })
            ); 
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
            return el('div', { className: 'h2l-popover-menu top-aligned', style: { width: 250, paddingBottom: 8 }, onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-menu-item', onClick: () => { setIsMenuOpen(false); onTaskClick(task); }, title: 'Bu göreve bir alt görev ekle' }, el(Icon, { name: 'arrow-turn-down-right', style:{marginRight:10, color:'#666', fontSize:14} }), 'Alt görev ekle'),
                el('div', { className: 'h2l-menu-separator' }),
                el('span', { className: 'h2l-menu-label' }, 'Tarih'),
                el('div', { className: 'h2l-menu-row' },
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Bugün', onClick: () => { onUpdateTask(task.id, {dueDate: getDateString(0)}); setIsMenuOpen(false); } }, el(Icon, {name:'calendar-day', style:{color:'#058527'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Yarın', onClick: () => { onUpdateTask(task.id, {dueDate: getDateString(1)}); setIsMenuOpen(false); } }, el(Icon, {name:'sun', style:{color:'#ad6200'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Gelecek Hafta', onClick: () => { onUpdateTask(task.id, {dueDate: getDateString(7)}); setIsMenuOpen(false); } }, el(Icon, {name:'calendar-week', style:{color:'#692fc2'}})),
                    el('div', { className: 'h2l-menu-icon-btn', title: 'Tarih Yok', onClick: () => { onUpdateTask(task.id, {dueDate: null}); setIsMenuOpen(false); } }, el(Icon, {name:'ban', style:{color:'#808080'}}))
                ),
                el('span', { className: 'h2l-menu-label' }, 'Öncelik'),
                el('div', { className: 'h2l-menu-row' },
                    el('div', { className: 'h2l-menu-icon-btn p1', title: 'Öncelik 1', onClick: () => { onUpdateTask(task.id, {priority:1}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'})),
                    el('div', { className: 'h2l-menu-icon-btn p2', title: 'Öncelik 2', onClick: () => { onUpdateTask(task.id, {priority:2}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'})),
                    el('div', { className: 'h2l-menu-icon-btn p3', title: 'Öncelik 3', onClick: () => { onUpdateTask(task.id, {priority:3}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'})),
                    el('div', { className: 'h2l-menu-icon-btn p4', title: 'Öncelik 4', onClick: () => { onUpdateTask(task.id, {priority:4}); setIsMenuOpen(false); } }, el(Icon, {name:'flag'}))
                ),
                el('div', { 
                    className: 'h2l-menu-item', 
                    title: 'Hatırlatıcı durumunu değiştir',
                    onClick: () => { 
                        const newStatus = (task.reminder_enabled == 1) ? 0 : 1;
                        onUpdateTask(task.id, { reminder_enabled: newStatus });
                        setIsMenuOpen(false); 
                    }
                }, 
                    el(Icon, { 
                        name: 'bell', 
                        style:{ marginRight:10, color: task.reminder_enabled == 1 ? '#db4c3f' : '#666', fontSize:14 } 
                    }), 
                    task.reminder_enabled == 1 ? 'Hatırlatıcıyı Kapat' : 'Hatırlatıcıyı Aç'
                ),
                el('div', { className: 'h2l-menu-item', title: 'Etiketleri yönet', onClick: () => { setIsMenuOpen(false); setEditorOpenMenu('labels_menu'); setIsEditing(true); } }, el(Icon, { name: 'tag', style:{marginRight:10, color:'#666', fontSize:14} }), 'Etiketler'),
                el('div', { className: 'h2l-menu-item', title: 'Konum ekle', onClick: () => { setIsMenuOpen(false); setEditorOpenMenu('location_menu'); setIsEditing(true); } }, el(Icon, { name: 'location-dot', style:{marginRight:10, color:'#666', fontSize:14} }), 'Konum'),
                el('div', { className: 'h2l-menu-separator' }),
                el('div', { className: 'h2l-menu-item', title: 'Başka projeye taşı', onClick: () => { setIsMenuOpen(false); setEditorOpenMenu('project'); setIsEditing(true); } }, el(Icon, { name: 'arrow-right-to-bracket', style:{marginRight:10, color:'#666', fontSize:14} }), 'Taşı'),
                el('div', { className: 'h2l-menu-item', title: 'Görevin kopyasını oluştur', onClick: handleDuplicate }, el(Icon, { name: 'copy', style:{marginRight:10, color:'#666', fontSize:14} }), 'Kopya oluştur'),
                el('div', { className: 'h2l-menu-item', title: 'Bağlantıyı panoya kopyala', onClick: handleCopyLink }, el(Icon, { name: 'link', style:{marginRight:10, color:'#666', fontSize:14} }), 'Görev bağlantısını kopyala')
            );
        };

        const isDoneLike = ['completed', 'cancelled'].includes(task.status);
        const checkClass = task.status === 'cancelled' ? 'cancelled' : (task.status === 'completed' ? 'completed' : '');
        const checkIcon = task.status === 'cancelled' ? 'ban' : 'check';
        
        let rowClassName = `h2l-task-row ${highlightClass} ${isMenuOpen || isAssigneeMenuOpen ? 'menu-open' : ''}`;
        if (dragOverState === 'top') rowClassName += ' h2l-drag-over-top';
        if (dragOverState === 'bottom') rowClassName += ' h2l-drag-over-bottom';

        const project = projects.find(p => parseInt(p.id) === parseInt(task.project_id));
        const section = sections.find(s => parseInt(s.id) === parseInt(task.section_id));

        return el('div', { 
            className: rowClassName, 
            onClick: () => onTaskClick ? onTaskClick(task) : null,
            draggable: true,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop
        },
            toastMsg && el(Toast, { message: toastMsg, onClose: () => setToastMsg(null) }),
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
                    (task.reminder_enabled == 1) && el('span', { className: 'h2l-detail-item', title: 'Hatırlatıcı açık' }, el(Icon, {name:'bell', style:{color:'#db4c3f', fontSize:12}})),
                    (parseInt(task.comment_count || 0) > 0) && el('span', { className: 'h2l-detail-item comments', style: { cursor: 'pointer', color: '#888' }, onClick: (e) => { e.stopPropagation(); onTaskClick(task); } }, el(Icon, {name:'comment', style:{fontSize:11}}), ' ', task.comment_count),
                    (task.labels && task.labels.length > 0) && task.labels.map(lbl => {
                        const isString = typeof lbl === 'string';
                        const labelName = isString ? lbl : lbl.name;
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
                    (task.status !== 'open' && task.status !== 'in_progress' && TASK_STATUSES[task.status]) && el('span', { className: 'h2l-detail-item status-badge', style: { color: TASK_STATUSES[task.status].color, fontSize: '11px', fontWeight: 600 } }, task.status === 'completed' ? null : [el(Icon, {name: TASK_STATUSES[task.status].icon}), ' ', TASK_STATUSES[task.status].label]),
                    project && el('span', { className: 'h2l-detail-item project', style:{marginLeft: 'auto', fontSize: '11px'} }, 
                        el('span', {style:{marginRight:4}}, project.title),
                        el('span', { className: 'h2l-dot', style: { backgroundColor: project.color || '#888' } }),
                        section ? el('span', {style:{color:'#999', marginLeft:4}}, `/ ${section.name}`) : null
                    )
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

    const QuickAddContainer = ({ sectionId, projectId, users, projects, sections, onAdd, labels, date, parentTaskId = 0 }) => {
        const [isOpen, setIsOpen] = useState(false);
        if (!isOpen) return el('div', { style: { marginLeft: parentTaskId ? 0 : 28 } }, el(QuickAddTrigger, { onOpen: () => setIsOpen(true) }));
        const initData = { project_id: projectId, section_id: sectionId, parent_task_id: parentTaskId };
        if (date) initData.due_date = date; 
        return el('div', { style: { marginLeft: parentTaskId ? 0 : 28 } },
            el(TaskEditor, {
                mode: 'add', users, projects, sections, activeProjectId: projectId,
                initialData: initData,
                onSave: (data) => { onAdd(data); },
                onCancel: () => setIsOpen(false),
                labels
            })
        );
    };

    const SectionGroup = ({ section, tasks, users, projects, sections, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection, onMoveTask, onMoveSection, labels, navigate }) => {
        const [isOpen, setIsOpen] = useState(true);
        const [isEditing, setIsEditing] = useState(false);
        const [secName, setSecName] = useState(section.name);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [showDeleteModal, setShowDeleteModal] = useState(false); 
        const [dragOver, setDragOver] = useState(false);
        const [sectionDragOverState, setSectionDragOverState] = useState(null); 
        const menuRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [menuRef]);

        const handleSaveName = () => { if (secName.trim() && secName !== section.name) { onUpdateSection(section.id, { name: secName, projectId: section.project_id }); } else { setSecName(section.name); } setIsEditing(false); };

        const handleSectionDragStart = (e) => { if (isEditing) { e.preventDefault(); return; } currentDraggedId = section.id; currentDraggedType = 'section'; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.closest('.h2l-section-container').classList.add('h2l-section-is-dragging'), 0); };
        const handleSectionDragEnd = (e) => { currentDraggedId = null; currentDraggedType = null; e.target.closest('.h2l-section-container').classList.remove('h2l-section-is-dragging'); setSectionDragOverState(null); };
        const handleContainerDragOver = (e) => { e.preventDefault(); if (currentDraggedType === 'section') { if (currentDraggedId === section.id) return; const rect = e.currentTarget.getBoundingClientRect(); const midY = rect.top + rect.height / 2; setSectionDragOverState(e.clientY < midY ? 'top' : 'bottom'); e.stopPropagation(); } else if (currentDraggedType === 'task') { if (tasks.length === 0 && !dragOver) setDragOver(true); } };
        const handleContainerDrop = (e) => { e.preventDefault(); setDragOver(false); if (currentDraggedType === 'section' && currentDraggedId !== section.id && onMoveSection) { e.stopPropagation(); setSectionDragOverState(null); const position = sectionDragOverState === 'top' ? 'before' : 'after'; onMoveSection(currentDraggedId, section.id, position); } else if (currentDraggedType === 'task' && tasks.length === 0 && currentDraggedId && onMoveTask) { onMoveTask(currentDraggedId, null, null, section.id); } };
        const handleContainerDragLeave = () => { setDragOver(false); setSectionDragOverState(null); };

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
            isOpen && tasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, highlightToday, onMoveTask, onAddTask, labels, navigate })), 
            isOpen && el(QuickAddContainer, { sectionId: section.id, projectId: section.project_id, users, projects, sections, onAdd: onAddTask, labels })
        );
    };

    const SectionAdd = ({ onAdd }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [name, setName] = useState('');
        const handleSubmit = (e) => { e.preventDefault(); if(name.trim()) { onAdd({ name }); setName(''); setIsEditing(false); } };
        if (!isEditing) { return el('div', { className: 'h2l-section-separator', onClick: () => setIsEditing(true) }, el('span', { className: 'h2l-separator-line' }), el('span', { className: 'h2l-separator-text' }, 'Bölüm ekle'), el('span', { className: 'h2l-separator-line' })); }
        return el('div', { className: 'h2l-section-add-form' }, el('form', { onSubmit: handleSubmit }, el('input', { className: 'h2l-section-input', autoFocus: true, placeholder: 'Bölüm adı', value: name, onChange: e => setName(e.target.value), onBlur: () => !name.trim() && setIsEditing(false) }), el('div', { className: 'h2l-form-actions' }, el('button', { type:'submit', className: 'h2l-btn primary', disabled:!name.trim() }, 'Bölüm ekle'), el('button', { type:'button', className: 'h2l-btn', onClick: () => setIsEditing(false) }, 'İptal'))));
    };

    // --- BOARD (KANBAN) VIEW (UPDATED) ---
    const BoardCard = ({ task, users, onTaskClick, onUpdateTask }) => {
        let assignee = null;
        if (task.assignees && task.assignees.length > 0) { 
            assignee = users.find(u => parseInt(u.id) === parseInt(task.assignees[0])); 
        }
        const smartDate = getSmartDateDisplay(task.due_date);
        const isCompleted = task.status === 'completed';

        return el('div', { 
            className: `h2l-board-card ${isCompleted ? 'completed' : ''}`, 
            onClick: () => onTaskClick(task), // Modal açma işlemi
            draggable: true,
            onDragStart: (e) => {
                e.stopPropagation(); // Kolon sürüklemesini engelle
                currentDraggedId = task.id;
                currentDraggedType = 'task';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', task.id);
                setTimeout(() => e.target.classList.add('is-dragging'), 0);
            },
            onDragEnd: (e) => {
                currentDraggedId = null;
                currentDraggedType = null;
                e.target.classList.remove('is-dragging');
            }
        },
            el('div', { className: 'h2l-bc-header' },
                el('div', { 
                    className: `h2l-bc-check p${task.priority} ${isCompleted ? 'completed' : ''}`,
                    onClick: (e) => {
                        e.stopPropagation();
                        onUpdateTask(task.id, { status: isCompleted ? 'in_progress' : 'completed' });
                    }
                }, isCompleted && el(Icon, { name: 'check', style: { fontSize: 10, color: '#fff' } })),
                el('div', { 
                    className: 'h2l-bc-title', 
                    dangerouslySetInnerHTML: { __html: task.title } 
                })
            ),
            el('div', { className: 'h2l-bc-footer' },
                el('div', { className: 'h2l-bc-meta' },
                    smartDate && el('div', { className: `h2l-bc-date ${smartDate.color === '#d1453b' ? 'overdue' : (smartDate.text === 'Bugün' ? 'today' : '')}` },
                        el(Icon, { name: smartDate.icon, style: { fontSize: 11 } }),
                        smartDate.text
                    ),
                    (parseInt(task.comment_count) > 0) && el('div', { style: { display: 'flex', alignItems: 'center', gap: 4 } },
                        el(Icon, { name: 'comment', style: { fontSize: 11 } }),
                        task.comment_count
                    )
                ),
                assignee && el('div', { className: 'h2l-bc-assignee' },
                    el('img', { src: assignee.avatar, title: assignee.name })
                )
            )
        );
    };

    const BoardColumn = ({ section, tasks, users, onUpdateTask, onMoveColumn, isDraggable, onTaskClick }) => {
        const [isDragOver, setIsDragOver] = useState(false);
        const [dropIndex, setDropIndex] = useState(null);

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            setDropIndex(null);

            if (currentDraggedType === 'task' && currentDraggedId) {
                const updatePayload = {};
                if (section.type === 'status') {
                    // Durum değiştir
                    updatePayload.status = section.id;
                } else {
                    // Bölüm değiştir (Varsayılan davranış)
                    updatePayload.sectionId = section.id || 0;
                }
                onUpdateTask(currentDraggedId, updatePayload);
            }

            if (currentDraggedType === 'column' && currentDraggedId && currentDraggedId !== section.id && onMoveColumn) {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const midX = rect.left + rect.width / 2;
                 const position = e.clientX < midX ? 'before' : 'after';
                 onMoveColumn(currentDraggedId, section.id, position);
            }
        };

        const handleDragStart = (e) => {
            if (currentDraggedType === 'task') return; // Eğer task sürükleniyorsa kolon sürüklemeyi başlatma

            if (!isDraggable) {
                e.preventDefault();
                return;
            }
            currentDraggedId = section.id;
            currentDraggedType = 'column';
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', section.id);
            setTimeout(() => e.target.style.opacity = '0.5', 0);
        };

        const handleDragEnd = (e) => {
            currentDraggedId = null;
            currentDraggedType = null;
            e.target.style.opacity = '1';
        };
        
        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Event bubble'ı durdur, üst elemanlar etkilemesin
            e.dataTransfer.dropEffect = 'move';

            if (currentDraggedType === 'task') {
                setIsDragOver(true);
                
                const cards = e.currentTarget.querySelectorAll('.h2l-board-card');
                let closestIndex = tasks.length;
                
                let minOffset = Number.NEGATIVE_INFINITY;
                
                cards.forEach((card, idx) => {
                    const box = card.getBoundingClientRect();
                    const offset = e.clientY - box.top - box.height / 2;
                    if (offset < 0 && offset > minOffset) {
                        minOffset = offset;
                        closestIndex = idx;
                    }
                });
                setDropIndex(closestIndex);
                
            } else if (currentDraggedType === 'column' && isDraggable) {
                setIsDragOver(true);
            }
        };

        return el('div', { 
            className: `h2l-board-column ${isDragOver ? 'drag-over' : ''}`,
            draggable: isDraggable,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDragOver: handleDragOver,
            onDragLeave: () => { setIsDragOver(false); setDropIndex(null); },
            onDrop: handleDrop
        },
            el('div', { className: 'h2l-board-header', style: { cursor: isDraggable ? 'grab' : 'default' } },
                el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                    el('span', null, section.name),
                    el('span', { className: 'count' }, tasks.length)
                )
            ),
            el('div', { className: 'h2l-board-body' },
                tasks.map((t, idx) => (
                    el(Fragment, { key: t.id },
                        (isDragOver && dropIndex === idx && currentDraggedType === 'task') && el('div', { className: 'h2l-drop-indicator' }),
                        el(BoardCard, { task: t, users, onTaskClick, onUpdateTask })
                    )
                )),
                (isDragOver && dropIndex === tasks.length && currentDraggedType === 'task') && el('div', { className: 'h2l-drop-indicator' })
            )
        );
    };

    const BoardView = ({ tasks, sections, users = [], onUpdateTask, onAddTask, onTaskClick }) => {
        const [groupBy, setGroupBy] = useState(localStorage.getItem('h2l_board_group_by') || 'section');
        const [localSections, setLocalSections] = useState(sections);

        useEffect(() => {
             const sorted = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)); 
             setLocalSections(sorted);
        }, [sections]);

        const changeGroupBy = (val) => {
            setGroupBy(val);
            localStorage.setItem('h2l_board_group_by', val);
        };

        const handleMoveColumn = (draggedId, targetId, position) => {
            const draggedIndex = localSections.findIndex(s => s.id === draggedId);
            const targetIndex = localSections.findIndex(s => s.id === targetId);
            if (draggedIndex === -1 || targetIndex === -1) return;
            
            const newSections = [...localSections];
            const [draggedSection] = newSections.splice(draggedIndex, 1);
            let insertIndex = newSections.findIndex(s => s.id === targetId);
            if (position === 'after') insertIndex++;
            newSections.splice(insertIndex, 0, draggedSection);
            
            // Optimistic UI update
            newSections.forEach((s, index) => { s.sort_order = index; });
            setLocalSections(newSections);
            
            // API Call
            const itemsToUpdate = newSections.map(s => ({ id: s.id, order: s.sort_order }));
            apiFetch({ path: '/h2l/v1/reorder', method: 'POST', data: { type: 'section', items: itemsToUpdate } })
                .catch(err => {
                    console.error(err);
                    // Revert on error if needed, but usually redundant fetch will fix it
                });
        };

        // Define columns based on groupBy
        let columns = [];
        if (groupBy === 'status') {
             columns = Object.values(TASK_STATUSES).map(s => ({
                 id: s.key,
                 name: s.label,
                 type: 'status',
                 color: s.color
             }));
        } else {
             // Default: Sections + "Bölümsüz"
             columns = [
                { id: 0, name: 'Bölümsüz', type: 'section', isVirtual: true },
                ...localSections.map(s => ({ ...s, type: 'section' }))
             ];
        }

        return el('div', { className: 'h2l-board-container', style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column' } },
            // Controls (Modern Switch)
            el('div', { className: 'h2l-board-toolbar', style: { padding: '0 0 15px 0', display: 'flex', justifyContent: 'flex-end' } },
               el('div', { className: 'h2l-view-switcher', style: { display: 'inline-flex', background: '#f0f0f0', padding: '3px', borderRadius: '6px' } },
                   el('button', { 
                       className: `h2l-switch-btn ${groupBy === 'section' ? 'active' : ''}`,
                       onClick: () => changeGroupBy('section'),
                       style: { 
                           display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px',
                           background: groupBy === 'section' ? '#fff' : 'transparent',
                           color: groupBy === 'section' ? '#333' : '#666',
                           boxShadow: groupBy === 'section' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                           fontSize: '13px', fontWeight: 500
                       }
                   }, el(Icon, { name: 'layer-group' }), 'Bölüm'),
                   el('button', { 
                       className: `h2l-switch-btn ${groupBy === 'status' ? 'active' : ''}`,
                       onClick: () => changeGroupBy('status'),
                       style: { 
                           display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px',
                           background: groupBy === 'status' ? '#fff' : 'transparent',
                           color: groupBy === 'status' ? '#333' : '#666',
                           boxShadow: groupBy === 'status' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                           fontSize: '13px', fontWeight: 500
                       }
                   }, el(Icon, { name: 'bars-progress' }), 'Durum')
               )
            ),
            // Board
            el('div', { className: 'h2l-board-view', style: { flex: 1, overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: '15px', paddingBottom: '20px', alignItems: 'flex-start' } },
                columns.map(col => {
                    const colTasks = tasks.filter(t => {
                        // FIX: Robust check for parent_task_id to ensure only main tasks are shown
                        const parentId = parseInt(t.parent_task_id || 0);
                        if (parentId !== 0) return false;

                        if (groupBy === 'status') {
                            // Handle 'open' as 'in_progress' fallback if needed, or exact match
                            if (t.status === 'open' && col.id === 'in_progress') return true;
                            return t.status === col.id;
                        } else {
                            return parseInt(t.section_id || 0) === parseInt(col.id);
                        }
                    });

                    // Filter out empty 'No Section' column only in section mode if others exist
                    if (groupBy === 'section' && col.id === 0 && colTasks.length === 0 && sections.length > 0) return null;

                    return el(BoardColumn, { 
                        key: col.id, 
                        section: col, 
                        tasks: colTasks, 
                        users, 
                        onUpdateTask,
                        // Only pass drag/move handlers if grouping by section and column is not virtual ("No Section")
                        isDraggable: groupBy === 'section' && !col.isVirtual,
                        onMoveColumn: groupBy === 'section' ? handleMoveColumn : null,
                        onTaskClick
                    });
                })
            )
        );
    };

    // --- UPCOMING & TODAY VIEW ---
    const UpcomingView = ({ tasks, users, projects, sections, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, labels, navigate }) => {
        const [currentDate, setCurrentDate] = useState(new Date());
        const [weekDates, setWeekDates] = useState([]);
        const [overdueExpanded, setOverdueExpanded] = useState(true);

        useEffect(() => {
            const start = new Date(currentDate);
            const dates = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                dates.push(d);
            }
            setWeekDates(dates);
        }, [currentDate]);

        const today = new Date();
        today.setHours(0,0,0,0);

        const groupedTasks = { overdue: [], today: [], upcoming: {} };

        tasks.forEach(t => {
            if (t.status === 'completed' || t.status === 'cancelled') return;
            if (!t.due_date) return;
            const tDate = new Date(t.due_date);
            tDate.setHours(0,0,0,0);
            
            if (tDate < today) groupedTasks.overdue.push(t);
            else if (tDate.getTime() === today.getTime()) groupedTasks.today.push(t);
            else {
                const dKey = formatDateKey(tDate);
                if (!groupedTasks.upcoming[dKey]) groupedTasks.upcoming[dKey] = { date: tDate, tasks: [] };
                groupedTasks.upcoming[dKey].tasks.push(t);
            }
        });

        const futureDays = [];
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        for (let i = 0; i < 7; i++) {
            const d = new Date(tomorrow);
            d.setDate(tomorrow.getDate() + i);
            const key = formatDateKey(d);
            if (!groupedTasks.upcoming[key]) groupedTasks.upcoming[key] = { date: d, tasks: [] };
        }

        const sortedKeys = Object.keys(groupedTasks.upcoming).sort();
        const goToToday = () => setCurrentDate(new Date());
        const shiftWeek = (days) => { const newDate = new Date(currentDate); newDate.setDate(newDate.getDate() + days); setCurrentDate(newDate); };
        const handleRescheduleOverdue = () => { groupedTasks.overdue.forEach(t => onUpdateTask(t.id, { due_date: getDateString(0) })); };

        return el('div', { className: 'h2l-upcoming-view' },
            el('div', { className: 'h2l-upcoming-header-wrapper' },
                el('div', { className: 'h2l-upcoming-top-bar' },
                    el('h1', null, 'Yaklaşan'),
                    el('div', { className: 'h2l-uc-controls' },
                        el('button', { className: 'h2l-btn-today', onClick: goToToday, disabled: formatDateKey(currentDate) === formatDateKey(today) }, 'Bugün'),
                        el('button', { className: 'h2l-uc-nav', onClick: () => shiftWeek(-7) }, el(Icon, {name:'chevron-left'})),
                        el('button', { className: 'h2l-uc-nav', onClick: () => shiftWeek(7) }, el(Icon, {name:'chevron-right'}))
                    )
                ),
                el('div', { className: 'h2l-calendar-strip' },
                    weekDates.map(d => {
                        const isToday = formatDateKey(d) === formatDateKey(today);
                        const dayName = d.toLocaleDateString('tr-TR', { weekday: 'short' });
                        const dayNum = d.getDate();
                        const hasTask = tasks.some(t => t.due_date && formatDateKey(new Date(t.due_date)) === formatDateKey(d));
                        return el('div', { key: formatDateKey(d), className: `h2l-strip-day ${isToday ? 'today' : ''}`, onClick: () => { const elId = `day-${formatDateKey(d)}`; const el = document.getElementById(elId); if(el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, el('span', { className: 'day-name' }, dayName), el('span', { className: 'day-num' }, dayNum), hasTask && el('span', { className: 'has-task-dot' }));
                    })
                )
            ),
            el('div', { className: 'h2l-upcoming-content' },
                groupedTasks.overdue.length > 0 && el('div', { className: 'h2l-overdue-section' },
                    el('div', { className: 'h2l-overdue-header' },
                        el('div', { className: 'h2l-overdue-toggle', onClick: () => setOverdueExpanded(!overdueExpanded) }, el(Icon, { name: overdueExpanded ? 'chevron-down' : 'chevron-right' }), el('span', null, 'Geciken'), el('span', { className: 'count' }, groupedTasks.overdue.length)),
                        el('button', { className: 'h2l-reschedule-link', onClick: handleRescheduleOverdue }, 'Zamanı yeniden ayarla')
                    ),
                    overdueExpanded && el('div', { className: 'h2l-overdue-list' }, groupedTasks.overdue.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, onAddTask, labels, navigate })))
                ),
                el('div', { className: 'h2l-date-section', id: `day-${formatDateKey(today)}` },
                    el('div', { className: 'h2l-date-header' }, el('span', { className: 'date-title' }, `Bugün · ${getDayName(today)} ${today.getDate()} ${getMonthName(today)}`), el('span', { className: 'date-count' }, groupedTasks.today.length || '')),
                    el('div', { className: 'h2l-date-tasks' }, groupedTasks.today.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, onAddTask, labels, navigate })), el(QuickAddContainer, { projectId: 0, sectionId: 0, users, projects, sections, onAdd: (d) => onAddTask({...d, dueDate: getDateString(0)}), labels, date: getDateString(0) }))
                ),
                sortedKeys.map(key => {
                    const group = groupedTasks.upcoming[key];
                    const isTomorrow = key === formatDateKey(new Date(new Date().setDate(new Date().getDate() + 1)));
                    const title = isTomorrow ? `Yarın · ${getDayName(group.date)} ${group.date.getDate()} ${getMonthName(group.date)}` : `${group.date.getDate()} ${getMonthName(group.date)} · ${getDayName(group.date)}`;
                    return el('div', { key: key, className: 'h2l-date-section', id: `day-${key}` },
                        el('div', { className: 'h2l-date-header' }, el('span', { className: 'date-title' }, title), el('span', { className: 'date-count' }, group.tasks.length || '')),
                        el('div', { className: 'h2l-date-tasks' }, group.tasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, onAddTask, labels, navigate })), el(QuickAddContainer, { projectId: 0, sectionId: 0, users, projects, sections, onAdd: (d) => onAddTask({...d, dueDate: key}), labels, date: key }))
                    );
                })
            )
        );
    };

    const TodayView = ({ tasks, users, projects, sections, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, labels, navigate }) => {
        const [overdueExpanded, setOverdueExpanded] = useState(false); 
        const today = new Date();
        today.setHours(0,0,0,0);

        const overdueTasks = [];
        const todayTasks = [];

        tasks.forEach(t => {
            if (t.status === 'completed' || t.status === 'cancelled') return;
            if (!t.due_date) return; 
            
            const tDate = new Date(t.due_date);
            tDate.setHours(0,0,0,0);
            
            if (tDate < today) overdueTasks.push(t);
            else if (tDate.getTime() === today.getTime()) todayTasks.push(t);
        });

        const handleRescheduleOverdue = () => {
            overdueTasks.forEach(t => onUpdateTask(t.id, { due_date: getDateString(0) }));
        };

        return el('div', { className: 'h2l-today-view' },
            el('div', { className: 'h2l-today-header' },
                el('div', { className: 'h2l-today-title-row' },
                    el('h1', null, 'Bugün'),
                    el('span', { className: 'h2l-today-date' }, `${getDayName(today)} ${today.getDate()} ${getMonthName(today)}`),
                    el('span', { className: 'h2l-today-count' }, todayTasks.length > 0 ? todayTasks.length + ' görev' : '')
                )
            ),
            overdueTasks.length > 0 && el('div', { className: 'h2l-overdue-section' },
                el('div', { className: 'h2l-overdue-header' },
                    el('div', { className: 'h2l-overdue-toggle', onClick: () => setOverdueExpanded(!overdueExpanded) },
                        el(Icon, { name: overdueExpanded ? 'chevron-down' : 'chevron-right' }),
                        el('span', null, 'Geciken'),
                        el('span', { className: 'count' }, overdueTasks.length)
                    ),
                    el('button', { className: 'h2l-reschedule-link', onClick: handleRescheduleOverdue }, 'Zamanı yeniden ayarla')
                ),
                overdueExpanded && el('div', { className: 'h2l-overdue-list' },
                    overdueTasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, onAddTask, labels, navigate }))
                )
            ),
            el('div', { className: 'h2l-today-list' },
                todayTasks.map(t => el(TaskRow, { key: t.id, task: t, users, projects, sections, onUpdateTask, onDeleteTask, onTaskClick, onAddTask, labels, navigate })),
                el(QuickAddContainer, { projectId: 0, sectionId: 0, users, projects, sections, onAdd: (d) => onAddTask({...d, dueDate: getDateString(0)}), labels, date: getDateString(0) })
            )
        );
    };

    const ListView = ({ project, tasks, sections, users, projects = [], onUpdateTask, onDeleteTask, onAddTask, onAddSection, onTaskClick, showCompleted, highlightToday, onUpdateSection, onDeleteSection, labels, navigate }) => {
        const [localTasks, setLocalTasks] = useState(tasks);
        const [localSections, setLocalSections] = useState(sections);

        useEffect(() => { const sorted = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)); setLocalTasks(sorted); }, [tasks]);
        useEffect(() => { const sortedSecs = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)); setLocalSections(sortedSecs); }, [sections]);

        const isVirtualView = project.id === 0;
        let visibleTasks = [...localTasks]; 
        
        // Ana görünümde sadece parent görevleri göster
        visibleTasks = visibleTasks.filter(t => !t.parent_task_id || t.parent_task_id == 0);
        
        if (!showCompleted) { visibleTasks = visibleTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled'); }
        visibleTasks.sort((a, b) => {
            const isADone = a.status === 'completed' || a.status === 'cancelled';
            const isBDone = b.status === 'completed' || b.status === 'cancelled';
            if (isADone && !isBDone) return 1; if (!isADone && isBDone) return -1;
            return (a.sort_order || 0) - (b.sort_order || 0); 
        });

        const rootTasks = visibleTasks.filter(t => !t.section_id || t.section_id == 0);

        const handleMoveTask = (draggedId, targetId, position, targetSectionId = null) => {
            const draggedTaskIndex = localTasks.findIndex(t => t.id === draggedId);
            if (draggedTaskIndex === -1) return;
            const newTasks = [...localTasks];
            const [draggedTask] = newTasks.splice(draggedTaskIndex, 1);
            if (targetSectionId !== null) { draggedTask.section_id = targetSectionId; newTasks.push(draggedTask); } 
            else if (targetId) {
                const targetIndex = newTasks.findIndex(t => t.id === targetId);
                if (targetIndex !== -1) {
                    draggedTask.section_id = newTasks[targetIndex].section_id;
                    if (position === 'before') { newTasks.splice(targetIndex, 0, draggedTask); } else { newTasks.splice(targetIndex + 1, 0, draggedTask); }
                }
            }
            newTasks.forEach((t, index) => { t.sort_order = index; });
            setLocalTasks(newTasks);
            const itemsToUpdate = newTasks.map(t => ({ id: t.id, order: t.sort_order, section_id: t.section_id }));
            apiFetch({ path: '/h2l/v1/reorder', method: 'POST', data: { type: 'task', items: itemsToUpdate } }).catch(err => { console.error("Reorder failed:", err); setLocalTasks(tasks); });
        };

        const handleMoveSection = (draggedId, targetId, position) => {
            const draggedIndex = localSections.findIndex(s => s.id === draggedId);
            const targetIndex = localSections.findIndex(s => s.id === targetId);
            if (draggedIndex === -1 || targetIndex === -1) return;
            const newSections = [...localSections];
            const [draggedSection] = newSections.splice(draggedIndex, 1);
            let insertIndex = newSections.findIndex(s => s.id === targetId);
            if (position === 'after') insertIndex++;
            newSections.splice(insertIndex, 0, draggedSection);
            newSections.forEach((s, index) => { s.sort_order = index; });
            setLocalSections(newSections);
            const itemsToUpdate = newSections.map(s => ({ id: s.id, order: s.sort_order }));
            apiFetch({ path: '/h2l/v1/reorder', method: 'POST', data: { type: 'section', items: itemsToUpdate } }).catch(err => console.error(err));
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
                    labels, navigate 
                })), 
                el(QuickAddContainer, { sectionId: 0, projectId: project.id, users, projects: projects.length ? projects : [project], sections, onAdd: onAddTask, labels }) 
            ),
            !isVirtualView && localSections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id) === parseInt(s.id));
                return el(SectionGroup, { 
                    key: s.id, section: s, tasks: sTasks, users, projects, sections, 
                    onUpdateTask, onDeleteTask, onTaskClick, highlightToday, 
                    onUpdateSection, onDeleteSection, 
                    onMoveTask: handleMoveTask,
                    onMoveSection: handleMoveSection,
                    labels, navigate 
                });
            }),
            !isVirtualView && el(SectionAdd, { onAdd: onAddSection })
        );
    };

    window.H2L.Tasks = {
        ListView,
        UpcomingView,
        TodayView,
        BoardView, // BoardView eklendi
        SectionGroup,
        TaskRow,
        QuickAddContainer // Dışarı açıldı (modalda kullanım için)
    };

})(window.wp);