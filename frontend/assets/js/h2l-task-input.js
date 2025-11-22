(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { 
        getPriorityColor: () => '#808080', 
        cleanTaskTitle: (t) => t, 
        calculateDateFromText: () => null 
    };
    const { getPriorityColor, cleanTaskTitle, calculateDateFromText } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    // --- CONTENT EDITABLE BİLEŞENİ ---
    // Bu bileşen "Uncontrolled" çalışır. React sadece başlangıç değerini verir.
    // Sonrasındaki değişiklikleri DOM kendi yönetir, React state'i takip eder ama render'a zorlamaz.
    const ContentEditable = ({ html, onChange, placeholder, className, autoFocus, onKeyDown }) => {
        const contentEditableRef = useRef(null);
        const lastHtml = useRef(html);

        // Sadece ilk render'da içeriği ata
        useEffect(() => {
            if (contentEditableRef.current) {
                contentEditableRef.current.innerText = html;
            }
        }, []); // Boş dependency array = sadece mount anında

        // Dışarıdan gelen html değişirse (örn: temizleme), ve odak bizde değilse güncelle
        useEffect(() => {
            if (contentEditableRef.current && html !== lastHtml.current && document.activeElement !== contentEditableRef.current) {
                contentEditableRef.current.innerText = html;
                lastHtml.current = html;
            }
        }, [html]);

        useEffect(() => {
            if (autoFocus && contentEditableRef.current) {
                contentEditableRef.current.focus();
            }
        }, []);

        const handleInput = (e) => {
            const text = e.target.innerText;
            lastHtml.current = text;
            onChange(text);
        };

        const handleKeyDownLocal = (e) => {
            if (onKeyDown) onKeyDown(e);
        };

        return el('div', {
            ref: contentEditableRef,
            className: `h2l-content-editable ${className}`,
            contentEditable: true,
            onInput: handleInput,
            onKeyDown: handleKeyDownLocal,
            'data-placeholder': placeholder,
            suppressContentEditableWarning: true,
            
            // --- KESİN ÇÖZÜM: Inline Style & Attribute ---
            dir: "ltr",
            style: { 
                direction: 'ltr', 
                textAlign: 'left', 
                unicodeBidi: 'normal', // Isolate yerine normal daha güvenli olabilir bu noktada
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
            }
        });
    };

    // --- TEXT SELECTION TOOLTIP ---
    const TextTooltip = ({ position, onFormat }) => {
        if (!position) return null;
        return el('div', { className: 'h2l-tooltip-popover', style: { left: position.left, top: position.top }, onMouseDown: e => e.preventDefault() },
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('bold') }, el(Icon, {name:'bold'})),
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('italic') }, el(Icon, {name:'italic'})),
            el('div', { className: 'h2l-tooltip-divider' }),
            el('button', { className: 'h2l-tooltip-btn', onClick: () => onFormat('link') }, el(Icon, {name:'link'}))
        );
    };

    // --- ANA EDİTÖR ---
    const TaskEditor = ({ mode = 'add', initialData = {}, users = [], projects = [], activeProjectId = 0, onSave, onCancel }) => {
        // State
        const [title, setTitle] = useState(initialData.title || '');
        const [description, setDescription] = useState(initialData.content || '');
        const [priority, setPriority] = useState(initialData.priority || 4);
        const [assigneeId, setAssigneeId] = useState(initialData.assignees && initialData.assignees.length > 0 ? initialData.assignees[0] : null);
        const [dueDate, setDueDate] = useState(initialData.due_date ? initialData.due_date.split(' ')[0] : '');
        const [status, setStatus] = useState(initialData.status || 'open');
        const [projectId, setProjectId] = useState(initialData.project_id || activeProjectId);
        
        const [activePopup, setActivePopup] = useState(null);
        const [tooltipPos, setTooltipPos] = useState(null); 
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        useEffect(() => {
            const handleClickOutside = (event) => { 
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    if(!event.target.closest('.h2l-tooltip-popover')) {
                        setActivePopup(null);
                    }
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);

        useEffect(() => {
            const handleSelection = () => {
                const selection = window.getSelection();
                if (!selection.isCollapsed && wrapperRef.current && wrapperRef.current.contains(selection.anchorNode)) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setTooltipPos({ 
                        left: rect.left + (rect.width / 2) - 40,
                        top: rect.top - 45 
                    });
                } else {
                    setTooltipPos(null);
                }
            };
            document.addEventListener('selectionchange', handleSelection);
            return () => document.removeEventListener('selectionchange', handleSelection);
        }, []);

        useEffect(() => {
            if (mode === 'edit' || !title) return;
            const pMatch = title.match(/(?:^|\s)p([1-4])(?:$|\s)/i);
            if (pMatch) setPriority(parseInt(pMatch[1]));
            if (calculateDateFromText) {
                const detectedDate = calculateDateFromText(title);
                if (detectedDate) setDueDate(detectedDate);
            }
            const userMatch = title.match(/(?:^|\s)@(\w+)/i);
            if (userMatch && users.length > 0) {
                const searchName = userMatch[1].toLowerCase();
                const foundUser = users.find(u => u.name.toLowerCase().includes(searchName));
                if (foundUser) setAssigneeId(foundUser.id);
            }
        }, [title, users]);

        const handleSubmit = () => {
            if(title.trim() && title.length <= MAX_CHARS) {
                const cleanTitle = cleanTaskTitle(title);
                const taskData = { 
                    id: initialData.id, 
                    title: cleanTitle, 
                    content: description, 
                    priority, 
                    assignees: assigneeId ? [assigneeId] : [], 
                    dueDate, 
                    status, 
                    projectId 
                };
                onSave(taskData);
                
                if(mode === 'add') {
                    // Formu temizle (State + DOM)
                    setTitle(''); 
                    setDescription(''); 
                    setPriority(4); 
                    setAssigneeId(null); 
                    setDueDate('');
                    // DOM'u manuel temizle (Uncontrolled olduğu için)
                    const titleEl = wrapperRef.current.querySelector('.h2l-content-editable.title-mode');
                    if(titleEl) titleEl.innerText = '';
                    const descEl = wrapperRef.current.querySelector('.h2l-content-editable.desc-mode');
                    if(descEl) descEl.innerText = '';
                }
            }
        };

        const handleFormat = (type) => {
            document.execCommand(type, false, null);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
            if (e.key === 'Escape') onCancel();
        };

        const renderPopup = () => {
            if (!activePopup) return null;
            const popupStyle = { top: '100%', left: 0, marginTop: 5 };
            
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu', style: popupStyle }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') {
                const today = new Date().toISOString().split('T')[0]; const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                return el('div', { className: 'h2l-popover-menu', style: { ...popupStyle, padding: 10 } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(today); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#058527', marginRight:8}}), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(tomorrow); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#eb8909', marginRight:8}}), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: 5 } }, el('input', { type: 'date', className: 'h2l-input', value: dueDate, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } })));
            }
            if (activePopup === 'project') return el('div', { className: 'h2l-popover-menu', style: { bottom: '100%', top: 'auto', marginBottom: 5, left: 0 } }, el('div', { className: 'h2l-menu-title' }, 'Proje Seç'), projects.map(p => el('div', { key: p.id, className: 'h2l-menu-item', onClick: () => { setProjectId(p.id); setActivePopup(null); } }, el('span', { style: { color: p.color, marginRight: 8, fontSize: 14 } }, '#'), p.title, parseInt(projectId) === parseInt(p.id) && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'status') {
                const statuses = { 'open': 'Açık', 'in_progress': 'Devam Ediyor', 'completed': 'Tamamlandı' };
                return el('div', { className: 'h2l-popover-menu', style: popupStyle }, Object.keys(statuses).map(k => el('div', { key: k, className: 'h2l-menu-item', onClick: () => { setStatus(k); setActivePopup(null); } }, el(Icon, { name: k === 'completed' ? 'check-circle' : 'circle', style: { marginRight: 8, color: '#888' } }), statuses[k], status === k && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            }
        };

        const selectedUser = assigneeId ? users.find(u => parseInt(u.id) === parseInt(assigneeId)) : null;
        const selectedProject = projects.find(p => parseInt(p.id) === parseInt(projectId));
        const isLimitExceeded = title.length > MAX_CHARS;

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef },
            tooltipPos && el(TextTooltip, { position: tooltipPos, onFormat: handleFormat }),

            el('div', { className: 'h2l-todoist-editor-body' },
                el(ContentEditable, { 
                    html: initialData.title || '', // Initial değer
                    onChange: setTitle, 
                    placeholder: mode === 'add' ? 'Görev adı örn: Toplantı p1 yarın @ali' : 'Görev adı', 
                    className: 'title-mode', 
                    autoFocus: true, 
                    onKeyDown: handleKeyDown 
                }),
                
                el(ContentEditable, { 
                    html: initialData.content || '', 
                    onChange: setDescription, 
                    placeholder: 'Açıklama', 
                    className: 'desc-mode' 
                }),
                
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Karakter Sınırı: ${title.length}/${MAX_CHARS}`),

                el('div', { className: 'h2l-todoist-chips-area' },
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date') }, el(Icon, {name:'calendar'}), dueDate || 'Tarih'), activePopup === 'date' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 6, verticalAlign:'middle' } }), selectedUser.name] : [el(Icon, {name:'user'}), 'Atanan kişi']), activePopup === 'assignee' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` Öncelik ${priority !== 4 ? priority : ''}`), activePopup === 'priority' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip disabled' }, el(Icon, {name:'clock'}), ' Hatırlatıcılar')),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'status' ? null : 'status') }, el(Icon, {name:'spinner'}), status === 'open' ? ' Status' : ` ${status}`), activePopup === 'status' && renderPopup()),
                    el('div', { className: 'h2l-chip-wrapper' }, el('button', { className: 'h2l-todoist-chip icon-only' }, el(Icon, {name:'ellipsis'})))
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-chip-wrapper' }, el('div', { className: 'h2l-todoist-project-selector', onClick: () => setActivePopup(activePopup === 'project' ? null : 'project') }, selectedProject ? el('span', {style:{color:selectedProject.color}}, '#') : el(Icon, {name:'inbox'}), el('span', null, selectedProject ? selectedProject.title : 'Proje Seç'), el(Icon, {name:'angle-down', style:{fontSize:10, marginLeft:4}})), activePopup === 'project' && renderPopup()),
                el('div', { className: 'h2l-todoist-footer-actions' }, el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'), el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !title.trim() || isLimitExceeded }, mode === 'add' ? 'Görev ekle' : 'Kaydet'))
            )
        );
    };

    const QuickAddTrigger = ({ onOpen }) => {
        return el('div', { className: 'h2l-todoist-add-trigger', onClick: onOpen }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
    };

    window.H2L.TaskInput = { TaskEditor, QuickAddTrigger };

})(window.wp);