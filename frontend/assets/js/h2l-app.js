(function(wp, settings) {
    const { createElement: el, useState, useEffect } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const { ErrorBoundary, Icon } = window.H2L.Common;
    const { Sidebar } = window.H2L;
    const { ProjectsDashboard, ProjectModal, FolderModal } = window.H2L.Projects;
    const { ProjectDetail } = window.H2L;
    const { ListView, UpcomingView, TodayView } = window.H2L.Tasks;
    
    // --- YENİ: Güvenli Meeting Modülü İçe Aktarımı ---
    const { MeetingsDashboard, StartMeetingModal, LiveMeetingView, SummaryView } = window.H2L.Meetings || { 
        MeetingsDashboard: () => null, StartMeetingModal: () => null, LiveMeetingView: () => null, SummaryView: () => null 
    };
    
    const TaskModal = window.H2L && window.H2L.TaskModal ? window.H2L.TaskModal : { TaskDetailModal: () => null };
    const { TaskDetailModal } = TaskModal;

    const BASE_URL = settings.base_url || '/gorevler';

    // --- MEVCUT: Labels & Filters Sayfası ---
    const { FiltersLabelsView } = window.H2L.Filters || { FiltersLabelsView: () => null }; 


    // --- GÜNCELLENMİŞ SETTINGS MODAL (API ENTEGRASYONLU) ---
    const SettingsModal = ({ onClose }) => {
        const [activeTab, setActiveTab] = useState('general');
        // Varsayılan değerler
        const [userSettings, setUserSettings] = useState({ // İsim karışıklığını önlemek için settings -> userSettings
            email_notifications: true,
            in_app_notifications: true,
            start_view: 'projects', // Varsayılan: Projelerim
            ical_active: false,
            ical_url: ''
        });
        const [loading, setLoading] = useState(true);
        const [copySuccess, setCopySuccess] = useState(false);

        // Ayarları yükle
        useEffect(() => {
            apiFetch({ path: '/h2l/v1/user-settings' })
                .then(res => {
                    // State merge işlemi
                    setUserSettings(prev => ({ ...prev, ...res }));
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }, []);

        // Checkbox Toggle
        const handleToggle = (key) => {
            const newValue = !userSettings[key];
            setUserSettings(prev => ({ ...prev, [key]: newValue }));
            saveSetting(key, newValue);
        };

        // Select Change (Text values) - BU FONKSİYON ZORUNLU
        const handleChange = (key, value) => {
            setUserSettings(prev => ({ ...prev, [key]: value }));
            saveSetting(key, value);
        };

        const saveSetting = (key, value) => {
            apiFetch({ 
                path: '/h2l/v1/user-settings', 
                method: 'POST', 
                data: { [key]: value } 
            }).catch(err => {
                console.error("Ayar kaydedilemedi:", err);
            });
        };

        const handleCopyUrl = () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(userSettings.ical_url).then(() => {
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2500);
                });
            } else {
                // Fallback
                const input = document.getElementById('h2l-ical-input');
                if (input) {
                    input.select();
                    document.execCommand('copy');
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2500);
                }
            }
        };

        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal medium', onClick: e => e.stopPropagation(), style: { position: 'relative' } },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, 'Ayarlar'), el(Icon, { name: 'xmark', onClick: onClose })),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-settings-tabs', style: { display: 'flex', borderBottom: '1px solid #eee', marginBottom: '20px' } },
                        el('button', { 
                            className: `h2l-tab-btn ${activeTab === 'general' ? 'active' : ''}`, 
                            onClick: () => setActiveTab('general'),
                            style: { marginRight: '20px', paddingBottom: '10px', borderBottom: activeTab === 'general' ? '2px solid #db4c3f' : 'none', fontWeight: 600 }
                        }, 'Genel'),
                        el('button', { 
                            className: `h2l-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`, 
                            onClick: () => setActiveTab('notifications'),
                            style: { marginRight: '20px', paddingBottom: '10px', borderBottom: activeTab === 'notifications' ? '2px solid #db4c3f' : 'none', fontWeight: 600 }
                        }, 'Bildirimler'),
                        el('button', { 
                            className: `h2l-tab-btn ${activeTab === 'integrations' ? 'active' : ''}`, 
                            onClick: () => setActiveTab('integrations'),
                            style: { paddingBottom: '10px', borderBottom: activeTab === 'integrations' ? '2px solid #db4c3f' : 'none', fontWeight: 600 }
                        }, 'Takvim')
                    ),
                    
                    activeTab === 'general' && el('div', { className: 'h2l-settings-content' },
                        el('div', { className: 'h2l-form-group' },
                            el('label', { className: 'h2l-label' }, 'Başlangıç Sayfası'),
                            el('select', { className: 'h2l-select', value: userSettings.start_view || 'projects', onChange: (e) => handleChange('start_view', e.target.value) },
                                el('option', { value: 'projects' }, 'Projelerim (Varsayılan)'),
                                el('option', { value: 'inbox' }, 'Gelen Kutusu'),
                                el('option', { value: 'today' }, 'Bugün'),
                                el('option', { value: 'upcoming' }, 'Yaklaşan')
                            ),
                            el('p', { style: { fontSize: '12px', color: '#888', marginTop: '5px' } }, 'Uygulamayı açtığınızda ilk olarak bu ekranı görürsünüz.')
                        )
                    ),

                    activeTab === 'notifications' && el('div', { className: 'h2l-settings-content' },
                        el('div', { className: 'h2l-form-group switch-row', onClick: () => handleToggle('email_notifications'), style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9f9f9' } },
                            el('div', null,
                                el('span', { className: 'h2l-setting-label', style: { display: 'block', fontWeight: 600 } }, 'E-posta Bildirimleri'),
                                el('span', { style: { fontSize: '12px', color: '#888' } }, 'Önemli güncellemeleri e-posta ile al.')
                            ),
                            el('div', { className: 'h2l-switch' },
                                el('input', { type: 'checkbox', checked: userSettings.email_notifications, onChange: () => {} }),
                                el('span', { className: 'h2l-slider round' })
                            )
                        ),
                        el('div', { className: 'h2l-form-group switch-row', onClick: () => handleToggle('in_app_notifications'), style: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9f9f9' } },
                            el('div', null,
                                el('span', { className: 'h2l-setting-label', style: { display: 'block', fontWeight: 600 } }, 'Site İçi Bildirimler'),
                                el('span', { style: { fontSize: '12px', color: '#888' } }, 'Uygulama içindeyken bildirim al.')
                            ),
                            el('div', { className: 'h2l-switch' },
                                el('input', { type: 'checkbox', checked: userSettings.in_app_notifications, onChange: () => {} }),
                                el('span', { className: 'h2l-slider round' })
                            )
                        )
                    ),

                    activeTab === 'integrations' && el('div', { className: 'h2l-settings-content' },
                        !userSettings.ical_active ? el('div', {className:'h2l-empty-state', style: { padding: '20px', textAlign: 'center', color: '#999' }}, 'Takvim entegrasyonu yönetici tarafından kapatılmış.') :
                        el('div', null, 
                            el('h4', {style: { margin: '0 0 10px 0', fontSize: '14px' }}, 'Takvim Aboneliği (iCal)'),
                            el('p', {style:{fontSize:13, color:'#666', lineHeight: 1.5}}, 'Bu bağlantıyı Google Takvim veya Outlook\'a ekleyerek görevlerinizi takip edebilirsiniz.'),
                            el('div', {className: 'h2l-ical-box', style:{display:'flex', gap:10, marginTop:15, marginBottom: 20}},
                                el('input', {id: 'h2l-ical-input', type:'text', readOnly:true, value:userSettings.ical_url, className:'h2l-input', style:{background:'#f9f9f9', fontSize: '12px'}}),
                                el('button', {className:'h2l-btn', onClick: handleCopyUrl}, el(Icon, {name:'copy'}), ' Kopyala')
                            ),
                            el('div', {style:{fontSize:12, color:'#888', background: '#f5f5f5', padding: '15px', borderRadius: '6px'}}, 
                                el('strong', {style:{display:'block', marginBottom: 5, color: '#333'}}, 'Google Takvim Kurulumu:'),
                                '1. Sol menüde "Diğer takvimler" yanındaki + butonuna tıklayın.', el('br'),
                                '2. "URL ile ekle" seçeneğini seçin.', el('br'),
                                '3. Yukarıdaki linki yapıştırın.'
                            )
                        )
                    )
                ),
                el('div', { className: 'h2l-modal-footer' }, el('button', { className: 'h2l-btn', onClick: onClose }, 'Kapat')),
                
                // Şık Bildirim Balonu (Toast)
                copySuccess && el('div', { 
                    style: { 
                        position: 'absolute', 
                        bottom: '80px', 
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        background: '#333', 
                        color: '#fff', 
                        padding: '10px 20px', 
                        borderRadius: '6px', 
                        fontSize: '13px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        animation: 'fadeIn 0.2s ease-out',
                        whiteSpace: 'nowrap'
                    } 
                }, el(Icon, {name:'check', style:{color:'#4cd964'}}), 'Bağlantı kopyalandı!')
            )
        );
    };

    const HelpModal = ({ onClose }) => {
        return el('div', { className: 'h2l-overlay', onClick: onClose },
            el('div', { className: 'h2l-modal large h2l-help-modal', onClick: e => e.stopPropagation() },
                el('div', { className: 'h2l-modal-header' }, el('h3', null, 'Yardım & Kısayollar'), el(Icon, { name: 'xmark', onClick: onClose })),
                el('div', { className: 'h2l-modal-body' },
                    el('div', { className: 'h2l-help-section' },
                        el('h4', null, el(Icon, {name:'bolt'}), ' Hızlı Ekleme İpuçları'),
                        el('p', null, 'Görev eklerken veya düzenlerken aşağıdaki sembolleri kullanarak hızlıca detay ekleyebilirsiniz:'),
                        el('div', { className: 'h2l-help-grid' },
                            el('div', { className: 'h2l-help-item' }, el('span', { className: 'h2l-tag-demo date' }, 'yarın 15:00'), el('span', null, 'Tarih ve saat (Doğal dil)')),
                            el('div', { className: 'h2l-help-item' }, el('span', { className: 'h2l-tag-demo priority' }, 'p1'), el('span', null, 'Öncelik (p1, p2, p3)')),
                            el('div', { className: 'h2l-help-item' }, el('span', { className: 'h2l-tag-demo mention' }, '@ali'), el('span', null, 'Kişi atama')),
                            el('div', { className: 'h2l-help-item' }, el('span', { className: 'h2l-tag-demo project' }, '#proje'), el('span', null, 'Projeye ekle')),
                            el('div', { className: 'h2l-help-item' }, el('span', { className: 'h2l-tag-demo section' }, '>bölüm'), el('span', null, 'Bölüme ekle'))
                        )
                    ),
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
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [], labels: [], filters: [] });
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null);
        const [activeTaskId, setActiveTaskId] = useState(null); 
        const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
        const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
        
        // --- YENİ: Meeting State ---
        const [activeMeeting, setActiveMeeting] = useState(null);

        const loadData = () => {
            apiFetch({ path: '/h2l/v1/init' }).then(res => { 
                setData(res); 
                setLoading(false); 
                
                // Başlangıç Görünümü Ayarı (Sadece Ana Sayfadaysak)
                if (window.location.pathname === BASE_URL || window.location.pathname === BASE_URL + '/') {
                    if (res.user_prefs && res.user_prefs.start_view) {
                        const sv = res.user_prefs.start_view;
                        if (sv === 'inbox') {
                            const inboxProj = res.projects.find(p => p.slug === 'inbox-project');
                            if (inboxProj) setViewState({ type: 'project_detail', id: parseInt(inboxProj.id), isInbox: true });
                        }
                        else if (sv === 'today') setViewState({ type: 'today' });
                        else if (sv === 'upcoming') setViewState({ type: 'upcoming' });
                        else setViewState({ type: 'projects' });
                    }
                }
            })
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

            // 2. Ana Rota Kontrolü (Boş ise Başlangıç Ayarına Bak)
            if (path === '' || path === '/' || path === '/gorevler' || path === '/gorevler/') { 
                // Varsayılan olarak kullanıcının seçtiği başlangıç sayfasını uygula
                const startView = (data.user_prefs && data.user_prefs.start_view) ? data.user_prefs.start_view : 'projects';
                
                if (startView === 'inbox') {
                    const inboxProj = data.projects.find(p => p.slug === 'inbox-project');
                    if (inboxProj) setViewState({ type: 'project_detail', id: parseInt(inboxProj.id), isInbox: true });
                    else setViewState({ type: 'projects' });
                }
                else if (startView === 'today') setViewState({ type: 'today' });
                else if (startView === 'upcoming') setViewState({ type: 'upcoming' });
                else setViewState({ type: 'projects' }); // 'projects' veya bilinmeyen
            } 
            else if(path.includes('/proje/')) { const pid = parseInt(path.split('/proje/')[1]); if(!isNaN(pid)) setViewState({ type: 'project_detail', id: pid }); } 
            else if (path.includes('/inbox')) { const inboxProj = data.projects.find(p => p.slug === 'inbox-project'); if (inboxProj) setViewState({ type: 'project_detail', id: parseInt(inboxProj.id), isInbox: true }); else setViewState({ type: 'projects' }); } 
            else if (path.includes('/bugun')) { setViewState({ type: 'today' }); } 
            else if (path.includes('/yaklasan')) { setViewState({ type: 'upcoming' }); } 
            else if (path.includes('/filtreler-etiketler')) { setViewState({ type: 'filters_labels' }); }
            else if (path.includes('/toplantilar')) { setViewState({ type: 'meetings' }); }
            else if (path.includes('/etiket/')) { const parts = path.split('/etiket/'); if (parts[1]) setViewState({ type: 'label', slug: parts[1] }); }
            else if (path.includes('/filtre/')) { const parts = path.split('/filtre/'); if (parts[1]) setViewState({ type: 'filter', id: parseInt(parts[1]) }); }
        };

        const getCurrentViewPath = () => {
            if (viewState.type === 'project_detail') return viewState.isInbox ? '/inbox' : `/proje/${viewState.id}`;
            if (viewState.type === 'today') return '/bugun';
            if (viewState.type === 'upcoming') return '/yaklasan';
            if (viewState.type === 'filters_labels') return '/filtreler-etiketler';
            // --- YENİ: Toplantı Rotası ---
            if (viewState.type === 'meetings' || viewState.type === 'live_meeting' || viewState.type === 'meeting_summary') return '/toplantilar';
            if (viewState.type === 'label') return `/etiket/${viewState.slug}`;
            if (viewState.type === 'filter') return `/filtre/${viewState.id}`;

            return '';
        };

        const handleCloseTask = () => { setActiveTaskId(null); const parentPath = getCurrentViewPath(); window.history.replaceState({}, '', BASE_URL + parentPath); };

        useEffect(() => { if (!loading) { const path = window.location.pathname.replace(BASE_URL, ''); parseRoute(path); } }, [loading, data.tasks]);
        useEffect(() => { window.onpopstate = () => { const path = window.location.pathname.replace(BASE_URL, ''); parseRoute(path); }; }, [data.projects, data.tasks]);

        useEffect(() => {
            const handleGlobalKeys = (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
                if (e.key === 'q' || e.key === 'Q') {
                    e.preventDefault();
                    setModal({ type: 'project', data: null }); 
                }
            };
            document.addEventListener('keydown', handleGlobalKeys);
            return () => document.EventListener('keydown', handleGlobalKeys);
        }, []);

        const handleAction = (act, item) => { 
            if(act === 'add_project' || act === 'edit_project') setModal({ type: 'project', data: item });
            if(act === 'add_folder' || act === 'edit_folder') setModal({ type: 'folder', data: item });
            if (act === 'update_project_members') { handleSaveProject(item); }
        };
        // --- YENİ: FİLTRE İŞLEMLERİ ---
        const handleAddFilter = (title, query) => {
            apiFetch({ path: '/h2l/v1/filters', method: 'POST', data: { title, query } })
                .then(() => loadData())
                .catch(err => alert('Filtre kaydedilemedi.'));
        };
        const handleDeleteFilter = (id) => {
            apiFetch({ path: `/h2l/v1/filters/${id}`, method: 'DELETE' })
                .then(() => loadData());
        };
        // --- MEVCUT CRUD FONKSİYONLARI (KORUNDU) ---
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
        
        const handleToggleFavorite = (project) => {
            const newStatus = parseInt(project.is_favorite) === 1 ? 0 : 1;
            apiFetch({ 
                path: `/h2l/v1/projects/${project.id}`, 
                method: 'POST', 
                data: { is_favorite: newStatus } 
            }).then(loadData);
        };

        // --- YENİ: TOPLANTI FONKSİYONLARI (HATA YAKALAMALI) ---
        const handleStartMeeting = (title, crmType) => {
            apiFetch({ 
                path: '/h2l/v1/meetings/start', 
                method: 'POST', 
                data: { title, related_object_type: crmType } 
            }).then(res => {
                if(res.success) {
                    const newMeeting = { id: res.id, title, status: 'in_progress' };
                    setActiveMeeting(newMeeting);
                    setViewState({ type: 'live_meeting' });
                    setModal(null);
                }
            }).catch(err => {
                console.error("Start meeting error:", err);
                alert("Toplantı başlatılamadı. Lütfen kalıcı bağlantıları (Permalinks) yenileyin.");
            });
        };

        const handleFinishMeeting = (id, transcript, duration) => {
            apiFetch({ 
                path: `/h2l/v1/meetings/${id}/finish`, 
                method: 'POST', 
                data: { transcript, duration_seconds: duration } 
            }).then(res => {
                setActiveMeeting(res);
                setViewState({ type: 'meeting_summary' });
            }).catch(err => {
                console.error("Finish meeting error:", err);
                alert("Toplantı kaydedilemedi.");
            });
        };

        const handleMeetingTasksCreate = (tasksToCreate, meetingId) => {
            // 1. Gelen Kutusu (Inbox) projesini slug üzerinden bulmaya çalış
            // Veritabanında varsayılan olarak 'inbox-project' slug'ı kullanılır.
            let targetProject = data.projects.find(p => p.slug === 'inbox-project');
            
            // Eğer Inbox bulunamazsa, kullanıcının erişebildiği herhangi bir ilk projeyi (Notlarım vb.) seç.
            // Bu, görevlerin "kaybolmasını" önler.
            if (!targetProject && data.projects.length > 0) {
                targetProject = data.projects[0];
            }

            // Proje ID'sini al, yoksa 0 (bu durumda API görev oluşturur ama listede görünmeyebilir)
            const targetProjectId = targetProject ? parseInt(targetProject.id) : 0;

            if (targetProjectId === 0) {
                alert("Hata: Gelen Kutusu veya herhangi bir proje bulunamadı. Lütfen önce bir proje oluşturun.");
                return;
            }

            const promises = tasksToCreate.map(t => {
                return apiFetch({ 
                    path: '/h2l/v1/tasks', 
                    method: 'POST', 
                    data: { 
                        title: t.title, 
                        meeting_id: meetingId,
                        projectId: targetProjectId 
                    } 
                });
            });

            Promise.all(promises).then(() => {
                alert('Görevler başarıyla oluşturuldu.');
                loadData(); // Verileri yeniden çekerek listeyi güncelle
                
                // Eğer görevler Inbox'a gittiyse oraya yönlendir, değilse ilgili projeye
                if (targetProject.slug === 'inbox-project') {
                    navigate('/inbox');
                } else {
                    navigate(`/proje/${targetProjectId}`);
                }
            }).catch(err => {
                console.error("Tasks creation error:", err);
                alert("Görevler oluşturulurken bir hata oluştu: " + err.message);
            });
        };

        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

        const todayStr = new Date().toISOString().split('T')[0];
        const counts = {
            inbox: data.tasks.filter(t => { const p = data.projects.find(prj => prj.id == t.project_id); return p && p.slug === 'inbox-project' && t.status !== 'completed' && t.status !== 'trash'; }).length,
            today: data.tasks.filter(t => t.due_date && t.due_date.startsWith(todayStr) && t.status !== 'completed' && t.status !== 'trash').length,
            upcoming: data.tasks.filter(t => t.due_date && t.due_date > todayStr && t.status !== 'completed' && t.status !== 'trash').length
        };

        let content = null;
        let visibleTasks = []; 
        const onTaskClick = (task) => navigate('/gorev/' + task.id);

        if (viewState.type === 'projects') {
            visibleTasks = data.tasks.filter(t => t.status !== 'trash');
            content = el(ProjectsDashboard, { data, navigate, onAction: handleAction, onToggleFavorite: handleToggleFavorite });
        } 
        else if (viewState.type === 'project_detail') {
            const activeProject = data.projects.find(p => parseInt(p.id) === viewState.id);
            if (activeProject) {
                visibleTasks = data.tasks.filter(t => parseInt(t.projectId || t.project_id) === viewState.id && t.status !== 'trash');
                const activeSections = data.sections.filter(s => parseInt(s.projectId || s.project_id) === viewState.id);
                content = el(ProjectDetail, { project: activeProject, projects: data.projects, folders: data.folders, tasks: visibleTasks, sections: activeSections, users: data.users, navigate, onAddTask: handleAddTask, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask, onAddSection: handleAddSection, onUpdateSection: handleUpdateSection, onDeleteSection: handleDeleteSection, onAction: handleAction, labels: data.labels || [], onTaskClick: onTaskClick });
            } else { content = el('div', {className: 'h2l-error'}, 'Proje bulunamadı.'); }
        }
        else if (viewState.type === 'today') { content = el(TodayView, { tasks: data.tasks.filter(t => t.status !== 'trash'), users: data.users, projects: data.projects, sections: data.sections, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask, onAddTask: handleAddTask, onTaskClick: onTaskClick, labels: data.labels || [], navigate }); }
        else if (viewState.type === 'upcoming') { visibleTasks = data.tasks.filter(t => t.due_date && t.status !== 'trash'); content = el(UpcomingView, { tasks: visibleTasks, users: data.users, projects: data.projects, sections: data.sections, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask, onAddTask: handleAddTask, onTaskClick: onTaskClick, labels: data.labels || [], navigate }); }
        
        // --- GÜNCELLENEN VIEW: Filters & Labels ---
        else if (viewState.type === 'filters_labels') {
            content = el(FiltersLabelsView, { 
                labels: data.labels, 
                filters: data.filters, // API'den gelen filtreler
                users: data.users,
                navigate, 
                onAddFilter: handleAddFilter,
                onDeleteFilter: handleDeleteFilter
            });
        }
        
        // --- YENİ VIEW: Filter Detail ---
        else if (viewState.type === 'filter') {
            const activeFilter = data.filters ? data.filters.find(f => parseInt(f.id) === viewState.id) : null;
            if (activeFilter) {
                let query = {};
                try { query = JSON.parse(activeFilter.query_json); } catch(e){}
                
                // Filtreleme Mantığı
                visibleTasks = data.tasks.filter(t => {
                    if (t.status === 'trash') return false;
                    if (t.status === 'completed' && query.due !== 'completed') return false; // Varsayılan olarak tamamlananları gizle

                    let match = true;
                    
                    // Assignee
                    if (query.assignee) {
                        if (query.assignee === 'me') {
                            if (!t.assignees || !t.assignees.map(id=>parseInt(id)).includes(parseInt(window.h2lFrontendSettings.currentUser.id))) match = false;
                        } else {
                            if (!t.assignees || !t.assignees.map(id=>parseInt(id)).includes(parseInt(query.assignee))) match = false;
                        }
                    }

                    // Priority
                    if (query.priority && parseInt(t.priority) !== parseInt(query.priority)) match = false;

                    // Due Date
                    if (query.due) {
                        if (!t.due_date) {
                            match = false;
                        } else {
                            const d = new Date(t.due_date);
                            const today = new Date();
                            d.setHours(0,0,0,0); today.setHours(0,0,0,0);
                            
                            if (query.due === 'today' && d.getTime() !== today.getTime()) match = false;
                            if (query.due === 'overdue' && d.getTime() >= today.getTime()) match = false;
                            if (query.due === 'upcoming' && d.getTime() <= today.getTime()) match = false;
                        }
                    }

                    return match;
                }).map(t => ({ ...t, section_id: 0, parent_task_id: 0 })); // Flatten tasks for filter view

                const virtualProject = { id: 0, title: activeFilter.title, color: '#555', view_type: 'list' };
                content = el(ListView, { 
                    project: virtualProject, 
                    projects: data.projects, 
                    tasks: visibleTasks, 
                    sections: [], 
                    users: data.users, 
                    navigate, 
                    onUpdateTask: handleUpdateTask, 
                    onDeleteTask: handleDeleteTask, 
                    onAddSection: () => alert('Filtre görünümünde bölüm eklenemez.'), 
                    onTaskClick: onTaskClick, 
                    showCompleted: true, 
                    highlightToday: true, 
                    onUpdateSection: ()=>{}, 
                    onDeleteSection: ()=>{}, 
                    labels: data.labels || [],
                    onAddTask: handleAddTask
                });
            } else { content = el('div', {className: 'h2l-error'}, 'Filtre bulunamadı.'); }
        }

        // --- YENİ VIEW'LAR BAŞLANGIÇ ---
        else if (viewState.type === 'meetings') {
            content = el(MeetingsDashboard, { 
                onStartNew: () => setModal({ type: 'start_meeting' }),
                onSelectMeeting: (m) => { 
                    setActiveMeeting(m); 
                    setViewState({ type: m.status === 'active' ? 'live_meeting' : 'meeting_summary' }); 
                }
            });
        }
        else if (viewState.type === 'live_meeting') {
            content = el(LiveMeetingView, { meeting: activeMeeting, onFinish: handleFinishMeeting });
        }
        else if (viewState.type === 'meeting_summary') {
            content = el(SummaryView, { meeting: activeMeeting, navigate, onAddTasks: handleMeetingTasksCreate });
        }
        // --- YENİ VIEW'LAR BİTİŞ ---
        else if (viewState.type === 'label') {
            const activeLabel = data.labels ? data.labels.find(l => l.slug === viewState.slug) : null;
            if (activeLabel) {
                visibleTasks = data.tasks.filter(t => t.status !== 'trash' && t.labels && t.labels.some(l => l.slug === viewState.slug)).map(t => ({ ...t, section_id: 0, parent_task_id: 0 }));
                const virtualProject = { id: 0, title: activeLabel.name, color: activeLabel.color || '#808080', view_type: 'list' };
                content = el(ListView, { project: virtualProject, projects: data.projects, tasks: visibleTasks, sections: [], users: data.users, navigate, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask, onAddSection: () => alert('Etiket görünümünde bölüm eklenemez.'), onTaskClick: onTaskClick, showCompleted: true, highlightToday: true, onUpdateSection: ()=>{}, onDeleteSection: ()=>{}, labels: data.labels || [], onAddTask: handleAddTask });
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
                onOpenHelp: () => setModal({ type: 'help' }),
                onToggleFavorite: handleToggleFavorite 
            }),
            
            el('div', { className: 'h2l-mobile-trigger', onClick: () => setIsMobileSidebarOpen(true) }, el(Icon, {name: 'bars'})),
            el('div', { className: 'h2l-main-wrapper' }, content),
            
            // Modal Renders
            modal?.type === 'project' && el(ProjectModal, { onClose:()=>setModal(null), onSave:handleSaveProject, onDelete:handleDeleteProject, folders:data.folders, users:data.users, initialData:modal.data }),
            modal?.type === 'folder' && el(FolderModal, { onClose:()=>setModal(null), onSave:handleSaveFolder, onDelete:handleDeleteFolder, initialData:modal.data }),
            modal?.type === 'settings' && el(SettingsModal, { onClose: () => setModal(null) }),
            modal?.type === 'help' && el(HelpModal, { onClose: () => setModal(null) }),
            
            // --- YENİ MODAL ---
            modal?.type === 'start_meeting' && el(StartMeetingModal, { onClose: () => setModal(null), onStart: handleStartMeeting }),
            
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