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
        
        // CSS Dosyaları
        wp_enqueue_style( 'h2l-main-css', H2L_URL . 'frontend/assets/frontend.css', array(), time() );
        // Yeni Detay CSS'i
        wp_enqueue_style( 'h2l-detail-css', H2L_URL . 'frontend/assets/project-detail.css', array('h2l-main-css'), time() );

        // JS Dosyaları
        // Önce Detay Modülünü yükle (Bağımlılık olarak wp-element)
        wp_enqueue_script( 
            'h2l-detail-js', 
            H2L_URL . 'frontend/assets/project-detail.js', 
            array( 'wp-element' ), 
            time(), 
            true 
        );

        // Sonra Ana Uygulamayı yükle (Detay modülüne bağımlı)
        wp_enqueue_script( 
            'h2l-frontend-js', 
            H2L_URL . 'frontend/assets/frontend.js', 
            array( 'wp-element', 'wp-api-fetch', 'jquery', 'h2l-detail-js' ), 
            time(), 
            true 
        );

        wp_localize_script( 'h2l-frontend-js', 'h2lFrontendSettings', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'base_url' => site_url('/gorevler'),
            'currentUser' => wp_get_current_user()
        ) );
    }
}
?>