(function(wp, settings) {
    const { createElement: el, useState, useEffect } = wp.element;
    const apiFetch = wp.apiFetch;
    
    const { ErrorBoundary, Icon } = window.H2L.Common;
    const { Sidebar } = window.H2L;
    const { ProjectsDashboard, ProjectModal, FolderModal } = window.H2L.Projects;
    const { ProjectDetail } = window.H2L;
    const { ListView } = window.H2L.Tasks; 
    
    const TaskModal = window.H2L && window.H2L.TaskModal ? window.H2L.TaskModal : { TaskDetailModal: () => null };
    const { TaskDetailModal } = TaskModal;

    const BASE_URL = settings.base_url || '/gorevler';

    // --- API MIDDLEWARE (GÜNCELLENDİ) ---
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;

        // LITESPEED CACHE FIX:
        // Sadece veri okuma (GET) işlemlerinde URL sonuna benzersiz zaman damgası ekle.
        // Bu sayede tarayıcı ve sunucu her isteği "yeni" sanar ve cache kullanmaz.
        if ((!options.method || options.method === 'GET') && options.path) {
            const separator = options.path.includes('?') ? '&' : '?';
            options.path = `${options.path}${separator}t=${new Date().getTime()}`;
        }

        return next(options);
    });

    const App = () => {
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [] });
        const [loading, setLoading] = useState(true);
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null);
        const [activeTaskId, setActiveTaskId] = useState(null); 

        const loadData = () => {
            // Init isteği artık middleware sayesinde ?t=... parametresi alacak
            apiFetch({ path: '/h2l/v1/init' }).then(res => { setData(res); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
        };

        useEffect(() => { loadData(); }, []);

        // --- ROUTING LOGIC ---
        const navigate = (path) => {
            const fullPath = path.startsWith('/') ? path : '/' + path;
            window.history.pushState({}, '', BASE_URL + fullPath);
            parseRoute(fullPath);
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
            } else {
                setActiveTaskId(null);
            }

            if(path === '' || path === '/') {
                setViewState({ type: 'projects' });
            } else if(path.includes('/proje/')) {
                const pid = parseInt(path.split('/proje/')[1]);
                if(!isNaN(pid)) setViewState({ type: 'project_detail', id: pid });
            } else if (path.includes('/inbox')) {
                const inboxProj = data.projects.find(p => p.slug === 'inbox-project');
                if (inboxProj) setViewState({ type: 'project_detail', id: parseInt(inboxProj.id), isInbox: true });
                else setViewState({ type: 'projects' });
            } else if (path.includes('/bugun')) {
                setViewState({ type: 'today' });
            } else if (path.includes('/yaklasan')) {
                setViewState({ type: 'upcoming' });
            } else if (path.includes('/etiket/')) {
                const parts = path.split('/etiket/');
                if (parts[1]) setViewState({ type: 'label', slug: parts[1] });
            }
        };

        const getCurrentViewPath = () => {
            if (viewState.type === 'project_detail') return viewState.isInbox ? '/inbox' : `/proje/${viewState.id}`;
            if (viewState.type === 'today') return '/bugun';
            if (viewState.type === 'upcoming') return '/yaklasan';
            if (viewState.type === 'label') return `/etiket/${viewState.slug}`;
            return '';
        };

        const handleCloseTask = () => {
            setActiveTaskId(null);
            const parentPath = getCurrentViewPath();
            window.history.replaceState({}, '', BASE_URL + parentPath);
        };

        useEffect(() => {
            if (!loading) {
                const path = window.location.pathname.replace(BASE_URL, '');
                parseRoute(path);
            }
        }, [loading, data.tasks]);

        useEffect(() => {
            window.onpopstate = () => {
                const path = window.location.pathname.replace(BASE_URL, '');
                parseRoute(path);
            };
        }, [data.projects, data.tasks]);

        // --- ACTIONS ---
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
        
        const handleDeleteTask = (id) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' }).then(() => { 
            loadData(); 
            if(activeTaskId === id) { 
                handleCloseTask();
            } 
        });
        
        const handleAddSection = (d) => apiFetch({ path: '/h2l/v1/sections', method: 'POST', data: d }).then(loadData);
        const handleUpdateSection = (id, data) => apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'POST', data: data }).then(loadData);
        const handleDeleteSection = (id) => apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'DELETE' }).then(loadData);
        
        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

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
                
                content = el(ProjectDetail, { 
                    project: activeProject, 
                    projects: data.projects,
                    folders: data.folders, 
                    tasks: visibleTasks, 
                    sections: activeSections, 
                    users: data.users,
                    navigate,
                    onAddTask: handleAddTask, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask,
                    onAddSection: handleAddSection, onUpdateSection: handleUpdateSection, onDeleteSection: handleDeleteSection, onAction: handleAction, 
                    labels: data.labels || [],
                    onTaskClick: onTaskClick 
                });
            } else {
                content = el('div', {className: 'h2l-error'}, 'Proje bulunamadı.');
            }
        }
        else if (viewState.type === 'today' || viewState.type === 'upcoming') {
            const todayStr = new Date().toISOString().split('T')[0];
            let viewTitle = "";
            
            if (viewState.type === 'today') {
                viewTitle = "Bugün";
                visibleTasks = data.tasks.filter(t => {
                    if (!t.due_date || t.status === 'trash') return false;
                    return t.due_date.startsWith(todayStr);
                });
            } else {
                viewTitle = "Yaklaşan";
                visibleTasks = data.tasks.filter(t => {
                    if (!t.due_date || t.status === 'trash') return false;
                    return t.due_date >= todayStr;
                }).sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
            }

            const virtualProject = { id: 0, title: viewTitle, color: viewState.type==='today'?'#058527':'#692fc2', view_type: 'list' };

            content = el(ListView, {
                project: virtualProject,
                projects: data.projects,
                tasks: visibleTasks,
                sections: [],
                users: data.users,
                navigate,
                onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask,
                onAddTask: (d) => handleAddTask({...d, dueDate: todayStr}),
                onAddSection: () => alert('Bu görünümde bölüm eklenemez.'),
                onTaskClick: onTaskClick, 
                showCompleted: true,
                highlightToday: true,
                onUpdateSection: ()=>{}, onDeleteSection: ()=>{},
                labels: data.labels || [] 
            });
        }
        else if (viewState.type === 'label') {
            const activeLabel = data.labels ? data.labels.find(l => l.slug === viewState.slug) : null;
            if (activeLabel) {
                visibleTasks = data.tasks.filter(t => {
                    if (t.status === 'trash') return false;
                    return t.labels && t.labels.some(l => l.slug === viewState.slug);
                });
                const virtualProject = { id: 0, title: activeLabel.name, color: activeLabel.color || '#808080', view_type: 'list' };
                content = el(ListView, {
                    project: virtualProject, projects: data.projects, tasks: visibleTasks, sections: [], users: data.users, navigate,
                    onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask,
                    onAddTask: (d) => { const currentLabels = d.labels || []; if(!currentLabels.includes(activeLabel.name)) currentLabels.push(activeLabel.name); handleAddTask({...d, labels: currentLabels}); },
                    onAddSection: () => alert('Etiket görünümünde bölüm eklenemez.'), onTaskClick: onTaskClick, showCompleted: true, highlightToday: true, onUpdateSection: ()=>{}, onDeleteSection: ()=>{}, labels: data.labels || [] 
                });
            } else { content = el('div', {className: 'h2l-error'}, 'Etiket bulunamadı: ' + viewState.slug); }
        }

        const activeTask = activeTaskId ? data.tasks.find(t => t.id == activeTaskId) : null;

        return el('div', { id: 'h2l-app-container', className: 'h2l-flex-root' },
            el(Sidebar, { navigate, activeView: viewState }),
            el('div', { className: 'h2l-main-wrapper' }, content),
            modal?.type === 'project' && el(ProjectModal, { onClose:()=>setModal(null), onSave:handleSaveProject, onDelete:handleDeleteProject, folders:data.folders, users:data.users, initialData:modal.data }),
            modal?.type === 'folder' && el(FolderModal, { onClose:()=>setModal(null), onSave:handleSaveFolder, onDelete:handleDeleteFolder, initialData:modal.data }),
            
            activeTask && el(TaskDetailModal, { 
                task: activeTask, 
                tasks: visibleTasks, 
                onClose: handleCloseTask, 
                onUpdate: (id, d) => { handleUpdateTask(id, d); }, 
                onDelete: handleDeleteTask,
                onAdd: handleAddTask,
                users: data.users, projects: data.projects, sections: data.sections, labels: data.labels,
                navigate 
            })
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