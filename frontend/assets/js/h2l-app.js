(function(wp, settings) {
    const { createElement: el, useState, useEffect } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const { ErrorBoundary, Icon } = window.H2L.Common;
    const { Sidebar } = window.H2L;
    const { ProjectsDashboard, ProjectModal, FolderModal } = window.H2L.Projects;
    const { ProjectDetail } = window.H2L;
    const { ListView, UpcomingView, TodayView } = window.H2L.Tasks; // TodayView eklendi
    
    const TaskModal = window.H2L && window.H2L.TaskModal ? window.H2L.TaskModal : { TaskDetailModal: () => null };
    const { TaskDetailModal } = TaskModal;

    const BASE_URL = settings.base_url || '/gorevler';

    // --- YENİ: Labels & Filters Sayfası (Güncellendi) ---
    const FiltersLabelsView = ({ labels, navigate }) => {
        const [expanded, setExpanded] = useState({ filters: true, labels: true });
        
        const toggle = (key) => setExpanded({ ...expanded, [key]: !expanded[key] });

        // Statik Filtreler (Mock Data)
        const staticFilters = [
            { id: 'f1', name: 'Bana atananlar', icon: 'user', count: 4 },
            { id: 'f2', name: 'Öncelik 1', icon: 'flag', count: 3 }
        ];

        return el('div', { className: 'h2l-filters-page' },
            el('div', { className: 'h2l-header-area h2l-filters-header' }, 
                el('h1', null, 'Filtreler & Etiketler')
            ),
            
            // Filtreler Bölümü
            el('div', { className: 'h2l-filter-section' },
                el('div', { className: 'h2l-filter-section-header', onClick: () => toggle('filters') },
                    el('div', { className: 'h2l-filter-toggle' },
                        el(Icon, { name: expanded.filters ? 'chevron-down' : 'chevron-right' }),
                        'Filtreler',
                        el('span', { className: 'h2l-filter-usage-badge' }, 'KULLANILDI: 2/3')
                    ),
                    el(Icon, { name: 'plus', className: 'h2l-filter-add-btn' })
                ),
                expanded.filters && el('div', { className: 'h2l-filter-list' },
                    staticFilters.map(f => 
                        el('div', { key: f.id, className: 'h2l-filter-row' },
                            el('div', { className: 'h2l-filter-left' },
                                el(Icon, { name: f.icon }), // icon-droplet vb olabilir
                                f.name
                            ),
                            el('span', { className: 'h2l-filter-count' }, f.count)
                        )
                    )
                )
            ),

            // Etiketler Bölümü
            el('div', { className: 'h2l-filter-section' },
                el('div', { className: 'h2l-filter-section-header', onClick: () => toggle('labels') },
                    el('div', { className: 'h2l-filter-toggle' },
                        el(Icon, { name: expanded.labels ? 'chevron-down' : 'chevron-right' }),
                        'Etiketler'
                    ),
                    el(Icon, { name: 'plus', className: 'h2l-filter-add-btn' })
                ),
                expanded.labels && el('div', { className: 'h2l-filter-list' },
                    labels.length === 0 && el('p', {style:{color:'#999', padding:10, fontStyle:'italic', fontSize:13}}, 'Henüz etiket yok.'),
                    labels.map(l => 
                        el('div', { key: l.id, className: 'h2l-filter-row', onClick: () => navigate(`/etiket/${l.slug}`) },
                            el('div', { className: 'h2l-filter-left' },
                                el(Icon, { name: 'tag', style: { color: l.color || '#808080', transform: 'rotate(45deg)' } }), 
                                l.name
                            ),
                            el('span', { className: 'h2l-filter-count' }, '1') // Mock count
                        )
                    )
                )
            )
        );
    };

    // --- YENİ: Settings Modal ---
    const SettingsModal = ({ onClose }) => {
        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal medium', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, 'Ayarlar'), el(Icon, { name: 'xmark', onClick: onClose })),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-settings-placeholder' },
                        el(Icon, { name: 'gear', style: { fontSize: 48, color: '#ddd', marginBottom: 20 } }),
                        el('p', null, 'Ayarlar paneli yakında eklenecek.'),
                        el('p', { style:{fontSize:12, color:'#888'} }, 'Genel ayarlar, tema seçenekleri ve hesap yönetimi burada yer alacak.')
                    )
                ),
                el('div', { className: 'h2l-modal-footer' }, el('button', { className: 'h2l-btn', onClick: onClose }, 'Kapat'))
            )
        );
    };

    // --- YENİ: Help Modal (Kısayollar & Smart Parser) ---
    const HelpModal = ({ onClose }) => {
        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal large h2l-help-modal', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, 'Yardım & Kısayollar'), el(Icon, { name: 'xmark', onClick: onClose })),
                el('div', { className: 'h2l-modal-body' },
                    
                    // Bölüm 1: Akıllı Hızlı Ekleme
                    el('div', { className: 'h2l-help-section' },
                        el('h4', null, el(Icon, {name:'bolt'}), ' Hızlı Ekleme İpuçları'),
                        el('p', null, 'Görev eklerken veya düzenlerken aşağıdaki sembolleri kullanarak hızlıca detay ekleyebilirsiniz:'),
                        el('div', { className: 'h2l-help-grid' },
                            el('div', { className: 'h2l-help-item' }, 
                                el('span', { className: 'h2l-tag-demo date' }, 'yarın 15:00'), 
                                el('span', null, 'Tarih ve saat (Doğal dil)')
                            ),
                            el('div', { className: 'h2l-help-item' }, 
                                el('span', { className: 'h2l-tag-demo priority' }, 'p1'), 
                                el('span', null, 'Öncelik (p1, p2, p3)')
                            ),
                            el('div', { className: 'h2l-help-item' }, 
                                el('span', { className: 'h2l-tag-demo mention' }, '@ali'), 
                                el('span', null, 'Kişi atama')
                            ),
                            el('div', { className: 'h2l-help-item' }, 
                                el('span', { className: 'h2l-tag-demo project' }, '#proje'), 
                                el('span', null, 'Projeye ekle')
                            ),
                            el('div', { className: 'h2l-help-item' }, 
                                el('span', { className: 'h2l-tag-demo section' }, '>bölüm'), 
                                el('span', null, 'Bölüme ekle')
                            )
                        )
                    ),

                    // Bölüm 2: Klavye Kısayolları
                    el('div', { className: 'h2l-help-section' },
                        el('h4', null, el(Icon, {name:'keyboard'}), ' Klavye Kısayolları'),
                        el('table', { className: 'h2l-shortcuts-table' },
                            el('tbody', null,
                                el('tr', null, el('td', null, el('kbd', null, 'q')), el('td', null, 'Hızlı görev ekle')),
                                el('tr', null, el('td', null, el('kbd', null, 'Esc')), el('td', null, 'Pencereleri kapat / İptal et')),
                                el('tr', null, el('td', null, el('kbd', null, 'Enter')), el('td', null, 'Kaydet / Gönder')),
                                el('tr', null, el('td', null, el('kbd', null, '#')), el('td', null, 'Etiket menüsünü aç (Editörde)')),
                                el('tr', null, el('td', null, el('kbd', null, '@')), el('td', null, 'Kişi etiketle (Yorumlarda)'))
                            )
                        )
                    )
                ),
                el('div', { className: 'h2l-modal-footer' }, el('button', { className: 'h2l-btn primary', onClick: onClose }, 'Tamam, anlaşıldı'))
            )
        );
    };

    // --- API MIDDLEWARE ---
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        if ((!options.method || options.method === 'GET') && options.path) {
            const separator = options.path.includes('?') ? '&' : '?';
            options.path = `${options.path}${separator}t=${new Date().getTime()}`;
        }
        return next(options);
    });

    const App = () => {
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [], labels: [] });
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null); // { type: 'project'|'folder'|'settings'|'help', data: ... }
        const [activeTaskId, setActiveTaskId] = useState(null); 
        const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
        const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

        const loadData = () => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => { setData(res); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        };

        useEffect(() => { loadData(); }, []);

        useEffect(() => {
            apiFetch({ path: '/h2l/v1/trigger-reminders', method: 'POST' }).catch(() => {});
            const interval = setInterval(() => {
                apiFetch({ path: '/h2l/v1/trigger-reminders', method: 'POST' }).catch(() => {});
            }, 60000); 
            return () => clearInterval(interval);
        }, []);

        const navigate = (path) => {
            const fullPath = path.startsWith('/') ? path : '/' + path;
            window.history.pushState({}, '', BASE_URL + fullPath);
            parseRoute(fullPath);
            setIsMobileSidebarOpen(false);
        };
        
        const parseRoute = (path) => {
            if (path.includes('/gorev/')) {
                const parts = path.split('/gorev/');
                if (parts[1]) {
                    const tid = parseInt(parts[1]);
                    setActiveTaskId(tid);
                    const task = data.tasks.find(t => t.id == tid);
                    if (task && task.project_id) {
                        if (!(viewState.type === 'project_detail' && viewState.id === parseInt(task.project_id))) {
                            setViewState({ type: 'project_detail', id: parseInt(task.project_id) });
                        }
                        return; 
                    }
                }
            } else { setActiveTaskId(null); }

            if(path === '' || path === '/') { setViewState({ type: 'projects' }); } 
            else if(path.includes('/proje/')) { const pid = parseInt(path.split('/proje/')[1]); if(!isNaN(pid)) setViewState({ type: 'project_detail', id: pid }); } 
            else if (path.includes('/inbox')) { const inboxProj = data.projects.find(p => p.slug === 'inbox-project'); if (inboxProj) setViewState({ type: 'project_detail', id: parseInt(inboxProj.id), isInbox: true }); else setViewState({ type: 'projects' }); } 
            else if (path.includes('/bugun')) { setViewState({ type: 'today' }); } 
            else if (path.includes('/yaklasan')) { setViewState({ type: 'upcoming' }); } 
            else if (path.includes('/filtreler-etiketler')) { setViewState({ type: 'filters_labels' }); }
            else if (path.includes('/etiket/')) { const parts = path.split('/etiket/'); if (parts[1]) setViewState({ type: 'label', slug: parts[1] }); }
        };

        const getCurrentViewPath = () => {
            if (viewState.type === 'project_detail') return viewState.isInbox ? '/inbox' : `/proje/${viewState.id}`;
            if (viewState.type === 'today') return '/bugun';
            if (viewState.type === 'upcoming') return '/yaklasan';
            if (viewState.type === 'filters_labels') return '/filtreler-etiketler';
            if (viewState.type === 'label') return `/etiket/${viewState.slug}`;
            return '';
        };

        const handleCloseTask = () => { setActiveTaskId(null); const parentPath = getCurrentViewPath(); window.history.replaceState({}, '', BASE_URL + parentPath); };

        useEffect(() => { if (!loading) { const path = window.location.pathname.replace(BASE_URL, ''); parseRoute(path); } }, [loading, data.tasks]);
        useEffect(() => { window.onpopstate = () => { const path = window.location.pathname.replace(BASE_URL, ''); parseRoute(path); }; }, [data.projects, data.tasks]);

        // Kısayol Tuşları (Global)
        useEffect(() => {
            const handleGlobalKeys = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
                if (e.key === 'q' || e.key === 'Q') {
                    e.preventDefault();
                    setModal({ type: 'project', data: null }); 
                }
            };
            document.addEventListener('keydown', handleGlobalKeys);
            return () => document.removeEventListener('keydown', handleGlobalKeys);
        }, []);

        const handleAction = (act, item) => { 
            if(act === 'add_project' || act === 'edit_project') setModal({ type: 'project', data: item });
            if(act === 'add_folder' || act === 'edit_folder') setModal({ type: 'folder', data: item });
            if (act === 'update_project_members') { handleSaveProject(item); }
        };

        const handleSaveProject = (f) => apiFetch({ path: '/h2l/v1/projects'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteProject = (id) => apiFetch({ path: `/h2l/v1/projects/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); navigate(''); });
        const handleSaveFolder = (f) => apiFetch({ path: '/h2l/v1/folders'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteFolder = (id) => apiFetch({ path: `/h2l/v1/folders/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); });
        const handleAddTask = (d) => apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data: d }).then(loadData);
        const handleUpdateTask = (id, d) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'POST', data: d }).then(res => { loadData(); });
        const handleDeleteTask = (id) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' }).then(() => { loadData(); if(activeTaskId === id) { handleCloseTask(); } });
        const handleAddSection = (d) => apiFetch({ path: '/h2l/v1/sections', method: 'POST', data: d }).then(loadData);
        const handleUpdateSection = (id, data) => apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'POST', data: data }).then(loadData);
        const handleDeleteSection = (id) => apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'DELETE' }).then(loadData);
        
        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

        const todayStr = new Date().toISOString().split('T')[0];
        const counts = {
            inbox: data.tasks.filter(t => {
                const p = data.projects.find(prj => prj.id == t.project_id);
                return p && p.slug === 'inbox-project' && t.status !== 'completed' && t.status !== 'trash';
            }).length,
            today: data.tasks.filter(t => t.due_date && t.due_date.startsWith(todayStr) && t.status !== 'completed' && t.status !== 'trash').length,
            upcoming: data.tasks.filter(t => t.due_date && t.due_date > todayStr && t.status !== 'completed' && t.status !== 'trash').length
        };

        let content = null;
        let visibleTasks = []; 
        const onTaskClick = (task) => navigate('/gorev/' + task.id);

        if (viewState.type === 'projects') {
            visibleTasks = data.tasks.filter(t => t.status !== 'trash');
            content = el(ProjectsDashboard, { data, navigate, onAction: handleAction });
        } 
        else if (viewState.type === 'project_detail') {
            const activeProject = data.projects.find(p => parseInt(p.id) === viewState.id);
            if (activeProject) {
                visibleTasks = data.tasks.filter(t => parseInt(t.projectId || t.project_id) === viewState.id && t.status !== 'trash');
                const activeSections = data.sections.filter(s => parseInt(s.projectId || s.project_id) === viewState.id);
                content = el(ProjectDetail, { project: activeProject, projects: data.projects, folders: data.folders, tasks: visibleTasks, sections: activeSections, users: data.users, navigate, onAddTask: handleAddTask, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask, onAddSection: handleAddSection, onUpdateSection: handleUpdateSection, onDeleteSection: handleDeleteSection, onAction: handleAction, labels: data.labels || [], onTaskClick: onTaskClick });
            } else { content = el('div', {className: 'h2l-error'}, 'Proje bulunamadı.'); }
        }
        else if (viewState.type === 'today') {
            // Bugün Görünümü (GÜNCELLENDİ: TodayView kullanılıyor)
            content = el(TodayView, { 
                tasks: data.tasks.filter(t => t.status !== 'trash'),
                users: data.users, 
                projects: data.projects, 
                sections: data.sections, 
                onUpdateTask: handleUpdateTask, 
                onDeleteTask: handleDeleteTask, 
                onAddTask: handleAddTask, 
                onTaskClick: onTaskClick, 
                labels: data.labels || [],
                navigate
            });
        }
        else if (viewState.type === 'upcoming') {
            visibleTasks = data.tasks.filter(t => t.due_date && t.status !== 'trash');
            content = el(UpcomingView, { 
                tasks: visibleTasks, 
                users: data.users, 
                projects: data.projects, 
                sections: data.sections, 
                onUpdateTask: handleUpdateTask, 
                onDeleteTask: handleDeleteTask, 
                onAddTask: handleAddTask, 
                onTaskClick: onTaskClick, 
                labels: data.labels || [],
                navigate
            });
        }
        else if (viewState.type === 'filters_labels') {
            content = el(FiltersLabelsView, { labels: data.labels, navigate });
        }
        else if (viewState.type === 'label') {
            const activeLabel = data.labels ? data.labels.find(l => l.slug === viewState.slug) : null;
            if (activeLabel) {
                visibleTasks = data.tasks.filter(t => t.status !== 'trash' && t.labels && t.labels.some(l => l.slug === viewState.slug));
                const virtualProject = { id: 0, title: activeLabel.name, color: activeLabel.color || '#808080', view_type: 'list' };
                content = el(ListView, { project: virtualProject, projects: data.projects, tasks: visibleTasks, sections: [], users: data.users, navigate, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask, onAddSection: () => alert('Etiket görünümünde bölüm eklenemez.'), onTaskClick: onTaskClick, showCompleted: true, highlightToday: true, onUpdateSection: ()=>{}, onDeleteSection: ()=>{}, labels: data.labels || [] });
            } else { content = el('div', {className: 'h2l-error'}, 'Etiket bulunamadı: ' + viewState.slug); }
        }

        const activeTask = activeTaskId ? data.tasks.find(t => t.id == activeTaskId) : null;

        return el('div', { id: 'h2l-app-container', className: `h2l-flex-root ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}` },
            el(Sidebar, { 
                navigate, activeView: viewState, counts, projects: data.projects, labels: data.labels,
                isCollapsed: isSidebarCollapsed, toggleCollapse: () => setIsSidebarCollapsed(!isSidebarCollapsed),
                isMobileOpen: isMobileSidebarOpen, closeMobile: () => setIsMobileSidebarOpen(false),
                onAddProject: () => setModal({type: 'project', data: null}),
                onOpenSettings: () => setModal({ type: 'settings' }),
                onOpenHelp: () => setModal({ type: 'help' })
            }),
            
            el('div', { className: 'h2l-mobile-trigger', onClick: () => setIsMobileSidebarOpen(true) }, el(Icon, {name: 'bars'})),
            el('div', { className: 'h2l-main-wrapper' }, content),
            
            modal?.type === 'project' && el(ProjectModal, { onClose:()=>setModal(null), onSave:handleSaveProject, onDelete:handleDeleteProject, folders:data.folders, users:data.users, initialData:modal.data }),
            modal?.type === 'folder' && el(FolderModal, { onClose:()=>setModal(null), onSave:handleSaveFolder, onDelete:handleDeleteFolder, initialData:modal.data }),
            
            // Yeni Modallar
            modal?.type === 'settings' && el(SettingsModal, { onClose: () => setModal(null) }),
            modal?.type === 'help' && el(HelpModal, { onClose: () => setModal(null) }),
            
            activeTask && el(TaskDetailModal, { task: activeTask, tasks: visibleTasks, onClose: handleCloseTask, onUpdate: (id, d) => { handleUpdateTask(id, d); }, onDelete: handleDeleteTask, onAdd: handleAddTask, users: data.users, projects: data.projects, sections: data.sections, labels: data.labels, navigate })
        );
    };

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('h2l-frontend-app');
        if (root && wp.element) {
            if(wp.element.createRoot) wp.element.createRoot(root).render(el(ErrorBoundary, null, el(App)));
            else wp.element.render(el(ErrorBoundary, null, el(App)), root);
        }
    });
})(window.wp, window.h2lFrontendSettings);