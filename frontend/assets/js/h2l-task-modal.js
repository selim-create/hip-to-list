(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null, TASK_STATUSES: {} };
    const { Icon, Avatar, TASK_STATUSES } = Common;
    
    // TaskInput kontrolü
    const TaskInput = window.H2L && window.H2L.TaskInput ? window.H2L.TaskInput : { ContentEditable: () => null, TaskEditor: () => null };
    const { ContentEditable, TaskEditor } = TaskInput;
    
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { getPriorityColor: () => '#808080' };
    const { getPriorityColor } = Reminders;
    const TodoistDatepicker = window.H2L && window.H2L.TodoistDatepicker ? window.H2L.TodoistDatepicker : null;

    window.H2L = window.H2L || {};
    window.H2L.TaskModal = window.H2L.TaskModal || {};

    // --- HELPER: CRM Nesne Türleri ---
    const CRM_TYPES = [
        { value: 'kampanya', label: 'Kampanya' },
        { value: 'ajans', label: 'Ajans' },
        { value: 'reklamveren', label: 'Reklamveren' },
        { value: 'yayinci', label: 'Yayıncı' },
        { value: 'mecra', label: 'Mecra' },
        { value: 'post', label: 'Yazı' },
        { value: 'page', label: 'Sayfa' }
    ];

    // --- BİLEŞEN: CRM Selector Sidebar ---
    const SidebarCRMSelector = ({ relatedType, relatedId, relatedTitle, relatedLink, onUpdate }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [selectedType, setSelectedType] = useState(relatedType || 'kampanya');
        const [searchTerm, setSearchTerm] = useState('');
        const [results, setResults] = useState([]);
        const [loading, setLoading] = useState(false);
        const searchTimeout = useRef(null);
        const containerRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (isEditing && containerRef.current && !containerRef.current.contains(event.target)) {
                    setIsEditing(false);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [isEditing]);

        const handleSearch = (term) => {
            setSearchTerm(term);
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            if (term.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            searchTimeout.current = setTimeout(() => {
                apiFetch({ path: `/h2l/v1/crm-search?term=${term}&type=${selectedType}` })
                    .then(res => {
                        setResults(res);
                        setLoading(false);
                    })
                    .catch(() => setLoading(false));
            }, 400);
        };

        const handleSelect = (item) => {
            onUpdate({ related_object_type: selectedType, related_object_id: item.id });
            setIsEditing(false);
        };

        const handleRemove = () => {
            onUpdate({ related_object_type: '', related_object_id: 0 });
            setIsEditing(false);
        };

        const hasRelation = relatedId && relatedId > 0;

        return el('div', { className: 'h2l-tm-sidebar-group', style: { position: 'relative' }, ref: containerRef },
            el('div', { className: 'h2l-tm-sb-label' }, 'İlişkili Kayıt'),
            el('div', { 
                className: 'h2l-tm-sb-value clickable', 
                onClick: (e) => { e.stopPropagation(); setIsEditing(!isEditing); },
                style: { flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }
            },
                hasRelation ? [
                    el('div', { key: 'type', style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' } },
                        el(Icon, { name: 'link', style: { fontSize: '10px' } }),
                        CRM_TYPES.find(t => t.value === relatedType)?.label || relatedType
                    ),
                    el('a', { 
                        key: 'link',
                        href: relatedLink || '#', 
                        target: '_blank', 
                        onClick: e => e.stopPropagation(),
                        style: { fontWeight: 500, color: '#246fe0', textDecoration: 'none' }
                    }, relatedTitle || `ID: ${relatedId}`)
                ] : el('span', { style: { color: '#888' } }, 'Kayıt bağla...')
            ),
            
            isEditing && el('div', { className: 'h2l-popover-menu right-aligned', style: { width: '280px', padding: '10px', zIndex: 20065, top: '100%', right: 0 } },
                el('div', { style: { marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    el('strong', { style: { fontSize: '12px' } }, 'Kayıt Bağla'),
                    el(Icon, { name: 'xmark', style: { cursor: 'pointer' }, onClick: () => setIsEditing(false) })
                ),
                el('select', { 
                    className: 'h2l-select', 
                    style: { marginBottom: '8px', width: '100%', fontSize: '13px' },
                    value: selectedType,
                    onChange: e => { setSelectedType(e.target.value); setResults([]); setSearchTerm(''); }
                }, CRM_TYPES.map(t => el('option', { key: t.value, value: t.value }, t.label))),
                el('div', { style: { position: 'relative' } },
                    el('input', {
                        className: 'h2l-input',
                        placeholder: 'Ara...',
                        autoFocus: true,
                        value: searchTerm,
                        onChange: e => handleSearch(e.target.value),
                        style: { width: '100%', paddingRight: '25px' }
                    }),
                    loading && el('span', { style: { position: 'absolute', right: '8px', top: '8px', fontSize: '10px', color: '#999' } }, '...')
                ),
                el('div', { style: { marginTop: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' } },
                    results.length === 0 && searchTerm.length > 1 && !loading && el('div', { style: { padding: '8px', fontSize: '12px', color: '#999' } }, 'Sonuç yok'),
                    results.map(r => 
                        el('div', { 
                            key: r.id, 
                            className: 'h2l-menu-item', 
                            onClick: () => handleSelect(r),
                            style: { padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9' }
                        }, r.title)
                    )
                ),
                (relatedId > 0) && el('button', { 
                    className: 'h2l-btn text-danger small', 
                    style: { marginTop: '10px', width: '100%' },
                    onClick: handleRemove 
                }, 'Bağlantıyı Kaldır')
            )
        );
    };

    const TextTooltip = ({ position, onFormat, showLinkInput, onLinkSubmit, onClose }) => {
        const [linkUrl, setLinkUrl] = useState('');
        const inputRef = useRef(null);
        useEffect(() => { if(showLinkInput && inputRef.current) inputRef.current.focus(); }, [showLinkInput]);
        if (!position) return null;
        const style = { left: position.left, top: position.top, zIndex: 999999 };
        if (showLinkInput) {
            return el('div', { className: 'h2l-tooltip-popover', style: style, onMouseDown: e => e.stopPropagation() },
                el('div', { className: 'h2l-tooltip-link-area' },
                    el('input', { ref: inputRef, className: 'h2l-tooltip-input', placeholder: 'https://...', value: linkUrl, onChange: e => setLinkUrl(e.target.value), onKeyDown: (e) => { if(e.key === 'Enter') onLinkSubmit(linkUrl); } }),
                    el('button', { className: 'h2l-tooltip-btn', onClick: () => onLinkSubmit(linkUrl) }, el(Icon, {name:'check'})),
                    el('button', { className: 'h2l-tooltip-btn', onClick: onClose }, el(Icon, {name:'xmark'}))
                )
            );
        }
        return el('div', { className: 'h2l-tooltip-popover', style: style, onMouseDown: e => e.stopPropagation() },
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('bold'), title: 'Kalın' }, el(Icon, {name:'bold'})),
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('italic'), title: 'İtalik' }, el(Icon, {name:'italic'})),
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('strikeThrough'), title: 'Üstü Çizili' }, el(Icon, {name:'strikethrough'})),
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('code'), title: 'Kod' }, el(Icon, {name:'code'})),
            el('div', { className: 'h2l-tooltip-divider' }),
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('link_prompt'), title: 'Link' }, el(Icon, {name:'link'}))
        );
    };

    const SidebarDatePicker = ({ date, repeat, onChange }) => {
        const wrapperRef = useRef(null); const pickerRef = useRef(null);
        useEffect(() => { if (wrapperRef.current && !pickerRef.current && TodoistDatepicker) { const timePart = date && date.includes(' ') ? date.split(' ')[1].substring(0, 5) : null; pickerRef.current = new TodoistDatepicker(wrapperRef.current, { defaultDate: date, defaultTime: timePart, defaultRepeat: repeat, onChange: (data) => { let isoDate = null; if (data.date) { isoDate = data.date + (data.time ? ` ${data.time}:00` : ''); } onChange(isoDate, data.repeat); } }); } return () => { if (pickerRef.current && pickerRef.current.destroy) pickerRef.current.destroy(); }; }, []);
        useEffect(() => { if (pickerRef.current) { if (date) { const d = new Date(date); pickerRef.current.selectedDate = isNaN(d.getTime()) ? null : d; if (date.includes(' ')) pickerRef.current.selectedTime = date.split(' ')[1].substring(0, 5); else pickerRef.current.selectedTime = null; } else { pickerRef.current.selectedDate = null; pickerRef.current.selectedTime = null; } pickerRef.current.selectedRepeat = repeat; pickerRef.current.updateUI(); } }, [date, repeat]);
        return el('div', { ref: wrapperRef, style: { width: '100%' } });
    };

    const SidebarPrioritySelector = ({ priority, onChange }) => { return el('div', { className: 'h2l-sidebar-priority-selector' }, [1, 2, 3, 4].map(p => el('div', { key: p, className: `h2l-priority-flag p${p} ${priority === p ? 'active selected' : ''}`, onClick: (e) => { e.stopPropagation(); onChange(p); }, title: `Öncelik ${p}` }, el(Icon, { name: 'flag' })))); };

    const SidebarAssigneeList = ({ assigneeIds, users, onOpenMenu }) => {
        if (!assigneeIds || assigneeIds.length === 0) { return el('div', { className: 'h2l-tm-sb-value clickable', onClick: onOpenMenu }, el(Icon, { name: 'user', style: { color: '#888', marginRight: 8, fontSize: 14 } }), el('span', { style: { color: '#555' } }, 'Kişi ata')); }
        const assignedUsers = assigneeIds.map(id => users.find(u => parseInt(u.id) === parseInt(id))).filter(Boolean);
        return el('div', { className: 'h2l-tm-sb-value clickable', onClick: onOpenMenu, style: { height: 'auto', padding: '4px 0' } }, el('div', { className: 'h2l-sidebar-avatars' }, assignedUsers.map(u => el(Avatar, { key: u.id, userId: u.id, users, size: 26, style: { border: '2px solid #fafafa', marginLeft: '-6px' } })), el('div', { className: 'h2l-sidebar-add-assignee-btn' }, el(Icon, { name: 'plus' }))));
    };

    const SidebarRow = ({ label, value, icon, color, onClick, activeKey, renderPopupContent, isClickable = true, customContent, onTogglePopup }) => {
        return el('div', { className: 'h2l-tm-sidebar-group', style: { position: 'relative' } },
            el('div', { className: 'h2l-tm-sb-label' }, label),
            customContent ? customContent : el('div', { className: `h2l-tm-sb-value clickable-trigger ${isClickable?'clickable':''}`, onClick: isClickable ? (e) => { e.stopPropagation(); if(onTogglePopup) onTogglePopup(); } : null }, icon && el(Icon, { name: icon, style: { color: color || '#777', marginRight: 8, fontSize: 14 } }), el('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 } }, el('span', { style: { color: color || '#202020' } }, value))),
            (activeKey && renderPopupContent) && renderPopupContent()
        );
    };

    const CommentItem = ({ comment, user, onDelete, onUpdate }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState(comment.content);
        const handleSave = () => { if (editContent.trim() !== comment.content) { onUpdate(comment.id, editContent); } setIsEditing(false); };
        if (isEditing) { return el('div', { className: 'h2l-tm-comment-row editing' }, el(Avatar, { userId: comment.user_id, users: [user], size: 28 }), el('div', { className: 'h2l-tm-comment-bubble editing' }, el('textarea', { className: 'h2l-tm-comment-editor', value: editContent, onChange: (e) => setEditContent(e.target.value), autoFocus: true }), el('div', { className: 'h2l-tm-comment-actions-bar' }, el('button', { className: 'h2l-btn-cancel small', onClick: () => setIsEditing(false) }, 'İptal'), el('button', { className: 'h2l-btn-save small', onClick: handleSave, disabled: !editContent.trim() }, 'Güncelle')))); }
        return el('div', { className: 'h2l-tm-comment-row' }, el(Avatar, { userId: comment.user_id, users: [user], size: 28 }), el('div', { className: 'h2l-tm-comment-bubble' }, el('div', { className: 'h2l-tm-comment-meta' }, el('strong', null, user ? user.name : 'Bilinmeyen'), el('span', null, comment.created_at.split('T')[0]), (window.h2lFrontendSettings.currentUser.ID == comment.user_id) && el('div', { className: 'h2l-tm-comment-actions' }, el('button', { title: 'Düzenle', onClick: () => setIsEditing(true) }, el(Icon, { name: 'pen' })), el('button', { title: 'Sil', onClick: () => { if(confirm('Yorum silinsin mi?')) onDelete(comment.id); } }, el(Icon, { name: 'trash' })))), el('div', { className: 'h2l-tm-comment-text', dangerouslySetInnerHTML: { __html: comment.content } })));
    };

    const CommentInput = ({ onSend, currentUser, users, scrollToView }) => {
        const [isExpanded, setIsExpanded] = useState(false); const [text, setText] = useState(''); const [mentionState, setMentionState] = useState({ isOpen: false, query: '', triggerIndex: -1 }); const textareaRef = useRef(null);
        const handleFocus = () => { setIsExpanded(true); if (scrollToView) scrollToView(); };
        const handleSend = () => { if (!text.trim()) return; onSend(text); setText(''); setIsExpanded(false); setMentionState({ isOpen: false, query: '', triggerIndex: -1 }); };
        const handleCancel = () => { setText(''); setIsExpanded(false); setMentionState({ isOpen: false, query: '', triggerIndex: -1 }); };
        const handleInput = (e) => { const val = e.target.value; setText(val); const sel = e.target.selectionStart; let found = false; for (let i = sel - 1; i >= 0; i--) { if (val[i] === '@') { if (i === 0 || /\s/.test(val[i-1])) { const query = val.substring(i + 1, sel); if (!/\s/.test(query)) { setMentionState({ isOpen: true, query, triggerIndex: i }); found = true; } } break; } } if (!found) setMentionState({ isOpen: false, query: '', triggerIndex: -1 }); };
        const insertMention = (user) => { const beforeMention = text.substring(0, mentionState.triggerIndex); const insertion = `@${user.username || user.name.replace(/\s+/g, '')} `; const afterCursor = text.substring(textareaRef.current.selectionStart); const newText = beforeMention + insertion + afterCursor; setText(newText); setMentionState({ isOpen: false, query: '', triggerIndex: -1 }); setTimeout(() => { if(textareaRef.current) { textareaRef.current.focus(); const newPos = beforeMention.length + insertion.length; textareaRef.current.setSelectionRange(newPos, newPos); } }, 0); };
        const filteredUsers = mentionState.isOpen ? users.filter(u => (u.name && u.name.toLowerCase().includes(mentionState.query.toLowerCase())) || (u.username && u.username.toLowerCase().includes(mentionState.query.toLowerCase()))).slice(0, 5) : [];
        return el('div', { className: `h2l-tm-footer-inner ${isExpanded ? 'expanded' : ''}` }, el('div', { className: 'h2l-tm-comment-input-wrapper', style: { position: 'relative' } }, el(Avatar, { userId: currentUser.ID, users: users, size: 32 }), el('div', { className: 'h2l-tm-input-box' }, (mentionState.isOpen && filteredUsers.length > 0) && el('div', { className: 'h2l-mention-popup', style: { bottom: '100%', left: 40 } }, el('div', { className: 'h2l-mention-list' }, filteredUsers.map(u => el('div', { key: u.id, className: 'h2l-mention-item', onClick: () => insertMention(u) }, el(Avatar, { userId: u.id, users, size: 24 }), el('div', null, el('strong', null, u.name), u.username && el('span', { style: { marginLeft: 6 } }, `@${u.username}`)))))), el('textarea', { ref: textareaRef, placeholder: 'Yorum yaz...', value: text, onChange: handleInput, onFocus: handleFocus, onKeyDown: e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (mentionState.isOpen && filteredUsers.length > 0) { insertMention(filteredUsers[0]); } else { handleSend(); } } if (e.key === 'Escape') { if(mentionState.isOpen) { setMentionState({ ...mentionState, isOpen: false }); e.stopPropagation(); } } } }), !isExpanded && el('div', { className: 'h2l-tm-collapsed-icon' }, el(Icon, {name:'paperclip'})), isExpanded && el('div', { className: 'h2l-tm-input-toolbar' }, el('div', { className: 'h2l-tm-input-tools' }, el('button', { className: 'h2l-icon-btn small', title: 'Dosya ekle' }, el(Icon, { name: 'paperclip' })), el('button', { className: 'h2l-icon-btn small', title: 'Emoji' }, el(Icon, { name: 'face-smile' }))), el('div', { className: 'h2l-tm-input-buttons' }, el('button', { className: 'h2l-btn-cancel', onClick: handleCancel }, 'İptal'), el('button', { className: 'h2l-btn-save', onClick: handleSend, disabled: !text.trim() }, 'Yorum yap'))))));
    };

    const TaskContentEditor = ({ title, description, onSave, placeholderTitle, placeholderDesc }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [tempTitle, setTempTitle] = useState(title);
        const [tempDesc, setTempDesc] = useState(description);
        const [tooltipState, setTooltipState] = useState(null);
        const containerRef = useRef(null);
        const savedRange = useRef(null);
        useEffect(() => { if(!isEditing) { setTempTitle(title); setTempDesc(description); } }, [title, description, isEditing]);
        useEffect(() => { const handleSelection = () => { if (!isEditing) return; const selection = window.getSelection(); if (!selection.isCollapsed && containerRef.current && containerRef.current.contains(selection.anchorNode)) { const range = selection.getRangeAt(0); const rect = range.getBoundingClientRect(); setTooltipState(prev => prev && prev.showLinkInput ? prev : { pos: { left: rect.left + (rect.width/2), top: rect.top - 45 }, showLinkInput: false }); } else { setTooltipState(prev => prev && prev.showLinkInput ? prev : null); } }; document.addEventListener('selectionchange', handleSelection); return () => document.removeEventListener('selectionchange', handleSelection); }, [isEditing]);
        const handleFormat = (cmd) => { if (cmd === 'link_prompt') { const sel = window.getSelection(); if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0); setTooltipState(prev => ({ ...prev, showLinkInput: true })); } else if (cmd === 'code') { document.execCommand('insertHTML', false, `<code>${window.getSelection().toString()}</code>`); } else { document.execCommand(cmd, false, null); } };
        const handleLinkSubmit = (url) => { if (url) { const sel = window.getSelection(); sel.removeAllRanges(); if (savedRange.current) sel.addRange(savedRange.current); document.execCommand('createLink', false, url); } setTooltipState(null); savedRange.current = null; };
        const handleSave = () => { onSave(tempTitle, tempDesc); setIsEditing(false); };
        const handleCancel = () => { setTempTitle(title); setTempDesc(description); setIsEditing(false); };
        if (isEditing) { return el('div', { className: 'h2l-unified-editor editing', ref: containerRef }, tooltipState && el(TextTooltip, { position: tooltipState.pos, showLinkInput: tooltipState.showLinkInput, onFormat: handleFormat, onLinkSubmit: handleLinkSubmit, onClose: () => setTooltipState(null) }), el('div', { className: 'h2l-editor-row' }, el(ContentEditable, { html: tempTitle, onChange: setTempTitle, placeholder: placeholderTitle, className: 'title-mode h2l-tm-editor', autoFocus: true })), el('div', { className: 'h2l-editor-row' }, el(ContentEditable, { html: tempDesc, onChange: setTempDesc, placeholder: placeholderDesc, className: 'desc-mode h2l-tm-editor' })), el('div', { className: 'h2l-editable-actions' }, el('button', { className: 'h2l-btn-cancel', onClick: handleCancel }, 'İptal'), el('button', { className: 'h2l-btn-save', onClick: handleSave, disabled: !tempTitle.trim() }, 'Kaydet'))); }
        return el('div', { className: 'h2l-unified-editor view', onClick: () => setIsEditing(true) }, el('div', { className: 'h2l-view-title', dangerouslySetInnerHTML: { __html: title || placeholderTitle } }), el('div', { className: 'h2l-view-desc h2l-rich-content', style: { display: description ? 'block' : 'none' }, dangerouslySetInnerHTML: { __html: description } }), !description && el('div', { className: 'h2l-view-desc placeholder' }, placeholderDesc));
    };

    const SubtaskRow = ({ task, onUpdate, onDelete, onOpen }) => {
        const [isCompleted, setIsCompleted] = useState(task.status === 'completed');
        const toggleComplete = () => { const newStatus = isCompleted ? 'in_progress' : 'completed'; setIsCompleted(!isCompleted); onUpdate(task.id, { status: newStatus }); };
        return el('div', { className: 'h2l-subtask-row' }, 
            el('div', { className: `h2l-subtask-check ${isCompleted ? 'completed' : ''}`, onClick: toggleComplete, style: { background: isCompleted ? '#aaa' : 'transparent', borderColor: isCompleted ? '#aaa' : '#ccc' } }, isCompleted && el(Icon, { name: 'check', style: { fontSize: 10, color: '#fff' } })), 
            el('div', { 
                className: `h2l-subtask-content ${isCompleted ? 'completed' : ''}`, 
                contentEditable: true, 
                onBlur: (e) => { if(e.target.innerHTML !== task.title) onUpdate(task.id, { title: e.target.innerHTML }); }, 
                suppressContentEditableWarning: true,
                dangerouslySetInnerHTML: { __html: task.title }
            }), 
            el('div', { className: 'h2l-subtask-actions' }, el(Icon, { name: 'arrow-up-right-from-square', style: { cursor: 'pointer', color: '#888', marginRight: 10, fontSize: 12 }, title: 'Görevi Aç', onClick: (e) => { e.stopPropagation(); onOpen(); } }), el(Icon, { name: 'xmark', style: { cursor: 'pointer', color: '#ccc' }, title: 'Sil', onClick: () => onDelete(task.id) }))
        );
    };

    // --- MAIN MODAL ---
    const TaskDetailModal = ({ task, tasks = [], onClose, onUpdate, onDelete, onAdd, users, projects, sections, labels = [], navigate }) => { 
        const [comments, setComments] = useState([]);
        const [subtasks, setSubtasks] = useState([]); 
        const [isScrolled, setIsScrolled] = useState(false);
        const [activePopup, setActivePopup] = useState(null);
        const [popoverSearch, setPopoverSearch] = useState('');
        const [newLocation, setNewLocation] = useState('');
        const [showSubtaskInput, setShowSubtaskInput] = useState(false);
        const scrollRef = useRef(null);
        
        const currentIndex = tasks.findIndex(t => t.id === task.id);
        const prevTask = currentIndex > 0 ? tasks[currentIndex - 1] : null;
        const nextTask = currentIndex !== -1 && currentIndex < tasks.length - 1 ? tasks[currentIndex + 1] : null;

        const updateField = (fields) => onUpdate(task.id, fields);

        const loadComments = () => { apiFetch({ path: `/h2l/v1/comments?task_id=${task.id}` }).then(setComments); };
        
        const loadSubtasks = () => {
            apiFetch({ path: `/h2l/v1/tasks?parent_task_id=${task.id}` }).then(setSubtasks);
        };

        useEffect(() => {
            loadComments();
            loadSubtasks();
            setActivePopup(null);
            setShowSubtaskInput(false);
        }, [task.id]);

        useEffect(() => {
            const handleScroll = () => { if (scrollRef.current) { setIsScrolled(scrollRef.current.scrollTop > 40); } };
            const div = scrollRef.current; if (div) div.addEventListener('scroll', handleScroll);
            const handleClickOutside = (e) => { if (activePopup && !e.target.closest('.h2l-popover-menu') && !e.target.closest('.clickable-trigger')) { setActivePopup(null); } };
            document.addEventListener('mousedown', handleClickOutside);
            return () => { if (div) div.removeEventListener('scroll', handleScroll); document.removeEventListener('mousedown', handleClickOutside); };
        }, [activePopup]);

        const handleAddComment = (content) => { apiFetch({ path: '/h2l/v1/comments', method: 'POST', data: { task_id: task.id, content } }).then((newComment) => { setComments([...comments, newComment]); }); };
        const handleDeleteComment = (cid) => { apiFetch({ path: `/h2l/v1/comments/${cid}`, method: 'DELETE' }).then(() => { setComments(comments.filter(c => c.id !== cid)); }); };
        const handleUpdateComment = (cid, newContent) => { apiFetch({ path: `/h2l/v1/comments/${cid}`, method: 'POST', data: { content: newContent } }).then((updatedComment) => { setComments(comments.map(c => c.id === cid ? updatedComment : c)); }); };

        const handleAddSubtask = (data) => {
            const subtaskData = { ...data, parent_task_id: task.id, project_id: task.project_id };
            onAdd(subtaskData).then(() => {
                loadSubtasks(); 
                // Görev eklendikten sonra input açık kalsın ki art arda ekleme yapılabilsin
            });
        };

        const handleUpdateSubtask = (sid, data) => { onUpdate(sid, data).then(() => loadSubtasks()); };
        const handleDeleteSubtask = (sid) => { if(confirm('Alt görevi silmek istiyor musunuz?')) { onDelete(sid).then(() => loadSubtasks()); } };
        const handleDuplicateTask = () => { if(onAdd) { const duplicateData = { title: task.title, content: task.content, project_id: task.project_id, section_id: task.section_id, priority: task.priority, labels: task.labels ? task.labels.map(l => l.name) : [], status: 'in_progress' }; onAdd(duplicateData); setActivePopup(null); } };
        const handleCopyLink = () => { const url = `${window.location.origin}/gorevler/gorev/${task.id}`; if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(() => alert('Link kopyalandı!')); } else { const ta = document.createElement("textarea"); ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); alert('Link kopyalandı!'); } setActivePopup(null); };
        const scrollToComments = () => { if (scrollRef.current) { scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); } };

        const currentProject = projects.find(p => p.id == task.project_id) || {};
        const currentStatusObj = TASK_STATUSES[task.status] || TASK_STATUSES['in_progress'];

        // --- POPOVER MENÜLER ---
        const renderProjectMenu = () => {
            const filtered = projects.filter(p => p.title.toLowerCase().includes(popoverSearch.toLowerCase()));
            return el('div', { className: 'h2l-popover-menu right-aligned' },
                el('div', { className: 'h2l-popover-header' }, 
                    el('input', { className: 'h2l-search-input', placeholder: 'Proje ara...', value: popoverSearch, onChange: e => setPopoverSearch(e.target.value), autoFocus: true, onClick:e=>e.stopPropagation() })
                ),
                el('div', { className: 'h2l-popover-list', style: { maxHeight: 200 } },
                    filtered.map(p => el('div', { key: p.id, className: 'h2l-menu-item', onClick: () => { updateField({ projectId: p.id }); setActivePopup(null); setPopoverSearch(''); } },
                        el('span', { style: { color: p.color, marginRight: 8 } }, '#'),
                        p.title,
                        parseInt(task.project_id) === parseInt(p.id) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })
                    ))
                )
            );
        };

        const renderAssigneeMenu = () => {
            let eligibleUsers = users;
            if (currentProject && currentProject.id) {
                let mgrs = currentProject.managers || [];
                if (typeof mgrs === 'string') mgrs = JSON.parse(mgrs);
                const pMembers = [parseInt(currentProject.owner_id), ...mgrs.map(id => parseInt(id))].filter(Boolean);
                if (pMembers.length > 0) eligibleUsers = users.filter(u => pMembers.includes(parseInt(u.id)));
            }
            const filtered = eligibleUsers.filter(u => u.name.toLowerCase().includes(popoverSearch.toLowerCase()));
            
            return el('div', { className: 'h2l-popover-menu right-aligned', style: { width: 260 } },
                el('div', { className: 'h2l-popover-header' }, 
                    el('input', { className: 'h2l-search-input', placeholder: 'Kişi ara...', value: popoverSearch, onChange: e => setPopoverSearch(e.target.value), autoFocus: true, onClick:e=>e.stopPropagation() })
                ),
                el('div', { className: 'h2l-popover-list' },
                    filtered.map(u => {
                        const currentAssignees = task.assignees ? task.assignees.map(Number) : [];
                        const isAssigned = currentAssignees.includes(Number(u.id));
                        return el('div', { 
                            key: u.id, 
                            className: 'h2l-menu-item', 
                            onClick: (e) => {
                                e.stopPropagation();
                                let newAssignees;
                                if (isAssigned) {
                                    newAssignees = currentAssignees.filter(id => id !== Number(u.id));
                                } else {
                                    newAssignees = [...currentAssignees, Number(u.id)];
                                }
                                updateField({ assignees: newAssignees });
                            } 
                        },
                            el(Avatar, { userId: u.id, users, size: 20, style:{marginRight:8} }),
                            u.name,
                            isAssigned && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })
                        );
                    }),
                    el('div', { className: 'h2l-menu-separator' }),
                    el('div', { className: 'h2l-menu-item text-danger', onClick: () => { updateField({ assignees: [] }); setActivePopup(null); } }, 'Tümünü Kaldır')
                )
            );
        };

        const renderStatusMenu = () => {
            return el('div', { className: 'h2l-popover-menu right-aligned' },
                el('div', { className: 'h2l-popover-list' },
                    Object.entries(TASK_STATUSES).map(([key, val]) => 
                        el('div', { key: key, className: 'h2l-menu-item', onClick: () => { updateField({ status: key }); setActivePopup(null); } },
                            el(Icon, { name: val.icon, style: { color: val.color, marginRight: 8 } }),
                            val.label,
                            task.status === key && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } })
                        )
                    )
                )
            );
        };

        const renderLabelMenu = () => {
            const filtered = labels.filter(l => l.name.toLowerCase().includes(popoverSearch.toLowerCase()));
            const currentLabels = task.labels ? task.labels.map(l => l.name) : [];
            
            return el('div', { className: 'h2l-popover-menu right-aligned', style: { width: 220 } },
                el('div', { className: 'h2l-popover-header' }, 
                    el('input', { className: 'h2l-search-input', placeholder: 'Etiket ara...', value: popoverSearch, onChange: e => setPopoverSearch(e.target.value), autoFocus: true, onClick:e=>e.stopPropagation() })
                ),
                el('div', { className: 'h2l-popover-list' },
                    filtered.map(l => {
                        const isSelected = currentLabels.includes(l.name);
                        return el('div', { key: l.id, className: 'h2l-menu-item', onClick: (e) => { 
                            e.stopPropagation(); 
                            const newLabels = isSelected ? currentLabels.filter(n => n !== l.name) : [...currentLabels, l.name];
                            updateField({ labels: newLabels });
                        } },
                            el(Icon, { name: 'tag', style: { color: l.color || '#808080', marginRight: 8, fontSize: 12 } }),
                            l.name,
                            isSelected && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f', fontSize: 12 } })
                        );
                    }),
                    filtered.length === 0 && popoverSearch.trim() !== '' && el('div', { className: 'h2l-menu-item', onClick: () => { 
                        const newLabels = [...currentLabels, popoverSearch];
                        updateField({ labels: newLabels });
                        setPopoverSearch('');
                    } }, el(Icon, { name: 'plus', style: { marginRight: 8 } }), `"${popoverSearch}" oluştur`)
                )
            );
        };

        const renderLocationMenu = () => {
            return el('div', { className: 'h2l-popover-menu right-aligned', style: { padding: 10 } },
                el('div', { className: 'h2l-menu-title', style: { margin: '0 0 5px 0' } }, 'Konum Düzenle'),
                el('input', { 
                    className: 'h2l-input', style: { width: '100%', fontSize: 13 }, 
                    placeholder: 'Konum adı...', defaultValue: task.location || '',
                    onChange: e => setNewLocation(e.target.value),
                    onKeyDown: e => { if(e.key === 'Enter') { updateField({ location: newLocation }); setActivePopup(null); } },
                    autoFocus: true, onClick: e => e.stopPropagation()
                }),
                el('div', { style: { marginTop: 8, textAlign: 'right' } }, 
                    el('button', { className: 'h2l-btn primary small', onClick: () => { updateField({ location: newLocation }); setActivePopup(null); } }, 'Kaydet')
                )
            );
        };

        const renderActionsMenu = () => {
            return el('div', { className: 'h2l-popover-menu right-aligned top-aligned' },
                el('div', { className: 'h2l-menu-item', onClick: () => { setActivePopup(null); }, title: 'Bu göreve bir alt görev ekle' }, el(Icon, { name: 'arrow-turn-down-right', style:{marginRight:10, color:'#666', fontSize:14} }), 'Alt görev ekle'),
                el('div', { className: 'h2l-menu-item', onClick: handleCopyLink }, el(Icon, { name: 'link', style:{marginRight:10, color:'#666'} }), 'Bağlantıyı kopyala'),
                el('div', { className: 'h2l-menu-item', onClick: handleDuplicateTask }, el(Icon, { name: 'copy', style:{marginRight:10, color:'#666'} }), 'Kopya oluştur'),
                el('div', { className: 'h2l-menu-separator' }),
                el('div', { className: 'h2l-menu-item text-danger', onClick: () => { if(confirm('Görevi silmek istediğinize emin misiniz?')) onDelete(task.id); } }, el(Icon, { name: 'trash', style:{marginRight:10} }), 'Görevi Sil')
            );
        };

        return el('div', { className: 'h2l-detail-overlay', onClick: onClose },
            el('div', { className: 'h2l-task-modal', onClick: e => e.stopPropagation() },
                
                /* HEADER */
                el('div', { className: 'h2l-tm-header' },
                    el('div', { className: 'h2l-tm-breadcrumb' },
                        el('span', { className: `h2l-tm-proj-name ${isScrolled ? 'hidden-up' : ''}` }, 
                            el('span', { style: { color: currentProject.color || '#888', marginRight: 8 } }, '#'),
                            currentProject.title || 'Inbox'
                        ),
                        el('div', { className: `h2l-tm-task-name-scroll ${isScrolled ? 'visible-up' : ''}` }, task.title.replace(/<[^>]*>/g, ''))
                    ),
                    el('div', { className: 'h2l-tm-header-actions' },
                        el('button', { className: 'h2l-icon-btn', title: 'Önceki', disabled: !prevTask, style: { opacity: !prevTask ? 0.3 : 1, cursor: !prevTask ? 'default' : 'pointer' }, onClick: () => prevTask && navigate('/gorev/' + prevTask.id) }, el(Icon, { name: 'chevron-up' })),
                        el('button', { className: 'h2l-icon-btn', title: 'Sonraki', disabled: !nextTask, style: { opacity: !nextTask ? 0.3 : 1, cursor: !nextTask ? 'default' : 'pointer' }, onClick: () => nextTask && navigate('/gorev/' + nextTask.id) }, el(Icon, { name: 'chevron-down' })),
                        el('div', { className: 'h2l-sep-v' }),
                        el('div', { style:{position:'relative'} }, el('button', { className: 'h2l-icon-btn clickable-trigger', onClick: () => setActivePopup(activePopup === 'actions' ? null : 'actions') }, el(Icon, { name: 'ellipsis' })), activePopup === 'actions' && renderActionsMenu()),
                        el('button', { className: 'h2l-icon-btn', onClick: onClose }, el(Icon, { name: 'xmark', style: { fontSize: 18 } }))
                    )
                ),

                /* BODY */
                el('div', { className: 'h2l-tm-body' },
                    el('div', { className: 'h2l-tm-left-column' },
                        el('div', { className: 'h2l-tm-main', ref: scrollRef },
                            el('div', { className: 'h2l-tm-gutter' }, el('div', { className: `h2l-task-check minimal p${task.priority} ${task.status === 'completed' ? 'completed' : ''}`, onClick: () => updateField({ status: task.status === 'completed' ? 'in_progress' : 'completed' }) }, el(Icon, { name: 'check' }))),
                            el('div', { className: 'h2l-tm-content-col' },
                                el(TaskContentEditor, { title: task.title, description: task.content, placeholderTitle: 'Görev adı', placeholderDesc: 'Açıklama', onSave: (t, d) => updateField({ title: t, content: d }) }),
                                
                                /* SUBTASKS AREA */
                                el('div', { className: 'h2l-tm-subtasks-area' },
                                    subtasks.length > 0 && el('div', { className: 'h2l-subtask-list' }, 
                                        subtasks.map(st => el(SubtaskRow, { 
                                            key: st.id, 
                                            task: st, 
                                            onUpdate: handleUpdateSubtask, 
                                            onDelete: handleDeleteSubtask,
                                            onOpen: () => navigate('/gorev/' + st.id)
                                        }))
                                    ),
                                    !showSubtaskInput && el('div', { className: 'h2l-tm-add-subtask', onClick: () => setShowSubtaskInput(true) }, el(Icon, {name:'plus'}), ' Alt görev ekle'),
                                    
                                    // --- DÜZELTİLDİ: QuickAddContainer yerine doğrudan TaskEditor ---
                                    showSubtaskInput && el('div', { className: 'h2l-subtask-editor-wrapper', style: { marginTop: 10 } }, 
                                        el(TaskEditor, { 
                                            mode: 'add',
                                            initialData: { 
                                                project_id: task.project_id, 
                                                section_id: task.section_id, 
                                                parent_task_id: task.id 
                                            },
                                            users, projects, sections, 
                                            onSave: handleAddSubtask,
                                            onCancel: () => setShowSubtaskInput(false),
                                            labels 
                                        })
                                    )
                                ),
                                
                                el('div', { className: 'h2l-tm-activity-stream' },
                                    el('div', { className: 'h2l-tm-comments-header' }, el('span', null, 'Yorumlar'), el('span', { className: 'h2l-tm-badge' }, comments.length)),
                                    comments.length === 0 && el('div', { style: { color: '#ccc', fontSize: '13px', padding: '20px 0', textAlign: 'center', fontStyle: 'italic' } }, 'Henüz yorum yapılmamıştır'),
                                    comments.map(c => el(CommentItem, { key: c.id, comment: c, user: users.find(u => u.id == c.user_id), onDelete: handleDeleteComment, onUpdate: handleUpdateComment }))
                                )
                            )
                        ),
                        el('div', { className: 'h2l-tm-footer' }, el(CommentInput, { onSend: handleAddComment, currentUser: window.h2lFrontendSettings.currentUser, users: users, scrollToView: scrollToComments }))
                    ),
                    /* RIGHT SIDEBAR */
                    el('div', { className: 'h2l-tm-sidebar' },
                        el('div', { className: 'h2l-tm-sidebar-inner' },
                            el(SidebarRow, { label: 'Proje', value: currentProject.title || 'Projesiz', icon: 'hashtag', color: currentProject.color, activeKey: activePopup === 'project' ? 'project' : null, onTogglePopup: () => { setPopoverSearch(''); setActivePopup(activePopup === 'project' ? null : 'project'); }, renderPopupContent: renderProjectMenu }),
                            el(SidebarRow, { label: 'Atanan kişiler', activeKey: activePopup === 'assignee' ? 'assignee' : null, customContent: el(SidebarAssigneeList, { assigneeIds: task.assignees, users, onOpenMenu: (e) => { e.stopPropagation(); setPopoverSearch(''); setActivePopup(activePopup === 'assignee' ? null : 'assignee'); } }), renderPopupContent: renderAssigneeMenu }),
                            
                            // YENİ: CRM Selector Ekle
                            el(SidebarCRMSelector, { 
                                relatedType: task.related_object_type, 
                                relatedId: task.related_object_id, 
                                relatedTitle: task.related_object_title,
                                relatedLink: task.related_object_link,
                                onUpdate: updateField
                            }),

                            el('div', { className: 'h2l-tm-sidebar-group' }, el('div', { className: 'h2l-tm-sb-label' }, 'Tarih'), el('div', { className: 'h2l-tm-sb-value', style: { padding: 0 } }, el(SidebarDatePicker, { date: task.due_date, repeat: task.recurrence_rule, onChange: (d, r) => updateField({ dueDate: d, repeat: r }) }))),
                            el('div', { className: 'h2l-tm-sidebar-group' }, el('div', { className: 'h2l-tm-sb-label' }, 'Öncelik'), el(SidebarPrioritySelector, { priority: task.priority, onChange: (p) => updateField({ priority: p }) })),
                            el(SidebarRow, { label: 'Hatırlatıcılar', value: (task.reminder_enabled == 1) ? 'Açık' : 'Kapalı', icon: 'bell', color: (task.reminder_enabled == 1) ? '#db4c3f' : '#aaa', isClickable: true, onTogglePopup: () => updateField({ reminder_enabled: (task.reminder_enabled == 1) ? 0 : 1 }) }),
                            el(SidebarRow, { label: 'Durum', value: currentStatusObj.label, icon: currentStatusObj.icon, color: currentStatusObj.color, activeKey: activePopup === 'status' ? 'status' : null, onTogglePopup: () => setActivePopup(activePopup === 'status' ? null : 'status'), renderPopupContent: renderStatusMenu }),
                            el('div', { className: 'h2l-tm-sidebar-group' }, el('div', { className: 'h2l-tm-sb-label' }, 'Etiketler', el(Icon, { name: 'plus', style: { fontSize: 12, cursor: 'pointer' }, className: 'clickable-trigger', onClick: (e) => { e.stopPropagation(); setPopoverSearch(''); setActivePopup(activePopup==='labels'?null:'labels'); } })), el('div', { className: 'h2l-tm-tags-container' }, (task.labels && task.labels.length > 0) ? task.labels.map(l => el('span', { key: l.id || l, className: 'h2l-tm-tag' }, (typeof l === 'string' ? l : l.name), el(Icon,{name:'xmark', style:{marginLeft:5, fontSize:10, cursor:'pointer'}, onClick: (e) => { e.stopPropagation(); updateField({ labels: task.labels.map(lbl=>lbl.name).filter(n => n !== (l.name || l)) }); } }))) : el('span', { className: 'h2l-tm-no-val' }, 'Etiket yok')), activePopup === 'labels' && renderLabelMenu()),
                            el('div', { className: 'h2l-tm-sb-separator' }),
                            el(SidebarRow, { label: 'Konum', value: task.location || 'Konum ekle', icon: 'location-dot', color: task.location ? '#202020' : '#aaa', activeKey: activePopup === 'location' ? 'location' : null, onTogglePopup: () => { setNewLocation(task.location || ''); setActivePopup(activePopup === 'location' ? null : 'location'); }, renderPopupContent: renderLocationMenu }),
                            el('div', { className: 'h2l-tm-sb-separator' }),
                            el('div', { className: 'h2l-tm-meta-info' }, `Oluşturuldu: ${task.created_at.split(' ')[0]}`)
                        )
                    )
                )
            )
        );
    };

    window.H2L.TaskModal = { TaskDetailModal };

})(window.wp);