<?php
/**
 * Frontend Yönetimi: Şablon ve Varlık Yükleme
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/**
 * Görevler sayfası kontrolü
 */
function h2l_is_tasks_page() {
    if ( is_page('gorevler') ) return true;
    $pagename = get_query_var('pagename', '');
    return $pagename === 'gorevler';
}

add_filter( 'template_include', 'h2l_force_app_template', 999 );
function h2l_force_app_template( $template ) {
    if ( h2l_is_tasks_page() ) {
        if ( ! defined( 'DONOTCACHEPAGE' ) ) { define( 'DONOTCACHEPAGE', true ); }
        if ( ! headers_sent() ) {
            header('X-LiteSpeed-Cache-Control: no-cache');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Expires: 0');
        }
        nocache_headers();
        $t = plugin_dir_path(__FILE__) . 'templates/h2l-page-template.php';
        if ( file_exists($t) ) return $t;
    }
    return $template;
}

add_action( 'wp_enqueue_scripts', 'h2l_enqueue_frontend_assets' );
function h2l_enqueue_frontend_assets() {
    if ( ! is_user_logged_in() ) return;
    $is_app_page = h2l_is_tasks_page();

    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0');
    $deps = array( 'wp-element', 'wp-api-fetch', 'jquery' );

    // CSS
    wp_enqueue_style('h2l-common-css', H2L_URL.'frontend/assets/css/h2l-common.css', array(), filemtime( H2L_PATH.'frontend/assets/css/h2l-common.css' ));
    wp_enqueue_style('h2l-datepicker-css', H2L_URL.'frontend/assets/css/h2l-datepicker.css', array(), filemtime( H2L_PATH.'frontend/assets/css/h2l-datepicker.css' ));
    wp_enqueue_style('h2l-tasks-css', H2L_URL.'frontend/assets/css/h2l-tasks.css', array('h2l-common-css'), filemtime( H2L_PATH.'frontend/assets/css/h2l-tasks.css' ));
    
    // JS
    wp_enqueue_script('h2l-common-js', H2L_URL.'frontend/assets/js/h2l-common.js', $deps, filemtime( H2L_PATH.'frontend/assets/js/h2l-common.js' ), true);
    wp_enqueue_script('h2l-reminders-js', H2L_URL.'frontend/assets/js/h2l-reminders.js', array('h2l-common-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-reminders.js' ), true);
    wp_enqueue_script('h2l-datepicker-js', H2L_URL.'frontend/assets/js/h2l-datepicker.js', array('h2l-common-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-datepicker.js' ), true);
    wp_enqueue_script('h2l-task-input-js', H2L_URL.'frontend/assets/js/h2l-task-input.js', array('h2l-reminders-js','h2l-common-js','h2l-datepicker-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-task-input.js' ), true);
    wp_enqueue_script('h2l-task-modal-js', H2L_URL.'frontend/assets/js/h2l-task-modal.js', array('h2l-task-input-js','h2l-common-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-task-modal.js' ), true);

    $cu = wp_get_current_user();
    $frontend_settings = array(
        'root'        => esc_url_raw( (string) rest_url() ),
        'nonce'       => wp_create_nonce('wp_rest'),
        'base_url'    => esc_url_raw( (string) site_url('/gorevler') ),
        'currentUser' => array( 'id' => (int) $cu->ID, 'name' => (string) $cu->display_name, 'email' => (string) $cu->user_email, 'roles' => (array) $cu->roles )
    );

    if ( $is_app_page ) {
        // Uygulama içi stiller ve scriptler
        wp_enqueue_style('h2l-app-css', H2L_URL.'frontend/assets/css/h2l-app.css', array('h2l-common-css'), filemtime( H2L_PATH.'frontend/assets/css/h2l-app.css' ));
        wp_enqueue_style('h2l-projects-css', H2L_URL.'frontend/assets/css/h2l-projects.css', array('h2l-app-css'), filemtime( H2L_PATH.'frontend/assets/css/h2l-projects.css' ));
        
        wp_enqueue_style('h2l-meetings-css', H2L_URL.'frontend/assets/css/h2l-meetings.css', array('h2l-app-css'), '1.0.0');

        wp_enqueue_script('h2l-sidebar-js', H2L_URL.'frontend/assets/js/h2l-sidebar.js', array('h2l-common-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-sidebar.js' ), true);
        wp_enqueue_script('h2l-tasks-js', H2L_URL.'frontend/assets/js/h2l-tasks.js', array('h2l-task-input-js','h2l-common-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-tasks.js' ), true);
        wp_enqueue_script('h2l-projects-js', H2L_URL.'frontend/assets/js/h2l-projects.js', array('h2l-common-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-projects.js' ), true);
        wp_enqueue_script('h2l-project-detail-js', H2L_URL.'frontend/assets/js/h2l-project-detail.js', array('h2l-tasks-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-project-detail.js' ), true);
        
        wp_enqueue_script('h2l-meetings-js', H2L_URL.'frontend/assets/js/h2l-meetings.js', array('h2l-common-js'), '1.0.0', true);
        
        // YENİ: Filters JS
        wp_enqueue_script('h2l-filters-js', H2L_URL.'frontend/assets/js/h2l-filters.js', array('h2l-common-js'), '1.0.0', true);

        wp_enqueue_script('h2l-app-js', H2L_URL.'frontend/assets/js/h2l-app.js', array('h2l-projects-js','h2l-project-detail-js','h2l-sidebar-js','h2l-task-modal-js', 'h2l-meetings-js', 'h2l-filters-js'), filemtime( H2L_PATH.'frontend/assets/js/h2l-app.js' ), true);

        wp_localize_script( 'h2l-app-js', 'h2lFrontendSettings', $frontend_settings );
    } else {
        wp_enqueue_script('h2l-popup-loader-js', H2L_URL.'frontend/assets/js/h2l-popup-loader.js', array('h2l-task-modal-js','wp-element','wp-api-fetch'), filemtime( H2L_PATH.'frontend/assets/js/h2l-popup-loader.js' ), true);
        wp_localize_script( 'h2l-popup-loader-js', 'h2lFrontendSettings', $frontend_settings );
    }
}
?>