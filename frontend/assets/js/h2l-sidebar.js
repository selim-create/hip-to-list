(function(wp) {
    const { createElement: el } = wp.element;
    const { Icon } = window.H2L.Common;

    window.H2L = window.H2L || {};
    window.H2L.Sidebar = ({ navigate }) => {
        return el('div', { className: 'h2l-sidebar' }, 
             el('div', {className:'h2l-sidebar-head'}, 'Adbreak'),
             el('div', {className:'h2l-nav-item active', onClick:()=>navigate('')}, el(Icon,{name:'layer-group'}), ' Projeler')
        );
    };
})(window.wp);