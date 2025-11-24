(function(wp) {
    const { createElement: el, useState, useEffect, useRef, Component } = wp.element;
    const apiFetch = wp.apiFetch;

    window.H2L = window.H2L || {};
    window.H2L.Common = window.H2L.Common || {};

    const PROJECT_COLORS = [
        { name: 'Gri', code: '#808080' }, { name: 'Kırmızı', code: '#db4c3f' }, { name: 'Turuncu', code: '#e67e22' }, 
        { name: 'Sarı', code: '#f1c40f' }, { name: 'Yeşil', code: '#27ae60' }, { name: 'Mavi', code: '#2980b9' }, 
        { name: 'Mor', code: '#8e44ad' }, { name: 'Pembe', code: '#e84393' }, { name: 'Menekşe', code: '#b8255f' }, 
        { name: 'Nane', code: '#6accbc' }, { name: 'Turkuaz', code: '#158fad' }, { name: 'Koyu Gri', code: '#2c3e50' }
    ];

    const TASK_STATUSES = {
        not_started: { key: 'not_started', label: 'Başlamadı', icon: 'circle', color: '#808080' },
        in_progress: { key: 'in_progress', label: 'Devam Ediyor', icon: 'play', color: '#246fe0' },
        on_hold: { key: 'on_hold', label: 'Beklemede', icon: 'pause', color: '#e67e22' },
        in_review: { key: 'in_review', label: 'Revizyonda', icon: 'magnifying-glass', color: '#8e44ad' },
        pending_approval: { key: 'pending_approval', label: 'Onay Bekliyor', icon: 'clock', color: '#f1c40f' },
        cancelled: { key: 'cancelled', label: 'İptal Edildi', icon: 'ban', color: '#c0392b' },
        completed: { key: 'completed', label: 'Tamamlandı', icon: 'check-circle', color: '#27ae60' }
    };

    class ErrorBoundary extends Component {
        constructor(props) { super(props); this.state = { hasError: false }; }
        static getDerivedStateFromError(error) { return { hasError: true }; }
        componentDidCatch(error, errorInfo) { console.error("H2L Error:", error, errorInfo); }
        render() { return this.state.hasError ? el('div', {className:'h2l-error-box'}, 'Beklenmedik bir hata oluştu.') : this.props.children; }
    }

    const Icon = ({ name, className = "", style = {}, onClick, title }) => 
        el('i', { className: `fa-solid fa-${name} ${className}`, style: style, onClick, title });
    
    const Avatar = ({ userId, users, size = 24, style = {} }) => {
        if (!users || !Array.isArray(users)) return null;
        const user = users.find(u => parseInt(u.id) === parseInt(userId));
        const finalStyle = { width: size, height: size, minWidth: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', ...style };
        if (!user) return el('div', { className: 'h2l-avatar-ph', style: { ...finalStyle, background:'#eee' } });
        return el('img', { src: user.avatar, className: 'h2l-avatar', style: finalStyle, title: user.name });
    };

    const getFolderId = (p) => p.folderId || p.folder_id || 0;

    const MultiSelect = ({ users, selected, onChange, ownerId = null }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [searchTerm, setSearchTerm] = useState('');
        const wrapperRef = useRef(null);
        
        useEffect(() => {
            const handleClickOutside = (event) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); };
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [wrapperRef]);

        const isSelected = (id) => {
            if (ownerId && parseInt(id) === parseInt(ownerId)) return true;
            if (!selected) return false;
            return selected.some(sid => parseInt(sid) === parseInt(id));
        };

        const toggleSelection = (id) => {
            if (ownerId && parseInt(id) === parseInt(ownerId)) return;
            let newSelected;
            if (isSelected(id)) { newSelected = selected.filter(i => parseInt(i) !== parseInt(id)); } 
            else { newSelected = [...(selected || []), id]; }
            onChange(newSelected);
        };

        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
        let displayCount = (selected ? selected.length : 0);

        return el('div', { className: 'h2l-multi-select', ref: wrapperRef },
            el('div', { className: 'h2l-multi-trigger', onClick: () => setIsOpen(!isOpen) }, 
                el('span', { style: { color: (displayCount > 0) ? '#333' : '#999' } }, displayCount > 0 ? `${displayCount} yönetici` : 'Seç...'), 
                el(Icon, { name: 'angle-down' })
            ),
            isOpen && el('div', { className: 'h2l-multi-dropdown' },
                el('div', { className: 'h2l-multi-search' }, el('input', { type: 'text', placeholder: 'Ara...', value: searchTerm, onChange: e => setSearchTerm(e.target.value) })),
                el('div', { className: 'h2l-multi-list' },
                    filteredUsers.map(u => {
                        const uid = parseInt(u.id);
                        const isOwner = ownerId && uid === parseInt(ownerId);
                        const selectedState = isSelected(uid);
                        return el('div', { 
                            key: u.id, 
                            className: `h2l-multi-item ${selectedState ? 'selected' : ''}`, 
                            onClick: () => toggleSelection(uid),
                            style: { cursor: isOwner ? 'default' : 'pointer', opacity: isOwner ? 0.7 : 1, backgroundColor: isOwner ? '#f9f9f9' : (selectedState ? '#fff5f5' : '#fff') }
                        },
                            el(Avatar, { userId: u.id, users: users, size: 24 }), 
                            el('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } },
                                el('span', null, u.name),
                                isOwner && el('span', { style: { fontSize: '10px', color: '#888', fontWeight: 600 } }, 'Proje Sahibi')
                            ),
                            isOwner ? el(Icon, { name: 'lock', style: { color: '#999', fontSize: '12px' } }) : (selectedState && el(Icon, { name: 'check', style: { color: '#db4c3f' } }))
                        );
                    })
                )
            )
        );
    };

    // --- DÜZELTİLMİŞ NOTIFICATION BELL ---
    const NotificationBell = ({ navigate }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [notifications, setNotifications] = useState([]);
        const [unreadCount, setUnreadCount] = useState(0);
        const [popoverStyle, setPopoverStyle] = useState({});
        
        const triggerRef = useRef(null);
        const popoverRef = useRef(null);

        const fetchNotifications = () => {
            apiFetch({ path: '/h2l/v1/notifications' }).then(res => {
                setNotifications(res.list);
                setUnreadCount(res.unread_count);
            }).catch(() => {});
        };

        useEffect(() => {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }, []);

        // Dinamik Pozisyonlama
        const togglePopover = (e) => {
            e.stopPropagation();
            if (!isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setPopoverStyle({
                    position: 'fixed',
                    top: (rect.bottom + 10) + 'px',
                    left: rect.left + 'px',
                    zIndex: 99999
                });
            }
            setIsOpen(!isOpen);
        };

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (triggerRef.current && triggerRef.current.contains(event.target)) return;
                if (popoverRef.current && popoverRef.current.contains(event.target)) return;
                setIsOpen(false);
            };
            
            if (isOpen) {
                document.addEventListener("mousedown", handleClickOutside);
            }
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [isOpen]);

        const handleRead = (notif) => {
            if (notif.is_read == 0) {
                apiFetch({ path: '/h2l/v1/notifications/read', method: 'POST', data: { id: notif.id } })
                    .then(res => {
                        setNotifications(res.list);
                        setUnreadCount(res.unread_count);
                    });
            }
            if (notif.link) {
                if (notif.link.includes('/gorevler/')) {
                    const path = notif.link.split('/gorevler')[1];
                    navigate(path);
                } else {
                    window.location.href = notif.link;
                }
                setIsOpen(false);
            }
        };

        const handleMarkAllRead = () => {
            apiFetch({ path: '/h2l/v1/notifications/read', method: 'POST', data: { all: true } })
                .then(res => {
                    setNotifications(res.list);
                    setUnreadCount(res.unread_count);
                });
        };

        // TARİH FORMATLAMA FONKSİYONU
        const formatNotifDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            // Ay Gün Yıl (25 Kasım 2025) formatı
            return date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        };

        return el('div', { className: 'h2l-notification-wrapper' },
            el('div', { className: 'h2l-notification-trigger', ref: triggerRef, onClick: togglePopover },
                el(Icon, { name: 'bell' }),
                unreadCount > 0 && el('span', { className: 'h2l-badge' }, unreadCount > 9 ? '9+' : unreadCount)
            ),
            isOpen && el('div', { className: 'h2l-notification-popover', ref: popoverRef, style: popoverStyle },
                el('div', { className: 'h2l-notif-header' },
                    el('span', null, 'Bildirimler'),
                    el('span', { className: 'h2l-mark-all', onClick: handleMarkAllRead }, 'Tümünü okundu say')
                ),
                el('div', { className: 'h2l-notif-list' },
                    notifications.length === 0 && el('div', { className: 'h2l-no-notif' }, 'Henüz bildirim yok.'),
                    notifications.map(n => 
                        el('div', { key: n.id, className: `h2l-notif-item ${n.is_read == 0 ? 'unread' : ''}`, onClick: () => handleRead(n) },
                            el('div', { className: 'h2l-notif-icon' }, 
                                el(Icon, { name: n.type === 'assignment' ? 'clipboard-user' : (n.type === 'mention' ? 'comment' : 'bell') })
                            ),
                            el('div', { className: 'h2l-notif-content' },
                                el('div', { className: 'h2l-notif-title' }, n.title),
                                // HTML KODLARINI DÜZELTMEK İÇİN: dangerouslySetInnerHTML kullanıyoruz
                                el('div', { 
                                    className: 'h2l-notif-msg', 
                                    dangerouslySetInnerHTML: { __html: n.message } 
                                }),
                                // TARİH FORMATI GÜNCELLENDİ
                                el('div', { className: 'h2l-notif-time' }, formatNotifDate(n.created_at))
                            ),
                            n.is_read == 0 && el('div', { className: 'h2l-notif-dot' })
                        )
                    )
                )
            )
        );
    };

    window.H2L.Common = { ErrorBoundary, Icon, Avatar, MultiSelect, NotificationBell, getFolderId, PROJECT_COLORS, TASK_STATUSES };
})(window.wp);