<?php
/**
 * Frontend Yönetimi: Hibrit Yükleme
 * Hem Şablon hem de İçerik Filtresi kullanarak içeriğin kaybolmasını önler.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// 1. Şablon Yönlendirme (Öncelikli Yöntem)
add_filter( 'template_include', 'h2l_force_app_template', 999 );

function h2l_force_app_template( $template ) {
    if ( is_page( 'gorevler' ) ) {
        $custom_template = plugin_dir_path( __FILE__ ) . 'templates/h2l-page-template.php';
        if ( file_exists( $custom_template ) ) {
            return $custom_template;
        }
    }
    return $template;
}

// 2. İçerik Değiştirme (Yedek Yöntem - Şablon çalışmazsa devreye girer)
add_filter( 'the_content', 'h2l_force_app_content', 999 );

function h2l_force_app_content( $content ) {
    if ( is_page( 'gorevler' ) ) {
        // Eğer özel şablon devreye girmemişse, içeriği React kutusuyla değiştir
        return '<div id="h2l-page-wrapper"><div id="h2l-frontend-app"><div class="h2l-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Yükleniyor...</div></div></div>';
    }
    return $content;
}

// 3. Varlıkları Yükle
add_action( 'wp_enqueue_scripts', 'h2l_enqueue_frontend_assets' );

function h2l_enqueue_frontend_assets() {
    if ( is_page( 'gorevler' ) ) {
        // Font Awesome
        wp_enqueue_style( 'font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0' );
        
        // CSS
        wp_enqueue_style( 'h2l-frontend-css', H2L_URL . 'frontend/assets/frontend.css', array(), time() ); // Cache'i engellemek için time()
        
        // JS
        wp_enqueue_script( 'h2l-frontend-js', H2L_URL . 'frontend/assets/frontend.js', array( 'wp-element', 'wp-api-fetch', 'jquery' ), time(), true );

        wp_localize_script( 'h2l-frontend-js', 'h2lFrontendSettings', array(
            'root' => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'currentUser' => wp_get_current_user()
        ) );
    }
}
?>