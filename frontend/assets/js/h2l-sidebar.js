(function(wp) {
    const { createElement: el } = wp.element;
    const { Icon } = window.H2L.Common;

    window.H2L = window.H2L || {};
    
    window.H2L.Sidebar = ({ navigate, activeView }) => {
        
        const isActive = (path) => {
            if (path === '' && activeView.type === 'projects') return true;
            if (path === 'inbox' && activeView.type === 'project_detail' && activeView.isInbox) return true;
            if (path === 'today' && activeView.type === 'today') return true;
            if (path === 'upcoming' && activeView.type === 'upcoming') return true;
            return false;
        };

        return el('div', { className: 'h2l-sidebar' }, 
             el('div', {className:'h2l-sidebar-head'}, 
                el('span', null, 'Adbreak'),
                el('span', {style:{fontSize:12, fontWeight:400, color:'#888', marginLeft:5}}, 'Görevler')
             ),
             
             el('div', { className: 'h2l-nav-group' },
                 el('div', {
                     className: `h2l-nav-item ${isActive('inbox') ? 'active' : ''}`, 
                     onClick: () => navigate('/inbox')
                 }, el(Icon,{name:'inbox', style:{color:'#246fe0'}}), ' Gelen Kutusu'),

                 el('div', {
                     className: `h2l-nav-item ${isActive('today') ? 'active' : ''}`, 
                     onClick: () => navigate('/bugun')
                 }, el(Icon,{name:'calendar-day', style:{color:'#058527'}}), ' Bugün'),

                 el('div', {
                     className: `h2l-nav-item ${isActive('upcoming') ? 'active' : ''}`, 
                     onClick: () => navigate('/yaklasan')
                 }, el(Icon,{name:'calendar-week', style:{color:'#692fc2'}}), ' Yaklaşan')
             ),

             el('div', { className: 'h2l-nav-group', style:{marginTop:20} },
                el('div', {className:'h2l-sidebar-subtitle'}, 'Projelerim'),
                el('div', {
                     className: `h2l-nav-item ${isActive('') ? 'active' : ''}`, 
                     onClick:()=>navigate('')
                }, el(Icon,{name:'layer-group'}), ' Tüm Projeler')
             )
        );
    };
})(window.wp);