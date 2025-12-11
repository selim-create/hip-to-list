(function(wp) {
    const { createElement: el, useState, useEffect } = wp.element;
    const apiFetch = wp.apiFetch;
    const { Icon, Avatar } = window.H2L.Common;

    window.H2L = window.H2L || {};
    window.H2L.Profile = window.H2L.Profile || {};

    const ProfileView = ({ currentUser, tasks, projects, users }) => { // users prop'u eklendi mi kontrol edin
        const [settings, setSettings] = useState({
            email_notifications: true,
            in_app_notifications: true,
            start_view: 'projects',
            ical_active: false,
            ical_url: ''
        });
        const [loading, setLoading] = useState(true);
        const [copySuccess, setCopySuccess] = useState(false);
        const [activeTab, setActiveTab] = useState('general'); // general, notifications, integrations
        const userList = users || []; 
        const fullUserProfile = userList.find(u => parseInt(u.id) === parseInt(currentUser.id)) || currentUser;
        // Kullanıcı İstatistikleri
        const myTasks = tasks.filter(t => t.assignees && t.assignees.includes(String(currentUser.id)));
        const completedTasks = myTasks.filter(t => t.status === 'completed').length;
        const openTasks = myTasks.filter(t => t.status !== 'completed' && t.status !== 'trash').length;
        const myProjects = projects.filter(p => parseInt(p.owner_id) === parseInt(currentUser.id)).length;

        useEffect(() => {
            apiFetch({ path: '/h2l/v1/user-settings' })
                .then(res => { setSettings(res); setLoading(false); })
                .catch(() => setLoading(false));
        }, []);

        const handleSave = (key, value) => {
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);
            apiFetch({ path: '/h2l/v1/user-settings', method: 'POST', data: { [key]: value } });
        };

        const handleCopyUrl = () => {
            navigator.clipboard.writeText(settings.ical_url).then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            });
        };

        if (loading) return el('div', { className: 'h2l-loading' }, 'Yükleniyor...');

        return el('div', { className: 'h2l-profile-page' },
            // HEADER
            el('div', { className: 'h2l-header-area' }, el('h1', null, 'Profil ve Ayarlar')),

            el('div', { className: 'h2l-profile-container' },
                
                // SOL KOLON: KULLANICI KARTI
                el('div', { className: 'h2l-profile-sidebar' },
                    el('div', { className: 'h2l-profile-card' },
                        el('div', { className: 'h2l-pc-avatar' },
                            el(Avatar, { userId: fullUserProfile.id, users: [fullUserProfile], size: 100 })
                        ),
                        el('h2', { className: 'h2l-pc-name' }, currentUser.name),
                        el('p', { className: 'h2l-pc-email' }, currentUser.email),
                        el('span', { className: 'h2l-pc-role' }, currentUser.roles[0] || 'Kullanıcı'),
                        
                        el('div', { className: 'h2l-pc-stats' },
                            el('div', { className: 'h2l-stat-item' },
                                el('span', { className: 'h2l-stat-val' }, openTasks),
                                el('span', { className: 'h2l-stat-lbl' }, 'Açık Görev')
                            ),
                            el('div', { className: 'h2l-stat-item' },
                                el('span', { className: 'h2l-stat-val' }, completedTasks),
                                el('span', { className: 'h2l-stat-lbl' }, 'Tamamlanan')
                            ),
                            el('div', { className: 'h2l-stat-item' },
                                el('span', { className: 'h2l-stat-val' }, myProjects),
                                el('span', { className: 'h2l-stat-lbl' }, 'Proje')
                            )
                        )
                    )
                ),

                // SAĞ KOLON: AYARLAR
                el('div', { className: 'h2l-profile-content' },
                    // TABS
                    el('div', { className: 'h2l-profile-tabs' },
                        el('button', { className: activeTab === 'general' ? 'active' : '', onClick: () => setActiveTab('general') }, 'Genel'),
                        el('button', { className: activeTab === 'notifications' ? 'active' : '', onClick: () => setActiveTab('notifications') }, 'Bildirimler'),
                        el('button', { className: activeTab === 'integrations' ? 'active' : '', onClick: () => setActiveTab('integrations') }, 'Entegrasyonlar')
                    ),

                    // TAB CONTENT: GENERAL
                    activeTab === 'general' && el('div', { className: 'h2l-tab-content' },
                        el('h3', null, 'Uygulama Tercihleri'),
                        el('div', { className: 'h2l-form-group' },
                            el('label', { className: 'h2l-label' }, 'Başlangıç Sayfası'),
                            el('select', { className: 'h2l-select', value: settings.start_view, onChange: (e) => handleSave('start_view', e.target.value) },
                                el('option', { value: 'projects' }, 'Projelerim'),
                                el('option', { value: 'inbox' }, 'Gelen Kutusu'),
                                el('option', { value: 'today' }, 'Bugün'),
                                el('option', { value: 'upcoming' }, 'Yaklaşan')
                            ),
                            el('p', { className: 'h2l-hint' }, 'Görevler\'i açtığınızda ilk görmek istediğiniz ekran.')
                        )
                    ),

                    // TAB CONTENT: NOTIFICATIONS
                    activeTab === 'notifications' && el('div', { className: 'h2l-tab-content' },
                        el('h3', null, 'Bildirim Ayarları'),
                        el('div', { className: 'h2l-setting-row' },
                            el('div', null,
                                el('strong', null, 'E-posta Bildirimleri'),
                                el('p', null, 'Görev atamaları ve önemli güncellemeler için e-posta al.')
                            ),
                            el('div', { className: 'h2l-switch' },
                                el('input', { type: 'checkbox', checked: settings.email_notifications, onChange: (e) => handleSave('email_notifications', e.target.checked) }),
                                el('span', { className: 'h2l-slider round' })
                            )
                        ),
                        el('div', { className: 'h2l-setting-row' },
                            el('div', null,
                                el('strong', null, 'Site İçi Bildirimler'),
                                el('p', null, 'Panelde çalışırken sağ üstte bildirimleri gör.')
                            ),
                            el('div', { className: 'h2l-switch' },
                                el('input', { type: 'checkbox', checked: settings.in_app_notifications, onChange: (e) => handleSave('in_app_notifications', e.target.checked) }),
                                el('span', { className: 'h2l-slider round' })
                            )
                        )
                    ),

                    // TAB CONTENT: INTEGRATIONS
                    activeTab === 'integrations' && el('div', { className: 'h2l-tab-content' },
                        el('h3', null, 'Takvim Entegrasyonu (iCal)'),
                        !settings.ical_active 
                            ? el('div', { className: 'h2l-alert info' }, 'Bu özellik yönetici tarafından henüz aktif edilmemiştir.')
                            : el('div', null,
                                el('p', {style:{fontSize:'13px', color:'#666'}}, 'Aşağıdaki bağlantıyı Google Takvim veya Outlook\'a ekleyerek görevlerinizi takviminizde görün.'),
                                el('div', { className: 'h2l-copy-box' },
                                    el('input', { type: 'text', value: settings.ical_url, readOnly: true }),
                                    el('button', { onClick: handleCopyUrl, className: 'h2l-btn' }, copySuccess ? el(Icon, {name:'check'}) : el(Icon, {name:'copy'}))
                                )
                            )
                    )
                )
            )
        );
    };

    window.H2L.Profile = { ProfileView };

})(window.wp);