(function(wp) {
    const { createElement: el, useState, useEffect, useRef } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const Common = window.H2L && window.H2L.Common ? window.H2L.Common : { Icon: () => null, Avatar: () => null, TASK_STATUSES: {} };
    const { Icon, Avatar, TASK_STATUSES } = Common;
    const TaskInput = window.H2L && window.H2L.TaskInput ? window.H2L.TaskInput : { ContentEditable: () => null };
    const { ContentEditable } = TaskInput;
    const Reminders = window.H2L && window.H2L.Reminders ? window.H2L.Reminders : { getPriorityColor: () => '#808080' };
    const { getPriorityColor } = Reminders;

    window.H2L = window.H2L || {};
    window.H2L.TaskModal = window.H2L.TaskModal || {};

    // --- HELPER: Text Tooltip ---
    const TextTooltip = ({ position, onFormat, showLinkInput, onLinkSubmit, onClose }) => {
        // ... (Tooltip kodları aynı)
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

    // --- HELPER: Date Formatter ---
    const getSmartDateDisplay = (dateStr, isRecurring) => {
        // ... (Tarih formatlama aynı)
        if (!dateStr) return null;
        const date = new Date(dateStr);
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(date); target.setHours(0,0,0,0);
        const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        
        const days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
        const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

        let text = `${target.getDate()} ${months[target.getMonth()]}`;
        let color = '#555'; let icon = 'calendar';
        
        if (diffDays === 0) { text = 'Bugün'; color = '#058527'; icon = 'calendar-day'; }
        else if (diffDays === 1) { text = 'Yarın'; color = '#b36b00'; icon = 'sun'; }
        else if (diffDays < 0) { color = '#d1453b'; }
        else if (diffDays < 7) { text = days[target.getDay()]; color = '#692fc2'; icon = 'calendar-week'; }

        const hasTime = dateStr.includes(' ') && !dateStr.endsWith('00:00:00');
        return { text: hasTime ? `${text} ${dateStr.split(' ')[1].substring(0,5)}` : text, color, icon, isRecurring };
    };

    // --- COMPONENT: Comment Item ---
    const CommentItem = ({ comment, user, onDelete, onUpdate }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [editContent, setEditContent] = useState(comment.content);

        const handleSave = () => {
            onUpdate(comment.id, editContent);
            setIsEditing(false);
        };

        if (isEditing) {
            return el('div', { className: 'h2l-tm-comment-row editing' },
                el(Avatar, { userId: comment.user_id, users: [user], size: 28 }),
                el('div', { className: 'h2l-tm-comment-bubble editing' },
                    el('textarea', { 
                        className: 'h2l-tm-comment-editor',
                        value: editContent,
                        onChange: (e) => setEditContent(e.target.value),
                        autoFocus: true
                    }),
                    el('div', { className: 'h2l-tm-comment-actions-bar' },
                        el('button', { className: 'h2l-btn-cancel small', onClick: () => setIsEditing(false) }, 'İptal'),
                        el('button', { className: 'h2l-btn-save small', onClick: handleSave, disabled: !editContent.trim() }, 'Güncelle')
                    )
                )
            );
        }

        return el('div', { className: 'h2l-tm-comment-row' },
            el(Avatar, { userId: comment.user_id, users: [user], size: 28 }),
            el('div', { className: 'h2l-tm-comment-bubble' },
                el('div', { className: 'h2l-tm-comment-meta' }, 
                    el('strong', null, user ? user.name : 'Bilinmeyen'),
                    el('span', null, comment.created_at.split('T')[0]),
                    el('div', { className: 'h2l-tm-comment-actions' },
                        el('button', { title: 'Düzenle', onClick: () => setIsEditing(true) }, el(Icon, { name: 'pen' })),
                        el('button', { title: 'Sil', onClick: () => { if(confirm('Yorum silinsin mi?')) onDelete(comment.id); } }, el(Icon, { name: 'trash' }))
                    )
                ),
                el('div', { className: 'h2l-tm-comment-text', dangerouslySetInnerHTML: { __html: comment.content } })
            )
        );
    };

    // --- COMPONENT: Comment Input ---
    const CommentInput = ({ onSend, currentUser, users, scrollToView }) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const [text, setText] = useState('');
        const textareaRef = useRef(null);

        const handleFocus = () => {
            setIsExpanded(true);
            if (scrollToView) scrollToView();
        };

        const handleSend = () => {
            if (!text.trim()) return;
            onSend(text);
            setText('');
            setIsExpanded(false);
        };

        const handleCancel = () => {
            setText('');
            setIsExpanded(false);
        };

        return el('div', { className: `h2l-tm-footer-inner ${isExpanded ? 'expanded' : ''}` },
            el('div', { className: 'h2l-tm-comment-input-wrapper' },
                el(Avatar, { userId: currentUser.ID, users: users, size: 32 }),
                el('div', { className: 'h2l-tm-input-box' },
                    el('textarea', { 
                        ref: textareaRef,
                        placeholder: 'Yorum yaz...', 
                        value: text, 
                        onChange: e => setText(e.target.value),
                        onFocus: handleFocus,
                        onKeyDown: e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }
                    }),
                    !isExpanded && el('div', { className: 'h2l-tm-collapsed-icon' }, el(Icon, {name:'paperclip'})),
                    isExpanded && el('div', { className: 'h2l-tm-input-toolbar' },
                        el('div', { className: 'h2l-tm-input-tools' },
                            el('button', { className: 'h2l-icon-btn small', title: 'Dosya ekle' }, el(Icon, { name: 'paperclip' })),
                            el('button', { className: 'h2l-icon-btn small', title: 'Emoji' }, el(Icon, { name: 'face-smile' }))
                        ),
                        el('div', { className: 'h2l-tm-input-buttons' },
                            el('button', { className: 'h2l-btn-cancel', onClick: handleCancel }, 'İptal'),
                            el('button', { className: 'h2l-btn-save', onClick: handleSend, disabled: !text.trim() }, 'Yorum yap')
                        )
                    )
                )
            )
        );
    };

    // --- UNIFIED TASK CONTENT EDITOR ---
    const TaskContentEditor = ({ title, description, onSave, placeholderTitle, placeholderDesc }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [tempTitle, setTempTitle] = useState(title);
        const [tempDesc, setTempDesc] = useState(description);
        const [tooltipState, setTooltipState] = useState(null);
        const containerRef = useRef(null);
        const savedRange = useRef(null);

        useEffect(() => { if(!isEditing) { setTempTitle(title); setTempDesc(description); } }, [title, description, isEditing]);

        useEffect(() => {
            const handleSelection = () => {
                if (!isEditing) return;
                const selection = window.getSelection();
                if (!selection.isCollapsed && containerRef.current && containerRef.current.contains(selection.anchorNode)) {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    setTooltipState(prev => prev && prev.showLinkInput ? prev : { pos: { left: rect.left + (rect.width/2), top: rect.top - 45 }, showLinkInput: false });
                } else {
                    setTooltipState(prev => prev && prev.showLinkInput ? prev : null);
                }
            };
            document.addEventListener('selectionchange', handleSelection);
            return () => document.removeEventListener('selectionchange', handleSelection);
        }, [isEditing]);

        const handleFormat = (cmd) => {
            if (cmd === 'link_prompt') {
                const sel = window.getSelection();
                if (sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0);
                setTooltipState(prev => ({ ...prev, showLinkInput: true }));
            } else if (cmd === 'code') {
                document.execCommand('insertHTML', false, `<code>${window.getSelection().toString()}</code>`);
            } else {
                document.execCommand(cmd, false, null);
            }
        };

        const handleLinkSubmit = (url) => {
            if (url) {
                const sel = window.getSelection(); sel.removeAllRanges();
                if (savedRange.current) sel.addRange(savedRange.current);
                document.execCommand('createLink', false, url);
            }
            setTooltipState(null); savedRange.current = null;
        };

        const handleSave = () => { onSave(tempTitle, tempDesc); setIsEditing(false); };
        const handleCancel = () => { setTempTitle(title); setTempDesc(description); setIsEditing(false); };

        if (isEditing) {
            return el('div', { className: 'h2l-unified-editor editing', ref: containerRef },
                tooltipState && el(TextTooltip, { position: tooltipState.pos, showLinkInput: tooltipState.showLinkInput, onFormat: handleFormat, onLinkSubmit: handleLinkSubmit, onClose: () => setTooltipState(null) }),
                el('div', { className: 'h2l-editor-row' },
                    el(ContentEditable, { html: tempTitle, onChange: setTempTitle, placeholder: placeholderTitle, className: 'title-mode h2l-tm-editor', autoFocus: true })
                ),
                el('div', { className: 'h2l-editor-row' },
                    el(ContentEditable, { html: tempDesc, onChange: setTempDesc, placeholder: placeholderDesc, className: 'desc-mode h2l-tm-editor' })
                ),
                el('div', { className: 'h2l-editable-actions' },
                    el('button', { className: 'h2l-btn-cancel', onClick: handleCancel }, 'İptal'),
                    el('button', { className: 'h2l-btn-save', onClick: handleSave, disabled: !tempTitle.trim() }, 'Kaydet')
                )
            );
        }

        return el('div', { className: 'h2l-unified-editor view', onClick: () => setIsEditing(true) },
            el('div', { className: 'h2l-view-title', dangerouslySetInnerHTML: { __html: title || placeholderTitle } }),
            el('div', { className: 'h2l-view-desc h2l-rich-content', style: { display: description ? 'block' : 'none' }, dangerouslySetInnerHTML: { __html: description } }),
            !description && el('div', { className: 'h2l-view-desc placeholder' }, placeholderDesc)
        );
    };

    // --- MAIN MODAL ---
    const TaskDetailModal = ({ task, onClose, onUpdate, users, projects, sections, labels = [], navigate }) => { // navigate prop eklendi
        const [comments, setComments] = useState([]);
        const [isScrolled, setIsScrolled] = useState(false); // Scroll durumu
        const scrollRef = useRef(null);
        
        // Mevcut listenin task listesi (önceki/sonraki için)
        // Bu veriyi props'tan almak gerekebilir ama şimdilik globalden alıyoruz
        // ya da 'task' prop'undan id'ye göre buluyoruz.
        // En temiz yöntem: App'ten 'tasks' prop'u almak.
        // H2L.App'te tasks prop'u zaten geçiliyor olmalı. Eğer yoksa eklenmeli.
        // Şu an 'tasks' prop'u yok, o yüzden globalden almayı deneyeceğiz veya
        // App.js'yi güncellememiz gerekecek. Şimdilik varsayım yapalım.
        // App.js'de TaskDetailModal çağrılırken tasks={activeTasks} geçilmeli.
        // Eğer yoksa navigate fonksiyonunu kullanamayız.
        
        // Önceki/Sonraki Görev Bulma
        const findSiblingTask = (direction) => {
            // Bu fonksiyonun çalışması için 'allTasks' listesine ihtiyacımız var.
            // App.js'deki modal çağrısına 'tasks' prop'unu eklemelisin.
            // Şimdilik window.H2L.currentTasks gibi bir global hack veya prop bekliyoruz.
            // En iyisi 'tasks' prop'unu beklemek.
            
            // Varsayalım ki 'tasks' prop olarak geldi (App.js güncellenmeli)
            // Eğer gelmediyse işlem yapma
            /* NOT: App.js'de TaskDetailModal'a tasks={activeTasks} prop'u eklenmeli.
               Şu anki kodda bu yoksa çalışmaz. 
            */
        };

        const updateField = (fields) => onUpdate(task.id, fields);

        useEffect(() => {
            apiFetch({ path: `/h2l/v1/comments?task_id=${task.id}` }).then(setComments);
        }, [task.id]);

        // Scroll Listener
        useEffect(() => {
            const handleScroll = () => {
                if (scrollRef.current) {
                    setIsScrolled(scrollRef.current.scrollTop > 40);
                }
            };
            const div = scrollRef.current;
            if (div) div.addEventListener('scroll', handleScroll);
            return () => { if (div) div.removeEventListener('scroll', handleScroll); };
        }, []);

        const handleAddComment = (content) => { /* ... */ };
        const handleDeleteComment = (cid) => { /* ... */ };
        const handleUpdateComment = (cid, newContent) => { /* ... */ };
        const scrollToComments = () => { /* ... */ };

        const currentProject = projects.find(p => p.id == task.project_id) || {};
        const currentSection = sections.find(s => s.id == task.section_id);
        const smartDate = getSmartDateDisplay(task.due_date, !!task.recurrence_rule);
        const assignee = users.find(u => u.id == (task.assignees && task.assignees[0]));

        const SidebarItem = ({ label, value, icon, color, onClick, isClickable = true }) => el('div', { className: 'h2l-tm-sidebar-group' },
            el('div', { className: 'h2l-tm-sb-label' }, label),
            el('div', { className: `h2l-tm-sb-value ${isClickable?'clickable':''}`, onClick: isClickable ? onClick : null },
                icon && el(Icon, { name: icon, style: { color: color || '#777', marginRight: 8, fontSize: 14 } }),
                // Özel Öncelik Gösterimi (Circle)
                label === 'Öncelik' && el('div', { className: 'h2l-priority-circle', style: { backgroundColor: color } }),
                // Özel Atanan Gösterimi (Avatar)
                label === 'Atanan kişi' && !icon && el(Avatar, { userId: task.assignees[0], users, size: 24, style:{marginRight:8} }),
                
                el('div', { style: { display: 'flex', flexDirection: 'column', lineHeight: 1.2 } },
                    el('span', { style: { color: color || '#202020' } }, value),
                    // Öncelik alanında proje adını göster
                    label === 'Öncelik' && el('span', { style: { fontSize: 11, color: '#888', marginTop: 2 } }, currentProject.title)
                )
            )
        );

        return el('div', { className: 'h2l-detail-overlay', onClick: onClose },
            el('div', { className: 'h2l-task-modal', onClick: e => e.stopPropagation() },
                
                /* HEADER */
                el('div', { className: 'h2l-tm-header' },
                    el('div', { className: 'h2l-tm-breadcrumb' },
                        // SCROLL ANIMASYONU: Proje Adı -> Görev Adı
                        el('span', { className: `h2l-tm-proj-name ${isScrolled ? 'hidden-up' : ''}` }, 
                            el('span', { style: { color: currentProject.color || '#888', marginRight: 8 } }, '#'),
                            currentProject.title || 'Inbox'
                        ),
                        el('div', { className: `h2l-tm-task-name-scroll ${isScrolled ? 'visible-up' : ''}` }, 
                            // HTML etiketlerini temizle
                            task.title.replace(/<[^>]*>/g, '')
                        )
                    ),
                    el('div', { className: 'h2l-tm-header-actions' },
                        // TODO: Sonraki/Önceki görev fonksiyonları burada çağrılacak
                        el('button', { className: 'h2l-icon-btn', title: 'Önceki' }, el(Icon, { name: 'chevron-up' })),
                        el('button', { className: 'h2l-icon-btn', title: 'Sonraki' }, el(Icon, { name: 'chevron-down' })),
                        el('div', { className: 'h2l-sep-v' }),
                        el('button', { className: 'h2l-icon-btn', onClick: onClose }, el(Icon, { name: 'xmark', style: { fontSize: 18 } }))
                    )
                ),

                /* BODY */
                el('div', { className: 'h2l-tm-body' },
                    
                    /* LEFT COLUMN */
                    el('div', { className: 'h2l-tm-left-column' },
                        /* SCROLLABLE MAIN */
                        el('div', { className: 'h2l-tm-main', ref: scrollRef },
                            el('div', { className: 'h2l-tm-gutter' },
                                el('div', { 
                                    className: `h2l-task-check minimal p${task.priority} ${task.status === 'completed' ? 'completed' : ''}`,
                                    onClick: () => updateField({ status: task.status === 'completed' ? 'in_progress' : 'completed' })
                                }, el(Icon, { name: 'check' }))
                            ),

                            el('div', { className: 'h2l-tm-content-col' },
                                el(TaskContentEditor, {
                                    title: task.title, description: task.content,
                                    placeholderTitle: 'Görev adı', placeholderDesc: 'Açıklama',
                                    onSave: (t, d) => updateField({ title: t, content: d })
                                }),

                                el('div', { className: 'h2l-tm-subtasks-area' }, 
                                    el('div', { className: 'h2l-tm-add-subtask' }, el(Icon, {name:'plus'}), ' Alt görev ekle')
                                ),
                                
                                el('div', { className: 'h2l-tm-activity-stream' },
                                    el('div', { className: 'h2l-tm-comments-header' }, 
                                        el('span', null, 'Yorumlar'),
                                        el('span', { className: 'h2l-tm-badge' }, comments.length)
                                    ),
                                    comments.map(c => el(CommentItem, { 
                                        key: c.id, 
                                        comment: c, 
                                        user: users.find(u => u.id == c.user_id),
                                        onDelete: handleDeleteComment,
                                        onUpdate: handleUpdateComment
                                    }))
                                )
                            )
                        ),

                        /* FOOTER */
                        el('div', { className: 'h2l-tm-footer' },
                            el(CommentInput, { 
                                onSend: handleAddComment, 
                                currentUser: window.h2lFrontendSettings.currentUser,
                                users: users,
                                scrollToView: scrollToComments
                            })
                        )
                    ),

                    /* RIGHT SIDEBAR */
                    el('div', { className: 'h2l-tm-sidebar' },
                        el('div', { className: 'h2l-tm-sidebar-inner' },
                            el(SidebarItem, { label: 'Proje', value: currentProject.title || 'Projesiz', icon: 'hashtag', color: currentProject.color }),
                            el(SidebarItem, { label: 'Atanan kişi', value: assignee ? assignee.name : 'Atanmamış', icon: assignee ? null : 'user' }),
                            el(SidebarItem, { label: 'Tarih', value: smartDate ? smartDate.text : 'Tarih Yok', icon: smartDate ? smartDate.icon : 'calendar', color: smartDate ? smartDate.color : null }),
                            el(SidebarItem, { label: 'Son Tarih', value: 'Son tarih ekle', icon: 'clock', color: '#aaa', isClickable: true }),
                            
                            // ÖNCELİK ALANI (GÜNCELLENMİŞ)
                            el(SidebarItem, { 
                                label: 'Öncelik', 
                                value: `P${task.priority}`, 
                                icon: null, // İkonu özel olarak render ediyoruz
                                color: getPriorityColor(task.priority), 
                                onClick: () => updateField({ priority: task.priority === 1 ? 4 : task.priority - 1 }) 
                            }),
                            
                            el('div', { className: 'h2l-tm-sidebar-group' },
                                el('div', { className: 'h2l-tm-sb-label', style:{display:'flex', justifyContent:'space-between'} }, 'Etiketler', el(Icon, { name: 'plus', style: { fontSize: 12, cursor: 'pointer' } })),
                                el('div', { className: 'h2l-tm-tags-container' },
                                    (task.labels && task.labels.length > 0) ? task.labels.map(l => el('span', { key: l.id || l, className: 'h2l-tm-tag' }, (typeof l === 'string' ? l : l.name), el(Icon,{name:'xmark', style:{marginLeft:5, fontSize:10, cursor:'pointer'}}))) : el('span', { className: 'h2l-tm-no-val' }, 'Etiket yok')
                                )
                            ),
                            el('div', { className: 'h2l-tm-sb-separator' }),
                            el(SidebarItem, { label: 'Hatırlatıcılar', value: 'Hatırlatıcı ekle', icon: 'bell', color: '#aaa', isClickable: false }),
                            el(SidebarItem, { label: 'Konum', value: 'Konum ekle', icon: 'location-dot', color: '#aaa', isClickable: false }),
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