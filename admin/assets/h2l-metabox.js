(function(wp, settings) {
    const { createElement: el, useState, useEffect } = wp.element;
    const { Button, TextControl } = wp.components;
    const apiFetch = wp.apiFetch;

    const Icon = ({ name, style, onClick }) => el('i', { className: `fa-solid fa-${name}`, style, onClick });

    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        return next(options);
    });

    const CRMMetaboxApp = () => {
        const rootEl = document.getElementById('h2l-crm-metabox-root');
        const postId = parseInt(rootEl.getAttribute('data-post-id'));
        const postType = rootEl.getAttribute('data-post-type');
        const postTitle = rootEl.getAttribute('data-post-title');

        const [tasks, setTasks] = useState([]);
        const [loading, setLoading] = useState(true);
        const [newTaskTitle, setNewTaskTitle] = useState('');
        const [selectedProject, setSelectedProject] = useState(0); // Varsayılan 0 (Inbox)
        const [isAdding, setIsAdding] = useState(false);

        const fetchTasks = () => {
            apiFetch({ path: `/h2l/v1/tasks?related_object_id=${postId}&related_object_type=${postType}` })
                .then(res => { setTasks(res); setLoading(false); })
                .catch(() => setLoading(false));
        };

        useEffect(() => { fetchTasks(); }, []);

        const handleAddTask = () => {
            if (!newTaskTitle.trim()) return;
            setIsAdding(true);

            const data = {
                title: newTaskTitle,
                project_id: parseInt(selectedProject), // Seçilen Proje ID
                related_object_id: postId,
                related_object_type: postType,
                labels: [postType] 
            };

            apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data })
                .then(() => {
                    setNewTaskTitle('');
                    setIsAdding(false);
                    fetchTasks();
                });
        };

        const handleStatusToggle = (task) => {
            const newStatus = task.status === 'completed' ? 'in_progress' : 'completed';
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
            apiFetch({ path: `/h2l/v1/tasks/${task.id}`, method: 'POST', data: { status: newStatus } });
        };

        if (loading) return el('div', null, 'Yükleniyor...');

        return el('div', { className: 'h2l-crm-wrapper', style: {padding: '0'} },
            
            // EKLEME ALANI (GÜNCELLENDİ)
            el('div', { style: { marginBottom: '15px', background: '#f9f9f9', padding: '10px', borderRadius: '4px', border: '1px solid #eee' } },
                
                // 1. Proje Seçimi
                el('select', {
                    className: 'h2l-input',
                    style: { width: '100%', marginBottom: '8px', fontSize: '12px', padding: '4px', borderColor: '#ddd', color: '#555' },
                    value: selectedProject,
                    onChange: (e) => setSelectedProject(e.target.value)
                },
                    el('option', { value: 0 }, '📥 Gelen Kutusu (Inbox)'),
                    (settings.projects || []).map(p => 
                        el('option', { key: p.id, value: p.id }, `● ${p.title}`)
                    )
                ),

                // 2. Başlık ve Buton
                el('div', { style: { display: 'flex', gap: '5px' } },
                    el('input', {
                        className: 'h2l-input',
                        style: { flex: 1, fontSize: '13px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px' },
                        value: newTaskTitle,
                        onChange: (e) => setNewTaskTitle(e.target.value),
                        placeholder: 'Yeni görev yazın...',
                        onKeyDown: (e) => { if (e.key === 'Enter') handleAddTask(); }
                    }),
                    el('button', { 
                        className: 'button button-secondary', 
                        onClick: handleAddTask, 
                        disabled: !newTaskTitle.trim() || isAdding 
                    }, isAdding ? '...' : 'Ekle')
                )
            ),

            // GÖREV LİSTESİ
            el('div', { className: 'h2l-crm-task-list' },
                tasks.length === 0 && el('p', { style: { color: '#ccc', fontStyle: 'italic', fontSize:'12px', margin:0, textAlign:'center' } }, 'İlişkili görev yok.'),
                
                tasks.map(task => {
                    const isCompleted = task.status === 'completed';
                    return el('div', { 
                        key: task.id, 
                        style: { 
                            display: 'flex', alignItems: 'center', gap: '8px', 
                            padding: '8px 0', borderBottom: '1px solid #f0f0f0', 
                            opacity: isCompleted ? 0.6 : 1
                        } 
                    },
                        el('div', { 
                            onClick: () => handleStatusToggle(task),
                            style: { cursor: 'pointer', color: isCompleted ? '#27ae60' : '#ccc' } 
                        }, el(Icon, { name: isCompleted ? 'circle-check' : 'circle' })),
                        
                        el('div', { style: { flex: 1, overflow: 'hidden' } },
                            el('a', { 
                                href: `${window.location.origin}/gorevler/gorev/${task.id}`, 
                                target: '_blank',
                                style: { 
                                    textDecoration: isCompleted ? 'line-through' : 'none',
                                    color: '#333', fontSize: '13px', display: 'block',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                } 
                            }, task.title),
                            // Proje Adını Göster (İsteğe Bağlı)
                            task.project_name && el('span', { style: { fontSize:'10px', color:'#999' } }, task.project_name)
                        )
                    );
                })
            )
        );
    };

    document.addEventListener('DOMContentLoaded', () => {
        const root = document.getElementById('h2l-crm-metabox-root');
        if (root && wp.element.createRoot) {
            wp.element.createRoot(root).render(el(CRMMetaboxApp));
        }
    });

})(window.wp, window.h2lMetaboxSettings);