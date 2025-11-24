<?php
/**
 * Bootstrap Dosyası
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Helper'ları yükle
if ( file_exists( H2L_PATH . 'includes/helpers.php' ) ) {
    require_once H2L_PATH . 'includes/helpers.php';
}

// Core Sınıfları (Dosya varsa yükle)
$core_files = [
    'includes/core/folder.php',
    'includes/core/project.php',
    'includes/core/task.php',
    'includes/core/comment.php',
    'includes/core/reminder.php',
    'includes/core/notification.php'

];

foreach ( $core_files as $file ) {
    if ( file_exists( H2L_PATH . $file ) ) {
        require_once H2L_PATH . $file;
    }
}

// API
if ( file_exists( H2L_PATH . 'includes/h2l-api.php' ) ) {
    require_once H2L_PATH . 'includes/h2l-api.php';
}

// Admin Menüleri (BURASI KRİTİK)
if ( is_admin() ) {
    if ( file_exists( H2L_PATH . 'admin/h2l-admin.php' ) ) {
        require_once H2L_PATH . 'admin/h2l-admin.php';
    }
} else {
    if ( file_exists( H2L_PATH . 'frontend/h2l-frontend.php' ) ) {
        require_once H2L_PATH . 'frontend/h2l-frontend.php';
    }
}

// Hooks
if ( file_exists( H2L_PATH . 'includes/hooks.php' ) ) {
    require_once H2L_PATH . 'includes/hooks.php';
}

// Global Init
add_action( 'init', 'h2l_init' );

function h2l_init() {
    load_plugin_textdomain( 'h2l', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
    
    if ( is_user_logged_in() && function_exists('h2l_check_default_user_data') ) {
        h2l_check_default_user_data();
    }
}

add_action( 'user_register', 'h2l_on_user_register' );
function h2l_on_user_register( $user_id ) {
    if( function_exists('h2l_check_default_user_data') ) {
        h2l_check_default_user_data( $user_id );
    }
}
?>