<?php
/**
 * Frontend Yönetimi: Şablon ve Varlık Yükleme
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// 1. Şablon Yönlendirme
add_filter( 'template_include', 'h2l_force_app_template', 999 );

function h2l_force_app_template( $template ) {
    if ( is_page( 'gorevler' ) || get_query_var('pagename') === 'gorevler' ) {
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
        
        // 1. Common: Değişkenler, Reset, UI Kit (Temel)
        wp_enqueue_style( 'h2l-common-css', H2L_URL . 'frontend/assets/css/h2l-common.css', array(), time() );

        // 2. App: Ana Layout ve İskelet (Common'a bağımlı)
        wp_enqueue_style( 'h2l-app-css', H2L_URL . 'frontend/assets/css/h2l-app.css', array('h2l-common-css'), time() );

        // 3. Projects: Dashboard ve Listeler (App'e bağımlı)
        wp_enqueue_style( 'h2l-projects-css', H2L_URL . 'frontend/assets/css/h2l-projects.css', array('h2l-app-css'), time() );

        // 4. Tasks: Görev Detayları ve Bölümler (App'e bağımlı)
        wp_enqueue_style( 'h2l-tasks-css', H2L_URL . 'frontend/assets/css/h2l-tasks.css', array('h2l-app-css'), time() );

        // YENİ: Datepicker CSS
        wp_enqueue_style( 'h2l-datepicker-css', H2L_URL . 'frontend/assets/css/h2l-datepicker.css', array(), time() );

        // --- JS Dosyaları ---
        // (JS yapısı aynen korundu)
        $deps = array( 'wp-element', 'wp-api-fetch', 'jquery' );

        // 1. Ortak Bileşenler (Icon, Avatar, Constants)
        wp_enqueue_script('h2l-common-js', H2L_URL . 'frontend/assets/js/h2l-common.js', $deps, time(), true);

        // 2. Parser & Helper (Tasks bu dosyaya ihtiyaç duyar)
        wp_enqueue_script('h2l-reminders-js', H2L_URL . 'frontend/assets/js/h2l-reminders.js', array('h2l-common-js'), time(), true);

        // 3. Sidebar (App ihtiyaç duyar)
        wp_enqueue_script('h2l-sidebar-js', H2L_URL . 'frontend/assets/js/h2l-sidebar.js', array('h2l-common-js'), time(), true);
        
        // 4. Proje & Klasörler (Dashboard & Modals)
        wp_enqueue_script('h2l-projects-js', H2L_URL . 'frontend/assets/js/h2l-projects.js', array('h2l-common-js'), time(), true);

        // [YENİ] 5. Görev Girdileri (Task Input - QuickAdd, RichInput, InlineEditor)
        // Bu dosya Reminders ve Common'a ihtiyaç duyar.
        // YENİ: Datepicker JS (h2l-common-js'den sonra, h2l-task-input-js'den önce)
        wp_enqueue_script('h2l-datepicker-js', H2L_URL . 'frontend/assets/js/h2l-datepicker.js', array('h2l-common-js'), time(), true);
        
        // h2l-task-input-js artık datepicker'a da bağımlı olabilir veya doğrudan globalden kullanabilir.
        wp_enqueue_script('h2l-task-input-js', H2L_URL . 'frontend/assets/js/h2l-task-input.js', array('h2l-reminders-js', 'h2l-common-js', 'h2l-datepicker-js'), time(), true);

        // [GÜNCELLENDİ] 6. Görev Listesi & Modallar (Tasks Logic)
        // Bu dosya artık h2l-task-input-js dosyasına bağımlıdır.
        wp_enqueue_script('h2l-tasks-js', H2L_URL . 'frontend/assets/js/h2l-tasks.js', array('h2l-task-input-js', 'h2l-common-js'), time(), true);

        // 7. Proje Detay Sayfası Wrapper (Tasks'a ihtiyaç duyar)
        wp_enqueue_script('h2l-project-detail-js', H2L_URL . 'frontend/assets/js/h2l-project-detail.js', array('h2l-tasks-js'), time(), true);

        // 8. Ana Uygulama Root (Hepsini birleştirir)
        wp_enqueue_script('h2l-app-js', H2L_URL . 'frontend/assets/js/h2l-app.js', array('h2l-projects-js', 'h2l-project-detail-js', 'h2l-sidebar-js'), time(), true);

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