(function(wp, settings) {
    const { createElement: el, useState, useEffect } = wp.element;
    const apiFetch = wp.apiFetch;
    
    // GLOBAL COMPONENT IMPORTS
    const { ErrorBoundary, Icon } = window.H2L.Common;
    const { Sidebar } = window.H2L;
    const { ProjectsDashboard, ProjectModal, FolderModal } = window.H2L.Projects;
    const { ProjectDetail } = window.H2L;
    const { ListView } = window.H2L.Tasks;

    const BASE_URL = settings.base_url || '/gorevler';

    // --- API CONFIG ---
    apiFetch.use((options, next) => {
        if (!options.headers) options.headers = {};
        options.headers['X-WP-Nonce'] = settings.nonce;
        return next(options);
    });

    // --- APP COMPONENT ---
    const App = () => {
        const [data, setData] = useState({ folders: [], projects: [], tasks: [], users: [], sections: [] });
        const [loading, setLoading] = useState(true);
        // View State: { type: 'projects' | 'project_detail' | 'today' | 'upcoming', id: null, isInbox: false }
        const [viewState, setViewState] = useState({ type: 'projects' });
        const [modal, setModal] = useState(null);

        const loadData = () => {
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
            }
        };

        useEffect(() => {
            if (!loading) {
                const path = window.location.pathname.replace(BASE_URL, '');
                parseRoute(path);
            }
        }, [loading, data.projects]);

        useEffect(() => {
            window.onpopstate = () => {
                const path = window.location.pathname.replace(BASE_URL, '');
                parseRoute(path);
            };
        }, [data.projects]);

        // --- ACTIONS ---
        const handleAction = (act, item) => { 
            if(act === 'add_project' || act === 'edit_project') setModal({ type: 'project', data: item });
            if(act === 'add_folder' || act === 'edit_folder') setModal({ type: 'folder', data: item });
            if (act === 'update_project_members') {
            // Proje güncelleme API'sini çağır
            handleSaveProject(item); 
             }
        };

        const handleSaveProject = (f) => apiFetch({ path: '/h2l/v1/projects'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteProject = (id) => apiFetch({ path: `/h2l/v1/projects/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); navigate(''); });
        const handleSaveFolder = (f) => apiFetch({ path: '/h2l/v1/folders'+(f.id?`/${f.id}`:''), method: 'POST', data: f }).then(() => { loadData(); setModal(null); });
        const handleDeleteFolder = (id) => apiFetch({ path: `/h2l/v1/folders/${id}`, method: 'DELETE' }).then(() => { loadData(); setModal(null); });
        
        const handleAddTask = (d) => apiFetch({ path: '/h2l/v1/tasks', method: 'POST', data: d }).then(loadData);
        const handleUpdateTask = (id, d) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'POST', data: d }).then(res => { loadData(); });
        const handleDeleteTask = (id) => apiFetch({ path: `/h2l/v1/tasks/${id}`, method: 'DELETE' }).then(() => { loadData(); });
        
        const handleAddSection = (d) => apiFetch({ path: '/h2l/v1/sections', method: 'POST', data: d }).then(loadData);
        const handleUpdateSection = (id, data) => apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'POST', data: data }).then(loadData);
        const handleDeleteSection = (id) => apiFetch({ path: `/h2l/v1/sections/${id}`, method: 'DELETE' }).then(loadData);
        
        if(loading) return el('div', {className:'h2l-loading'}, el(Icon,{name:'circle-notch', className:'fa-spin'}), ' Yükleniyor...');

        // --- CONTENT RENDERER ---
        let content = null;

        if (viewState.type === 'projects') {
            content = el(ProjectsDashboard, { data, navigate, onAction: handleAction });
        } 
        else if (viewState.type === 'project_detail') {
            const activeProject = data.projects.find(p => parseInt(p.id) === viewState.id);
            if (activeProject) {
                const activeTasks = data.tasks.filter(t => parseInt(t.projectId || t.project_id) === viewState.id && t.status !== 'trash');
                const activeSections = data.sections.filter(s => parseInt(s.projectId || s.project_id) === viewState.id);
                content = el(ProjectDetail, { 
                    project: activeProject, folders: data.folders, tasks: activeTasks, sections: activeSections, users: data.users,
                    navigate, onAddTask: handleAddTask, onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask,
                    onAddSection: handleAddSection, onUpdateSection: handleUpdateSection, onDeleteSection: handleDeleteSection, onAction: handleAction
                });
            } else {
                content = el('div', {className: 'h2l-error'}, 'Proje bulunamadı.');
            }
        }
        else if (viewState.type === 'today' || viewState.type === 'upcoming') {
            const todayStr = new Date().toISOString().split('T')[0];
            let filteredTasks = [];
            let viewTitle = "";
            
            if (viewState.type === 'today') {
                viewTitle = "Bugün";
                filteredTasks = data.tasks.filter(t => {
                    if (!t.due_date || t.status === 'trash') return false;
                    return t.due_date.startsWith(todayStr);
                });
            } else {
                viewTitle = "Yaklaşan";
                filteredTasks = data.tasks.filter(t => {
                    if (!t.due_date || t.status === 'trash') return false;
                    return t.due_date >= todayStr;
                }).sort((a,b) => new Date(a.due_date) - new Date(b.due_date));
            }

            const virtualProject = { id: 0, title: viewTitle, color: viewState.type==='today'?'#058527':'#692fc2', view_type: 'list' };

            content = el(ListView, {
                project: virtualProject,
                tasks: filteredTasks,
                sections: [],
                users: data.users,
                onUpdateTask: handleUpdateTask, onDeleteTask: handleDeleteTask,
                onAddTask: (d) => handleAddTask({...d, dueDate: todayStr}),
                onAddSection: () => alert('Bu görünümde bölüm eklenemez.'),
                onTaskClick: () => {}, 
                showCompleted: true,
                highlightToday: true,
                onUpdateSection: ()=>{}, onDeleteSection: ()=>{}
            });
        }

        return el('div', { id: 'h2l-app-container', className: 'h2l-flex-root' },
            el(Sidebar, { navigate, activeView: viewState }),
            el('div', { className: 'h2l-main-wrapper' }, content),
            modal?.type === 'project' && el(ProjectModal, { onClose:()=>setModal(null), onSave:handleSaveProject, onDelete:handleDeleteProject, folders:data.folders, users:data.users, initialData:modal.data }),
            modal?.type === 'folder' && el(FolderModal, { onClose:()=>setModal(null), onSave:handleSaveFolder, onDelete:handleDeleteFolder, initialData:modal.data })
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