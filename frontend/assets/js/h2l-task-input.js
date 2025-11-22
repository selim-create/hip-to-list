(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    
    // Bağımlılıkları kontrol et ve al
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null };
    const { Icon, Avatar } = Common;
    
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { 
        getPriorityColor: () => '#808080', 
        cleanTaskTitle: (t) => t, 
        renderRichText: (t) => t,
        calculateDateFromText: () => null 
    };
    const { getPriorityColor, cleanTaskTitle, renderRichText, calculateDateFromText } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.TaskInput = window.H2L.TaskInput || {};

    // --- 1. YARDIMCI UI BİLEŞENLERİ (TextTooltip, RichInput) ---

    const TextTooltip = ({ position, onFormat }) => {
        const [mode, setMode] = useState('options'); 
        const [url, setUrl] = useState('');
        const inputRef = useRef(null);

        useEffect(() => { if(mode === 'link' && inputRef.current) inputRef.current.focus(); }, [mode]);
        if (!position) return null;

        const handleLinkSubmit = (e) => {
            e.preventDefault();
            if(url.trim()) { onFormat('link', url); setMode('options'); setUrl(''); }
        };

        return el('div', { className: 'h2l-tooltip-popover', style: { left: position.left, top: position.top - 45 }, onMouseDown: (e) => e.preventDefault() },
            mode === 'options' ? [
                el('button', { key:'b', className: 'h2l-tooltip-btn', title:'Kalın', onClick: (e) => { e.preventDefault(); onFormat('bold'); } }, el(Icon, {name:'bold'})),
                el('button', { key:'i', className: 'h2l-tooltip-btn', title:'İtalik', onClick: (e) => { e.preventDefault(); onFormat('italic'); } }, el(Icon, {name:'italic'})),
                el('button', { key:'s', className: 'h2l-tooltip-btn', title:'Üstü Çizili', onClick: (e) => { e.preventDefault(); onFormat('strike'); } }, el(Icon, {name:'strikethrough'})),
                el('div', { key:'d', className: 'h2l-tooltip-divider' }),
                el('button', { key:'l', className: 'h2l-tooltip-btn', title:'Bağlantı', onClick: (e) => { e.preventDefault(); setMode('link'); } }, el(Icon, {name:'link'}))
            ] : [
                el('div', { key:'link-form', className:'h2l-tooltip-link-area' },
                    el('input', { ref: inputRef, className: 'h2l-tooltip-input', placeholder: 'https://...', value: url, onChange: e => setUrl(e.target.value), onKeyDown: e => { if(e.key === 'Enter') handleLinkSubmit(e); if(e.key === 'Escape') setMode('options'); } }),
                    el('button', { className: 'h2l-tooltip-btn', onClick: handleLinkSubmit }, el(Icon, {name:'check'})),
                    el('button', { className: 'h2l-tooltip-btn', onClick: () => setMode('options') }, el(Icon, {name:'xmark'}))
                )
            ]
        );
    };

    const RichInput = ({ value, onChange, placeholder, mode = 'title', onKeyDown, autoFocus, onSelectExtras }) => {
        const [tooltipPos, setTooltipPos] = useState(null);
        const inputRef = useRef(null);
        const highlightRef = useRef(null);

        const handleScroll = (e) => { if (highlightRef.current) highlightRef.current.scrollTop = e.target.scrollTop; };
        
        const handleAutoResize = (e) => { 
            const target = e.target || inputRef.current;
            if(target) {
                target.style.height = 'auto'; 
                target.style.height = target.scrollHeight + 'px'; 
            }
        };

        useEffect(() => { 
            if(autoFocus && inputRef.current) { 
                inputRef.current.focus(); 
                handleAutoResize({}); 
            } 
        }, []);

        const handleSelect = (e) => {
            const input = e.target;
            if (input.selectionStart !== input.selectionEnd) {
                const charWidth = 8; 
                const selectionCenter = (input.selectionStart + input.selectionEnd) / 2;
                let leftOffset = Math.min(selectionCenter * charWidth, input.offsetWidth - 100);
                leftOffset = Math.max(leftOffset, 100);
                setTooltipPos({ left: leftOffset, top: 0 });
            } else { setTooltipPos(null); }
            if(onSelectExtras) onSelectExtras(e);
        };

        const applyFormat = (type, linkUrl = '') => {
            const input = inputRef.current; if (!input) return;
            const start = input.selectionStart; const end = input.selectionEnd;
            const selectedText = value.substring(start, end);
            let newText = value; let newCursorPos = end;

            if (type === 'bold') { newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end); newCursorPos += 4; }
            else if (type === 'italic') { newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end); newCursorPos += 2; }
            else if (type === 'strike') { newText = value.substring(0, start) + `~~${selectedText}~~` + value.substring(end); newCursorPos += 4; }
            else if (type === 'link') { newText = value.substring(0, start) + `[${selectedText}](${linkUrl})` + value.substring(end); newCursorPos = newText.length; }

            onChange(newText); setTooltipPos(null);
            setTimeout(() => { input.focus(); input.setSelectionRange(newCursorPos, newCursorPos); handleAutoResize({}); }, 0);
        };

        return el('div', { className: `h2l-input-container ${mode === 'desc' ? 'description-mode' : ''}` },
            el('div', { className: `h2l-highlight-layer ${mode === 'desc' ? 'desc-mode' : 'title-mode'}`, ref: highlightRef }, renderRichText(value, mode)),
            el('textarea', { 
                ref: inputRef,
                className: `h2l-rich-textarea ${mode === 'desc' ? 'desc-mode' : 'title-mode'}`,
                placeholder: placeholder, 
                value: value, 
                onChange: (e) => { onChange(e.target.value); handleAutoResize(e); }, 
                onSelect: handleSelect, 
                onKeyDown: onKeyDown, 
                onScroll: handleScroll,
                rows: 1 
            }),
            tooltipPos && el(TextTooltip, { position: tooltipPos, onFormat: applyFormat })
        );
    };

    // --- 2. INLINE TASK EDITOR (Satır İçi Düzenleme) ---

    const InlineTaskEditor = ({ task, users, onSave, onCancel }) => {
        const [title, setTitle] = useState(task.title || '');
        const [description, setDescription] = useState(task.content || '');
        const [priority, setPriority] = useState(task.priority || 4);
        const [assigneeId, setAssigneeId] = useState(task.assignees && task.assignees.length > 0 ? task.assignees[0] : null);
        const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split(' ')[0] : '');
        
        const [activePopup, setActivePopup] = useState(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        useEffect(() => {
            const handleClickOutside = (event) => { 
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    if(event.target.closest('.h2l-tooltip-popover')) return;
                    setActivePopup(null);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);

        const handleSubmit = () => {
            if(title.trim() && title.length <= MAX_CHARS) {
                const cleanTitle = cleanTaskTitle(title);
                onSave({ id: task.id, title: cleanTitle, content: description, priority, assignees: assigneeId ? [assigneeId] : [], dueDate });
            }
        };

        const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } if (e.key === 'Escape') onCancel(); };

        const renderPopupContent = () => {
            if (!activePopup) return null;
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu top-aligned' }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu top-aligned' }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') {
                const today = new Date().toISOString().split('T')[0]; const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                return el('div', { className: 'h2l-popover-menu top-aligned', style:{ padding: '10px' } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(today); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#27ae60', marginRight:8}}), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(tomorrow); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#e67e22', marginRight:8}}), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: '5px' } }, el('input', { type: 'date', className: 'h2l-input', style: { fontSize: '12px', padding: '4px' }, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } })));
            }
        };

        const selectedUser = assigneeId ? users.find(u => parseInt(u.id) === parseInt(assigneeId)) : null;
        const charCount = title.length; const isLimitExceeded = charCount > MAX_CHARS;

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef, style: { marginLeft: 28 } },
            el('div', { className: 'h2l-todoist-editor-body' },
                el(RichInput, { 
                    value: title, onChange: setTitle, placeholder: 'Görev adı', mode: 'title', autoFocus: true, onKeyDown: handleKeyDown
                }),
                el(RichInput, { 
                    value: description, onChange: setDescription, placeholder: 'Açıklama', mode: 'desc'
                }),
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Limit aşıldı: ${charCount} / ${MAX_CHARS}`),
                el('div', { className: 'h2l-todoist-chips-area' },
                    el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date'), style: dueDate ? { color: '#db4c3f', borderColor: '#db4c3f', background: '#fff5f5' } : {} }, el(Icon, {name:'calendar'}), dueDate ? ` ${dueDate}` : ' Tarih'),
                    el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 4, display:'inline-block', verticalAlign:'middle' } }), ` ${selectedUser.name}`] : [el(Icon, {name:'user'}), ' Atanan']),
                    el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` P${priority}`),
                    el('div', { style:{position:'relative', display:'inline-block'} }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'more' ? null : 'more') }, el(Icon, {name:'ellipsis'})), renderPopupContent())
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-todoist-footer-actions', style: { marginLeft: 'auto' } },
                    el('button', { className: 'h2l-todoist-btn-cancel', onClick: onCancel }, 'İptal'),
                    el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !title.trim() || isLimitExceeded }, 'Kaydet')
                )
            )
        );
    };

    // --- 3. QUICK ADD (Hızlı Ekle + NLP) ---
    const QuickAdd = ({ sectionId, onAdd, projectTitle = 'Proje Adı', users = [] }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const [description, setDescription] = useState('');
        const [priority, setPriority] = useState(4);
        const [assigneeId, setAssigneeId] = useState(null);
        const [dueDate, setDueDate] = useState('');
        const [activePopup, setActivePopup] = useState(null);
        const wrapperRef = useRef(null);
        const MAX_CHARS = 500;

        useEffect(() => {
            const handleClickOutside = (event) => { 
                if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                    if(event.target.closest('.h2l-tooltip-popover')) return;
                    setActivePopup(null);
                }
            };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);

        // NLP ALGILAMA (Tarih, Öncelik, Kişi)
        useEffect(() => {
            if (!title) return;
            
            // Öncelik (p1, p2...)
            const pMatch = title.match(/(?:^|\s)p([1-4])(?:$|\s)/i);
            if (pMatch) setPriority(parseInt(pMatch[1]));
            
            // Tarih (JS tabanlı anlık algılama)
            if (calculateDateFromText) {
                const detectedDate = calculateDateFromText(title);
                if (detectedDate) setDueDate(detectedDate);
            }

            // Kullanıcı (@kisi)
            const userMatch = title.match(/(?:^|\s)@(\w+)/i);
            if (userMatch && users.length > 0) {
                const searchName = userMatch[1].toLowerCase();
                const foundUser = users.find(u => u.name.toLowerCase().includes(searchName));
                if (foundUser) setAssigneeId(foundUser.id);
            }
        }, [title, users]);

        const handleSubmit = () => { 
            if(title.trim() && title.length <= MAX_CHARS) { 
                // Temizlenmiş başlığı gönder
                const cleanTitle = cleanTaskTitle(title);
                onAdd({ title: cleanTitle, content: description, sectionId, priority: priority, assignees: assigneeId ? [assigneeId] : [], dueDate: dueDate }); 
                setTitle(''); setDescription(''); setPriority(4); setAssigneeId(null); setDueDate(''); setActivePopup(null);
            } 
        };
        
        const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if(title.length <= MAX_CHARS) handleSubmit(); } if (e.key === 'Escape') { setIsEditing(false); setTitle(''); setDescription(''); } };

        const renderPopupContent = () => {
            if (!activePopup) return null;
            if (activePopup === 'priority') return el('div', { className: 'h2l-popover-menu top-aligned' }, [1, 2, 3, 4].map(p => el('div', { key: p, className: 'h2l-menu-item', onClick: () => { setPriority(p); setActivePopup(null); } }, el(Icon, { name: 'flag', style: { color: getPriorityColor(p), marginRight: 8 } }), `Öncelik ${p}`, priority === p && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'assignee') return el('div', { className: 'h2l-popover-menu top-aligned' }, el('div', { className: 'h2l-menu-item', onClick: () => { setAssigneeId(null); setActivePopup(null); } }, el(Icon, { name: 'user-xmark', style: { marginRight: 8 } }), 'Atamayı kaldır'), users.map(u => el('div', { key: u.id, className: 'h2l-menu-item', onClick: () => { setAssigneeId(u.id); setActivePopup(null); } }, el(Avatar, { userId: u.id, users, size: 20, style: { marginRight: 8 } }), u.name, assigneeId === u.id && el(Icon, { name: 'check', style: { marginLeft: 'auto', color: '#db4c3f' } }))));
            if (activePopup === 'date') {
                const today = new Date().toISOString().split('T')[0]; const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                return el('div', { className: 'h2l-popover-menu top-aligned', style:{ padding: '10px' } }, el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(today); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#27ae60', marginRight:8}}), 'Bugün'), el('div', { className: 'h2l-menu-item', onClick: () => { setDueDate(tomorrow); setActivePopup(null); } }, el(Icon, {name:'sun', style:{color:'#e67e22', marginRight:8}}), 'Yarın'), el('div', { style: { borderTop: '1px solid #eee', margin: '5px 0', paddingTop: '5px' } }, el('input', { type: 'date', className: 'h2l-input', style: { fontSize: '12px', padding: '4px' }, onChange: (e) => { setDueDate(e.target.value); setActivePopup(null); } })));
            }
            if (activePopup === 'more') return el('div', { className: 'h2l-popover-menu top-aligned' }, el('div', { className: 'h2l-menu-item' }, el(Icon,{name:'tag'}), ' Etiketler (Yakında)'), el('div', { className: 'h2l-menu-item' }, el(Icon,{name:'location-dot'}), ' Konum (Yakında)'));
        };

        if (!isEditing) return el('div', { className: 'h2l-todoist-add-trigger', onClick: () => setIsEditing(true) }, el('div', { className: 'h2l-todoist-btn-content' }, el('span', { className: 'plus-icon' }, el(Icon, { name: 'plus' })), 'Görev ekle'));
        
        const selectedUser = assigneeId ? users.find(u => parseInt(u.id) === parseInt(assigneeId)) : null;
        const charCount = title.length; const isLimitExceeded = charCount > MAX_CHARS;

        return el('div', { className: 'h2l-todoist-editor-wrapper', ref: wrapperRef },
            el('div', { className: 'h2l-todoist-editor-body' },
                el(RichInput, { value: title, onChange: setTitle, placeholder: 'Görev adı (Örn: Toplantı p1 yarın @ahmet)', mode: 'title', autoFocus: true, onKeyDown: handleKeyDown }),
                el(RichInput, { value: description, onChange: setDescription, placeholder: 'Açıklama', mode: 'desc' }),
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Limit aşıldı: ${charCount} / ${MAX_CHARS}`),
                el('div', { className: 'h2l-todoist-chips-area' },
                    el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date'), style: dueDate ? { color: '#db4c3f', borderColor: '#db4c3f', background: '#fff5f5' } : {} }, el(Icon, {name:'calendar'}), dueDate ? ` ${dueDate}` : ' Tarih'),
                    el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 4, display:'inline-block', verticalAlign:'middle' } }), ` ${selectedUser.name}`] : [el(Icon, {name:'user'}), ' Atanan']),
                    el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` P${priority}`),
                    el('div', { style:{position:'relative', display:'inline-block'} }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'more' ? null : 'more') }, el(Icon, {name:'ellipsis'})), renderPopupContent())
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-todoist-project-selector' }, el(Icon, {name:'list-check', style:{marginRight:5}}), projectTitle || 'Proje'),
                el('div', { className: 'h2l-todoist-footer-actions' }, el('button', { className: 'h2l-todoist-btn-cancel', onClick: () => setIsEditing(false) }, 'İptal'), el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !title.trim() || isLimitExceeded }, 'Görev ekle'))
            )
        );
    };

    // Modülü Dışarı Aktar
    window.H2L.TaskInput = {
        RichInput,
        InlineTaskEditor,
        QuickAdd,
        TextTooltip
    };

})(window.wp);