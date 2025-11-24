(function(wp) {
    const { createElement: el, useState, useEffect } = wp.element;
    const { Icon, NotificationBell } = window.H2L.Common;

    window.H2L = window.H2L || {};
    
    // Sidebar Bölüm Başlığı (Collapsible)
    const SidebarSection = ({ title, children, defaultExpanded = true, onAddClick, isCollapsed }) => {
        const [isExpanded, setIsExpanded] = useState(defaultExpanded);
        
        if (isCollapsed) return null; 

        return el('div', { className: 'h2l-sb-section' },
            el('div', { className: 'h2l-sb-section-header' },
                el('div', { className: 'h2l-sb-section-toggle', onClick: () => setIsExpanded(!isExpanded) },
                    el('span', { className: 'h2l-sb-section-title' }, title),
                    el(Icon, { name: isExpanded ? 'chevron-down' : 'chevron-right', style: { fontSize: 10, marginLeft: 6 } })
                ),
                onAddClick && el('button', { className: 'h2l-sb-add-btn', onClick: onAddClick, title: 'Ekle' }, el(Icon, { name: 'plus' }))
            ),
            isExpanded && el('div', { className: 'h2l-sb-section-content' }, children)
        );
    };

    const SidebarItem = ({ icon, label, count, color, onClick, isActive, isCollapsed, isFavorite, onToggleFavorite }) => {
        return el('div', { 
            className: `h2l-sb-item ${isActive ? 'active' : ''}`, 
            onClick: onClick,
            title: isCollapsed ? label : '' 
        },
            el('div', { className: 'h2l-sb-item-left' },
                el(Icon, { name: icon, style: { color: color || (isActive ? '#db4c3f' : '#555') } }),
                !isCollapsed && el('span', { className: 'h2l-sb-label' }, label)
            ),
            !isCollapsed && el('div', { className: 'h2l-sb-item-right' },
                onToggleFavorite && el('button', { 
                    className: `h2l-sb-fav-btn ${isFavorite ? 'is-fav' : ''}`, 
                    onClick: (e) => { e.stopPropagation(); onToggleFavorite(); } 
                }, el(Icon, { name: isFavorite ? 'star' : 'star' })),
                count > 0 && el('span', { className: 'h2l-sb-count' }, count)
            )
        );
    };

    window.H2L.Sidebar = ({ navigate, activeView, counts, projects, labels, isCollapsed, toggleCollapse, isMobileOpen, closeMobile, onAddProject, onOpenSettings, onOpenHelp }) => {
        
        const isActive = (type, id = null) => {
            if (type === 'inbox' && activeView.type === 'project_detail' && activeView.isInbox) return true;
            if (activeView.type === type) {
                if (id !== null) return activeView.id === parseInt(id) || activeView.slug === id;
                return true;
            }
            return false;
        };

        const favoriteProjects = projects.filter(p => parseInt(p.is_favorite) === 1);
        const otherProjects = projects.filter(p => parseInt(p.is_favorite) !== 1 && (!p.slug || p.slug !== 'inbox-project'));

        const handleNavigation = (path) => {
            navigate(path);
            if (window.innerWidth < 768) closeMobile();
        };

        return el('aside', { className: `h2l-sidebar-container ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}` },
            
            // 1. HEADER
            el('div', { className: 'h2l-sb-header' },
                el('div', { className: 'h2l-sb-user-area' },
                    el('div', { className: 'h2l-sb-avatar' }, 'H'),
                    !isCollapsed && el('span', { className: 'h2l-sb-username' }, 'Adbreak')
                ),
                el('div', { className: 'h2l-sb-header-actions' },
                    el(NotificationBell, { navigate: handleNavigation }),
                    el('button', { className: 'h2l-sb-collapse-btn', onClick: toggleCollapse, title: isCollapsed ? 'Genişlet' : 'Daralt' }, 
                        el(Icon, { name: isCollapsed ? 'angles-right' : 'angles-left' })
                    )
                )
            ),

            // 2. SCROLLABLE CONTENT
            el('div', { className: 'h2l-sb-scroll-area' },
                
                // VIEWS
                el('div', { className: 'h2l-sb-views' },
                    el(SidebarItem, { icon: 'inbox', label: 'Gelen Kutusu', count: counts.inbox, color: '#246fe0', isActive: isActive('inbox'), isCollapsed, onClick: () => handleNavigation('/inbox') }),
                    el(SidebarItem, { icon: 'calendar-day', label: 'Bugün', count: counts.today, color: '#058527', isActive: isActive('today'), isCollapsed, onClick: () => handleNavigation('/bugun') }),
                    el(SidebarItem, { icon: 'calendar-week', label: 'Yaklaşan', count: counts.upcoming, color: '#692fc2', isActive: isActive('upcoming'), isCollapsed, onClick: () => handleNavigation('/yaklasan') }),
                    
                    // YENİ: Etiketler & Filtreler Menüsü (Ayrı Sayfa)
                    el(SidebarItem, { 
                        icon: 'tags', 
                        label: 'Etiketler & Filtreler', 
                        color: '#e67e22', 
                        isActive: isActive('filters_labels'), 
                        isCollapsed, 
                        onClick: () => handleNavigation('/filtreler-etiketler') 
                    })
                ),

                // FAVORITES
                !isCollapsed && el(SidebarSection, { title: 'Favoriler', defaultExpanded: true },
                    favoriteProjects.length === 0 
                        ? el('div', { className: 'h2l-sb-empty-state' }, 'Henüz favoriniz yok.')
                        : favoriteProjects.map(p => el(SidebarItem, { 
                            key: p.id, icon: 'circle', color: p.color, label: p.title, count: p.total_count, 
                            isActive: isActive('project_detail', p.id), isCollapsed: false, isFavorite: true,
                            onClick: () => handleNavigation(`/proje/${p.id}`)
                        }))
                ),

                // PROJECTS (Varsayılan Kapalı: defaultExpanded: false)
                !isCollapsed && el(SidebarSection, { title: 'Projelerim', defaultExpanded: false, onAddClick: onAddProject },
                    otherProjects.length === 0
                        ? el('div', { className: 'h2l-sb-empty-state' }, 'Proje bulunamadı.')
                        : otherProjects.map(p => el(SidebarItem, { 
                            key: p.id, icon: 'circle', color: p.color, label: p.title, count: p.total_count, 
                            isActive: isActive('project_detail', p.id), isCollapsed: false, 
                            onClick: () => handleNavigation(`/proje/${p.id}`)
                        }))
                )
            ),

            // 3. FOOTER (Ayarlar ve Yardım)
            el('div', { className: 'h2l-sb-footer' },
                el('button', { className: 'h2l-sb-footer-btn', title: 'Ayarlar', onClick: onOpenSettings }, 
                    el(Icon, { name: 'gear' }), !isCollapsed && ' Ayarlar'
                ),
                el('button', { className: 'h2l-sb-footer-btn', title: 'Yardım & Kısayollar', onClick: onOpenHelp }, 
                    el(Icon, { name: 'circle-question' }), !isCollapsed && ' Yardım'
                ),
                window.innerWidth < 768 && el('button', { className: 'h2l-sb-footer-btn mobile-close', onClick: closeMobile }, el(Icon, {name:'xmark'}), 'Kapat')
            )
        );
    };
})(window.wp);