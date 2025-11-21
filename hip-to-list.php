<?php
/**
 * Plugin Name: Hip to List
 * Plugin URI:  https://hipmedya.com/
 * Description: Apple Reminders ve Todoist benzeri, ekip odaklı görev yönetim eklentisi.
 * Version:     1.0.0
 * Author:      Hip Medya
 * Text Domain: h2l
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Doğrudan erişimi engelle
}

// Sabitleri Tanımla
define( 'H2L_VERSION', '1.0.0' );
define( 'H2L_PATH', plugin_dir_path( __FILE__ ) );
define( 'H2L_URL', plugin_dir_url( __FILE__ ) );
define( 'H2L_DB_PREFIX', 'h2l_' ); // Tablo ön eki

// Bootstrap dosyasını yükle (Uygulamanın beyni)
if ( file_exists( H2L_PATH . 'includes/bootstrap.php' ) ) {
    require_once H2L_PATH . 'includes/bootstrap.php';
}

// Kurulum Hook'u (Veritabanı tabloları için)
register_activation_hook( __FILE__, 'h2l_activate_plugin' );

function h2l_activate_plugin() {
    // Install dosyasını sadece aktivasyon sırasında yükle
    require_once H2L_PATH . 'includes/install.php';
    h2l_install_db();
}
?>