/**
 * Hip to List - Admin SPA
 * No-Build React (wp.element)
 */

(function(wp, settings) {
    const { createElement: el, useState, useEffect, Fragment } = wp.element;
    const { Button, TextControl, Spinner, Modal, Dashicon } = wp.components;
    const apiFetch = wp.apiFetch;

    // --- Ikonlar (Basit SVG veya Dashicons) ---
    const Icons = {
        inbox: 'dashicons-email',
        today: 'dashicons-calendar-alt',
        upcoming: 'dashicons-calendar',
        project: 'dashicons-list-view',
        add: 'dashicons-plus'
    };

    // --- Alt Bileşenler ---

    // 1. Sidebar Bileşeni
    const Sidebar = ({ activeView, onChangeView, projects }) => {
        return el('div', { className: 'h2l-sidebar' },
            // Sabit Menüler
            el('div', { 
                className: `h2l-nav-item ${activeView === 'inbox' ? 'active' : ''}`,
                onClick: () => onChangeView('inbox')
            },
                el(Dashicon, { icon: 'email', className: 'h2l-nav-icon' }),
                'Gelen Kutusu'
            ),
            el('div', { 
                className: `h2l-nav-item ${activeView === 'today' ? 'active' : ''}`,
                onClick: () => onChangeView('today')
            },
                el(Dashicon, { icon: 'calendar-alt', className: 'h2l-nav-icon' }),
                'Bugün'
            ),
            el('div', { 
                className: `h2l-nav-item ${activeView === 'upcoming' ? 'active' : ''}`,
                onClick: () => onChangeView('upcoming')
            },
                el(Dashicon, { icon: 'calendar', className: 'h2l-nav-icon' }),
                'Yaklaşan'
            ),

            // Projeler Başlığı
            el('div', { className: 'h2l-sidebar-section-title' },
                'Projelerim',
                el(Dashicon, { icon: 'plus', className: 'h2l-add-project-btn' })
            ),

            // Proje Listesi
            projects.map(proj => 
                el('div', { 
                    key: proj.id,
                    className: `h2l-nav-item ${activeView === `project-${proj.id}` ? 'active' : ''}`,
                    onClick: () => onChangeView(`project-${proj.id}`)
                },
                    el('span', { className: 'h2l-nav-icon', style: { color: proj.color || '#808080' } }, '●'),
                    proj.title
                )
            )
        );
    };

    // 2. Görev Listesi Bileşeni
    const TaskList = ({ tasks, onComplete }) => {
        if (tasks.length === 0) {
            return el('div', { style: { textAlign: 'center', marginTop: 50, color: '#888' } },
                el('p', null, 'Harika! Tüm görevler tamamlandı.'),
                el(Dashicon, { icon: 'yes', size: 40 })
            );
        }

        return el('ul', { className: 'h2l-task-list' },
            tasks.map(task => 
                el('li', { key: task.id, className: 'h2l-task-item' },
                    // Checkbox
                    el('div', { 
                        className: `h2l-checkbox-circle priority-${task.priority || 4}`,
                        onClick: () => onComplete(task.id)
                    }),
                    // İçerik
                    el('div', { className: 'h2l-task-content' },
                        el('span', { className: 'h2l-task-text' }, task.title),
                        el('div', { className: 'h2l-task-details' },
                            task.due_date && el('span', { className: 'h2l-due-date' }, 
                                el(Dashicon, { icon: 'clock', size: 14 }), 
                                ' ', task.due_date.split(' ')[0]
                            ),
                            el('span', null, task.project_name || 'Inbox')
                        )
                    )
                )
            )
        );
    };

    // 3. Ana Uygulama
    const App = () => {
        const [activeView, setActiveView] = useState('inbox');
        const [projects, setProjects] = useState([]); // Şimdilik boş, API'den gelecek
        const [tasks, setTasks] = useState([]);
        const [loading, setLoading] = useState(true);
        const [newTaskTitle, setNewTaskTitle] = useState('');
        
        // Başlangıç Verisi
        useEffect(() => {
            // Mock Projeler (Şimdilik) - Gerçek API'ye bağlanınca burası fetchProjects olacak
            setProjects([
                { id: 1, title: 'Notlarım', color: '#00bcd4' },
                { id: 2, title: 'Hip Medya Web', color: '#db4c3f' }
            ]);

            fetchTasks();
        }, [activeView]);

        const fetchTasks = () => {
            setLoading(true);
            // Query parametrelerini view'a göre ayarla
            let path = '/h2l/v1/tasks?status=open';
            // if (activeView === 'today') path += '&due_date=today';
            
            apiFetch({ path: path }).then(data => {
                setTasks(data);
                setLoading(false);
            });
        };

        const handleAddTask = () => {
            if(!newTaskTitle.trim()) return;
            setLoading(true);
            apiFetch({
                path: '/h2l/v1/tasks',
                method: 'POST',
                data: { title: newTaskTitle, project_id: 1 }
            }).then(res => {
                setNewTaskTitle('');
                fetchTasks();
            });
        };

        const handleCompleteTask = (taskId) => {
            // Optimistik güncelleme
            setTasks(tasks.filter(t => t.id !== taskId));
            // API çağrısı (Update status)
            // apiFetch(...)
        };

        // Görünüm Başlığını Belirle
        const getViewTitle = () => {
            if (activeView === 'inbox') return 'Gelen Kutusu';
            if (activeView === 'today') return 'Bugün';
            if (activeView === 'upcoming') return 'Yaklaşan';
            const proj = projects.find(p => `project-${p.id}` === activeView);
            return proj ? proj.title : 'Proje';
        };

        return el('div', { className: 'h2l-shell' },
            // SOL PANEL
            el(Sidebar, { 
                activeView, 
                onChangeView: setActiveView,
                projects 
            }),

            // SAĞ PANEL (ANA İÇERİK)
            el('div', { className: 'h2l-main-view' },
                // Üst Bar
                el('div', { className: 'h2l-top-bar' },
                    el('div', { className: 'h2l-view-title' }, getViewTitle()),
                    el('div', null, `Kullanıcı: ${settings.currentUser.data.display_name}`)
                ),

                // İçerik Alanı
                el('div', { className: 'h2l-content-scroll' },
                    // Hızlı Ekle (Todoist style satır içi)
                    el('div', { className: 'h2l-quick-add-wrapper' },
                        el('div', { style: { display: 'flex', gap: '10px' } },
                            el(TextControl, {
                                className: 'h2l-input-borderless',
                                placeholder: '+ Görev ekle (Örn: Toplantı notları p1 yarın)',
                                value: newTaskTitle,
                                onChange: setNewTaskTitle,
                                onKeyDown: (e) => { if(e.key === 'Enter') handleAddTask(); }
                            }),
                            el(Button, { isPrimary: true, onClick: handleAddTask, disabled: loading }, 'Ekle')
                        )
                    ),

                    // Görev Listesi
                    loading ? el(Spinner) : el(TaskList, { tasks, onComplete: handleCompleteTask })
                )
            )
        );
    };

    // Render
    const root = document.getElementById('h2l-admin-app');
    if (root) {
        wp.element.createRoot(root).render(el(App));
    }

})(window.wp, window.h2lSettings);