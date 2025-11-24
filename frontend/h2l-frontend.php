<?php
/**
 * Frontend Yönetimi: Şablon ve Varlık Yükleme
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// 1. Şablon Yönlendirme
add_filter( 'template_include', 'h2l_force_app_template', 999 );

function h2l_force_app_template( $template ) {
    if ( is_page( 'gorevler' ) || get_query_var('pagename') === 'gorevler' ) {
        
        // --- AGRESİF CACHE ENGELLEME ---
        
        // 1. WordPress ve Eklenti Sabitleri
        if ( ! defined( 'DONOTCACHEPAGE' ) ) { define( 'DONOTCACHEPAGE', true ); }
        if ( ! defined( 'DONOTCACHEOBJECT' ) ) { define( 'DONOTCACHEOBJECT', true ); }
        if ( ! defined( 'DONOTMINIFY' ) ) { define( 'DONOTMINIFY', true ); } // Bazen minify işlemi de sorun yaratabilir
        
        // 2. LiteSpeed Özel Header'ı (Kesinlikle Cacheleme)
        if ( ! headers_sent() ) {
            header( 'X-LiteSpeed-Cache-Control: no-cache' );
            // Tarayıcılar için standart headerlar
            header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
            header( 'Cache-Control: post-check=0, pre-check=0', false );
            header( 'Pragma: no-cache' );
            header( 'Expires: Sat, 26 Jul 1997 05:00:00 GMT' ); // Geçmiş tarih
        }
        
        // WordPress'in kendi fonksiyonunu da çağır
        nocache_headers();
        // --------------------------------------------------

        $t = plugin_dir_path( __FILE__ ) . 'templates/h2l-page-template.php';
        if ( file_exists( $t ) ) return $t;
    }
    return $template;
}

// 2. Varlıkları Yükle
add_action( 'wp_enqueue_scripts', 'h2l_enqueue_frontend_assets' );

function h2l_enqueue_frontend_assets() {
    if ( is_page( 'gorevler' ) ) {
        // Libs
        wp_enqueue_style( 'font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0' );
        
        // --- CSS Dosyaları (YENİ YAPI) ---
        wp_enqueue_style( 'h2l-common-css', H2L_URL . 'frontend/assets/css/h2l-common.css', array(), time() );
        wp_enqueue_style( 'h2l-app-css', H2L_URL . 'frontend/assets/css/h2l-app.css', array('h2l-common-css'), time() );
        wp_enqueue_style( 'h2l-projects-css', H2L_URL . 'frontend/assets/css/h2l-projects.css', array('h2l-app-css'), time() );
        wp_enqueue_style( 'h2l-tasks-css', H2L_URL . 'frontend/assets/css/h2l-tasks.css', array('h2l-app-css'), time() );
        wp_enqueue_style( 'h2l-datepicker-css', H2L_URL . 'frontend/assets/css/h2l-datepicker.css', array(), time() );

        // --- JS Dosyaları ---
        $deps = array( 'wp-element', 'wp-api-fetch', 'jquery' );

        // Dosyalara version parametresi olarak time() ekleyerek JS cache'ini de kırıyoruz.
        wp_enqueue_script('h2l-common-js', H2L_URL . 'frontend/assets/js/h2l-common.js', $deps, time(), true);
        wp_enqueue_script('h2l-reminders-js', H2L_URL . 'frontend/assets/js/h2l-reminders.js', array('h2l-common-js'), time(), true);
        wp_enqueue_script('h2l-sidebar-js', H2L_URL . 'frontend/assets/js/h2l-sidebar.js', array('h2l-common-js'), time(), true);
        wp_enqueue_script('h2l-projects-js', H2L_URL . 'frontend/assets/js/h2l-projects.js', array('h2l-common-js'), time(), true);
        wp_enqueue_script('h2l-datepicker-js', H2L_URL . 'frontend/assets/js/h2l-datepicker.js', array('h2l-common-js'), time(), true);
        wp_enqueue_script('h2l-task-input-js', H2L_URL . 'frontend/assets/js/h2l-task-input.js', array('h2l-reminders-js', 'h2l-common-js', 'h2l-datepicker-js'), time(), true);
        wp_enqueue_script('h2l-task-modal-js', H2L_URL . 'frontend/assets/js/h2l-task-modal.js', array('h2l-task-input-js', 'h2l-common-js'), time(), true);
        wp_enqueue_script('h2l-tasks-js', H2L_URL . 'frontend/assets/js/h2l-tasks.js', array('h2l-task-input-js', 'h2l-common-js'), time(), true);
        wp_enqueue_script('h2l-project-detail-js', H2L_URL . 'frontend/assets/js/h2l-project-detail.js', array('h2l-tasks-js'), time(), true);
        wp_enqueue_script('h2l-app-js', H2L_URL . 'frontend/assets/js/h2l-app.js', array('h2l-projects-js', 'h2l-project-detail-js', 'h2l-sidebar-js', 'h2l-task-modal-js'), time(), true);

        // Veri Aktarımı
        wp_localize_script( 'h2l-app-js', 'h2lFrontendSettings', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'base_url' => site_url('/gorevler'),
            'currentUser' => wp_get_current_user()
        ) );
    }
}
?>