(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const apiFetch = wp.apiFetch;
    window.H2L = window.H2L || {};

    // 1. HELPER FUNCTIONS
    const getPriorityColor = (p) => {
        switch(parseInt(p)) {
            case 1: return '#d1453b';
            case 2: return '#eb8909';
            case 3: return '#246fe0';
            default: return '#808080';
        }
    };
    const Icon = ({ name, className = "", onClick, style, title }) => el('i', { className: `fa-solid fa-${name} ${className}`, onClick, style, title });
    const Avatar = ({ userId, users, size = 24, style={} }) => {
        if(!users) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        const finalStyle = { width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, display:'block', ...style };
        if(!user) return el('div', {className:'h2l-avatar-ph', style:{...finalStyle, background:'#ccc'}});
        return el('img', { src: user.avatar, style: finalStyle, title: user.name });
    };
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

    // 2. PARSERS
    const cleanTaskTitle = (text) => {
        let clean = text || "";
        clean = clean.replace(/(?:^|\s)p[1-4](?:$|\s)/gi, ' ');
        return clean.replace(/\s+/g, ' ').trim();
    };

    const renderRichText = (text, mode = 'display') => {
        if (!text) return null;
        
        // Mode 'desc' için de markdown stilleri uygulanır
        // Chips (p1, @user vb.) sadece title veya display modunda vurgulanabilir, 
        // ancak tutarlılık için desc modunda da bırakıyoruz (veya istenirse kaldırılabilir).
        
        const regex = /((?:^|\s)(?:p[1-4]|bugün|yarın|today|tomorrow|@\w+)(?=$|\s)|\*\*[^*]+\*\*|_[^_]+_|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/gi;
        
        return text.split(regex).map((part, index) => {
            if (!part) return null;
            
            // Chips
            if (part.match(/^(?:^|\s)(?:p[1-4]|bugün|yarın|today|tomorrow|@\w+)$/i)) {
                return el('span', { key: index, className: 'h2l-highlight-tag' }, part);
            }
            // Markdown Rules
            if (part.match(/^\*\*[^*]+\*\*$/)) return el('strong', { key: index, className: 'h2l-md-bold' }, part.slice(2, -2));
            if (part.match(/^\*[^*]+\*$/) || part.match(/^_[^_]+_$/)) return el('em', { key: index, className: 'h2l-md-italic' }, part.slice(1, -1));
            if (part.match(/^~~[^~]+~~$/)) return el('del', { key: index, className: 'h2l-md-strike' }, part.slice(2, -2));
            if (part.match(/^`[^`]+`$/)) return el('code', { key: index, className: 'h2l-md-code' }, part.slice(1, -1));
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return el('a', { 
                    key: index, href: linkMatch[2], className: 'h2l-md-link', target: '_blank', rel: 'noopener noreferrer',
                    onClick: (e) => { e.stopPropagation(); }, onMouseDown: (e) => e.stopPropagation()
                }, linkMatch[1]);
            }
            return part;
        });
    };

    // 3. COMPONENTS

    // --- TextTooltip (Formatlayıcı) ---
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
                el('button', { key:'u', className: 'h2l-tooltip-btn', title:'Altı Çizili', onClick: (e) => { e.preventDefault(); onFormat('underline'); } }, el(Icon, {name:'underline'})),
                el('div', { key:'d', className: 'h2l-tooltip-divider' }),
                el('button', { key:'c', className: 'h2l-tooltip-btn', title:'Kod', onClick: (e) => { e.preventDefault(); onFormat('code'); } }, el(Icon, {name:'code'})),
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

    // --- RichInput (Başlık ve Açıklama için Ortak Bileşen) ---
    const RichInput = ({ value, onChange, placeholder, mode = 'title', onKeyDown, autoFocus, onSelectExtras }) => {
        const [tooltipPos, setTooltipPos] = useState(null);
        const inputRef = useRef(null);
        const highlightRef = useRef(null);

        // Scroll senkronizasyonu
        const handleScroll = (e) => { if (highlightRef.current) highlightRef.current.scrollTop = e.target.scrollTop; };
        
        // Otomatik yükseklik
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

        // Metin seçimi ve Tooltip pozisyonu
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
            else if (type === 'underline') { newText = value.substring(0, start) + `<u>${selectedText}</u>` + value.substring(end); newCursorPos += 7; }
            else if (type === 'code') { newText = value.substring(0, start) + `\`${selectedText}\`` + value.substring(end); newCursorPos += 2; }
            else if (type === 'link') { newText = value.substring(0, start) + `[${selectedText}](${linkUrl})` + value.substring(end); newCursorPos = newText.length; }

            onChange(newText); setTooltipPos(null);
            setTimeout(() => { input.focus(); input.setSelectionRange(newCursorPos, newCursorPos); handleAutoResize({}); }, 0);
        };

        // Akıllı Yapıştırma (Smart Paste - HTML to Markdown)
        const handlePaste = (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            const html = clipboardData.getData('text/html');
            if (html) {
                e.preventDefault();
                const div = document.createElement('div');
                div.innerHTML = html;
                
                // Basic HTML to Markdown conversion
                let text = div.innerHTML;
                text = text.replace(/<b>(.*?)<\/b>/gi, '**$1**').replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
                text = text.replace(/<i>(.*?)<\/i>/gi, '*$1*').replace(/<em>(.*?)<\/em>/gi, '*$1*');
                text = text.replace(/<del>(.*?)<\/del>/gi, '~~$1~~').replace(/<s>(.*?)<\/s>/gi, '~~$1~~');
                text = text.replace(/<u>(.*?)<\/u>/gi, '<u>$1</u>');
                text = text.replace(/<code>(.*?)<\/code>/gi, '`$1`');
                text = text.replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)');
                text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''); // Tag temizliği
                
                const input = inputRef.current;
                const start = input.selectionStart;
                const end = input.selectionEnd;
                const newValue = value.substring(0, start) + text + value.substring(end);
                
                onChange(newValue);
                setTimeout(() => { handleAutoResize({}); }, 0);
            }
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
                onPaste: handlePaste, // Paste Listener
                rows: 1 
            }),
            tooltipPos && el(TextTooltip, { position: tooltipPos, onFormat: applyFormat })
        );
    };

    // --- InlineTaskEditor (Düzenleme Modu) ---
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
                const cleanTitle = title.replace(/(?:^|\s)p[1-4](?:$|\s)/gi, ' ').replace(/\s+/g, ' ').trim();
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
                    value: title, 
                    onChange: setTitle, 
                    placeholder: 'Görev adı',
                    mode: 'title',
                    autoFocus: true,
                    onKeyDown: handleKeyDown
                }),
                el(RichInput, { 
                    value: description, 
                    onChange: setDescription, 
                    placeholder: 'Açıklama',
                    mode: 'desc'
                }),
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Görev ismi karakter limiti: ${charCount} / ${MAX_CHARS}`),
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

    // --- TaskRow (Görüntüleme Modu) ---
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
                el('button', { className: 'h2l-icon-btn', title: 'Tarih', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'calendar' })),
                el('button', { className: 'h2l-icon-btn', title: 'Yorumlar', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'comment' })),
                assignee ? el('div', { style:{margin:'0 4px'} }, el(Avatar, { userId: assignee.id, users, size: 24 })) : el('button', { className: 'h2l-icon-btn', title: 'Ata', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'user' })),
                el('button', { className: 'h2l-icon-btn', title: 'Diğer', onClick: (e) => { e.stopPropagation(); } }, el(Icon, { name: 'ellipsis' }))
            )
        );
    };

    // --- QuickAdd (Ekleme Modu - RichInput Kullanan) ---
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

        // Live Parser (Sadece Title için)
        useEffect(() => {
            if (!title) return;
            const pMatch = title.match(/(?:^|\s)p([1-4])(?:$|\s)/i);
            if (pMatch) setPriority(parseInt(pMatch[1]));
            const dateMatch = title.match(/(?:^|\s)(bugün|yarın|today|tomorrow)(?:$|\s)/i);
            if (dateMatch) {
                const dKey = dateMatch[1].toLowerCase();
                const today = new Date(); let targetDate = new Date();
                if (dKey === 'yarın' || dKey === 'tomorrow') targetDate.setDate(today.getDate() + 1);
                setDueDate(targetDate.toISOString().split('T')[0]);
            }
            const userMatch = title.match(/(?:^|\s)@(\w+)/i);
            if (userMatch && users.length > 0) {
                const searchName = userMatch[1].toLowerCase();
                const foundUser = users.find(u => u.name.toLowerCase().includes(searchName) || u.name.toLowerCase().split(' ')[0].includes(searchName));
                if (foundUser) setAssigneeId(foundUser.id);
            }
        }, [title, users]);

        const handleSubmit = () => { 
            if(title.trim() && title.length <= MAX_CHARS) { 
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
                el(RichInput, { 
                    value: title, 
                    onChange: setTitle, 
                    placeholder: 'Görev adı (Örn: Toplantı p1 yarın @ahmet)',
                    mode: 'title',
                    autoFocus: true,
                    onKeyDown: handleKeyDown
                }),
                el(RichInput, { 
                    value: description, 
                    onChange: setDescription, 
                    placeholder: 'Açıklama',
                    mode: 'desc'
                }),
                
                isLimitExceeded && el('span', { className: 'h2l-char-counter limit-exceeded' }, `Görev ismi karakter limiti: ${charCount} / ${MAX_CHARS}`),
                
                el('div', { className: 'h2l-todoist-chips-area' },
                    el('button', { className: `h2l-todoist-chip ${dueDate ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'date' ? null : 'date'), style: dueDate ? { color: '#db4c3f', borderColor: '#db4c3f', background: '#fff5f5' } : {} }, el(Icon, {name:'calendar'}), dueDate ? ` ${dueDate}` : ' Tarih'),
                    el('button', { className: `h2l-todoist-chip ${assigneeId ? 'active' : ''}`, onClick: () => setActivePopup(activePopup === 'assignee' ? null : 'assignee') }, selectedUser ? [el(Avatar, { userId: assigneeId, users, size: 16, style: { marginRight: 4, display:'inline-block', verticalAlign:'middle' } }), ` ${selectedUser.name}`] : [el(Icon, {name:'user'}), ' Atanan']),
                    el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'priority' ? null : 'priority'), style: priority !== 4 ? { color: getPriorityColor(priority), borderColor: getPriorityColor(priority) } : {} }, el(Icon, {name:'flag'}), ` P${priority}`),
                    el('button', { className: 'h2l-todoist-chip' }, el(Icon, {name:'clock'}), ' Hatırlatıcı'),
                    el('div', { style:{position:'relative', display:'inline-block'} }, el('button', { className: 'h2l-todoist-chip', onClick: () => setActivePopup(activePopup === 'more' ? null : 'more') }, el(Icon, {name:'ellipsis'})), renderPopupContent())
                )
            ),
            el('div', { className: 'h2l-todoist-footer' },
                el('div', { className: 'h2l-todoist-project-selector', onClick: () => alert('Proje değiştirme henüz aktif değil.') }, el(Icon, {name:'list-check', style:{marginRight:5}}), projectTitle || 'Proje', el(Icon, {name:'caret-down', style:{marginLeft:4, fontSize:10}})),
                el('div', { className: 'h2l-todoist-footer-actions' }, el('button', { className: 'h2l-todoist-btn-cancel', onClick: () => setIsEditing(false) }, 'İptal'), el('button', { className: 'h2l-todoist-btn-add', onClick: handleSubmit, disabled: !title.trim() || isLimitExceeded }, 'Görev ekle'))
            )
        );
    };

    // 4. LIST & BOARD & MAIN
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

    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections }) => {
        // ... (Aynı kalıyor)
        const [title, setTitle] = useState(task.title);
        const [desc, setDesc] = useState(task.content || '');
        const [comments, setComments] = useState([]);
        const [newComment, setNewComment] = useState('');
        const [isCommentSending, setIsCommentSending] = useState(false);

        useEffect(() => {
            if (wp.apiFetch) {
                wp.apiFetch({ path: `/h2l/v1/comments?task_id=${task.id}` })
                    .then(data => {
                        if(Array.isArray(data)) setComments(data);
                    })
                    .catch(err => console.error("Yorumlar yüklenemedi:", err));
            }
        }, [task.id]);

        const handleSave = () => { if (title !== task.title || desc !== task.content) { onUpdate(task.id, { title, content: desc }); } };
        
        const handleSendComment = () => {
            if(!newComment.trim() || !wp.apiFetch) return;
            setIsCommentSending(true);
            wp.apiFetch({ 
                path: '/h2l/v1/comments', 
                method: 'POST', 
                data: { task_id: task.id, content: newComment } 
            }).then(res => {
                setComments([...comments, res]);
                setNewComment('');
                setIsCommentSending(false);
            }).catch(err => {
                console.error("Yorum gönderilemedi:", err);
                setIsCommentSending(false);
            });
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
                    el('div', { className: 'h2l-dm-section' }, el('h4', null, el(Icon, {name:'list-check', style:{marginRight:8}}), 'Alt görevler'), el('button', { className: 'h2l-btn-text' }, '+ Alt görev ekle')),
                    el('div', { className: 'h2l-comments-section' },
                        el('h4', { style:{marginBottom:15} }, 'Yorumlar'),
                        el('div', { className: 'h2l-comment-list' },
                            comments.map(c => {
                                const author = users.find(u => parseInt(u.id) === parseInt(c.user_id));
                                return el('div', { key: c.id, className: 'h2l-comment-item' },
                                    el(Avatar, { userId: c.user_id, users, size: 28, style:{marginTop:4} }),
                                    el('div', { className: 'h2l-comment-content-box' },
                                        el('div', { className: 'h2l-comment-header' },
                                            el('span', { className: 'h2l-comment-author' }, author ? author.name : 'Bilinmeyen'),
                                            el('span', { className: 'h2l-comment-date' }, c.created_at)
                                        ),
                                        el('div', { className: 'h2l-comment-text' }, c.content)
                                    )
                                );
                            })
                        ),
                        el('div', { className: 'h2l-comment-form' },
                            el(Avatar, { userId: window.h2lFrontendSettings?.currentUser?.ID, users, size: 28, style:{marginTop:4} }),
                            el('div', { className: 'h2l-comment-input-box' },
                                el('textarea', { 
                                    className: 'h2l-comment-textarea', 
                                    placeholder: 'Yorum yaz...', 
                                    value: newComment, 
                                    onChange: e => setNewComment(e.target.value) 
                                }),
                                el('div', { className: 'h2l-comment-toolbar' },
                                    el('div', { className: 'h2l-comment-tools' },
                                        el('div', { className: 'h2l-tool-btn' }, el(Icon, {name:'paperclip'})),
                                        el('div', { className: 'h2l-tool-btn' }, el(Icon, {name:'face-smile'}))
                                    ),
                                    el('button', { className: 'h2l-btn primary', disabled: isCommentSending || !newComment.trim(), onClick: handleSendComment }, 'Gönder')
                                )
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
                el(QuickAdd, { sectionId: 0, onAdd: onAddTask, projectTitle: project.title, users })
            ),
            sections.map(s => {
                const sTasks = visibleTasks.filter(t => parseInt(t.section_id || t.sectionId) === parseInt(s.id));
                return el(SectionGroup, { key: s.id, section: s, tasks: sTasks, users, onUpdateTask, onDeleteTask, onAddTask, onTaskClick, highlightToday, onUpdateSection, onDeleteSection, projectTitle: project.title });
            }),
            el(SectionAdd, { onAdd: onAddSection })
        );
    };
    const BoardView = ({ tasks, sections, onUpdateTask }) => { return el('div', { className: 'h2l-board-container' }, 'Board Görünümü (Yakında)'); };
    
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